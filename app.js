'use strict';

/* ══════════════ 状态 ══════════════ */
let chapters = [];            // /api/chapters 返回的章节列表
let currentPath = null;       // 当前章节 path（null = 在路线图页）
let pendingSection = null;    // 搜索跳转：加载后要滚动到的章节标题
let chapterGen = 0;           // 章节加载竞态守卫
let searchGen = 0;            // 搜索请求竞态守卫
let searchTimer = null;
let mermaidCounter = 0;
let tocHeadings = [];         // 当前章节的 {el, id, level, text}
const STATIC_MODE = !['127.0.0.1', 'localhost'].includes(window.location.hostname);
// 静态模式（GitHub Pages）没有后端：搜索数据是构建期产出的
// search-manifest.json（轻量目录）+ search/<n>.json（按章正文分片）。
let searchManifest = null;                                    // 首次搜索时拉一次，之后常驻内存
const shardCache = Object.create(null);                       // 分片序号 → Promise，兼作去重锁
const STATIC_SHARD_COUNT = 8;                                 // 与 build-pages.py 的 SHARD_COUNT 对齐
const STATIC_RESULT_LIMIT = 40;                               // 结果上限，与 /api/search 一致
const STATIC_ENOUGH = 30;    // 前两片扫完攒到这个数就认为够用；
                              // 低于它则继续拉余下分片，避免长尾词召回不全
const STATIC_MAX_SHARDS = 99;  // 渐进扫描的上限（实际受 STATIC_SHARD_COUNT 约束，即扫完为止）

const $ = id => document.getElementById(id);
const TRACK_LABEL = { core: '核心', recommended: '建议', optional: '选读' };
const TRACK_CLASS = { core: 'badge-core', recommended: 'badge-rec', optional: 'badge-opt' };

/* ══════════════ 阶段定义 ══════════════
   curriculum.yml 中每章有 phase（1-6 / optional / capstone / appendix），
   但 /api/chapters 暂不返回该字段，因此按下述编号区间从章节名推导；
   若服务端将来返回 phase，则以服务端值为准（见 phaseOf）。 */
const PHASES = [
  { key: '1',   no: '一', title: '第一阶段：离开 OJ',         desc: '终端与 Shell、文件系统、权限、编辑器、数据格式、软件安装', range: [0, 9] },
  { key: '2',   no: '二', title: '第二阶段：理解机器',       desc: '硬件、操作系统、内存与 I/O、系统管理、SSH 远程开发', range: [10, 14] },
  { key: '3',   no: '三', title: '第三阶段：编程语言',       desc: '从竞赛 C++ 到工程 C++、Python 速通与科学计算栈',     range: [15, 18] },
  { key: '4',   no: '四', title: '第四阶段：版本控制与网络', desc: 'Git/GitHub、依赖构建与 CI、HTTP 与 HTTPS',            range: [19, 24] },
  { key: '5',   no: '五', title: '第五阶段：应用开发',       desc: 'SQL 与数据库、前后端、Docker、部署与安全',           range: [25, 32] },
  { key: '6',   no: '六', title: '第六阶段：AI 工程',        desc: 'AI 工程与 Agent、多模态、GPU 与图形音频',            range: [33, 42] },
  { key: 'opt', no: '☆', title: '选读 AI 分支',             desc: 'PyTorch 与模型训练、多 GPU 分布式训练、训练服务器',  range: [43, 45] },
  { key: 'cap', no: '终', title: '最终实践',                 desc: '贯穿项目：从命令行工具到可部署应用',                  range: [46, 46] },
  { key: 'app', no: '附', title: '附录',                     desc: '命令速查、术语表与工程实践专题',                      range: [47, 99] },
];

function phaseOf(c) {
  // 服务端若提供 phase 字段，直接采用
  if (c.phase !== undefined && c.phase !== null && c.phase !== '') {
    const p = String(c.phase).toLowerCase();
    if (p === 'optional') return 'opt';
    if (p === 'capstone') return 'cap';
    if (p === 'appendix') return 'app';
    if (PHASES.some(ph => ph.key === p)) return p;
  }
  // 否则按章节编号区间推导（名称形如 "Ch0 …" / "Ch14 …" / "附录A …"）
  const m = /^Ch(\d+)/.exec(c.name || '');
  if (m) {
    const n = parseInt(m[1], 10);
    if (n <= 9) return '1';
    if (n <= 14) return '2';
    if (n <= 18) return '3';
    if (n <= 24) return '4';
    if (n <= 32) return '5';
    if (n <= 42) return '6';
    if (n <= 45) return 'opt';
    return 'cap';
  }
  return 'app';
}

function groupByPhase(list) {
  const groups = new Map();
  for (const ph of PHASES) groups.set(ph.key, []);
  for (const c of list) {
    const k = phaseOf(c);
    const arr = groups.get(k);
    if (arr) arr.push(c); else groups.get('app').push(c);
  }
  return groups;
}

// “已完成”= 文件存在且状态为 complete（提纲/缺失不计）
const isComplete = c => c.exists && c.status === 'complete';

// 阶段区间文案。章节编号在大多数阶段是连续的（Ch00–Ch09），但个别选读章会
// 插到别的阶段里（例如 Ch25 终端进阶的 phase 与它的物理目录一致，落在第一阶段），
// 于是编号出现空洞。此时按「连续段」渲染成 Ch00–Ch09、Ch25，比笼统的
// 「共 12 章」有用得多——读者能直接看出这个阶段覆盖哪些章。
function phaseRangeText(ph, list) {
  if (ph.key === 'app') return '附录 A–K';
  if (ph.key === 'cap') return 'Ch46';
  const numbers = list.filter(c => /^Ch\d+/.test(c.name))
    .map(c => +/^Ch(\d+)/.exec(c.name)[1])
    .sort((a, b) => a - b);
  const reviews = list.length - numbers.length;
  const suffix = reviews ? `（含 ${reviews} 复习章）` : '';
  if (!numbers.length) return `共 ${list.length} 章${suffix}`;
  // 把排好序的编号切成连续段：[0..9, 25] → [[0,9],[25,25]]
  const runs = [];
  for (const n of numbers) {
    const last = runs[runs.length - 1];
    if (last && n === last[1] + 1) last[1] = n;
    else runs.push([n, n]);
  }
  const label = runs.map(([a, b]) => {
    const sa = String(a).padStart(2, '0');
    if (a === b) return `Ch${sa}`;
    return `Ch${sa}–Ch${String(b).padStart(2, '0')}`;
  }).join('、');
  return label + suffix;
}

/* ══════════════ 工具函数 ══════════════ */
const escapeHtml = s => String(s).replace(/[&<>"']/g,
  c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const escapeRegex = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/* ══════════════ HTML 净化 ══════════════
   marked 从 v5 起就不再有 sanitize 选项，会把 Markdown 里的原始 HTML 原样
   透传到 innerHTML。本书现在只用 <br> 之类，但正文文件一旦被污染（或将来
   加入任何可写内容），那就是存储型 XSS——能读 DOM、能以读者身份调用 /api/*。

   这里不用正则去「过滤标签」：正则匹配 HTML 的边界情况太多，容易漏。
   改成让浏览器自己解析（DOMParser 解析时不执行脚本、不加载资源），然后
   按白名单遍历节点、逐个摘掉不允许的标签与属性，最后序列化回来。
   不依赖任何第三方库，因此也不存在「CDN 挂了净化就静默失效」的失败模式。 */
const SANITIZE_TAGS = new Set([
  // 结构
  'p', 'div', 'br', 'hr', 'blockquote', 'pre', 'code', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'dl', 'dt', 'dd', 'figure', 'figcaption', 'details', 'summary',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',
  // 行内
  'a', 'img', 'strong', 'em', 'b', 'i', 'u', 's', 'del', 'ins', 'mark', 'small',
  'sub', 'sup', 'kbd', 'abbr', 'cite', 'q', 'time', 'var', 'samp', 'span', 'input',
]);
// input 只为 GFM 任务列表的复选框存在
const SANITIZE_ATTRS = new Set([
  'class', 'id', 'href', 'src', 'alt', 'title', 'colspan', 'rowspan',
  'align', 'start', 'type', 'checked', 'disabled', 'lang', 'dir',
  'datetime', 'cite', 'width', 'height', 'loading', 'decoding',
]);
// 这些标签连同内容一起丢弃（而不是只脱掉标签留下文字）
const SANITIZE_DROP = new Set([
  'script', 'style', 'iframe', 'frame', 'frameset', 'object', 'embed', 'applet',
  'form', 'button', 'select', 'option', 'textarea', 'link', 'meta', 'base',
  'svg', 'math', 'template', 'noscript', 'audio', 'video', 'source', 'track', 'canvas',
]);

function safeUrl(value, isImg) {
  // 返回 null 表示这个 URL 不能用
  const v = String(value || '').trim();
  if (!v) return null;
  // 去掉控制字符与空白：`java\nscript:` 这类绕过靠这一步挡住
  const flat = v.replace(/[\u0000-\u0020\u007f]+/g, '');
  const m = /^([a-zA-Z][a-zA-Z0-9+.\-]*):/.exec(flat);
  if (!m) return v;                                  // 相对路径
  const scheme = m[1].toLowerCase();
  if (scheme === 'http' || scheme === 'https' || scheme === 'mailto') return v;
  // 图片允许位图 data URI；SVG 的 data URI 能带脚本，一律拒绝
  if (isImg && /^data:image\/(png|jpe?g|gif|webp|avif);base64,/i.test(flat)) return v;
  return null;
}

function sanitizeHtml(html) {
  let doc;
  try {
    doc = new DOMParser().parseFromString(String(html), 'text/html');
  } catch (e) {
    return '';                                        // 解析失败就什么都不渲染，不冒险
  }
  const walk = node => {
    // 逆序遍历，children 是活动集合，正序删除会跳节点
    const kids = Array.from(node.children || []);
    for (const el of kids) {
      const tag = el.tagName.toLowerCase();
      if (SANITIZE_DROP.has(tag)) { el.remove(); continue; }
      if (!SANITIZE_TAGS.has(tag)) {
        // 未知标签：保留其文字内容，丢掉标签本身（例如 <custom>文字</custom>）
        const text = doc.createTextNode(el.textContent || '');
        el.replaceWith(text);
        continue;
      }
      for (const attr of Array.from(el.attributes)) {
        const name = attr.name.toLowerCase();
        // 任何 on* 事件属性、style（可用于外带数据）一律删掉
        if (name.startsWith('on') || name === 'style' || name === 'srcdoc' || name === 'formaction') {
          el.removeAttribute(attr.name);
          continue;
        }
        if (!SANITIZE_ATTRS.has(name)) { el.removeAttribute(attr.name); continue; }
        if (name === 'href' || name === 'src') {
          const safe = safeUrl(attr.value, tag === 'img' && name === 'src');
          if (safe === null) el.removeAttribute(attr.name);
          else el.setAttribute(attr.name, safe);
        }
      }
      if (tag === 'input') {
        // 只留 GFM 任务列表的只读复选框
        if ((el.getAttribute('type') || '').toLowerCase() !== 'checkbox') { el.remove(); continue; }
        el.setAttribute('disabled', '');
        el.setAttribute('type', 'checkbox');
      }
      if (tag === 'a') el.removeAttribute('target');   // 避免 reverse tabnabbing
      walk(el);
    }
  };
  walk(doc.body);
  return doc.body.innerHTML;
}

function cdnReady() {
  return typeof marked !== 'undefined' && typeof marked.parse === 'function'
      && typeof katex !== 'undefined' && typeof hljs !== 'undefined';
}

// Mermaid 体积近 1 MB，而全书只有部分章节含图：首次遇到 .mermaid 节点时
// 才拉取并初始化，既不影响首屏，也不会让无图章白下这份依赖。
let mermaidLoader = null;
function ensureMermaid() {
  if (mermaidReady()) return Promise.resolve(true);
  if (!mermaidLoader) {
    mermaidLoader = new Promise(resolve => {
      const el = document.createElement('script');
      el.src = 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js';
      el.async = true;
      el.onload = () => {
        try {
          if (mermaidReady()) {
            mermaid.initialize({
              startOnLoad: false,
              theme: 'dark',
              // 显式写死 strict，不依赖默认值：图内 %%{init:...}%% 指令可以改写配置，
              // 而 mermaid 的保护名单虽默认含 securityLevel，明确指定更稳妥。
              // 不用 sandbox 档是因为它把图放进 iframe，会破坏本文件的
              // viewBox 修正与「适应宽度」按钮（它们要直接读 SVG DOM）。
              securityLevel: 'strict',
            });
          }
          resolve(mermaidReady());
        } catch (e) { resolve(false); }
      };
      el.onerror = () => { mermaidLoader = null; resolve(false); };
      document.head.appendChild(el);
    });
  }
  return mermaidLoader;
}

function mermaidReady() {
  return typeof mermaid !== 'undefined'
      && typeof mermaid.initialize === 'function'
      && typeof mermaid.render === 'function';
}

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) {
    let msg = 'HTTP ' + res.status;
    try { const j = await res.json(); if (j && j.error) msg = j.error; } catch (e) { /* 非 JSON 错误体 */ }
    throw new Error(msg);
  }
  return res.text();
}

/* ══════════════ 启动 ══════════════ */
async function init() {
  showLoading('正在加载章节目录…');
  try {
    const res = await fetch(STATIC_MODE ? './chapters.json' : '/api/chapters');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    chapters = await res.json();
    renderSidebar();
    renderRoadmap();
    updateChapterCount();
    detectServer();

    const fromHash = decodePathFromHash();
    // 账号页允许直接用链接进入；未登录时页面自己会给登录提示
    if (fromHash === 'profile' || fromHash === 'settings') {
      await loadServerProgress();
      showAccountPage(fromHash);
      return;
    }
    if (fromHash && fromHash !== 'roadmap') {
      const known = chapters.find(c => c.path === fromHash && c.exists);
      if (known) { await loadChapter(known.path); return; }
    }
    // 冷启动（无 hash）回到上次读的章节；没有历史则留在路线图
    if (!fromHash) {
      await loadServerProgress();
      const last = lastReadPath();
      if (last) {
        rememberChapterPath(last);
        await loadChapter(last);
        return;
      }
    }
    showRoadmap();
  } catch (e) {
    showError('无法连接到教材服务器',
      '请确认已在项目目录运行 <code>python server.py</code>，然后重试。（' + escapeHtml(e.message) + '）', init);
  }
}

function decodePathFromHash() {
  try { return decodeURIComponent(window.location.hash.slice(1)); }
  catch (e) { return ''; }
}

/* 冷启动续读：记住最后一次打开的章节路径。
   注意这不是「进度」——进度由 scroll 上报，这里只是导航记忆。 */
const LAST_PATH_KEY = 'reader-last-path';

function rememberChapterPath(path) {
  if (!path) return;
  try { localStorage.setItem(LAST_PATH_KEY, path); } catch (e) { /* 忽略 */ }
}

function lastReadPath() {
  let saved = '';
  try { saved = localStorage.getItem(LAST_PATH_KEY) || ''; } catch (e) { saved = ''; }
  if (!saved) return '';
  // 章节可能已被改名或删除，必须校验仍在目录里
  const known = chapters.find(c => c.path === saved && c.exists);
  return known ? known.path : '';
}

/* ══════════════ 侧边栏 ══════════════ */
function chapterBadges(c) {
  const badges = [];
  if (TRACK_LABEL[c.track]) {
    badges.push(`<span class="badge ${TRACK_CLASS[c.track]}">${TRACK_LABEL[c.track]}</span>`);
  }
  if (!c.exists) badges.push('<span class="badge badge-wip">待写</span>');
  else if (c.status === 'outline') badges.push('<span class="badge badge-wip">提纲</span>');
  return badges.join('');
}

function renderSidebar() {
  const groups = groupByPhase(chapters);
  $('chapter-groups').innerHTML = PHASES.map(ph => {
    const list = groups.get(ph.key) || [];
    if (!list.length) return '';
    const done = list.filter(isComplete).length;
    return `<div class="chapter-group collapsed" data-phase="${ph.key}">
      <button type="button" class="group-head" aria-expanded="false">
        <svg class="caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 6l6 6-6 6"/>
        </svg>
        <span class="group-title">${escapeHtml(ph.title)}</span>
        <span class="group-count" title="已完成 / 全部">${done}/${list.length}</span>
      </button>
      <div class="group-body">
        ${list.map(c => {
          const missing = !c.exists;
          return `<button type="button" class="chapter-item${missing ? ' missing' : ''}" data-path="${escapeHtml(c.path)}"${missing ? ' disabled' : ''} role="listitem">
            <span class="ci-name">${escapeHtml(c.name)}</span>${chapterBadges(c)}
          </button>`;
        }).join('')}
      </div>
    </div>`;
  }).join('');
  refreshProgressMarks();
}

// 侧边栏事件委托：加载章节 / 折叠分组 / 切换面板
$('chapter-groups').addEventListener('click', e => {
  const item = e.target.closest('.chapter-item');
  if (item) {
    if (!item.disabled) loadChapter(item.dataset.path);
    return;
  }
  const head = e.target.closest('.group-head');
  if (head) {
    const group = head.closest('.chapter-group');
    const collapsed = group.classList.toggle('collapsed');
    head.setAttribute('aria-expanded', String(!collapsed));
  }
});

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => switchSidebarPanel(btn.dataset.panel));
});

function switchSidebarPanel(panel) {
  document.querySelectorAll('.tab-btn').forEach(b => {
    const on = b.dataset.panel === panel;
    b.classList.toggle('active', on);
    b.setAttribute('aria-selected', String(on));
  });
  $('panel-list').hidden = panel !== 'list';
  $('panel-toc').hidden = panel !== 'toc';
}

// 侧边栏筛选（仅过滤，不请求服务器）
$('filter-input').addEventListener('input', () => {
  const q = $('filter-input').value.trim().toLowerCase();
  let anyVisible = false;
  document.querySelectorAll('.chapter-group').forEach(g => {
    let visible = 0;
    g.querySelectorAll('.chapter-item').forEach(el => {
      const show = !q || el.textContent.toLowerCase().includes(q);
      el.style.display = show ? '' : 'none';
      if (show) visible++;
    });
    g.style.display = visible ? '' : 'none';
    if (visible) anyVisible = true;
  });
  const empty = $('chapter-groups').querySelector('.no-match');
  if (!anyVisible && $('chapter-groups').children.length) {
    if (!empty) {
      const d = document.createElement('div');
      d.className = 'toc-empty no-match';
      d.textContent = '没有匹配的章节';
      $('chapter-groups').appendChild(d);
    }
  } else if (empty) {
    empty.remove();
  }
});

/* ══════════════ 本章目录（TOC） ══════════════ */
function buildToc() {
  const list = [];
  const content = $('content');
  content.querySelectorAll('h2, h3').forEach((h, i) => {
    const id = 'sec-' + i;
    h.id = id;
    list.push({
      el: h,
      id,
      level: h.tagName === 'H2' ? 2 : 3,
      text: headingLabel(h),
    });
  });
  tocHeadings = list;
  const placeholder = $('toc-placeholder'), toc = $('toc-list');
  if (!list.length) {
    placeholder.hidden = true;
    toc.hidden = false;
    toc.innerHTML = '<div class="toc-empty">本章没有二级 / 三级标题</div>';
    return;
  }
  placeholder.hidden = true;
  toc.hidden = false;
  const meta = chapters.find(c => c.path === currentPath);
  toc.innerHTML =
    (meta ? `<div class="toc-chapter">${escapeHtml(meta.name)}</div>` : '') +
    list.map(t => `<button type="button" class="toc-item lv${t.level}" data-id="${t.id}">${escapeHtml(t.text)}</button>`).join('');
}

$('toc-list').addEventListener('click', e => {
  const btn = e.target.closest('.toc-item');
  if (!btn) return;
  const t = tocHeadings.find(h => h.id === btn.dataset.id);
  if (t) {
    t.el.scrollIntoView({ block: 'start' });
    flashSection(t.el);
  }
});

function updateTocSpy() {
  if (!tocHeadings.length || $('content').hidden) return;
  const off = 130;
  let current = null;
  for (const t of tocHeadings) {
    if (t.el.getBoundingClientRect().top <= off) current = t;
    else break;
  }
  const id = current ? current.id : null;
  document.querySelectorAll('.toc-item').forEach(el => {
    el.classList.toggle('active', el.dataset.id === id);
  });
}

/* ══════════════ 章节加载 ══════════════ */
async function loadChapter(path, opts) {
  opts = opts || {};
  // 同一章节重复点击：仅处理滚动需求
  if (currentPath === path && $('content').innerHTML) {
    scrollToSection(opts.section);
    return;
  }
  // 切章前结算上一章的停留时长与阅读位置，并关闭 AI 窗口、清空对话
  if (currentPath && currentPath !== path) {
    rememberSection();
    accumulateSeconds(currentPath);
  }
  if (currentPath !== path) resetAskForChapter();

  currentPath = path;
  rememberChapterPath(path);
  pendingSection = opts.section || null;
  REPORTED_PCT[path] = REPORTED_PCT[path] || pctOf(path);
  chapterEnterAt = Date.now();

  // 更新 URL hash（触发 hashchange，handler 会发现 path 未变而忽略）
  const want = '#' + encodeURIComponent(path);
  if (window.location.hash !== want) window.location.hash = want;

  const gen = ++chapterGen;
  showLoading('正在加载章节…');

  try {
    const md = await fetchText(STATIC_MODE ? './' + path.split('/').map(encodeURIComponent).join('/') : '/api/chapter?path=' + encodeURIComponent(path));
    if (gen !== chapterGen) return; // 已被更新的请求取代
    renderContent(md, path);
    // 不再打开即标记已读：由滚动进度判定（见 reportScrollProgress）
    if (window.innerWidth <= 860) closeSidebar();
  } catch (e) {
    if (gen !== chapterGen) return;
    showError('章节加载失败', escapeHtml(e.message) + '。可点击重试，或尝试其他章节。',
      () => loadChapter(path));
  }
}

window.addEventListener('hashchange', () => {
  const p = decodePathFromHash();
  if (!p || p === 'roadmap') { showRoadmap(); return; }
  if (p === 'profile' || p === 'settings') { showAccountPage(p); return; }
  if (p !== currentPath) {
    const known = chapters.some(c => c.path === p);
    if (known) loadChapter(p);
  }
});

/* ══════════════ 路线图 ══════════════ */
function renderRoadmap() {
  const groups = groupByPhase(chapters);
  $('phase-cards').innerHTML = PHASES.map(ph => {
    const list = groups.get(ph.key) || [];
    if (!list.length) return '';
    const done = list.filter(isComplete).length;
    const pct = Math.round(done / list.length * 100);
    return `<section class="phase-card">
      <header class="phase-head">
        <span class="phase-badge">${ph.no}</span>
        <h2 class="phase-title">${escapeHtml(ph.title)}</h2>
        <span class="phase-range">${escapeHtml(phaseRangeText(ph, list))}</span>
      </header>
      <p class="phase-desc">${escapeHtml(ph.desc)}</p>
      <div class="phase-progress">
        <div class="progress-track" role="progressbar" aria-valuenow="${done}" aria-valuemin="0" aria-valuemax="${list.length}" aria-label="${escapeHtml(ph.title)} 进度">
          <div class="progress-fill" style="width:${pct}%"></div>
        </div>
        <span class="progress-text"><b>${done}</b>/${list.length} 已完成</span>
      </div>
      <div class="phase-chapters">
        ${list.map(c => {
          const missing = !c.exists;
          return `<button type="button" class="chapter-chip${missing ? ' missing' : ''}" data-path="${escapeHtml(c.path)}"${missing ? ' disabled' : ''} title="${escapeHtml(c.name)}">
            <span class="cc-name">${escapeHtml(c.name)}</span>${chapterBadges(c)}
          </button>`;
        }).join('')}
      </div>
    </section>`;
  }).join('');
}

// 路线图点击加载章节（事件委托）
$('phase-cards').addEventListener('click', e => {
  const chip = e.target.closest('.chapter-chip');
  if (chip && !chip.disabled) loadChapter(chip.dataset.path);
});

// 「继续上次的章节」：直接走 hash 路由，和点侧栏章节是同一条路径
$('my-read-continue').addEventListener('click', () => {
  const p = $('my-read-continue').dataset.path;
  if (p) window.location.hash = encodeURIComponent(p);
});

function showRoadmap() {
  // 离开章节：结算停留时长并关闭 AI 窗口（回到路线图也属于「切走」）
  if (currentPath) accumulateSeconds(currentPath);
  resetAskForChapter();
  currentPath = null;
  ACCOUNT_PAGE = null;
  pendingSection = null;
  $('loading').hidden = true;
  $('error').hidden = true;
  $('content').hidden = true;
  $('doc-head').hidden = true;
  $('account-page').hidden = true;
  $('resume-bar').hidden = true;
  RESUME_OFFER = null;
  $('chapter-nav').classList.remove('show');
  $('roadmap').hidden = false;
  tocHeadings = [];
  $('toc-list').hidden = true;
  $('toc-placeholder').hidden = false;
  updateAskFab();
  setActiveChapter(null);
  document.title = '速通笔记 — 学习路线图';
  window.scrollTo(0, 0);
}

$('brand').addEventListener('click', () => {
  if (window.location.hash !== '#roadmap') window.location.hash = 'roadmap';
  else showRoadmap();
});

function updateChapterCount() {
  const total = chapters.length;
  const done = chapters.filter(isComplete).length;
  const outline = chapters.filter(c => c.exists && !isComplete(c)).length;
  // 侧栏底部：正文完成度（提纲章不算完成）
  $('chapter-count').textContent = `正文完成 ${done} / ${total} 章` +
    (outline ? `（另有 ${outline} 章为提纲）` : '');

  // 首页统计按事实渲染。以前固定输出「共 N 章 / 文件就绪 N 章 / 正文完成 N 章」，
  // 三者相同时就是三遍同样的信息；没有缺口时合并成一条，有缺口才把缺口单列。
  const stats = outline
    ? [`共 <b>${total}</b> 章`, `正文完成 <b>${done}</b> 章`, `待补 <b>${outline}</b> 章`]
    : [`共 <b>${total}</b> 章 · 正文全部就绪`];
  $('hero-stats').innerHTML = stats.map(s => `<span>${s}</span>`).join('');

  const pct = total ? Math.round(done / total * 100) : 0;
  $('overall-fill').style.width = pct + '%';
  $('overall-text').textContent = outline
    ? `教材完成 ${pct}%（${outline} 章仍为提纲）`
    : `教材完成 100% · ${total} 章正文均已就绪`;
}

// 「我的阅读进度」：登录后在首页顶部展示，未登录时整块隐藏。
// 分母用「存在正文的章节数」，把待写章节排除在外，否则进度永远到不了 100%。
function updateMyRead() {
  const box = $('my-read');
  if (!box) return;
  if (!ACCOUNT) { box.hidden = true; return; }
  const readable = chapters.filter(c => c.exists);
  const read = readable.filter(c => isRead(c.path)).length;
  const total = readable.length || 1;
  const pct = Math.round(read / total * 100);
  box.hidden = false;
  $('my-read-done').textContent = read;
  $('my-read-total').textContent = readable.length;
  $('my-read-fill').style.width = pct + '%';
  $('my-read-track').setAttribute('aria-valuenow', String(pct));
  // 续读按钮指向最近读过的那一章；没有记录就不显示
  const last = lastReadPath();
  const go = $('my-read-continue');
  if (last) {
    go.hidden = false;
    go.textContent = '继续「' + chapterNameOf(last) + '」→';
    go.dataset.path = last;
  } else {
    go.hidden = true;
    delete go.dataset.path;
  }
}

/* ══════════════ Markdown → HTML 管线 ══════════════
   顺序：围栏代码 → 行内代码 → 块级公式 → 行内公式 → marked → 还原。
   先保护代码块，避免其中的 $ 与 ` 被误判为公式或代码。
   其中 ```mermaid 围栏还原为 <div class="mermaid">（代码经 HTML 转义，
   浏览器解析后 textContent 即原始代码），由 renderMermaid 显式渲染。 */

// 按 CommonMark 规则逐行扫描围栏代码块：开围栏 ≥3 个同字符（` 或 ~），
// 闭围栏为 ≥ 开围栏长度的同字符、且行内只有空白。逐行扫描可以正确处理
// 无语言标注的围栏（``` 单独成行）与连续多个围栏，正则整体匹配做不到。
function extractFences(s) {
  const fences = [];
  const lines = s.split('\n');
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^\s*(`{3,}|~{3,})\s*([^\n]*)$/);
    if (!m) { out.push(lines[i]); continue; }
    const marker = m[1][0];
    const len = m[1].length;
    const info = m[2].trim();
    const closeRe = new RegExp('^\\s*' + marker + '{' + len + ',}\\s*$');
    let close = -1;
    for (let j = i + 1; j < lines.length; j++) {
      if (closeRe.test(lines[j])) { close = j; break; }
    }
    if (close >= 0) {
      fences.push({ info, code: lines.slice(i + 1, close).join('\n') });
      // 占位符两侧加空行：否则会被 marked 与相邻段落合并进同一个 <p>
      out.push('', '⟨⟨⟨FENCE_' + (fences.length - 1) + '⟩⟩⟩', '');
      i = close;
    } else {
      out.push(lines[i]); // 未闭合：原样留给 marked
    }
  }
  return { text: out.join('\n'), fences };
}

function renderMarkdown(md) {
  const math = [], codes = [];
  let s = String(md);

  // 1. 围栏代码块（``` 与 ~~~，逐行扫描）
  const extracted = extractFences(s);
  const fences = extracted.fences;
  s = extracted.text;

  // 2. 行内代码 `...`
  s = s.replace(/`([^`\n]+)`/g, (m, c) => {
    codes.push(c);
    return '⟨⟨⟨CODE_' + (codes.length - 1) + '⟩⟩⟩';
  });

  // 3. 块级公式 $$...$$（占位符两侧加空行，避免与相邻段落合并）
  s = s.replace(/\$\$([\s\S]*?)\$\$/g, (m, f) => {
    math.push({ type: 'display', f });
    return '\n\n⟨⟨⟨MATH_' + (math.length - 1) + '⟩⟩⟩\n\n';
  });
  // 4. 行内公式 $...$（负向断言排除 $$ 与已替换占位符）
  s = s.replace(/(?<!\$)\$(?!\$)([^$\n]+?)\$(?!\$)/g, (m, f) => {
    math.push({ type: 'inline', f });
    return '⟨⟨⟨MATH_' + (math.length - 1) + '⟩⟩⟩';
  });

  // 5. marked 渲染
  let html = marked.parse(s);

  // 5.5 净化：marked 会原样透传 Markdown 里的原始 HTML，必须在这里摘掉
  //     可执行内容。放在这一步是关键——KaTeX、代码块、mermaid 都是之后
  //     才由本文件自己拼进去的可信输出，不该被白名单误伤。
  html = sanitizeHtml(html);

  // 6. 还原公式
  html = html.replace(/⟨⟨⟨MATH_(\d+)⟩⟩⟩/g, (m, i) => renderMath(math[+i]));

  // 7. 还原行内代码（转义后插入）
  html = html.replace(/⟨⟨⟨CODE_(\d+)⟩⟩⟩/g, (m, i) =>
    '<code>' + escapeHtml(codes[+i]) + '</code>');

  // 8. 还原围栏代码块（<p> 包裹的占位符整体替换；孤立占位符兜底）
  //    mermaid → <div class="mermaid">（供 renderMermaid 显式渲染）
  //    其他语言 → <pre><code class="language-…">（供 hljs 高亮）
  const restoreFence = (m, i) => {
    const f = fences[+i];
    if (!f) return m;
    const lang = (f.info.split(/\s+/)[0] || '').toLowerCase();
    if (lang === 'mermaid') {
      return '<div class="mermaid">' + escapeHtml(f.code) + '</div>';
    }
    const cls = lang ? ' class="language-' + escapeHtml(lang) + '"' : '';
    return '<pre><code' + cls + '>' + escapeHtml(f.code) + '</code></pre>';
  };
  html = html.replace(/<p>\s*⟨⟨⟨FENCE_(\d+)⟩⟩⟩\s*<\/p>/g, restoreFence);
  html = html.replace(/⟨⟨⟨FENCE_(\d+)⟩⟩⟩/g, restoreFence);

  return html;
}

function renderMath(m) {
  if (typeof katex === 'undefined') return '<code>' + escapeHtml(m.f) + '</code>';
  try {
    return katex.renderToString(m.f, { displayMode: m.type === 'display', throwOnError: false, strict: false });
  } catch (e) {
    return '<code>' + escapeHtml(m.f) + '</code>';
  }
}

/* ══════════════ 正文渲染 ══════════════ */
function renderContent(md, path) {
  if (!cdnReady()) {
    showError('渲染组件未加载',
      'marked / KaTeX / highlight.js 未能从 CDN 加载，请检查网络后刷新页面。', null);
    return;
  }

  const meta = chapters.find(c => c.path === path) || {};
  const html = renderMarkdown(md);
  const content = $('content');
  content.innerHTML = html;

  // 教材内部 Markdown 链接继续在单页阅读器中打开。
  content.querySelectorAll('a[href]').forEach(link => {
    const href = link.getAttribute('href');
    if (!href || /^(?:https?:|mailto:|#)/i.test(href)) return;
    try {
      const resolved = decodeURIComponent(new URL(href, 'https://textbook.local/' + path).pathname.slice(1));
      const chapterPath = resolved.split('#')[0];
      if (!chapters.some(c => c.path === chapterPath)) return;
      link.href = '#' + encodeURIComponent(chapterPath);
      link.addEventListener('click', event => {
        event.preventDefault();
        loadChapter(chapterPath);
      });
    } catch (e) { /* 保留普通链接 */ }
  });

  // 表格包裹（窄屏横向滚动）
  content.querySelectorAll('table').forEach(t => {
    const w = document.createElement('div');
    w.className = 'table-wrap';
    t.replaceWith(w);
    w.appendChild(t);
  });

  // 代码高亮 —— 即使没有标注语言也尝试自动检测
  content.querySelectorAll('pre code').forEach(block => {
    try {
      const hasLang = block.className.includes('language-') && block.className !== 'language-';
      if (hasLang) {
        hljs.highlightElement(block);
      } else {
        hljs.highlightAuto(block.textContent);
        block.classList.add('hljs');
      }
    } catch (e) { /* keep original */ }
  });

  // 复制按钮
  addCopyButtons(content);

  // Mermaid 图：显式渲染（异步，不阻塞正文展示）
  renderMermaid(content);

  // 本章目录（H2/H3）
  buildToc();
  setupSelfCheck();
  setupAskButtons();

  // 侧边栏高亮当前章节（列表与路线图 chips）
  setActiveChapter(path);

  // 章节头部信息
  $('doc-head').hidden = false;
  const badges = [];
  if (TRACK_LABEL[meta.track]) {
    badges.push(`<span class="badge ${TRACK_CLASS[meta.track]}">${TRACK_LABEL[meta.track]}</span>`);
  }
  if (meta.status === 'outline') badges.push('<span class="badge badge-wip">提纲</span>');
  $('page-chapter').innerHTML = escapeHtml(meta.name || '') + badges.join('');
  $('page-path').textContent = path;

  // 上一章 / 下一章
  updatePrevNext();
  document.title = (meta.name || '') + ' — 速通笔记';

  showContent();

  // 滚动定位：显式指定小节 > 上次读到的位置 > 章首
  const sec = pendingSection;
  pendingSection = null;
  if (sec) {
    scrollToSection(sec);
  } else {
    const key = LAST_SECTION[path];
    if (!key || !scrollToKey(key)) window.scrollTo(0, 0);
  }
  // 无论是否自动恢复都给出提示条：恢复成功时它告诉读者「你落在哪一节、
  // 可以一键回章首」，恢复失败时它就是入口。章首附近与低进度章不显示。
  updateResumeBar();
  // 书签要等 DOM 与 tocHeadings 都就绪后再拉，否则星标找不到对应标题
  loadBookmarks(path);
}

function setActiveChapter(path) {
  document.querySelectorAll('.chapter-item, .chapter-chip').forEach(el => {
    const active = el.dataset.path === path;
    el.classList.toggle('active', active);
    if (active) el.setAttribute('aria-current', 'true');
    else el.removeAttribute('aria-current');
  });
  const active = document.querySelector('.chapter-item.active');
  if (active) {
    const group = active.closest('.chapter-group');
    if (group) {
      group.classList.remove('collapsed');
      group.querySelector('.group-head')?.setAttribute('aria-expanded', 'true');
    }
    active.scrollIntoView({ block: 'nearest' });
  }
}

/* ── Mermaid：每个图显式渲染 ──
   对容器内每个未处理的 <div class="mermaid">：
   1. 取 textContent（即还原后的原始 mermaid 源码）
   2. mermaid.render(id, text) 显式渲染，成功后用返回的 SVG 替换内容
   3. 失败则回退为等宽 <pre>，保留源码并注明原因（可复制排查） */
function failMermaid(node, err) {
  node.dataset.failed = 'true';
  const pre = document.createElement('pre');
  pre.className = 'mermaid-fallback';
  const code = document.createElement('code');
  code.textContent = node.textContent.trim();
  pre.appendChild(code);
  const note = document.createElement('div');
  note.className = 'mermaid-error';
  note.textContent = '（图渲染失败' + (err ? '：' + err : '') + '，上方为原始代码）';
  pre.appendChild(note);
  node.replaceWith(pre);
}

// Mermaid 10 在含中文、<br> 和 subgraph 的图中偶尔会低估 viewBox，
// 元素虽已排版却落在 SVG 画布外（7.3.4 的“容器级”就是这个情况）。
// 用浏览器最终排版后的真实边界反推 SVG 坐标，扩展画布而不是缩放内容。
function repairMermaidViewBox(svgEl) {
  const vb = svgEl.viewBox && svgEl.viewBox.baseVal;
  const svgRect = svgEl.getBoundingClientRect();
  if (!vb || !vb.width || !vb.height || !svgRect.width || !svgRect.height) return null;

  const parts = [...svgEl.querySelectorAll('g, path, rect, polygon, circle, ellipse, line, text, foreignObject')];
  let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
  for (const part of parts) {
    const r = part.getBoundingClientRect();
    if (!r.width && !r.height) continue;
    if (![r.left, r.top, r.right, r.bottom].every(Number.isFinite)) continue;
    left = Math.min(left, r.left);
    top = Math.min(top, r.top);
    right = Math.max(right, r.right);
    bottom = Math.max(bottom, r.bottom);
  }
  if (!Number.isFinite(left) || right <= left || bottom <= top) return null;

  const padPx = 18;
  const scaleX = vb.width / svgRect.width;
  const scaleY = vb.height / svgRect.height;
  const contentLeft = vb.x + (left - svgRect.left - padPx) * scaleX;
  const contentTop = vb.y + (top - svgRect.top - padPx) * scaleY;
  const contentRight = vb.x + (right - svgRect.left + padPx) * scaleX;
  const contentBottom = vb.y + (bottom - svgRect.top + padPx) * scaleY;
  const nextLeft = Math.min(vb.x, contentLeft);
  const nextTop = Math.min(vb.y, contentTop);
  const nextRight = Math.max(vb.x + vb.width, contentRight);
  const nextBottom = Math.max(vb.y + vb.height, contentBottom);
  const next = {
    x: nextLeft,
    y: nextTop,
    width: nextRight - nextLeft,
    height: nextBottom - nextTop,
  };
  svgEl.setAttribute('viewBox', `${next.x} ${next.y} ${next.width} ${next.height}`);
  return next;
}

// Mermaid 的 %%{ init: {...} }%% 指令能改写渲染配置。书里没用这种写法，
// 也就不必留着这个「图能改渲染器行为」的入口，渲染前直接去掉。
function stripMermaidDirectives(src) {
  return String(src || '')
    .replace(/%%\s*\{[\s\S]*?\}\s*%%/g, '')
    .trim();
}

// 给可能永不落地的 promise 加超时：等不到就当等到了，继续往下走。
// 主要用于 requestAnimationFrame 与 document.fonts.ready —— 在后台标签页
// 或被节流的页面里，它们可能一直不触发。
function withTimeout(promise, ms) {
  if (!promise || typeof promise.then !== 'function') return Promise.resolve();
  return new Promise(resolve => {
    let settled = false;
    const done = () => { if (!settled) { settled = true; resolve(); } };
    setTimeout(done, ms);
    promise.then(done, done);
  });
}

// 等两帧（让浏览器完成一次布局）。rAF 不触发时由 setTimeout 兜底。
function nextFrame(ms) {
  return new Promise(resolve => {
    let settled = false;
    const done = () => { if (!settled) { settled = true; resolve(); } };
    const timer = setTimeout(done, ms);
    if (typeof requestAnimationFrame !== 'function') { clearTimeout(timer); done(); return; }
    requestAnimationFrame(() => requestAnimationFrame(() => { clearTimeout(timer); done(); }));
  });
}

async function renderMermaid(container) {
  const nodes = [...container.querySelectorAll('.mermaid')]
    .filter(n => !n.dataset.processed && !n.dataset.failed);
  if (!nodes.length) return;

  if (!mermaidReady()) {
    const ok = await ensureMermaid();
    if (!ok) {
      nodes.forEach(n => failMermaid(n, 'Mermaid 组件加载失败（检查网络后刷新重试）'));
      return;
    }
  }

  for (const node of nodes) {
    const raw = stripMermaidDirectives((node.textContent || '').trim());
    if (!raw) { failMermaid(node, '图为空'); continue; }
    try {
      const id = 'mmd-' + (++mermaidCounter);
      const { svg, bindFunctions } = await mermaid.render(id, raw);
      // 最后一道闸：mermaid 已按 strict 档渲染，但它的输出马上要进 innerHTML，
      // 所以在插入前再确认一遍没有可执行内容。
      //
      // 注意不能一刀切禁 foreignObject：mermaid 用它在图里放 HTML 标签，
      // 本书大量用 `<br/>` 换行，禁掉会让一大半流程图退回显示源码。
      // 真正会执行的是下面这几类——经 innerHTML 插入的 <script> 本身不会运行，
      // 能运行的只有事件属性、javascript: URL 和 iframe。
      const danger = /<\s*(script|iframe|object|embed|base|meta)\b|\son[a-z]+\s*=|\bjavascript\s*:|\battributeName\s*=\s*["']?on/i;
      if (danger.test(svg)) {
        failMermaid(node, '图中含有不安全内容，已改为显示源码');
        continue;
      }
      node.innerHTML = '<div class="mermaid-toolbar"><span class="mermaid-size-label"></span><button type="button" class="mermaid-fit-btn" aria-pressed="false">适应宽度</button></div><div class="mermaid-viewport">' + svg + '</div>';
      node.dataset.processed = 'true';
      // Mermaid 的 inline max-width 会把复杂图压到不可读；按 viewBox 恢复真实宽度。
      const svgEl = node.querySelector('svg');
      if (svgEl) {
        svgEl.style.maxHeight = 'none';
        svgEl.style.maxWidth = 'none';
        svgEl.style.height = 'auto';
        svgEl.removeAttribute('height');

        // 先按 Mermaid 原始宽度挂载，等浏览器完成文字排版后再修正画布。
        const initialViewBox = svgEl.viewBox && svgEl.viewBox.baseVal;
        svgEl.style.width = Math.ceil(initialViewBox && initialViewBox.width ? initialViewBox.width : 720) + 'px';
        // 等排版完成再量尺寸。两个 await 都带超时兜底：
        // requestAnimationFrame 在后台标签页/被节流的页面里可能永远不触发，
        // 直接 await 会把整个渲染循环挂死——后面的图一张都出不来。
        await withTimeout(document.fonts && document.fonts.ready, 800);
        await nextFrame(400);
        const repaired = repairMermaidViewBox(svgEl);
        const finalViewBox = repaired || (svgEl.viewBox && svgEl.viewBox.baseVal);
        const naturalWidth = Math.ceil(finalViewBox && finalViewBox.width ? finalViewBox.width : 720);
        const naturalHeight = Math.ceil(finalViewBox && finalViewBox.height ? finalViewBox.height : 400);
        svgEl.style.width = naturalWidth + 'px';

        const label = node.querySelector('.mermaid-size-label');
        const button = node.querySelector('.mermaid-fit-btn');
        label.textContent = naturalWidth + ' × ' + naturalHeight;
        button.addEventListener('click', () => {
          const fit = node.dataset.fit !== 'true';
          node.dataset.fit = String(fit);
          button.textContent = fit ? '原始尺寸' : '适应宽度';
          button.setAttribute('aria-pressed', String(fit));
        });
      }
      if (typeof bindFunctions === 'function') bindFunctions(node);
    } catch (e) {
      failMermaid(node, e && e.message);
    }
  }
  updateTocSpy();
}

/* ══════════════ 章节导航 / 滚动定位 ══════════════ */
function updatePrevNext() {
  const idx = chapters.findIndex(c => c.path === currentPath);
  const nav = $('chapter-nav');
  const prevBtn = $('prev-btn'), nextBtn = $('next-btn');
  if (idx < 0) { nav.classList.remove('show'); return; }

  let prev = null, next = null;
  for (let i = idx - 1; i >= 0 && !prev; i--) if (chapters[i].exists) prev = chapters[i];
  for (let i = idx + 1; i < chapters.length && !next; i++) if (chapters[i].exists) next = chapters[i];

  prevBtn.disabled = !prev;
  nextBtn.disabled = !next;
  $('prev-name').textContent = prev ? prev.name : '';
  $('next-name').textContent = next ? next.name : '';
  prevBtn.onclick = () => prev && loadChapter(prev.path);
  nextBtn.onclick = () => next && loadChapter(next.path);
  nav.classList.add('show');
}

// 标题签名：只保留中文、数字与小数点。服务端返回的小节名含 LaTeX
// （如 $\rm \S \, 3.4$），而渲染后标题文本是 KaTeX 输出（§ 3.4），
// 两边都做同样的归一化后才能可靠匹配。
function headingSig(s) {
  return s.replace(/\$[^$]*\$/g, ' ')
          .replace(/[^一-鿿0-9.·％%]/g, '')
          .toLowerCase();
}

function flashSection(el) {
  el.classList.remove('section-flash');
  void el.offsetWidth; // 重置动画
  el.classList.add('section-flash');
  setTimeout(() => el.classList.remove('section-flash'), 2200);
}

function scrollToSection(name) {
  if (!name) return;
  const targetSig = headingSig(name);
  const heads = document.querySelectorAll('#content h1, #content h2, #content h3, #content h4');
  let best = null, bestScore = 0;
  heads.forEach(h => {
    const t = h.textContent.replace(/\s+/g, ' ').trim();
    let score = 0;
    if (t === name) score = 4;
    else if (t.startsWith(name)) score = 3;
    else if (name.startsWith(t)) score = 2;
    else if (targetSig) {
      const sig = headingSig(t);
      if (sig === targetSig) score = 3;
      else if (sig.startsWith(targetSig) || targetSig.startsWith(sig)) score = 2;
      else if (sig.includes(targetSig)) score = 1;
    }
    if (score > bestScore) { bestScore = score; best = h; }
  });
  if (best) {
    best.scrollIntoView({ block: 'start' });
    flashSection(best);
  } else {
    window.scrollTo(0, 0);
  }
}

/* ══════════════ 复制按钮 ══════════════ */
function addCopyButtons(container) {
  container.querySelectorAll('pre').forEach(pre => {
    if (pre.querySelector('.copy-btn')) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'copy-btn';
    btn.textContent = '复制';
    btn.setAttribute('aria-label', '复制代码');
    btn.addEventListener('click', () => {
      const codeEl = pre.querySelector('code');
      const text = codeEl ? codeEl.textContent : pre.textContent;
      copyText(text, btn);
    });
    pre.appendChild(btn);
  });
}

function copyText(text, btn) {
  const done = () => {
    btn.textContent = '已复制';
    setTimeout(() => { btn.textContent = '复制'; }, 1500);
  };
  const fallback = () => {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { /* 忽略 */ }
    ta.remove();
  };
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(done, fallback);
  } else {
    fallback();
  }
}

/* ══════════════ 全文搜索 ══════════════ */
const searchFull = $('search-full');
const resultsEl = $('search-results');
const statusEl = $('search-status');
let searchResultsData = [];

// 一次搜索的调度状态：进度文案与早停提示都要知道「扫到哪了」
let searchProgress = null;

async function loadSearchManifest() {
  if (searchManifest) return searchManifest;
  const res = await fetch('./search-manifest.json');
  if (!res.ok) throw new Error('搜索目录加载失败（HTTP ' + res.status + '）');
  searchManifest = await res.json();
  return searchManifest;
}

// 分片按需加载并缓存。缓存里存的是 Promise 而不是结果：并发搜索/渐进加载
// 同一片时只有第一次真的发请求，后续拿到同一个 Promise。
function loadShard(i) {
  if (!shardCache[i]) {
    shardCache[i] = fetch('./search/' + i + '.json')
      .then(res => {
        if (!res.ok) throw new Error('搜索分片加载失败（HTTP ' + res.status + '）');
        return res.json();
      })
      .catch(err => { delete shardCache[i]; throw err; });  // 失败不缓存，下次还能重试
  }
  return shardCache[i];
}

// 把正文里的关键词命中转成结果条目。切片范围 [from, to) 只覆盖容器（章或节）自身的
// 正文，这样留白处的上下文不会串到相邻标题上，和逐章扫描的旧行为一致。
function collectStaticHits(doc, from, to, needle, q, results) {
  const content = doc.content || '';
  const lower = content.toLocaleLowerCase();
  let at = lower.indexOf(needle, from);
  while (at >= 0 && at < to && results.length < STATIC_RESULT_LIMIT) {
    const before = content.slice(0, at);
    // 只认「行内没有其他 #」的标题行：代码块里以 # 开头的 Shell/C 注释（如
    // `# 安装依赖`）不是小节名，混进来会显示成假的小节标题。与 build-pages.py
    // 跳过围栏的效果一致，但这里用一次正则扫描完成，不必维护围栏状态机。
    const headings = before.match(/^#{1,4}\s+[^#\n].*$/gm);
    const section = headings ? headings[headings.length - 1].replace(/^#+\s*/, '').trim() : '章首';
    // 保留原始换行交给 cleanSearchText 处理（行首标记要在压平空白之前才认得出）
    const snippet = content.slice(Math.max(0, at - 80), Math.min(content.length, at + q.length + 80));
    results.push({
      chapter: doc.chapter,
      path: doc.path,
      section: section.slice(0, 60),
      line: before.split('\n').length,
      snippet,
      score: snippet.toLocaleLowerCase().split(needle).length - 1,
    });
    at = lower.indexOf(needle, at + Math.max(1, q.length));
  }
}

// 标题命中（manifest 的 sections）：标题权重最高，因此直接作为结果返回，
// 不必下载任何正文。行号用 manifest 里的 n，点击即跳到该小节。
function staticTitleHits(q, results) {
  const needle = q.toLocaleLowerCase();
  const titleResults = [];
  for (const chap of searchManifest.chapters) {
    // sections 是 [标题, 行号] 紧凑数组（见 build-pages.py 的体积取舍）
    for (const s of chap.sections || []) {
      if (s[0].toLocaleLowerCase().includes(needle)) {
        titleResults.push({
          chapter: chap.chapter,
          path: chap.path,
          section: s[0],
          line: s[1],
          snippet: '标题匹配：' + s[0],
          score: 100,
          _title: true,
        });
      }
    }
  }
  return titleResults.concat(results);
}

// 分片排序：manifest 的 terms 是每片的正文术语表（{词: 出现次数}），
// 命中次数越多说明该片越可能含有这个关键词；标题命中额外加权。
function rankShardsByManifest(q) {
  const needle = q.toLocaleLowerCase();
  const weight = new Array(STATIC_SHARD_COUNT).fill(0);
  for (let i = 0; i < STATIC_SHARD_COUNT; i++) {
    const table = searchManifest.terms && searchManifest.terms[i];
    if (table && table[needle]) weight[i] += table[needle];
  }
  for (const chap of searchManifest.chapters) {
    const k = chap.shard;
    if (typeof k !== 'number' || k < 0 || k >= STATIC_SHARD_COUNT) continue;
    if (chap.chapter.toLocaleLowerCase().includes(needle)) weight[k] += 5;
    for (const s of chap.sections || []) {
      if (s[0].toLocaleLowerCase().includes(needle)) weight[k] += 10;
    }
  }
  // 得分高者优先；全 0（关键词只在正文低频出现）时保持 0,1,… 的自然顺序
  return weight.map((w, i) => ({ i, w }))
    .sort((a, b) => b.w - a.w || a.i - b.i)
    .map(x => x.i);
}

async function searchStatic(q) {
  await loadSearchManifest();
  const needle = q.toLocaleLowerCase();
  const manifest = searchManifest;
  const pathToIndex = Object.create(null);
  manifest.chapters.forEach((c, i) => { pathToIndex[c.path] = i; });

  // ① 元数据（标题）匹配：零正文下载就能出结果
  let results = staticTitleHits(q, []);

  // ② 正文匹配：先只碰最可能的 2 片
  const order = rankShardsByManifest(q);
  const preferred = order.slice(0, 2);
  for (const i of preferred) {
    if (results.length >= STATIC_RESULT_LIMIT) break;
    const shard = await loadShard(i);
    for (const doc of shard) collectStaticHits(doc, 0, (doc.content || '').length, needle, q, results);
  }
  if (searchProgress) searchProgress.scanned = preferred.length;

  // ③ 渐进加载：不足 8 条才继续，一次一片，边拉边把新结果并进列表
  if (results.length < STATIC_ENOUGH) {
    for (const i of order.slice(2, 2 + STATIC_MAX_SHARDS)) {
      if (results.length >= STATIC_RESULT_LIMIT) break;
      const shard = await loadShard(i);
      for (const doc of shard) collectStaticHits(doc, 0, (doc.content || '').length, needle, q, results);
      if (searchProgress) searchProgress.scanned++;
      if (searchProgress && searchProgress.onPartial) {
        searchProgress.onPartial(results.slice(0, STATIC_RESULT_LIMIT).sort(byScoreThenPosition(pathToIndex)));
      }
    }
  }
  results.sort(byScoreThenPosition(pathToIndex));
  if (searchProgress) searchProgress.total = STATIC_SHARD_COUNT;
  return results.slice(0, STATIC_RESULT_LIMIT);
}

// 结果排序：标题命中排前（score 100），其余沿用旧逻辑按 score 降序。
// score 相同时按 manifest / 分片里的原始章节顺序排，保证结果可复现、
// 也尽量贴近旧实现「按章节顺序线性扫描」的观感。
function byScoreThenPosition(pathToIndex) {
  return (a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (pathToIndex[a.path] || 0) - (pathToIndex[b.path] || 0);
  };
}

searchFull.addEventListener('input', () => {
  $('search-clear').hidden = !searchFull.value;
  clearTimeout(searchTimer);
  searchTimer = setTimeout(doSearch, 250);
});

async function doSearch() {
  const q = searchFull.value.trim();
  if (q.length < 2) {
    clearSearchResults();
    return;
  }
  statusEl.textContent = '正在搜索「' + q + '」…';
  const gen = ++searchGen;
  try {
    if (STATIC_MODE) {
      // 分片是逐个下载的：把进度写回状态栏，用户才知道是在加载而不是卡死。
      // 渐进加载时每拉完一片就重渲染一次，结果看起来是「边搜边冒出来」的。
      searchProgress = {
        scanned: 0,
        total: STATIC_SHARD_COUNT,
        onPartial: partial => {
          if (gen !== searchGen) return;
          renderResults(partial, q, { streaming: true });
        },
      };
      let results;
      try {
        results = await searchStatic(q);
      } finally {
        searchProgress = null;
      }
      if (gen !== searchGen) return;
      renderResults(results, q);
      return;
    }
    const res = await fetch('/api/search?q=' + encodeURIComponent(q));
    if (!res.ok) {
      let msg = 'HTTP ' + res.status;
      try { const j = await res.json(); if (j && j.error) msg = j.error; } catch (e) { /* 忽略 */ }
      throw new Error(msg);
    }
    const results = await res.json();
    if (gen !== searchGen) return;
    renderResults(results, q);
  } catch (e) {
    if (gen !== searchGen) return;
    statusEl.textContent = '搜索失败：' + e.message;
    resultsEl.hidden = true;
    resultsEl.innerHTML = '';
  }
}

function renderResults(results, q, opts) {
  searchResultsData = results;
  resultsEl.hidden = false;
  if (!results.length) {
    statusEl.textContent = opts && opts.streaming
      ? '正在搜索…（已扫描 ' + searchProgress.scanned + '/' + searchProgress.total + ' 段）'
      : '';
    if (!(opts && opts.streaming)) {
      resultsEl.innerHTML = `<div class="search-empty">没有找到与「${escapeHtml(q)}」匹配的内容<br>试试更短的关键词或换个术语。</div>`;
    }
    return;
  }
  // 结果数正好顶到上限时说明是「显示前 N 条」而不是「一共就 N 条」，
  // 否则读者会以为全书只有这么多处提及。
  const capped = results.length >= STATIC_RESULT_LIMIT;
  statusEl.textContent = capped
    ? '匹配较多，显示前 ' + STATIC_RESULT_LIMIT + ' 条'
    : '找到 ' + results.length + ' 处匹配';
  // 早停提示：分片没扫完就攒够结果时说明白，同时告诉用户缩小范围的办法
  if (searchProgress && !opts) {
    if (searchProgress.scanned < searchProgress.total) {
      statusEl.textContent += '（已扫描 ' + searchProgress.scanned + '/' + searchProgress.total
        + ' 段，继续输入更精确的关键词可缩小范围）';
    }
  } else if (searchProgress) {
    statusEl.textContent = '正在搜索…（已扫描 ' + searchProgress.scanned + '/' + searchProgress.total + ' 段，已找到 ' + results.length + ' 处）';
  }
  resultsEl.innerHTML = results.map((r, i) => `
    <button type="button" class="search-result" data-index="${i}">
      <div class="sr-head">
        <span class="sr-chapter">${escapeHtml(r.chapter)}</span>
        <span class="sr-line">第 ${r.line} 行</span>
      </div>
      <div class="sr-section">${escapeHtml(cleanSearchText(r.section))}</div>
      <div class="sr-snippet">${highlightSnippet(cleanSearchText(r.snippet), q)}</div>
    </button>
  `).join('');
}

function highlightSnippet(text, q) {
  const escaped = escapeHtml(text);
  return escaped.replace(new RegExp('(' + escapeRegex(q) + ')', 'gi'), '<mark>$1</mark>');
}

resultsEl.addEventListener('click', e => {
  const btn = e.target.closest('.search-result');
  if (!btn) return;
  document.querySelectorAll('.search-result').forEach(el => el.classList.remove('active'));
  btn.classList.add('active');
  const r = searchResultsData[+btn.dataset.index];
  if (r) loadChapter(r.path, { section: r.section });
});

$('search-clear').addEventListener('click', () => {
  searchFull.value = '';
  $('search-clear').hidden = true;
  clearSearchResults();
  searchFull.focus();
});

function clearSearchResults() {
  clearTimeout(searchTimer);
  searchProgress = null;
  statusEl.textContent = '';
  resultsEl.hidden = true;
  resultsEl.innerHTML = '';
  searchResultsData = [];
}

/* ══════════════ 加载 / 错误 / 内容 状态切换 ══════════════ */
function showLoading(text) {
  $('loading').hidden = false;
  $('error').hidden = true;
  $('content').hidden = true;
  $('roadmap').hidden = true;
  $('chapter-nav').classList.remove('show');
  if (text) $('loading-text').textContent = text;
}
function showError(title, detail, onRetry) {
  $('loading').hidden = true;
  $('error').hidden = false;
  $('content').hidden = true;
  $('roadmap').hidden = true;
  $('chapter-nav').classList.remove('show');
  $('error-title').textContent = title;
  $('error-text').innerHTML = detail || '';
  const btn = $('retry-btn');
  btn.hidden = !onRetry;
  btn.onclick = onRetry || null;
}
function showContent() {
  $('loading').hidden = true;
  $('error').hidden = true;
  $('roadmap').hidden = true;
  $('account-page').hidden = true;
  ACCOUNT_PAGE = null;
  $('content').hidden = false;
}

/* ══════════════ 移动端侧边栏 ══════════════ */
function toggleSidebar() {
  const open = $('sidebar').classList.toggle('open');
  $('overlay').classList.toggle('show', open);
  $('menu-toggle').setAttribute('aria-expanded', String(open));
  // 抽屉打开时工具条要让到它下面（见 CSS 的 body.drawer-open）
  document.body.classList.toggle('drawer-open', open);
}
function closeSidebar() {
  $('sidebar').classList.remove('open');
  $('overlay').classList.remove('show');
  $('menu-toggle').setAttribute('aria-expanded', 'false');
  document.body.classList.remove('drawer-open');
}
$('menu-toggle').addEventListener('click', toggleSidebar);
$('overlay').addEventListener('click', closeSidebar);

/* ══════════════ 键盘快捷键 ══════════════ */
document.addEventListener('keydown', e => {
  const typing = e.target.closest && e.target.closest('input, textarea, select, [contenteditable="true"]');

  // Ctrl+K / Cmd+K：聚焦全文搜索
  if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
    e.preventDefault();
    searchFull.focus();
    searchFull.select();
    return;
  }

  // Escape：优先清除搜索，其次关闭移动端目录
  if (e.key === 'Escape') {
    if (!resultsEl.hidden || searchFull.value) {
      searchFull.value = '';
      $('search-clear').hidden = true;
      clearSearchResults();
    } else if ($('sidebar').classList.contains('open')) {
      closeSidebar();
    } else {
      searchFull.blur();
    }
    return;
  }

  // 上下方向键：切换上一章 / 下一章（输入时除外）
  if (typing) return;
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    const idx = chapters.findIndex(c => c.path === currentPath);
    if (idx < 0) return;
    const step = e.key === 'ArrowDown' ? 1 : -1;
    for (let i = idx + step; i >= 0 && i < chapters.length; i += step) {
      if (chapters[i].exists) { loadChapter(chapters[i].path); break; }
    }
  }
});

/* ══════════════ 滚动：阅读进度 + 目录高亮 + 小节同步 ══════════════ */
// 滚动回调本身要轻：页面进度条与目录高亮每帧更新，进度上报/小节同步
// 走 300ms 节流（进度上报内部还会再判「是否比已上报值大 ≥5 点」）。
let scrollThrottle = 0;
window.addEventListener('scroll', () => {
  const doc = document.documentElement;
  const max = doc.scrollHeight - doc.clientHeight;
  const pct = max > 0 ? (doc.scrollTop / max) * 100 : 0;
  $('progress-bar').style.width = pct + '%';
  updateTocSpy();

  const now = Date.now();
  if (now - scrollThrottle < 300) return;
  scrollThrottle = now;
  reportScrollProgress();
  syncAskSection();
  rememberSection();
}, { passive: true });


/* ══════════════ 标题取名：去掉 KaTeX 隐藏副本 ══════════════ */
// 标题里的公式由 KaTeX 渲染成两份：可见的 .katex-html 和 1px 隐藏的
// .katex-mathml（其中 <annotation> 保存原始 LaTeX 源码）。直接取 textContent
// 会把 "\rm \S \, 2.1" 这类源码混进目录，所以克隆节点后先删掉隐藏副本。
function headingLabel(h) {
  const clone = h.cloneNode(true);
  clone.querySelectorAll('.katex-mathml, annotation').forEach(n => n.remove());
  return clone.textContent.replace(/\s+/g, ' ').trim();
}

/* ══════════════ 搜索文本清洗 ══════════════ */
// 搜索索引是原始 Markdown：片段里会露出 "###"、"**"、"$\rm \S \, 1.3.4$"。
// 这里把它们还原成读者能看懂的写法。
function cleanSearchText(input) {
  return String(input == null ? '' : input)
    .replace(/\$\\rm\s*\\S\s*\\,\s*([\dA-Za-z.]+)\$/g, '§ $1')
    .replace(/\$\\rm\s*Chapter\s*\\,\s*([\dA-Za-z]+)\$/g, '第 $1 章')
    .replace(/\$\\rm\s*Appendix\s*\\,\s*([A-Za-z]+)\$/g, '附录 $1')
    .replace(/\$([^$\n]+)\$/g, '$1')
    // 图片与链接：索引存的是原始 Markdown，片段里会露出 [文字](路径) 与 ![]()
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    // 片段边界截断造成的半个链接语法（有前半没后半，或反之）
    .replace(/\[([^\]]*)$/g, '$1')
    .replace(/^\s*\]\([^)]*\)/g, '')
    // 行内 HTML（教材里偶有 <br>、<sub> 之类）
    .replace(/<\/?[A-Za-z][^>]*>/g, '')
    .replace(/`{1,3}([^`]*)`{1,3}/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*\*/g, '')  // 片段边界截断造成的孤立加粗标记
    .replace(/^\s{0,3}#{1,6}\s*/gm, '')
    .replace(/^\s{0,3}[>\-*+]\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/* ══════════════ 章首自检清单：点击标记已掌握 ══════════════ */
// 只改阅读器内的显示状态，不动正文文件；勾选结果按章节存 localStorage。
function setupSelfCheck() {
  const content = $('content');
  const items = content.querySelectorAll('blockquote ul li');
  if (!items.length) return;
  const key = 'selfcheck:' + (currentPath || '');
  let saved = [];
  try { saved = JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) { saved = []; }
  const set = new Set(Array.isArray(saved) ? saved : []);

  items.forEach((li, i) => {
    const text = li.textContent.trim();
    if (text.charAt(0) !== '□') return;          // 仅"□ 前置项"可勾选
    li.classList.add('checkable');
    li.setAttribute('role', 'checkbox');
    const paint = on => {
      li.textContent = (on ? '✓ ' : '□ ') + text.slice(1).trim();
      li.classList.toggle('checked', on);
      li.setAttribute('aria-checked', String(on));
    };
    paint(set.has(i));
    li.addEventListener('click', () => {
      const on = !set.has(i);
      if (on) set.add(i); else set.delete(i);
      paint(on);
      try { localStorage.setItem(key, JSON.stringify([...set])); } catch (e) { /* 存储不可用时忽略 */ }
      saveChecksToServer(currentPath, [...set]);
    });
  });
}

/* ══════════════ 主题：深色 / 浅色 ══════════════ */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme === 'light' ? 'light' : 'dark');
}
function initTheme() {
  let saved = null;
  try { saved = localStorage.getItem('reader-theme'); } catch (e) { saved = null; }
  const prefersLight = window.matchMedia
    && window.matchMedia('(prefers-color-scheme: light)').matches;
  applyTheme(saved || (prefersLight ? 'light' : 'dark'));
}
const themeToggle = $('theme-toggle');
if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    applyTheme(next);
    try { localStorage.setItem('reader-theme', next); } catch (e) { /* 忽略 */ }
  });
}
initTheme();

/* ══════════════ 账号 · 进度 · 问 AI（服务器版功能） ══════════════ */
// 仅当页面同源存在 api/health 时启用；GitHub Pages 静态版探测失败，
// 入口由 body.no-server 隐藏，阅读/搜索/主题等原有功能不受影响。
const API_BASE = 'api';
let SERVER_MODE = false;
let ACCOUNT = null;          // {username, role, has_key, key_hint, stats, quota}
let SERVER_PROGRESS = {};    // {path: {state, checks, progress_pct, seconds}}
let AUTH_MODE = 'login';     // login | register | password
let ASK_SECTION = null;      // {id, title} —— 仅用于「下一条提问」的上下文
let ASK_BUSY = false;
let ASK_OPEN = false;        // 聊天窗口是否可见（关闭时不切章也要保留对话视图）
const ASK_HISTORY_CACHE = {}; // {path: [{question, answer, created_at}]}，本次会话内的对话缓存
const CHECK_SAVE_DELAY = 700;
const checkTimers = new Map();

/* —— 阅读进度：内存态与本地态 ——
   服务端 progress_pct / seconds 取历史最大值，因此客户端只需上报增量；
   未登录时写 localStorage（键 progress:<path>），登录后再补传。 */
const LOCAL_PROGRESS_KEY = p => 'progress:' + p;
let REPORTED_PCT = {};       // {path: 已上报过的最大百分比}，避免重复请求
let chapterEnterAt = 0;      // 本章进入时刻（毫秒），用于累计停留秒数
let sessionSeconds = {};     // {path: 本次会话累计秒数}
let LOCAL_UPLOADED = {};     // {path: true}，保证本地进度只补传一次
// 续读定位：lastSection[path] 是「上一次看到的小节标题签名」，不是进度百分比——
// 读者可能中途回翻，百分比取最大值会把人送到错的地方。
let LAST_SECTION = {};       // {path: sectionKey}
let RESUME_OFFER = null;     // {path, key, title} 当前章节可用的续读目标
let BOOKMARKS = {};          // {path: Set<sectionKey>} 本章书签（服务端权威）

// 服务端未登录时用本地记录兜底，保证 ✓ 与进度条在本地也生效
function localProgress(path) {
  try {
    const raw = localStorage.getItem(LOCAL_PROGRESS_KEY(path));
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}
function saveLocalProgress(path, patch) {
  const next = Object.assign({}, SERVER_PROGRESS[path], localProgress(path), patch);
  SERVER_PROGRESS[path] = next;
  try { localStorage.setItem(LOCAL_PROGRESS_KEY(path), JSON.stringify(next)); } catch (e) { /* 忽略 */ }
}
// 合并服务端与本地的进度记录：取 pct/seconds 最大、state 就高不就低
function mergeProgress(server, local) {
  if (!server) return local;
  if (!local) return server;
  return {
    state: (server.state === 'read' || local.state === 'read') ? 'read' : (server.state || local.state),
    checks: Array.isArray(server.checks) ? server.checks : local.checks,
    progress_pct: Math.max(server.progress_pct || 0, local.progress_pct || 0),
    seconds: Math.max(server.seconds || 0, local.seconds || 0),
    // 位置不取最大，以服务端（最近一次真实阅读）为准，本地兜底
    last_section: server.last_section || local.last_section || '',
    updated_at: server.updated_at || local.updated_at || '',
  };
}

async function api(path, opts = {}) {
  const init = { method: opts.method || 'GET', credentials: 'same-origin', headers: {} };
  if (opts.body !== undefined) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(opts.body);
  }
  const res = await fetch(API_BASE + path, init);
  const text = await res.text();
  let data = null;
  if (text) { try { data = JSON.parse(text); } catch (e) { data = null; } }
  if (!res.ok) {
    const err = new Error((data && data.error) || ('HTTP ' + res.status));
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

let toastTimer = null;
function toast(text) {
  let el = $('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

/* —— 探测后端 —— */
async function detectServer() {
  try {
    const h = await api('/health');
    SERVER_MODE = !!(h && h.status === 'ok');
  } catch (e) {
    SERVER_MODE = false;
  }
  document.body.classList.toggle('no-server', !SERVER_MODE);
  const chip = $('account-chip');
  if (chip) chip.hidden = !SERVER_MODE;
  updateAskFab();
  if (!SERVER_MODE) {
    // 静态版也把本地阅读进度读回来，否则 ✓ 与进度条不显示
    await loadServerProgress();
    refreshProgressMarks();
    if (currentPath) updateResumeBar();
    return;
  }
  await refreshAccount();
}

/* —— 账号状态 —— */
function isAdmin() { return !!(ACCOUNT && ACCOUNT.role === 'admin'); }
// limit === -1 覆盖管理员与「已保存自带 key」两种情况：都表示不限次数
function quotaHTML() {
  if (!ACCOUNT) return '未登录';
  const q = ACCOUNT.quota || { used: 0, limit: 0 };
  if (q.limit === -1) return '提问不限次数';
  return '今日剩余 <b>' + Math.max(0, q.limit - q.used) + '</b> / ' + q.limit + ' 次';
}

async function refreshAccount() {
  try { ACCOUNT = await api('/auth/me'); }
  catch (e) { ACCOUNT = null; }
  renderAccount();
  if (ACCOUNT) {
    await loadServerProgress();
    await uploadLocalProgress();   // 登录后把本地攒下的进度补传一次
  } else {
    await loadServerProgress();    // 未登录也要读本地进度来渲染 ✓ / 进度条
  }
  refreshProgressMarks();
  updateAskQuota();
  // 进度是异步到位的：它决定「上次读到哪」是否可用，到了要重算提示条
  if (currentPath) updateResumeBar();
  // 若聊天窗口正开着（例如刚在窗口内点「登录 / 注册」成功），刷新它的可用状态
  if (ASK_OPEN && ACCOUNT) {
    $('ask-input').disabled = false;
    $('ask-send').disabled = false;
    if (!$('ask-log').querySelector('.bubble')) loadAskHistory();
  }
}

function renderAccount() {
  const chip = $('account-chip');
  if (!chip) return;
  const name = $('account-name'), initial = $('account-initial'), badge = $('account-role-badge');
  if (ACCOUNT) {
    chip.hidden = false;
    name.textContent = ACCOUNT.username;
    initial.textContent = String(ACCOUNT.username || '?').charAt(0).toUpperCase();
    if (badge) badge.hidden = !isAdmin();
    const q = ACCOUNT.quota || {};
    $('account-menu-head').textContent = ACCOUNT.username + '（' + (isAdmin() ? '管理员' : '普通用户') + '）· ' +
      (q.limit === -1 ? '不限次数' : '每日 ' + q.limit + ' 次');
  } else {
    chip.hidden = !SERVER_MODE;
    name.textContent = '登录';
    initial.textContent = '登';
    if (badge) badge.hidden = true;
    $('account-menu').hidden = true;
  }
  // 供样式判断是否显示「收藏 / 问 AI」这类需要账号的控件
  document.body.classList.toggle('has-account', !!ACCOUNT);
  updateMyProgress();
  // 登录状态变化会影响星标可点击性，重新上色一次
  if (currentPath && $('content').querySelector('.h-mark')) applyBookmarkMarks();
}

/* —— 登录 / 注册 / 改密码 —— */
function openAuth(mode) {
  AUTH_MODE = mode || 'login';
  const isPwd = AUTH_MODE === 'password';
  $('auth-modal').hidden = false;
  $('auth-tabs').hidden = isPwd;
  $('auth-title').textContent = isPwd ? '修改密码'
    : (AUTH_MODE === 'register' ? '注册速通笔记' : '登录速通笔记');
  $('auth-user-wrap').hidden = isPwd;
  $('auth-old-wrap').hidden = !isPwd;
  $('auth-pass2-wrap').hidden = AUTH_MODE === 'login';
  $('auth-pass-wrap').firstChild.nodeValue = isPwd ? '新密码' : '密码';
  $('auth-pass').setAttribute('autocomplete', AUTH_MODE === 'login' ? 'current-password' : 'new-password');
  $('auth-submit').textContent = isPwd ? '保存新密码' : (AUTH_MODE === 'register' ? '注册并登录' : '登录');
  $('auth-note').hidden = isPwd;
  $('auth-msg').textContent = '';
  document.querySelectorAll('.auth-tab').forEach(t => {
    const on = t.dataset.tab === AUTH_MODE;
    t.classList.toggle('active', on);
    t.setAttribute('aria-selected', String(on));
  });
  $('auth-user').value = (ACCOUNT && !isPwd) ? ACCOUNT.username : '';
  $('auth-pass').value = '';
  $('auth-pass2').value = '';
  $('auth-old').value = '';
  setTimeout(() => { (isPwd ? $('auth-old') : $('auth-user')).focus(); }, 30);
}
function closeAuth() { $('auth-modal').hidden = true; }

async function submitAuth(event) {
  event.preventDefault();
  const msg = $('auth-msg');
  const user = $('auth-user').value.trim();
  const pass = $('auth-pass').value;
  const pass2 = $('auth-pass2').value;
  msg.textContent = '';
  try {
    if (AUTH_MODE === 'register') {
      if (!/^[A-Za-z0-9_-]{3,24}$/.test(user)) throw new Error('用户名需为 3–24 位字母、数字、下划线或短横线');
      if (pass.length < 8) throw new Error('密码至少 8 位');
      if (pass !== pass2) throw new Error('两次输入的密码不一致');
      await api('/auth/register', { method: 'POST', body: { username: user, password: pass } });
      closeAuth();
      await refreshAccount();
      toast('注册成功，已登录：' + (ACCOUNT ? ACCOUNT.username : user));
      return;
    }
    if (AUTH_MODE === 'password') {
      if (pass.length < 8) throw new Error('新密码至少 8 位');
      if (pass !== pass2) throw new Error('两次输入的新密码不一致');
      await api('/auth/password', { method: 'POST', body: { old: $('auth-old').value, new: pass } });
      closeAuth();
      toast('密码已更新');
      return;
    }
    await api('/auth/login', { method: 'POST', body: { username: user, password: pass } });
    closeAuth();
    await refreshAccount();
    toast('已登录：' + (ACCOUNT ? ACCOUNT.username : user));
  } catch (err) {
    msg.textContent = (err && err.message) || '操作失败，请稍后重试';
  }
}

/* —— 阅读进度（服务端保存，跨设备；未登录走 localStorage） —— */
async function loadServerProgress() {
  if (SERVER_MODE && ACCOUNT) {
    try {
      const d = await api('/progress');
      SERVER_PROGRESS = (d && d.progress) || {};
    } catch (e) { SERVER_PROGRESS = {}; }
  } else {
    SERVER_PROGRESS = {};
  }
  // 本地记录兜底合并：服务端取历史最大值，本地未上传的部分不能丢
  chapters.forEach(c => {
    const local = localProgress(c.path);
    if (local) SERVER_PROGRESS[c.path] = mergeProgress(SERVER_PROGRESS[c.path], local);
  });
  // 服务端勾选状态合并进本地缓存，供 setupSelfCheck 使用
  Object.keys(SERVER_PROGRESS).forEach(path => {
    const rec = SERVER_PROGRESS[path];
    if (rec && Array.isArray(rec.checks)) {
      try { localStorage.setItem('selfcheck:' + path, JSON.stringify(rec.checks)); } catch (e) { /* 忽略 */ }
    }
  });
  // 续读位置也走同一份记录
  LAST_SECTION = {};
  Object.keys(SERVER_PROGRESS).forEach(path => {
    const key = SERVER_PROGRESS[path] && SERVER_PROGRESS[path].last_section;
    if (key) LAST_SECTION[path] = key;
  });
}

// 登录后把本地进度补传一次。去重：同一个 path 只传一次；
// 服务端已有记录且各字段都不小于本地时跳过。
async function uploadLocalProgress() {
  if (!SERVER_MODE || !ACCOUNT) return;
  for (const c of chapters) {
    const path = c.path;
    if (LOCAL_UPLOADED[path]) continue;
    const local = localProgress(path);
    LOCAL_UPLOADED[path] = true;
    if (!local) continue;
    const srv = SERVER_PROGRESS[path] || {};
    const pct = local.progress_pct || 0;
    const secs = local.seconds || 0;
    const needRead = local.state === 'read' && srv.state !== 'read';
    if (pct <= (srv.progress_pct || 0) && secs <= (srv.seconds || 0) && !needRead) continue;
    const body = { path };
    if (pct > (srv.progress_pct || 0)) body.progress_pct = Math.min(100, pct);
    if (secs > (srv.seconds || 0)) body.seconds = Math.min(86400, Math.round(secs));
    if (needRead) { body.state = 'read'; body.progress_pct = 100; }
    if (local.last_section && !(srv.last_section)) body.last_section = local.last_section;
    try {
      await api('/progress', { method: 'POST', body });
      SERVER_PROGRESS[path] = mergeProgress(SERVER_PROGRESS[path], body);
    } catch (e) { LOCAL_UPLOADED[path] = false; }  // 失败则下次登录重试
    if (body.last_section && !LAST_SECTION[path]) LAST_SECTION[path] = body.last_section;
  }
  refreshProgressMarks();
}

function isRead(path) { return !!(SERVER_PROGRESS[path] && SERVER_PROGRESS[path].state === 'read'); }
function pctOf(path) {
  const rec = SERVER_PROGRESS[path];
  return rec && rec.progress_pct ? Math.min(100, Math.round(rec.progress_pct)) : 0;
}
function refreshProgressMarks() {
  document.querySelectorAll('.chapter-item[data-path]').forEach(btn => {
    const path = btn.dataset.path;
    btn.classList.toggle('read', isRead(path));
    // 进度条：按渲染时读到的 SERVER_PROGRESS 写内联宽度，不逐帧重绘
    let bar = btn.querySelector('.ci-progress');
    const pct = pctOf(path);
    if (pct > 0 && pct < 100) {
      if (!bar) {
        bar = document.createElement('span');
        bar.className = 'ci-progress';
        bar.setAttribute('aria-hidden', 'true');
        btn.appendChild(bar);
      }
      bar.style.width = pct + '%';
    } else if (bar) {
      bar.remove();
    }
  });
  updateMyProgress();
}
function updateMyProgress() {
  const el = $('my-progress');
  if (el) {
    if (!ACCOUNT) el.hidden = true;
    else {
      const read = chapters.filter(c => c.exists && isRead(c.path)).length;
      el.hidden = false;
      el.innerHTML = '我的进度 <b>' + read + '</b> / ' + chapters.length + ' 章' + (isAdmin() ? ' · 管理员' : '');
    }
  }
  updateMyRead();
}

/* —— 滚动进度 → 「已读」判定 ——
   打开即标记已读是错的：用户可能只看了开头。改为按 #content 的滚动覆盖
   比例判定，只有 pct ≥ 95（或已翻到底）才算读完。 */
const READ_PCT = 95;

function chapterContentMetrics() {
  const el = $('content');
  if (!el || el.hidden) return null;
  const rect = el.getBoundingClientRect();
  const top = rect.top + window.scrollY;
  const height = rect.height;
  if (!height) return null;                    // 内容尚未布局（如仅图片时 height 为 0）
  return { top, height, bottom: top + height };
}

function computeReadPct(m) {
  const seen = window.scrollY + window.innerHeight - m.top;
  return Math.max(0, Math.min(100, Math.round(seen / m.height * 100)));
}

function accumulateSeconds(path) {
  if (!path || !chapterEnterAt) return sessionSeconds[path] || 0;
  const now = Date.now();
  const delta = Math.max(0, (now - chapterEnterAt) / 1000);
  chapterEnterAt = now;
  sessionSeconds[path] = (sessionSeconds[path] || 0) + delta;
  return sessionSeconds[path];
}

// 上报增长的进度；仅在新增值比已上报值大 ≥5 个百分点时发请求，避免刷接口
async function reportScrollProgress() {
  const path = currentPath;
  const m = chapterContentMetrics();
  if (!path || !m) return;
  const pct = computeReadPct(m);
  const seen = Math.max(REPORTED_PCT[path] || 0, pctOf(path));
  const atBottom = window.scrollY + window.innerHeight >= m.bottom - 40;

  if (pct >= READ_PCT || atBottom) {
    if (!isRead(path)) await markChapterRead(path);
    else if (pct > seen) markLocalPct(path, pct);
    return;
  }
  if (pct >= seen + 5) {
    const secs = Math.round(accumulateSeconds(path));
    REPORTED_PCT[path] = pct;
    markLocalPct(path, pct);
    if (SERVER_MODE && ACCOUNT) {
      try {
        await api('/progress', { method: 'POST', body: { path, progress_pct: pct, seconds: secs } });
      } catch (e) { REPORTED_PCT[path] = seen; }   // 失败则下次滚动重试
    }
  }
}

// 本地写入进度百分比并刷新侧栏（不重绘整个列表，只改受影响的那一条）
function markLocalPct(path, pct) {
  saveLocalProgress(path, { progress_pct: pct });
  const btn = document.querySelector('.chapter-item[data-path="' + path.replace(/"/g, '\\"') + '"]');
  if (!btn) { refreshProgressMarks(); return; }
  let bar = btn.querySelector('.ci-progress');
  if (pct > 0 && pct < 100) {
    if (!bar) {
      bar = document.createElement('span');
      bar.className = 'ci-progress';
      bar.setAttribute('aria-hidden', 'true');
      btn.appendChild(bar);
    }
    bar.style.width = pct + '%';
  } else if (bar) {
    bar.remove();
  }
}

async function markChapterRead(path) {
  updateAskFab();
  if (!path || isRead(path)) return;
  REPORTED_PCT[path] = 100;
  saveLocalProgress(path, { state: 'read', progress_pct: 100 });
  refreshProgressMarks();
  if (!SERVER_MODE || !ACCOUNT) return;          // 未登录：本地已记录，登录后补传
  try {
    const secs = Math.round(accumulateSeconds(path));
    const body = { path, state: 'read', progress_pct: 100 };
    if (secs > 0) body.seconds = Math.min(86400, secs);
    await api('/progress', { method: 'POST', body });
  } catch (e) { /* 静默失败：不影响阅读 */ }
}
function saveChecksToServer(path, checks) {
  saveLocalProgress(path, { checks });
  if (!SERVER_MODE || !ACCOUNT || !path) return;
  clearTimeout(checkTimers.get(path));
  checkTimers.set(path, setTimeout(async () => {
    try {
      await api('/progress', { method: 'POST', body: { path, checks } });
      SERVER_PROGRESS[path] = Object.assign({}, SERVER_PROGRESS[path], { checks });
    } catch (e) { /* 忽略 */ }
  }, CHECK_SAVE_DELAY));
}

/* —— 问 AI：右下角聊天窗口 ——
   一次对话属于「当前文章」而不是某个小节：同一章关闭再打开对话仍在，
   切章才清空。小节信息只在发送那一刻取，滚动不影响已发出的对话。 */
function updateAskFab() {
  const fab = $('ask-fab');
  if (!fab) return;
  // 窗口打开时隐藏悬浮按钮，避免叠在一起
  fab.hidden = !(SERVER_MODE && !!currentPath) || ASK_OPEN;
}
function setupAskButtons() {
  $('content').querySelectorAll('h2, h3').forEach(h => {
    if (!h.id || h.querySelector('.h-ask')) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'h-ask';
    btn.textContent = '问 AI';
    btn.title = '就这一节问 AI';
    btn.addEventListener('click', ev => {
      ev.preventDefault();
      ev.stopPropagation();
      // 点标题旁按钮：把该小节设为「当前小节」并聚焦输入框，但不重置对话
      const t = tocHeadings.find(x => x.id === h.id);
      if (t) ASK_SECTION = { id: t.id, title: t.text };
      openAsk({ focus: true });
    });
    h.appendChild(btn);
  });
  setupBookmarkButtons();
  updateAskFab();
}
function currentSectionAnchor() {
  if (!tocHeadings.length) return null;
  let cur = tocHeadings[0];
  for (const t of tocHeadings) {
    if (t.el.getBoundingClientRect().top <= 140) cur = t; else break;
  }
  return cur;
}
// 随滚动更新「当前小节」提示与 ASK_SECTION（节流 300ms），
// 让用户知道下一条提问会带上哪一节的上下文
function syncAskSection() {
  if (!tocHeadings.length || $('content').hidden) return;
  const id = currentSectionAnchor();
  const t = id ? tocHeadings.find(x => x.id === id) : null;
  if (!t) return;
  ASK_SECTION = { id: t.id, title: t.text };
  renderAskSectionHint();
}
function renderAskSectionHint() {
  const el = $('ask-section-hint');
  if (!el) return;
  if (!ASK_SECTION || !ASK_OPEN) { el.hidden = true; return; }
  el.hidden = false;
  el.innerHTML = '当前小节：' + escapeHtml(ASK_SECTION.title);
}

function currentChapterName() {
  const meta = chapters.find(c => c.path === currentPath);
  return meta ? meta.name : (currentPath || '—');
}

/* ══════════════ 续读定位 ══════════════
   位置用小节标题签名（headingSig）而不是 DOM id —— id 是每次渲染按顺序生成的
   sec-N，章节内容一变就全错位；标题签名跨会话稳定，正好也能被 scrollToSection
   复用做模糊匹配。未登录时存 localStorage，登录后与服务端同步。 */
const LAST_SECTION_KEY = p => 'lastsec:' + p;

function currentSectionKey() {
  const t = currentSectionAnchor();
  return t ? headingSig(t.text) : '';
}

// 记录当前小节。两个刻意的取舍：
//  ① 只往前走：读者回翻到前面几节做对照时，不该把「读到哪」倒退回去，
//     否则下次打开就落在很久以前的位置；
//  ② 停在章首不动：滚到最顶通常是「回到开头看看」，不是放弃已读进度。
function rememberSection() {
  const path = currentPath;
  if (!path) return;
  // 只有正文视图在前台时才记录位置。在账号页/路线图上滚动时，#content 是隐藏的，
  // 里面所有标题的 rect.top 都是 0，会被误判成「读到了最后一节」而写坏记录。
  if ($('content').hidden || !tocHeadings.length) return;
  const key = currentSectionKey();
  if (!key) return;
  const prev = LAST_SECTION[path];
  if (prev === key) return;
  const cur = findSectionByKey(key);
  const old = prev ? findSectionByKey(prev) : null;
  const first = tocHeadings[0];
  // 从非首节退回首节：保留原位置
  if (old && first && cur && cur.id === first.id && old.id !== first.id) return;
  LAST_SECTION[path] = key;
  saveLocalProgress(path, { last_section: key });
  if (SERVER_MODE && ACCOUNT) {
    api('/progress', { method: 'POST', body: { path, last_section: key } })
      .catch(() => { /* 静默失败：本地已记，下次滚动重试 */ });
  }
}

// 打开章节后决定是否给出「继续阅读」提示条。
// 判据是「记住的小节不是本章第一节」——位置本身就是续读的证据，
// 不必依赖进度百分比（百分比只在跨过 5 点时才上报，跳转式滚动会漏掉）。
function updateResumeBar() {
  const bar = $('resume-bar');
  if (!bar) return;
  const key = currentPath ? LAST_SECTION[currentPath] : '';
  const item = key ? findSectionByKey(key) : null;
  const first = tocHeadings[0];
  const isFirst = !!(item && first && item.id === first.id);
  if (!key || !item || isFirst) {
    bar.hidden = true;
    RESUME_OFFER = null;
    return;
  }
  RESUME_OFFER = { path: currentPath, key, title: item.text };
  $('resume-text').innerHTML = '上次读到 <b>' + escapeHtml(item.text) + '</b>';
  bar.hidden = false;
}

function findSectionByKey(key) {
  if (!key) return null;
  if (!tocHeadings.length) return null;
  const exact = tocHeadings.find(t => headingSig(t.text) === key);
  if (exact) return exact;
  // 标题被改过一字：退化为前缀匹配
  return tocHeadings.find(t => {
    const sig = headingSig(t.text);
    return sig && (sig.startsWith(key) || key.startsWith(sig));
  }) || null;
}

function scrollToKey(key) {
  const item = findSectionByKey(key);
  if (!item) return false;
  item.el.scrollIntoView({ block: 'start' });
  flashSection(item.el);
  return true;
}

$('resume-go').addEventListener('click', () => {
  if (!RESUME_OFFER) return;
  scrollToKey(RESUME_OFFER.key);
});
$('resume-from-top').addEventListener('click', () => {
  $('resume-bar').hidden = true;
  RESUME_OFFER = null;
  window.scrollTo(0, 0);
});

// 关页 / 切到后台时补记一次位置：滚动节流可能正好把最后一次移动吞掉，
// 而 pagehide 是唯一在移动端 Safari 上可靠触发的时机。
window.addEventListener('pagehide', () => {
  if (currentPath) {
    rememberSection();
    accumulateSeconds(currentPath);
  }
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && currentPath) rememberSection();
});

/* ══════════════ 小节书签 ══════════════
   键同样是标题签名，因此章节正文重排后书签仍能落回同一小节。
   服务端为权威副本；未登录时仅本地内存有效（刷新即失效，界面会提示登录）。 */
function bookmarkSet(path) {
  if (!BOOKMARKS[path]) BOOKMARKS[path] = new Set();
  return BOOKMARKS[path];
}
function isBookmarked(path, key) { return bookmarkSet(path).has(key); }

function paintBookmark(btn, on) {
  btn.textContent = on ? '★' : '☆';
  btn.classList.toggle('on', on);
  btn.setAttribute('aria-pressed', String(on));
  btn.title = on ? '取消收藏这一节' : '收藏这一节';
}

async function toggleBookmark(btn, heading) {
  const path = currentPath;
  if (!path) return;
  if (!SERVER_MODE || !ACCOUNT) {
    toast('登录后可收藏小节，并在主页里统一查看');
    return;
  }
  const t = tocHeadings.find(x => x.id === heading.id);
  const title = t ? t.text : headingLabel(heading);
  const key = headingSig(title);
  if (!key) { toast('这一节没有可用的标题，无法收藏'); return; }

  const set = bookmarkSet(path);
  const wasOn = set.has(key);
  // 先改界面，失败再回滚：收藏是轻操作，不该等网络
  if (wasOn) set.delete(key); else set.add(key);
  paintBookmark(btn, !wasOn);
  try {
    await api('/bookmarks', { method: 'POST', body: {
      action: wasOn ? 'remove' : 'add', path, section_key: key, section_title: title,
    } });
    toast(wasOn ? '已取消收藏' : '已收藏：' + title);
  } catch (e) {
    if (wasOn) set.add(key); else set.delete(key);
    paintBookmark(btn, wasOn);
    toast('操作失败：' + ((e && e.message) || '网络错误'));
  }
}

// 打开章节时拉取该章书签，用于给星标上色
async function loadBookmarks(path) {
  BOOKMARKS[path] = new Set();
  if (!SERVER_MODE || !ACCOUNT || !path) return;
  try {
    const d = await api('/bookmarks?path=' + encodeURIComponent(path));
    const set = bookmarkSet(path);
    (d.items || []).forEach(it => { if (it.section_key) set.add(it.section_key); });
    applyBookmarkMarks();
  } catch (e) { /* 静默：书签不可用不影响阅读 */ }
}

function applyBookmarkMarks() {
  const path = currentPath;
  if (!path) return;
  const set = bookmarkSet(path);
  $('content').querySelectorAll('.h-mark').forEach(btn => {
    const raw = btn.dataset.key || '';
    paintBookmark(btn, !!raw && set.has(raw));
  });
}

// 在每个 H2/H3 标题后追加收藏星标（与「问 AI」按钮并列，但位置更靠前）
function setupBookmarkButtons() {
  $('content').querySelectorAll('h2, h3').forEach(h => {
    if (!h.id || h.querySelector('.h-mark')) return;
    const t = tocHeadings.find(x => x.id === h.id);
    const key = headingSig(t ? t.text : headingLabel(h));
    if (!key) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'h-mark';
    btn.dataset.key = key;
    paintBookmark(btn, isBookmarked(currentPath, key));
    btn.addEventListener('click', ev => {
      ev.preventDefault();
      ev.stopPropagation();
      toggleBookmark(btn, h);
    });
    // 插在「问 AI」前面，视觉顺序是「★ 问 AI」
    const ask = h.querySelector('.h-ask');
    if (ask) h.insertBefore(btn, ask); else h.appendChild(btn);
  });
}

function openAsk(opts) {
  opts = opts || {};
  if (!SERVER_MODE) { toast('问答功能需要在服务器版使用'); return; }
  if (!currentPath) { toast('请先打开一章再提问'); return; }
  const firstOpen = !ASK_OPEN;
  ASK_OPEN = true;
  $('ask-panel').hidden = false;
  $('ask-title').textContent = currentChapterName();
  hideAskAlert();
  updateAskQuota();
  updateAskFab();
  // 每次打开都按当前滚动位置重新取小节：用户可能换了位置，
  // 这样提示行显示的"下一条会问哪节"才和实际一致
  if (opts.sectionId) {
    const t = tocHeadings.find(x => x.id === opts.sectionId);
    ASK_SECTION = t ? { id: t.id, title: t.text } : ASK_SECTION;
    renderAskSectionHint();
  } else {
    syncAskSection();
  }
  if (!ASK_SECTION) { ASK_SECTION = { id: '', title: currentChapterName() }; renderAskSectionHint(); }

  $('ask-send').disabled = false;
  if (!ACCOUNT) {
    renderAskNotice('登录后即可提问。<br><button type="button" class="btn primary" id="ask-login-btn">登录 / 注册</button>');
    $('ask-send').disabled = true;
    $('ask-input').disabled = true;
    const b = $('ask-login-btn');
    if (b) b.addEventListener('click', () => openAuth('login'));
    return;
  }
  $('ask-input').disabled = false;
  // 同一章重复打开不再拉取历史，保留屏幕上的对话
  if (firstOpen) loadAskHistory();
  if (opts.focus) setTimeout(() => $('ask-input').focus(), 60);
}

function closeAsk() {
  ASK_OPEN = false;
  $('ask-panel').hidden = true;
  hideAskAlert();
  updateAskFab();
}
// 切章时清空对话视图；下次打开会拉取新章的记录
function resetAskForChapter() {
  if (ASK_OPEN) closeAsk();
  ASK_SECTION = null;
  $('ask-log').innerHTML = '';
  updateAskFab();
}

function hideAskAlert() { const el = $('ask-alert'); if (el) { el.hidden = true; el.textContent = ''; } }
function showAskAlert(html) {
  const el = $('ask-alert');
  if (!el) return;
  el.innerHTML = html;
  el.hidden = false;
}
function renderAskNotice(html) { $('ask-log').innerHTML = '<div class="qa-empty">' + html + '</div>'; }

// 气泡对话：用户右对齐、AI 左对齐；内容一律 escapeHtml，长文本可换行
function bubbleHTML(role, text, extra) {
  return '<div class="bubble ' + role + '">' + escapeHtml(text) + (extra || '') + '</div>';
}
function renderAskLog(items, pendingQ) {
  const log = $('ask-log');
  let html = '';
  if (!items.length && !pendingQ) {
    html += '<div class="qa-empty">就当前文章提问，AI 会结合你所在小节的正文回答；本节没讲到的，它会明确说“本节没有讲到”。</div>';
  }
  items.forEach(it => {
    html += bubbleHTML('me', it.question);
    html += bubbleHTML('ai', it.answer);
    if (it.created_at) html += '<div class="bubble-time">' + escapeHtml(it.created_at) + '</div>';
  });
  if (pendingQ) {
    html += bubbleHTML('me', pendingQ);
    html += '<div class="bubble ai bubble-pending">正在思考…</div>';
  }
  log.innerHTML = html;
  log.scrollTop = log.scrollHeight;
}
function appendBubble(role, text, extra) {
  const log = $('ask-log');
  log.insertAdjacentHTML('beforeend', bubbleHTML(role, text, extra));
  log.scrollTop = log.scrollHeight;
}
async function loadAskHistory() {
  if (!currentPath || !ACCOUNT) return;
  try {
    // 按文章拉全部记录，不再按 section_title 过滤（否则切小节就看不到别的节）
    const d = await api('/ask/history?path=' + encodeURIComponent(currentPath) + '&limit=50');
    const items = ((d && d.items) || []).slice().reverse();   // 接口按时间倒序，反转成正序
    renderAskLog(items);
  } catch (e) {
    renderAskLog([]);
    showAskAlert('加载历史对话失败：' + escapeHtml(e.message || '未知错误'));
  }
}
function updateAskQuota() { const el = $('ask-quota'); if (el) el.innerHTML = ACCOUNT ? quotaHTML() : ''; }

async function submitAsk(event) {
  event.preventDefault();
  if (ASK_BUSY || !SERVER_MODE || !currentPath) return;
  const q = $('ask-input').value.trim();
  if (!q) return;
  if (!ACCOUNT) { openAuth('login'); return; }
  // 上下文在发送这一刻取：用户中途滚动到别的小节，下一条就用新的
  // 上下文始终以"发送这一刻的滚动位置"为准，不依赖打开面板时的小节；
  // 取不到小节（例如章节没有 h2/h3）时退回本章第一个小节，仍可提问。
  const anchorId = currentSectionAnchor() || (tocHeadings[0] && tocHeadings[0].id);
  const t = anchorId ? tocHeadings.find(x => x.id === anchorId) : null;
  ASK_SECTION = t ? { id: t.id, title: t.text } : { id: '', title: currentChapterName() };


  ASK_BUSY = true;
  $('ask-send').disabled = true;
  hideAskAlert();
  appendBubble('me', q);
  appendBubble('ai', '正在思考…', '');
  const pendingEl = $('ask-log').lastElementChild;
  if (pendingEl) pendingEl.classList.add('bubble-pending');
  $('ask-input').value = '';

  try {
    const d = await api('/ask', { method: 'POST', body: {
      path: currentPath, section_id: ASK_SECTION.id, section_title: ASK_SECTION.title, question: q } });
    if (ACCOUNT.quota && d) {
      if (typeof d.used === 'number') ACCOUNT.quota.used = d.used;
      if (typeof d.limit === 'number') ACCOUNT.quota.limit = d.limit;
    }
    if (pendingEl) pendingEl.remove();
    appendBubble('ai', (d && d.answer) || '（没有返回内容）');
    updateAskQuota();
    // 同步进内存历史，切回本章时无需重新请求也能看到
    (ASK_HISTORY_CACHE[currentPath] = ASK_HISTORY_CACHE[currentPath] || [])
      .push({ question: q, answer: (d && d.answer) || '', created_at: '' });
  } catch (err) {
    if (pendingEl) pendingEl.remove();
    const status = err && err.status;
    if (status === 401) {
      ACCOUNT = null;
      renderAccount();
      appendBubble('err', '登录状态已失效，请重新登录。', '<br><button type="button" class="btn primary" id="ask-login-btn">登录</button>');
      const b = $('ask-login-btn');
      if (b) b.addEventListener('click', () => openAuth('login'));
      $('ask-input').disabled = true;
      $('ask-send').disabled = true;
    } else {
      appendBubble('err', (err && err.message) || '提问失败，请稍后重试');
      if (status === 429) {
        if (err.data) {
          if (typeof err.data.used === 'number' && ACCOUNT && ACCOUNT.quota) ACCOUNT.quota.used = err.data.used;
          if (typeof err.data.limit === 'number' && ACCOUNT && ACCOUNT.quota) ACCOUNT.quota.limit = err.data.limit;
        }
        showAskAlert(escapeHtml((err && err.message) || '今日免费额度已用尽') +
          '　在「设置」里填写自己的 API Key 即可不限次数。');
        updateAskQuota();
      }
    }
  } finally {
    ASK_BUSY = false;
    if (ACCOUNT) $('ask-send').disabled = false;
  }
}

/* —— 我的主页 —— */
function fmtDuration(seconds) {
  const s = Math.max(0, Math.round(seconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h) return h + ' 小时 ' + m + ' 分';
  if (m) return m + ' 分';
  return s + ' 秒';
}
function chapterNameOf(path) {
  const meta = chapters.find(c => c.path === path);
  return meta ? meta.name : path;
}

/* ══════════════ 账号页面：我的主页 / 设置 ══════════════
   与「路线图」「章节正文」并列的第三种视图，由 #profile / #settings 两个 hash
   路由切换。做成整页而非弹窗，是因为这里有进度概览、收藏清单、额度说明这些
   需要纵深的正文级内容；只有登录/注册这种短事务仍用弹窗。 */
let ACCOUNT_PAGE = null;      // 'profile' | 'settings'，当前显示的账号页

function renderAccountPageTabs() {
  $('account-page-tabs').querySelectorAll('.page-tab').forEach(btn => {
    const on = btn.dataset.page === ACCOUNT_PAGE;
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-current', on ? 'page' : 'false');
  });
}

// 导航到账号页。hash 已经是目标值时浏览器不会再发 hashchange，所以显式渲染一次。
function gotoAccountPage(kind) {
  const want = '#' + kind;
  if (window.location.hash === want) showAccountPage(kind);
  else window.location.hash = kind;
}

function showAccountPage(kind) {
  ACCOUNT_PAGE = kind === 'settings' ? 'settings' : 'profile';
  $('account-menu').hidden = true;
  $('search-results').hidden = true;
  // 正文相关视图全部让位；不重置 currentPath，这样点侧栏章节能立刻回到原章
  $('loading').hidden = true;
  $('error').hidden = true;
  $('roadmap').hidden = true;
  $('content').hidden = true;
  $('doc-head').hidden = true;
  $('chapter-nav').classList.remove('show');
  $('account-page').hidden = false;
  renderAccountPageTabs();
  const isSettings = ACCOUNT_PAGE === 'settings';
  $('account-page-title').textContent = isSettings ? '设置' : '我的主页';
  $('account-page-sub').textContent = isSettings
    ? '配置你自己的 DeepSeek API Key（提问不再受每日限额）、联系邮箱与账号安全。'
    : '阅读进度、收藏的小节与提问记录都保存在账号里，换一台设备登录即可继续。';
  document.title = (isSettings ? '设置' : '我的主页') + ' — 速通笔记';
  if (isSettings) { renderSettingsBody(); loadSettings(); }
  else loadProfile();
  window.scrollTo(0, 0);
}

$('account-page-tabs').addEventListener('click', e => {
  const btn = e.target.closest('.page-tab');
  if (btn) gotoAccountPage(btn.dataset.page);
});

function pageLoadingHTML(text) {
  return '<div class="page-card"><div class="empty-note">' + escapeHtml(text) + '</div></div>';
}
function pageErrorHTML(message, retryId) {
  return '<div class="page-card"><div class="empty-note">加载失败：' + escapeHtml(message) +
         (retryId ? '<br><button type="button" class="btn" id="' + retryId + '">重试</button>' : '') +
         '</div></div>';
}
// 未登录时的占位：账号页可以直接用链接进入，因此必须自己兜住这个状态
function pageLoginPromptHTML() {
  return '<div class="page-card"><h2>需要先登录</h2>' +
    '<p class="card-sub">这个页面显示的是账号里的数据，登录后才能查看。</p>' +
    '<div class="form-actions"><button type="button" class="btn primary" id="page-login-btn">登录 / 注册</button></div></div>';
}

async function loadProfile() {
  const body = $('account-page-body');
  if (!SERVER_MODE || !ACCOUNT) {
    body.innerHTML = pageLoginPromptHTML();
    bindPageLogin();
    return;
  }
  body.innerHTML = pageLoadingHTML('正在加载你的主页…');
  try {
    const d = await api('/profile');
    if (ACCOUNT_PAGE !== 'profile') return;   // 加载期间用户已切走
    body.innerHTML = renderProfile(d);
    bindProfileEvents();
  } catch (e) {
    if (ACCOUNT_PAGE !== 'profile') return;
    body.innerHTML = pageErrorHTML((e && e.message) || '网络错误', 'profile-retry');
    const btn = $('profile-retry');
    if (btn) btn.addEventListener('click', loadProfile);
  }
}

function bindPageLogin() {
  const btn = $('page-login-btn');
  if (btn) btn.addEventListener('click', () => openAuth('login'));
}

function renderProfile(d) {
  const stats = d.stats || {};
  const admin = d.role === 'admin';
  const email = d.email_masked
    ? escapeHtml(d.email_masked)
    : '未设置　<a href="#settings" style="color:var(--accent)">去设置</a>';

  // 续读：按最近更新时间列出有进度的章节，并带上进度条
  const cont = (d.continue_paths || []).slice(0, 6);
  const contHTML = cont.length
    ? cont.map(c => {
        const pct = Math.max(0, Math.min(100, Math.round(c.progress_pct || 0)));
        const name = escapeHtml(chapterNameOf(c.path));
        const meta = pct >= 100 ? '已读完' : (pct > 0 ? '已读 ' + pct + '%' : '刚开始');
        return `<button type="button" class="browse-item" data-goto="${escapeHtml(c.path)}">
          <span class="bi-name">${name}</span>
          <span class="bi-meta">${meta} · 继续 →</span>
          <span class="ci-progress-wrap" aria-hidden="true"><span class="ci-progress-bar" style="width:${pct}%"></span></span>
        </button>`;
      }).join('')
    : '<div class="empty-note">还没有阅读记录。打开任意一章开始阅读，这里就会显示上次的进度。</div>';

  const marks = (d.bookmarks || []).slice(0, 12);
  const markHTML = marks.length
    ? marks.map(b => `<button type="button" class="browse-item" data-goto="${escapeHtml(b.path)}">
        <span class="bi-name">★ ${escapeHtml(b.section_title || b.section_key)}</span>
        <span class="bi-meta">${escapeHtml(chapterNameOf(b.path))}</span>
      </button>`).join('')
    : '<div class="empty-note">还没有收藏的小节。把鼠标移到正文里的标题上，点 ☆ 即可收藏，方便日后跳回。</div>';

  const asks = (d.recent_asks || []).slice(0, 8);
  const askHTML = asks.length
    ? asks.map(a => `<button type="button" class="browse-item" data-goto="${escapeHtml(a.path)}">
        <span class="bi-q">${escapeHtml(a.question || '')}</span>
        <span class="bi-meta">${escapeHtml((a.created_at || '').slice(0, 10))}</span>
      </button>`).join('')
    : '<div class="empty-note">还没有提问记录。读正文时点标题旁的「问 AI」就能提问。</div>';

  return `
    <div class="page-card">
      <div class="profile-head">
        <div class="profile-avatar">${escapeHtml(String(d.username || '?').charAt(0).toUpperCase())}</div>
        <div class="profile-id">
          <div class="profile-name">${escapeHtml(d.username || '')}
            <span class="account-badge"${admin ? '' : ' hidden'}>管理员</span>
            ${admin ? '' : '<span class="account-badge" style="color:#94a3b8;background:rgba(148,163,184,.12);border-color:rgba(148,163,184,.3)">普通</span>'}
          </div>
          <div class="profile-sub">注册于 <b>${escapeHtml(d.member_since || '未知')}</b> · 邮箱：${email}</div>
        </div>
      </div>
      <div class="stat-grid">
        <div class="stat-cell"><div class="stat-num">${escapeHtml(String(stats.read_chapters || 0))}</div><div class="stat-cap">已读章数</div></div>
        <div class="stat-cell"><div class="stat-num" style="font-size:.86rem">${escapeHtml(fmtDuration(stats.read_seconds))}</div><div class="stat-cap">累计阅读</div></div>
        <div class="stat-cell"><div class="stat-num">${escapeHtml(String(d.bookmark_count || 0))}</div><div class="stat-cap">收藏小节</div></div>
        <div class="stat-cell"><div class="stat-num">${escapeHtml(String(stats.asked || 0))}</div><div class="stat-cap">提问次数</div></div>
      </div>
    </div>

    <div class="page-card">
      <h2>继续阅读</h2>
      <p class="card-sub">按最近阅读排序。打开章节时会自动回到你上次读到的小节。</p>
      <div class="browse-list">${contHTML}</div>
    </div>

    <div class="page-card">
      <h2>收藏的小节</h2>
      <p class="card-sub">正文中标题右侧的 ☆ 就是收藏按钮，点一下即可加入这里。</p>
      <div class="browse-list">${markHTML}</div>
    </div>

    <div class="page-card">
      <h2>最近提问</h2>
      <div class="browse-list">${askHTML}</div>
    </div>
  `;
}

function bindProfileEvents() {
  const body = $('account-page-body');
  body.querySelectorAll('[data-goto]').forEach(btn => {
    btn.addEventListener('click', () => {
      const path = btn.dataset.goto;
      // 直接改 hash 触发路由；不要先隐藏页面，交给 loadChapter/showRoadmap 处理
      window.location.hash = encodeURIComponent(path);
    });
  });
}

/* —— 设置页：AI Key + 邮箱 + 账号安全 —— */
function renderSettingsBody() {
  $('account-page-body').innerHTML = `
    <div class="page-card">
      <h2>AI 提问额度</h2>
      <p class="card-sub">默认每个账号每天 5 次免费提问。填写你自己的 DeepSeek API Key 后不再计数，也就不受这个限额约束。Key 加密保存在服务器上，页面不会再次显示完整内容。</p>
      <div id="settings-key-state" class="key-state">正在读取…</div>
      <div id="settings-key-form" class="form-row" hidden style="margin-top:.7rem">
        <label for="settings-key-input">DeepSeek API Key</label>
        <input id="settings-key-input" type="password" autocomplete="off" spellcheck="false" placeholder="sk-…">
      </div>
      <div class="form-actions" style="margin-top:.55rem">
        <button type="button" class="btn primary" id="settings-key-save">保存并验证</button>
        <button type="button" class="btn ghost" id="settings-key-clear" hidden>清除 Key</button>
      </div>
      <p class="set-note" id="settings-key-note">保存时服务器会先拿这个 Key 试一次请求，验证通过才落库，避免存下一个用不了的 Key。</p>
      <p class="set-msg" id="settings-key-msg" role="alert"></p>
    </div>

    <div class="page-card">
      <h2>邮箱</h2>
      <p class="card-sub">仅用于联系与找回账号，可以留空。页面上只显示掩码后的形式。</p>
      <div class="form-row">
        <label for="settings-email">邮箱地址</label>
        <input id="settings-email" type="email" autocomplete="email" spellcheck="false" placeholder="you@example.com">
      </div>
      <div class="form-actions">
        <button type="button" class="btn" id="settings-email-save">保存邮箱</button>
      </div>
      <p class="set-msg" id="settings-email-msg" role="alert"></p>
    </div>

    <div class="page-card">
      <h2>账号安全</h2>
      <p class="card-sub">登录状态保存在浏览器的 HttpOnly Cookie 里，页面脚本读不到它。在公共电脑上读完请及时退出。</p>
      <div class="form-actions">
        <button type="button" class="btn" id="settings-password">修改密码</button>
        <button type="button" class="btn ghost" id="settings-logout">退出登录</button>
      </div>
    </div>
  `;
  $('settings-key-save').addEventListener('click', saveKey);
  $('settings-key-clear').addEventListener('click', clearKey);
  $('settings-email-save').addEventListener('click', saveEmail);
  $('settings-password').addEventListener('click', () => openAuth('password'));
  $('settings-logout').addEventListener('click', logoutAccount);
}

async function loadSettings() {
  if (!SERVER_MODE || !ACCOUNT) {
    $('account-page-body').innerHTML = pageLoginPromptHTML();
    bindPageLogin();
    return;
  }
  try {
    const d = await api('/settings');
    if (ACCOUNT_PAGE !== 'settings') return;   // 加载期间用户已切走
    renderSettingsState(d);
  } catch (e) {
    const el = $('settings-key-state');
    if (el) el.textContent = '设置读取失败：' + ((e && e.message) || '网络错误');
  }
}

function renderSettingsState(d) {
  const hasKey = !!(d && d.has_key);
  const state = $('settings-key-state');
  const input = $('settings-key-input');
  const clearBtn = $('settings-key-clear');
  if (hasKey) {
    state.innerHTML = '已使用你自己的 API Key（<b>' + escapeHtml(d.key_hint || '') + '</b>）· 提问不限次数';
    clearBtn.hidden = false;
    input.hidden = true;
    $('settings-key-form').hidden = true;
    $('settings-key-save').textContent = '更换 Key';
  } else {
    const q = (ACCOUNT && ACCOUNT.quota) || { used: 0, limit: 5 };
    const left = q.limit === -1 ? '不限' : Math.max(0, q.limit - q.used);
    state.innerHTML = '使用免费额度：今日剩余 <b>' + left + '</b> / ' + (q.limit === -1 ? '不限' : q.limit) + ' 次';
    clearBtn.hidden = true;
    input.hidden = false;
    $('settings-key-form').hidden = false;
    $('settings-key-save').textContent = '保存并验证';
  }
}

function setSettingsMsg(id, text, ok) {
  const el = $(id);
  el.textContent = text || '';
  el.classList.toggle('ok', !!ok);
}

async function saveKey() {
  const input = $('settings-key-input');
  const key = input.value.trim();
  setSettingsMsg('settings-key-msg', '');
  if (!key) { setSettingsMsg('settings-key-msg', '请填写 API Key'); input.focus(); return; }
  const btn = $('settings-key-save');
  btn.disabled = true;
  const oldText = btn.textContent;
  btn.textContent = '验证中…';
  try {
    const d = await api('/settings', { method: 'POST', body: { llm_api_key: key } });
    input.value = '';
    setSettingsMsg('settings-key-msg', '已保存，验证通过', true);
    toast('已保存，验证通过');
    await refreshAccount();
    renderSettingsState(d);
  } catch (e) {
    // 后端的中文原因要留在表单里可见，不能只弹 toast
    setSettingsMsg('settings-key-msg', (e && e.message) || '保存失败，请稍后重试');
  } finally {
    btn.disabled = false;
    btn.textContent = oldText;
  }
}

async function clearKey() {
  if (!window.confirm('清除后将删除服务器上保存的 API Key，提问会回到每日免费额度（每日 5 次）。确定清除吗？')) return;
  setSettingsMsg('settings-key-msg', '');
  const btn = $('settings-key-clear');
  btn.disabled = true;
  try {
    await api('/settings', { method: 'POST', body: { clear: true } });
    setSettingsMsg('settings-key-msg', '已清除，提问回到每日免费额度', true);
    toast('已清除');
    await refreshAccount();
    await loadSettings();
  } catch (e) {
    setSettingsMsg('settings-key-msg', (e && e.message) || '清除失败，请稍后重试');
  } finally {
    btn.disabled = false;
  }
}

async function saveEmail() {
  const email = $('settings-email').value.trim();
  setSettingsMsg('settings-email-msg', '');
  const btn = $('settings-email-save');
  btn.disabled = true;
  try {
    const d = await api('/settings', { method: 'POST', body: { email } });
    setSettingsMsg('settings-email-msg',
      '已保存：' + ((d && d.email_masked) || (email ? '已更新' : '已清空')), true);
    toast('邮箱已保存');
    await refreshAccount();
  } catch (e) {
    setSettingsMsg('settings-email-msg', (e && e.message) || '保存失败，请稍后重试');
  } finally {
    btn.disabled = false;
  }
}

/* —— 事件绑定 —— */
$('account-chip').addEventListener('click', () => {
  if (!ACCOUNT) { openAuth('login'); return; }
  const m = $('account-menu');
  m.hidden = !m.hidden;
});
document.addEventListener('click', e => {
  const menu = $('account-menu');
  if (menu && !menu.hidden && !e.target.closest('#account-menu') && !e.target.closest('#account-chip')) {
    menu.hidden = true;
  }
});

async function logoutAccount() {
  try { await api('/auth/logout', { method: 'POST' }); } catch (e) { /* 忽略 */ }
  $('account-menu').hidden = true;
  ACCOUNT = null;
  await loadServerProgress();   // 回落到本地进度，未登录也能看到 ✓
  renderAccount();
  refreshProgressMarks();
  updateAskQuota();
  resetAskForChapter();
  toast('已退出登录');
  // 账号页的数据属于登录用户，退出后必须立刻离开，否则会留在空页上
  if (ACCOUNT_PAGE) {
    ACCOUNT_PAGE = null;
    window.location.hash = 'roadmap';
  }
}

$('menu-logout').addEventListener('click', logoutAccount);
$('menu-password').addEventListener('click', () => { $('account-menu').hidden = true; openAuth('password'); });
$('menu-profile').addEventListener('click', () => gotoAccountPage('profile'));
$('menu-settings').addEventListener('click', () => gotoAccountPage('settings'));
// 「更换 Key」是动态按钮：已保存 key 时先展开输入框，再让用户提交。
// 账号页每次渲染都会重建这个按钮，所以用事件委托而不是直接绑定。
$('account-page-body').addEventListener('click', e => {
  const saveBtn = e.target.closest('#settings-key-save');
  if (!saveBtn) return;
  const form = $('settings-key-form');
  if (form && form.hidden) {
    form.hidden = false;
    $('settings-key-input').hidden = false;
    saveBtn.textContent = '保存并验证';
    $('settings-key-input').focus();
    return;
  }
  saveKey();
});
$('auth-close').addEventListener('click', closeAuth);
$('auth-modal').addEventListener('click', e => { if (e.target.id === 'auth-modal') closeAuth(); });
document.querySelectorAll('.auth-tab').forEach(t => t.addEventListener('click', () => openAuth(t.dataset.tab)));
$('auth-form').addEventListener('submit', submitAuth);
$('ask-close').addEventListener('click', closeAsk);
$('ask-fab').addEventListener('click', () => openAsk({ focus: true }));
$('ask-form').addEventListener('submit', submitAsk);
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (!$('ask-panel').hidden) closeAsk();
  else if (!$('auth-modal').hidden) closeAuth();
});

/* ══════════════ 启动 ══════════════ */
// CDN 脚本带 defer，执行顺序上本内联脚本可能先跑（defer 脚本在文档解析结束后按序执行），
// 因此必须等它们就绪再启动，否则 marked/katex/hljs 会是 undefined。
function whenLibsReady(timeoutMs) {
  return new Promise(resolve => {
    const deadline = Date.now() + (timeoutMs || 8000);
    (function tick() {
      // katex 与 hljs 是渲染必需项，三件套齐了才算就绪
      const ready = typeof marked !== 'undefined' && typeof marked.parse === 'function'
                 && typeof katex !== 'undefined' && typeof hljs !== 'undefined';
      if (ready || Date.now() > deadline) { resolve(ready); return; }
      setTimeout(tick, 50);
    })();
  });
}

whenLibsReady().then(ready => {
  if (!ready) {
    console.warn('[libs] CDN 组件未在超时内就绪，将以纯文本形式显示章节');
  }
  try {
    if (typeof marked !== 'undefined' && typeof marked.use === 'function') {
      marked.use({ gfm: true, breaks: false });
    }
  } catch (e) {
    console.warn('[libs] marked 初始化失败：' + (e && e.message));
  }
  // Mermaid 按需加载（见 ensureMermaid），此处无需初始化
  init();
});