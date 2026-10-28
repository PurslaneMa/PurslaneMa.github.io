'use strict';

/* ══════════════ 状态 ══════════════ */
let chapters = [];            // /api/chapters 返回的章节列表
let CHAPTERS_BASE = [];       // 构建期章节快照：文章覆盖层每次从它重新计算
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

/* ══════════════ 大类登记处（唯一来源） ══════════════
   新增一个并列大类只改两处：① 这里加一条 BOOKS 记录；② 在 PHASES 里给它的每个
   阶段写 book 键、并给首阶段写 dir 前缀（章节 phase 字段缺失时按路径兜底）。
   顶栏按钮、书名、章节徽章、阶段归属、复习阶段编号全部由这两处派生——此前它们
   散落在 6 个数组与 9 条 if 分支里，漏改一处就会静默把新阶段并进别的册
   （2026-10-23 概率论「应用概率」上线时就是这样被 cache 里的旧逻辑并进 pb1 的）。 */
const BOOKS = [
  { key: 'cs',   label: '计算机速通',             trackLabel: '核心', trackClass: 'badge-core', desc: '离开 OJ 的核心主线：终端与系统、网络与 Git、前后端、Docker 与部署，终点是可部署的贯穿项目' },
  { key: 'math', label: '数学基础',               trackLabel: '数学', trackClass: 'badge-math', desc: '四个部分按序：连续数学、概率论、随机微分方程、范畴论4CS，各部分独立编号、自带复习章' },
  { key: 'dl',   label: '深度学习',               trackLabel: '分册', trackClass: 'badge-dl',   desc: '数学与记号、MLP 与反向传播、CNN 与训练技巧，生成模型四讲，RNN 与 Transformer' },
  { key: 'ml',   label: '机器学习与凸优化',       trackLabel: 'ML',   trackClass: 'badge-ml',   desc: '损失函数与凸性、梯度下降、线性模型与对偶，走到泛化与神经网络' },
  { key: 'dlf',  label: '深度学习框架',           trackLabel: '框架', trackClass: 'badge-dlf',  desc: 'PyTorch 能做什么：张量、自动求导、层与模块、优化器、训练循环、数据管道、设备与精度、保存与多卡，每层再打开盖子看内部机制' },
  { key: 'nlp',  label: '自然语言处理',           trackLabel: 'NLP',  trackClass: 'badge-nlp',  desc: '从0开始的自然语言处理：经典方法（CFG、HMM、N-gram 与词向量）、神经语言模型与分词、BERT/GPT 双路线、LLM 训练与对齐、多模态与安全' },
  { key: 'comb', label: '组合学',                 trackLabel: '组合', trackClass: 'badge-comb', desc: '计数与双射、生成函数、经典数列、树与图的计数，进阶到分析组合学（奇点分析）与图上的谱方法（扩张图、随机游走）' },
  { key: 'nt',   label: '数论',                   trackLabel: '数论', trackClass: 'badge-nt',   desc: '整除与同余、原根与互反、素数分布（筛法到素数定理）、代数数论（高斯整数与理想）、算术函数与 L 函数' },
  { key: 'gm',   label: '群论与模论',             trackLabel: '群模', trackClass: 'badge-gm',   desc: '群与陪集、商群与同态、Sylow、合成列与可解群、自由群；模与同态、张量积、PID 结构定理、半单性与表示论' },
  { key: 'qc',   label: '量子力学',               trackLabel: '量子', trackClass: 'badge-qc',   desc: '从狄拉克记号与「要解决什么问题」出发的最小量子力学，收在量子计算的路口' },
  { key: 'qai',  label: '交换代数·拓扑·同调速通', trackLabel: 'QAI',  trackClass: 'badge-qai',  desc: '交换代数、点集拓扑与同调代数，总装于 CSS 码、环面码与量子 AI 地图' },
  { key: 'fla',  label: '形式语言与自动机',       trackLabel: '语言', trackClass: 'badge-fla',  desc: '正则与上下文无关、图灵机与不可判定、一阶逻辑、MSO 与自动机的重合、复杂度地图' },
  { key: 'ct',   label: '计算理论',               trackLabel: '理论', trackClass: 'badge-ct',   desc: '可计算性与复杂性的机器：归约、P/NP 与 NPC、空间与随机化、交互证明、PCP 与电路下界' },
  { key: 'gfx',  label: '计算机图形学',           trackLabel: '图形', trackClass: 'badge-gfx',  desc: '成像与渲染（光栅化、相机、光照、光线追踪）、计算几何、计算机视觉' },
  { key: 'econ', label: '计算经济学',             trackLabel: '经济', trackClass: 'badge-econ', desc: '算法博弈论与机制设计：纳什均衡、VCG、无政府代价、稳定匹配与平台拍卖' },
  { key: 'gt',   label: '博弈论',                 trackLabel: '博弈', trackClass: 'badge-gt',   desc: '博弈论本体：纳什与minimax、子博弈完美、重复与合作、贝叶斯与信号、演化、PPAD' },
  { key: 'crypt', label: '密码学',               trackLabel: '密码', trackClass: 'badge-crypt', desc: '从完美保密到 TLS：对称与工作模式、哈希与 AEAD、DH/RSA/ECC、协议解剖与工程纪律' },
  { key: 'cir',   label: '数字电路',             trackLabel: '电路', trackClass: 'badge-cir',  desc: '从沙子到处理器：MOSFET 开关、CMOS 门、组合逻辑与加法器、锁存器与触发器、时钟方法学、存储电路与数据通路总装' },
  { key: 'db',    label: '数据库系统',           trackLabel: 'DB',  trackClass: 'badge-db',   desc: '从「数据放哪」到分布式：存储与 B+ 树、索引与执行计划、事务与 MVCC、复制与分片' },
  { key: 'os',    label: '操作系统',             trackLabel: 'OS',  trackClass: 'badge-os',   desc: '进程线程与调度、虚拟内存与页面置换、并发原语与死锁、文件系统与 I/O 模型' },
  { key: 'ca',    label: '计算机系统结构',       trackLabel: '结构', trackClass: 'badge-ca',  desc: '性能度量与 Amdahl、RISC-V 与流水线、乱序执行、缓存一致性与伪共享、SIMD、多核与 GPU、Roofline' },
  { key: 'net',   label: '计算机网络',           trackLabel: '网络', trackClass: 'badge-net', desc: '分层模型、IP 与路由、TCP 可靠性与拥塞控制、DNS/HTTP 演进与 TLS' },
];
const BOOK_LABEL = Object.fromEntries(BOOKS.map(b => [b.key, b.label]));

/* ══════════════ 学部（BOOKS 之上的归类层，2026-10-26 按学科划定） ══════════════
   顶栏分隔线、首页学部分组与「规划中」行都由它派生；books 的键必须都在 BOOKS 里。
   future 只在首页展示，是站点的选课地图——不是空头支票，新增大类时从这里挑。 */
const DIVISIONS = [
  { key: 'core',   label: '基础主线',        books: ['cs'],             future: [] },
  { key: 'math',   label: '数学基础',        books: ['math', 'comb', 'nt', 'gm'], future: [] },
  { key: 'ai',     label: '人工智能',        books: ['dl', 'ml', 'dlf', 'nlp'], future: ['强化学习', '具身智能'] },
  { key: 'qcs',    label: '量子计算机科学',  books: ['qc', 'qai'],      future: ['量子通信', '量子密码'] },
  { key: 'theory', label: '算法与理论',      books: ['fla', 'ct'],      future: ['算法与数据结构', '近似算法', '随机算法'] },
  { key: 'gfx',    label: '计算机图形学',    books: ['gfx'],            future: [] },
  { key: 'econ',   label: '经济学',          books: ['econ', 'gt'],     future: [] },
  { key: 'crypt',  label: '密码学',          books: ['crypt'],          future: [] },
  { key: 'sys',    label: '系统',            books: ['cir', 'db', 'os', 'ca', 'net'], future: [] },
];
const DIVISION_OF = {};
for (const d of DIVISIONS) for (const b of d.books) DIVISION_OF[b] = d;
// cs 的 track 分三档（core/recommended/optional）；每个并列大类一章一 track、与册同键
const TRACK_LABEL = Object.assign({ core: '核心', recommended: '建议', optional: '选读' },
  Object.fromEntries(BOOKS.filter(b => b.key !== 'cs').map(b => [b.key, b.trackLabel])));
const TRACK_CLASS = Object.assign({ core: 'badge-core', recommended: 'badge-rec', optional: 'badge-opt' },
  Object.fromEntries(BOOKS.filter(b => b.key !== 'cs').map(b => [b.key, b.trackClass])));

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
  { key: 'dl1', no: '基', title: '深度学习 · 基础与训练',   desc: '数学与记号、MLP 与反向传播、CNN、优化器、训练技巧',   range: [1, 7] },
  { key: 'dl2', no: '生', title: '深度学习 · 生成模型',     desc: '能量模型与采样、VAE、GAN、Flow 与扩散',               range: [8, 11] },
  { key: 'dl3', no: '序', title: '深度学习 · 序列与全景',   desc: 'RNN 与 LSTM、注意力与 Transformer、结课全景',          range: [12, 14] },
  { key: 'dlr', no: '复', title: '深度学习 · 复习总结',     desc: '闭卷自测与易混点对照',                                range: [15, 15] },
  { key: 'qc1', no: '基', title: '量子力学 · 基础原理',     desc: '约定与记号、要解决的问题、态矢量与叠加、可观测量与算子', range: [1, 4] },
  { key: 'qc2', no: '演', title: '量子力学 · 演化与测量',   desc: '幺正演化与薛定谔方程、Born 规则与坍缩、不确定原理',    range: [5, 7] },
  { key: 'qc3', no: '纠', title: '量子力学 · 复合系统与前沿', desc: '纠缠、密度算子、不可克隆、边界与 QCS 路口',            range: [8, 11] },
  { key: 'qr1', no: '复', title: '量子力学 · 复习总结',     desc: '闭卷自测与易混点对照',                                range: [12, 12] },
  { key: 'cn1', no: '基', title: '连续数学 · 分析地基', desc: '实数完备性、连续与紧致、微分与 Taylor、级数与一致收敛',        range: [1, 4] },
  { key: 'cn2', no: '维', title: '连续数学 · 多维与变换', desc: '多元微分与约束、向量分析与积分定理、傅里叶分析、复分析',      range: [5, 8] },
  { key: 'cn3', no: '方', title: '连续数学 · 方程、变分与算子', desc: '常微分方程与动力系统、变分法与最优控制、渐近分析、泛函分析与广义函数', range: [9, 12] },
  { key: 'cnr1', no: '复', title: '连续数学 · 复习总结', desc: '闭卷自测与易混点对照',                                        range: [13, 13] },
  { key: 'cn4', no: '进', title: '连续数学 · 调和分析与泛函进阶', desc: '傅里叶变换的深化、极大函数与插值、三大定理与弱收敛、Sobolev 与弱解', range: [13, 16] },
  { key: 'cnr2', no: '复', title: '连续数学 · 进阶复习总结', desc: '闭卷自测与易混点对照',                                    range: [14, 14] },
  { key: 'pb1', no: '基', title: '概率论 · 公理与极限', desc: '概率的公理化、随机变量与分布、多元与条件期望、极限定理',      range: [1, 4] },
  { key: 'pb2', no: '推', title: '概率论 · 统计推断', desc: '估计与似然、假设检验与置信区间、贝叶斯推断与后验计算',          range: [5, 7] },
  { key: 'pb3', no: '图', title: '概率论 · 图模型', desc: '贝叶斯网络与条件独立、无向模型与精确推断、隐变量与近似推断',    range: [8, 10] },
  { key: 'pb4', no: '过', title: '概率论 · 随机过程', desc: '马尔可夫链与 MCMC、泊松过程、鞅与集中不等式',                range: [11, 12] },
  { key: 'pb5', no: '测', title: '概率论 · 测度与实分析', desc: 'σ-代数与 Lebesgue 积分、概率的严格化与实分析工具箱',      range: [13, 14] },
  { key: 'pbr1', no: '复', title: '概率论 · 复习总结', desc: '闭卷自测与易混点对照',                                        range: [15, 15] },
  { key: 'pb6', no: '信', title: '概率论 · 信息、界与工程', desc: '信息论：熵与信道、大偏差与概率方法、排队论与可靠性',            range: [15, 17] },
  { key: 'pb7', no: '网', title: '概率论 · 网络、算法与决策', desc: '随机图与渗流、随机算法与随机数据结构、MDP 与强化学习、统计物理与蒙特卡洛', range: [18, 21] },
  { key: 'pbr2', no: '复', title: '概率论 · 应用复习总结', desc: '闭卷自测与易混点对照',                                        range: [22, 22] },
  { key: 'sd1', no: '随', title: '随机微分方程 · 布朗运动', desc: '从随机游走到布朗运动、性质、随机积分',                  range: [1, 3] },
  { key: 'sd2', no: '方', title: '随机微分方程 · 公式与名方程', desc: 'Itô 公式、Euler–Maruyama、OU 与几何布朗运动',       range: [4, 7] },
  { key: 'sd3', no: '泛', title: '随机微分方程 · 密度、ML 与数值', desc: 'Fokker–Planck、Langevin 与机器学习、收敛阶与稳定性', range: [8, 10] },
  { key: 'sr1', no: '复', title: '随机微分方程 · 复习总结', desc: '闭卷自测与易混点对照',                                  range: [11, 11] },
  { key: 'ct1', no: '语', title: '范畴论4CS · 语言', desc: '范畴、函子、自然变换',                                        range: [1, 3] },
  { key: 'ct2', no: '性', title: '范畴论4CS · 万有性质', desc: '积与余积、指数对象与 Curry–Howard、单子',                  range: [4, 6] },
  { key: 'ct3', no: '理', title: '范畴论4CS · 定理与应用', desc: 'Yoneda 引理、伴随函子、CS 应用地图、边界与下一层',       range: [7, 10] },
  { key: 'cr1', no: '复', title: '范畴论4CS · 复习总结', desc: '闭卷自测与易混点对照',                                    range: [11, 11] },
  { key: 'ml1', no: '凸', title: '机器学习与凸优化 · 凸优化基础', desc: '优化问题的共同形状、凸集与凸函数、梯度下降',      range: [1, 3] },
  { key: 'ml2', no: '模', title: '机器学习与凸优化 · 线性模型与优化器', desc: '线性回归与正则化、逻辑回归、SGD 与优化器、对偶与 KKT', range: [4, 7] },
  { key: 'ml3', no: '非', title: '机器学习与凸优化 · 从凸到非凸', desc: '支持向量机、泛化、神经网络',                      range: [8, 10] },
  { key: 'mr1', no: '复', title: '机器学习与凸优化 · 复习总结', desc: '闭卷自测与易混点对照',                              range: [11, 11] },
  { key: 'qa1', no: '环', title: '速通 · 交换代数', desc: '环、理想与商环、F₂ 多项式、特征 2 线性代数',                    range: [1, 3] },
  { key: 'qa2', no: '扑', title: '速通 · 点集拓扑', desc: '开集与连续、商空间与环面、单纯复形',                            range: [4, 6] },
  { key: 'qa3', no: '调', title: '速通 · 同调', desc: '同调与 Betti 数、正合列与链同伦、上同调与庞加莱对偶',                range: [7, 9] },
  { key: 'qa4', no: '量', title: '速通 · 通向量子 AI', desc: 'CSS 码与环面码、拓扑数据分析与量子核',                        range: [10, 11] },
  { key: 'qar1', no: '复', title: '速通 · 复习总结', desc: '闭卷自测与易混点对照',                                        range: [12, 12] },
  { key: 'gp1', no: '像', title: '计算机图形学 · 成像与渲染', desc: '像素与图像、光栅化、变换与相机、光照与着色、光线追踪与路径追踪', range: [1, 5] },
  { key: 'gp2', no: '几', title: '计算机图形学 · 计算几何', desc: '几何谓词与浮点精度、经典算法与空间加速结构',                  range: [6, 7] },
  { key: 'gp3', no: '视', title: '计算机图形学 · 计算机视觉', desc: '图像即信号、特征与匹配、相机与三维视觉、视觉进入深度学习时代', range: [8, 11] },
  { key: 'gr1', no: '复', title: '计算机图形学 · 复习总结', desc: '闭卷自测与易混点对照',                                      range: [12, 12] },
  { key: 'fa1', no: '语', title: '形式语言与自动机 · 语言与自动机', desc: '语言与判定问题、正则的边界与最小化、上下文无关与下推', range: [1, 3] },
  { key: 'fa2', no: '算', title: '形式语言与自动机 · 可计算性与逻辑', desc: '图灵机与通用计算、不可判定性与归约、一阶逻辑',      range: [4, 6] },
  { key: 'fa3', no: '逻', title: '形式语言与自动机 · 逻辑×自动机与验证', desc: 'MSO 与 Büchi/Courcelle、模型检查与时序逻辑',    range: [7, 8] },
  { key: 'fa4', no: '价', title: '形式语言与自动机 · 复杂度与地图', desc: '复杂度类与归约、可解性收束地图与书单',                range: [9, 10] },
  { key: 'fr1', no: '复', title: '形式语言与自动机 · 复习总结', desc: '闭卷自测与易混点对照',                                  range: [11, 11] },
  { key: 'ec1', no: '弈', title: '计算经济学 · 博弈与均衡', desc: '策略式博弈与纳什均衡、零和与极小极大的 LP 对偶',              range: [1, 2] },
  { key: 'ec2', no: '机', title: '计算经济学 · 机制设计与投票', desc: '二价拍卖与 VCG、算法机制设计、投票的不可能定理',          range: [3, 5] },
  { key: 'ec3', no: '价', title: '计算经济学 · 均衡、计算与匹配', desc: '无政府代价、均衡的计算与 PPAD、稳定匹配',              range: [6, 8] },
  { key: 'ec4', no: '台', title: '计算经济学 · 平台与收束', desc: '预算约束拍卖与收入、收束地图与书单',                        range: [9, 10] },
  { key: 'ecr1', no: '复', title: '计算经济学 · 复习总结', desc: '闭卷自测与易混点对照',                                      range: [11, 11] },
  { key: 'cy1', no: '密', title: '密码学 · 保密与分组密码', desc: '完美保密与攻击模型、AES 与工作模式',                        range: [1, 2] },
  { key: 'cy2', no: '证', title: '密码学 · 哈希与认证', desc: '哈希与生日攻击、MAC 与 AEAD、nonce 纪律',                      range: [3, 4] },
  { key: 'cy3', no: '钥', title: '密码学 · 公钥革命', desc: 'Diffie–Hellman、RSA 与签名、椭圆曲线',                          range: [5, 7] },
  { key: 'cy4', no: '协', title: '密码学 · 协议与工程', desc: 'TLS 1.3 解剖、零知识与秘密分享、工程纪律与收束',                range: [8, 10] },
  { key: 'cyr1', no: '复', title: '密码学 · 复习总结', desc: '闭卷自测与易混点对照',                                          range: [11, 11] },
  { key: 'db1',  no: '存', title: '数据库系统 · 存储与检索', desc: '从文件到 DBMS、页与 B+ 树、索引的艺术',                range: [1, 3] },
  { key: 'db2',  no: '查', title: '数据库系统 · 查询与优化', desc: '关系代数与连接算法、代价估算与执行计划',                range: [4, 5] },
  { key: 'db3',  no: '务', title: '数据库系统 · 事务',       desc: 'ACID 与崩溃恢复、锁与隔离级别、MVCC 与日志',            range: [6, 8] },
  { key: 'db4',  no: '布', title: '数据库系统 · 分布式与收束', desc: '复制与分片的一致性权衡、选型与生产实践',              range: [9, 10] },
  { key: 'dbr1', no: '复', title: '数据库系统 · 复习总结',   desc: '闭卷自测与易混点对照',                                  range: [11, 11] },
  { key: 'os1',  no: '管', title: '操作系统 · 抽象与调度',   desc: '三大抽象、进程与线程、CPU 调度',                        range: [1, 3] },
  { key: 'os2',  no: '页', title: '操作系统 · 虚拟内存',     desc: '页表与地址翻译、页面置换与局部性',                      range: [4, 5] },
  { key: 'os3',  no: '锁', title: '操作系统 · 并发与文件',   desc: 'CAS 与 futex、死锁破解、inode 与崩溃一致性',            range: [6, 8] },
  { key: 'os4',  no: '入', title: '操作系统 · I/O 与收束',   desc: '五种 I/O 模型与 epoll、性能定位地图',                    range: [9, 10] },
  { key: 'os5',  no: '进', title: '操作系统 · 进阶专题',     desc: '启动与中断、信号与终端、容器与 cgroups、虚拟化',          range: [11, 14] },
  { key: 'osr1', no: '复', title: '操作系统 · 复习总结',     desc: '闭卷自测与易混点对照',                                  range: [15, 15] },
  { key: 'ne1',  no: '层', title: '计算机网络 · 分层与链路', desc: '封装与分层职责、以太网与交换机、IP 与路由',              range: [1, 3] },
  { key: 'ne2',  no: '传', title: '计算机网络 · 传输',       desc: 'UDP 与 TCP、可靠性与重传、拥塞控制',                    range: [4, 6] },
  { key: 'ne3',  no: '用', title: '计算机网络 · 连接与应用', desc: '握手挥手与时延、DNS 与 HTTP 演进',                      range: [7, 8] },
  { key: 'ne4',  no: '安', title: '计算机网络 · 安全与收束', desc: 'TLS 的位置、排障工具箱与分层思维',                      range: [9, 10] },
  { key: 'ner1', no: '复', title: '计算机网络 · 复习总结',   desc: '闭卷自测与易混点对照',                                  range: [11, 11] },
  { key: 'th1',  no: '模', title: '计算理论 · 模型与归约',   desc: '从 OJ 机器到图灵机、归约的技艺与不可判定地图',            range: [1, 2] },
  { key: 'th2',  no: '类', title: '计算理论 · 复杂性类与 NPC', desc: 'P/NP 图谱、Cook-Levin、Ladner 与细粒度复杂度',          range: [3, 5] },
  { key: 'th3',  no: '机', title: '计算理论 · 空间、随机与交互', desc: 'PSPACE 与 TQBF、BPP、交互证明与 IP',                  range: [6, 8] },
  { key: 'th4',  no: '界', title: '计算理论 · 难近似与下界', desc: 'PCP 定理、电路复杂性与收束地图',                        range: [9, 10] },
  { key: 'thr1', no: '复', title: '计算理论 · 复习总结',     desc: '闭卷自测与易混点对照',                                  range: [11, 11] },
  { key: 'gt1',  no: '静', title: '博弈论 · 静态博弈',       desc: '策略式博弈与纳什均衡、零和与线性规划',                    range: [1, 2] },
  { key: 'gt2',  no: '动', title: '博弈论 · 动态、重复与信息', desc: '子博弈完美、重复博弈与合作的诞生、贝叶斯博弈与信号',      range: [3, 5] },
  { key: 'gt3',  no: '群', title: '博弈论 · 演化、合作与计算', desc: 'ESS 与复制子、核心与 Shapley 值、PPAD 与相关均衡',       range: [6, 8] },
  { key: 'gt4',  no: '市', title: '博弈论 · 应用与地图',   desc: '讨价还价与市场博弈、收束地图与书单',                      range: [9, 10] },
  { key: 'gtr1', no: '复', title: '博弈论 · 复习总结',       desc: '闭卷自测与易混点对照',                                  range: [11, 11] },
  { key: 'ca1',  no: '量', title: '系统结构 · 性能与 ISA',   desc: '延迟吞吐与 Amdahl、RISC-V 与指令集设计空间',              range: [1, 2] },
  { key: 'ca2',  no: '流', title: '系统结构 · 流水线与存储', desc: '五级流水与冒险、乱序执行、缓存与局部性',                  range: [3, 5] },
  { key: 'ca3',  no: '核', title: '系统结构 · 一致性与并行', desc: 'MESI 与伪共享、SIMD 与向量化、多核 SMT 与 GPU',          range: [6, 8] },
  { key: 'ca4',  no: '专', title: '系统结构 · IO 与专用架构', desc: '磁盘 SSD 与 RAID、Roofline 模型与收束地图',            range: [9, 10] },
  { key: 'car1', no: '复', title: '系统结构 · 复习总结',     desc: '闭卷自测与易混点对照',                                  range: [11, 11] },
  { key: 'cir1', no: '器', title: '数字电路 · 器件与门',     desc: '从沙子到 MOSFET、CMOS 门电路',                          range: [1, 2] },
  { key: 'cir2', no: '算', title: '数字电路 · 组合逻辑与运算', desc: '布尔代数与化简、加法器与进位链',                        range: [3, 4] },
  { key: 'cir3', no: '序', title: '数字电路 · 时序与时钟',   desc: '锁存器与毛刺、触发器、同步设计规则',                    range: [5, 7] },
  { key: 'cir4', no: '芯', title: '数字电路 · 存储、通路与芯片', desc: 'SRAM/DRAM、单周期数据通路总装、封装与总线',          range: [8, 10] },
  { key: 'cirr1', no: '复', title: '数字电路 · 复习总结',    desc: '闭卷自测与易混点对照',                                  range: [11, 11] },
  { key: 'num1', no: '误', title: '数值计算 · 误差与逼近',   desc: '浮点与舍入、数值微积分、插值与 Runge 现象',              range: [1, 3] },
  { key: 'num2', no: '解', title: '数值计算 · 方程与迭代',   desc: 'LU 分解与条件数、牛顿法与不动点迭代',                    range: [4, 5] },
  { key: 'numr1', no: '复', title: '数值计算 · 复习总结',    desc: '闭卷自测与易混点对照',                                  range: [6, 6] },
  { key: 'df1',  no: '张', title: '深度学习框架 · 张量与自动求导', desc: '张量对象与广播、自动求导用法、手写 40 行引擎',        range: [1, 3] },
  { key: 'df2',  no: '网', title: '深度学习框架 · 网络与训练', desc: 'nn.Module 与损失、三种优化器、五句话训练循环',        range: [4, 6] },
  { key: 'df3',  no: '数', title: '深度学习框架 · 数据与设备', desc: 'Dataset 与 DataLoader、GPU 与混合精度',               range: [7, 8] },
  { key: 'df4',  no: '收', title: '深度学习框架 · 保存与收束', desc: 'state_dict 与断点续训、数据并行、能力总表',           range: [9, 10] },
  { key: 'dfr1', no: '复', title: '深度学习框架 · 复习总结',  desc: '闭卷自测与易混点对照',                                  range: [11, 11] },
  { key: 'nl1',  no: '典', title: '自然语言处理 · 经典方法', desc: 'CFG 与 LSA、GMM-EM 与 HMM、N-gram 与词向量',            range: [1, 3] },
  { key: 'nl2',  no: '语', title: '自然语言处理 · 语言模型与分词', desc: 'RNN 语言模型、子词分词与损失实现',               range: [4, 5] },
  { key: 'nl3',  no: '预', title: '自然语言处理 · 预训练双路线', desc: 'BERT 与衍生、GPT 与 decoder-only、VAE 与语言 GAN',  range: [6, 9] },
  { key: 'nl4',  no: '智', title: '自然语言处理 · LLM 与对齐', desc: '扩展理论、训练与对齐、Agent 与应用',                 range: [10, 12] },
  { key: 'nl5',  no: '扩', title: '自然语言处理 · 扩充专题与收束', desc: '统计、翻译、标注、长文档、安全、多模态与架构串联', range: [13, 19] },
  { key: 'nlr1', no: '复', title: '自然语言处理 · 复习总结', desc: '概念线与流程速览',                                       range: [20, 20] },
  { key: 'cb1',  no: '计', title: '组合学 · 计数与生成函数', desc: '计数法则与双射、生成函数、经典数列',             range: [1, 3] },
  { key: 'cb2',  no: '构', title: '组合学 · 结构计数', desc: '树与图的计数、排列的组合结构',                             range: [4, 5] },
  { key: 'cb3',  no: '析', title: '组合学 · 分析组合学', desc: '奇点分析、奇点摄动与参数分布',                           range: [6, 7] },
  { key: 'cb4',  no: '谱', title: '组合学 · 谱方法', desc: '邻接谱与图参数、扩张图与随机游走、收束地图',         range: [8, 10] },
  { key: 'cbr1', no: '复', title: '组合学 · 复习总结', desc: '闭卷自测与易混点对照',                                     range: [11, 11] },
  { key: 'nt1',  no: '速', title: '数论 · 初等速通与素数初等', desc: '初等工具一页速通、π(x) 与 Chebyshev/Bertrand',        range: [1, 2] },
  { key: 'nt2',  no: 'ζ', title: '数论 · ζ 函数与素数定理', desc: 'Euler 乘积与解析延拓、函数方程、显式公式与 PNT 证明',    range: [3, 4] },
  { key: 'nt3',  no: 'L', title: '数论 · L 函数与筛法圆法', desc: 'Dirichlet 特征与 L(1,χ)、筛法与孪生素数前沿',           range: [5, 6] },
  { key: 'nt4',  no: '代', title: '数论 · 代数数论与局部方法', desc: '数域与代数整数环、理想与类数、p-adic 与局部-全局、收束', range: [7, 10] },
  { key: 'ntr1', no: '复', title: '数论 · 复习总结', desc: '闭卷自测与易混点对照',                                       range: [11, 11] },
  { key: 'gm1',  no: '群', title: '群论与模论 · 群论基础', desc: '群与陪集、商群与同态定理、群作用与 Sylow',             range: [1, 3] },
  { key: 'gm2',  no: '构', title: '群论与模论 · 结构定理', desc: '合成列与可解群、自由群与表现',                       range: [4, 5] },
  { key: 'gm3',  no: '模', title: '群论与模论 · 模论', desc: '模与同态、自由模与张量积',                                 range: [6, 7] },
  { key: 'gm4',  no: '示', title: '群论与模论 · 结构与表示', desc: 'PID 结构定理、半单性与表示论、收束地图',             range: [8, 10] },
  { key: 'gmr1', no: '复', title: '群论与模论 · 复习总结', desc: '闭卷自测与易混点对照',                                 range: [11, 11] },
  { key: 'opt', no: '☆', title: '选读 AI 分支',             desc: 'PyTorch 与模型训练、多 GPU 分布式训练、训练服务器',  range: [43, 45] },
  { key: 'cap', no: '终', title: '最终实践',                 desc: '贯穿项目：从命令行工具到可部署应用',                  range: [46, 46] },
  { key: 'app', no: '附', title: '附录',                     desc: '命令速查、术语表与工程实践专题',                      range: [47, 99] },
];

/* 阶段 → 所属大类；目录前缀 → 该大类首阶段（章节 phase 缺失时的兜底）。
   两表都由 BOOKS 的 key 构成，新增册时在这里补一行即可。 */
const PHASE_BOOK = {
  '1': 'cs', '2': 'cs', '3': 'cs', '4': 'cs', '5': 'cs', '6': 'cs', opt: 'cs', cap: 'cs', app: 'cs',
  dl1: 'dl', dl2: 'dl', dl3: 'dl', dlr: 'dl',
  qc1: 'qc', qc2: 'qc', qc3: 'qc', qr1: 'qc',
  ml1: 'ml', ml2: 'ml', ml3: 'ml', mr1: 'ml',
  sd1: 'math', sd2: 'math', sd3: 'math', sr1: 'math',
  ct1: 'math', ct2: 'math', ct3: 'math', cr1: 'math',
  qa1: 'qai', qa2: 'qai', qa3: 'qai', qa4: 'qai', qar1: 'qai',
  pb1: 'math', pb2: 'math', pb3: 'math', pb4: 'math', pb5: 'math', pbr1: 'math',
  pb6: 'math', pb7: 'math', pbr2: 'math',
  cn1: 'math', cn2: 'math', cn3: 'math', cn4: 'math', cnr1: 'math', cnr2: 'math',
  gp1: 'gfx', gp2: 'gfx', gp3: 'gfx', gr1: 'gfx',
  fa1: 'fla', fa2: 'fla', fa3: 'fla', fa4: 'fla', fr1: 'fla',
  ec1: 'econ', ec2: 'econ', ec3: 'econ', ec4: 'econ', ecr1: 'econ',
  cy1: 'crypt', cy2: 'crypt', cy3: 'crypt', cy4: 'crypt', cyr1: 'crypt',
  db1: 'db', db2: 'db', db3: 'db', db4: 'db', dbr1: 'db',
  os1: 'os', os2: 'os', os3: 'os', os4: 'os', osr1: 'os',
  ne1: 'net', ne2: 'net', ne3: 'net', ne4: 'net', ner1: 'net',
  os5: 'os',
  th1: 'ct', th2: 'ct', th3: 'ct', th4: 'ct', thr1: 'ct',
  cir1: 'cir', cir2: 'cir', cir3: 'cir', cir4: 'cir', cirr1: 'cir',
  num1: 'math', num2: 'math', numr1: 'math',
  df1: 'dlf', df2: 'dlf', df3: 'dlf', df4: 'dlf', dfr1: 'dlf',
  nl1: 'nlp', nl2: 'nlp', nl3: 'nlp', nl4: 'nlp', nl5: 'nlp', nlr1: 'nlp',
  cb1: 'comb', cb2: 'comb', cb3: 'comb', cb4: 'comb', cbr1: 'comb',
  nt1: 'nt', nt2: 'nt', nt3: 'nt', nt4: 'nt', ntr1: 'nt',
  gm1: 'gm', gm2: 'gm', gm3: 'gm', gm4: 'gm', gmr1: 'gm',
  gt1: 'gt', gt2: 'gt', gt3: 'gt', gt4: 'gt', gtr1: 'gt',
  ca1: 'ca', ca2: 'ca', ca3: 'ca', ca4: 'ca', car1: 'ca',
};
const PHASE_DIR = { '13-': 'dl1', '14-': 'qc1', '15-': 'ml1', '16-': 'sd1',
                    '17-': 'ct1', '18-': 'qa1', '19-': 'pb1', '20-': 'cn1', '21-': 'gp1', '22-': 'fa1', '23-': 'ec1', '24-': 'cy1', '25-': 'db1', '26-': 'os1', '27-': 'ne1', '28-': 'th1', '29-': 'gt1', '30-': 'ca1', '31-': 'cir1', '32-': 'num1', '33-': 'df1', '34-': 'nl1', '35-': 'cb1', '36-': 'nt1', '37-': 'gm1' };
const PHASE_KEYS = new Set(PHASES.map(ph => ph.key));

function phaseOf(c) {
  // 服务端若提供 phase 字段，直接采用
  if (c.phase !== undefined && c.phase !== null && c.phase !== '') {
    const p = String(c.phase).toLowerCase();
    if (p === 'optional') return 'opt';
    if (p === 'capstone') return 'cap';
    if (p === 'appendix') return 'app';
    if (PHASE_KEYS.has(p)) return p;
    // 未注册的 phase 绝不静默并入别的册：先在控制台报出来，再按目录前缀兜底
    console.warn('[phases] 未注册的 phase「' + c.phase + '」(path=' + (c.path || '') + ')，按目录前缀兜底');
  }
  // 大类的编号也从 1 起、与计算机速通重合，故先按目录前缀分流
  for (const pfx in PHASE_DIR) {
    if ((c.path || '').indexOf(pfx) === 0) return PHASE_DIR[pfx];
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
    if (n <= 46) return 'cap';
    // 兜底曾是 'dl1'（深度学习独苗年代）；编号异常大的章现在归附录，
    // 配合上方控制台的未注册告警定位数据问题
    return 'app';
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

/* ══════════════ 大类与阶段（表在文件头部，此处只做派生） ══════════════ */
function phaseBook(key) { return PHASE_BOOK[key] || 'cs'; }
function bookOf(c) { return phaseBook(phaseOf(c)); }
function activeBook() {
  if (currentPath) {
    const c = chapters.find(x => x.path === currentPath);
    if (c) return bookOf(c);
  }
  try { const b = localStorage.getItem('reader-book') || 'cs'; return LEGACY_BOOK[b] || b; } catch (e) { return 'cs'; }
}
function setActiveBook(b) { try { localStorage.setItem('reader-book', b); } catch (e) { /* 忽略 */ } }

/* ══════════════ 部分（大类内部的第二级，oi-wiki 式层级） ══════════════
   只登记真正分部分的大类；未登记的大类侧栏与路线图维持单层阶段分组。
   desc 沿用合并前各分册的一句话简介。2026-10-26 数学基础六部分。 */
const BOOK_PARTS = {
  math: [
    { label: '连续数学',           desc: '分析地基、多维与变换、方程与变分，进阶篇补调和分析与泛函三大定理', phases: ['cn1', 'cn2', 'cn3', 'cnr1', 'cn4', 'cnr2'] },
    { label: '概率论',             desc: '公理与极限定理、统计推断、图模型、随机过程、测度，外加应用概率七章', phases: ['pb1', 'pb2', 'pb3', 'pb4', 'pb5', 'pbr1', 'pb6', 'pb7', 'pbr2'] },
    { label: '随机微分方程',       desc: '随机游走走出布朗运动，Itô 微积分与两大名方程，合流 Langevin 与机器学习', phases: ['sd1', 'sd2', 'sd3', 'sr1'] },
    { label: '范畴论4CS',          desc: '范畴、函子与万有性质，Yoneda、伴随与单子，收在 CS 应用地图', phases: ['ct1', 'ct2', 'ct3', 'cr1'] },
    { label: '数值计算',           desc: '浮点与舍入、数值微积分、插值、LU 与条件数、迭代法——连续数学落地成代码的纪律', phases: ['num1', 'num2', 'numr1'] },
  ],
};
const PART_OF = {};
for (const parts of Object.values(BOOK_PARTS)) {
  for (const p of parts) for (const k of p.phases) PART_OF[k] = p;
}
function bookHasParts(b) { return Array.isArray(BOOK_PARTS[b]) && BOOK_PARTS[b].length > 0; }
function partOfPhase(phKey) { return PART_OF[phKey] || null; }
/* 分部分的大类里，阶段组标题去掉「连续数学 · 」这类前缀，避免与部分标题重复 */
function phaseDisplayTitle(ph) {
  if (partOfPhase(ph.key)) {
    const seg = ph.title.split(' · ');
    if (seg.length > 1) return seg.slice(1).join(' · ');
  }
  return ph.title;
}

/* ══════════════ 顶栏（首页 + 两个并列大类） ══════════════ */
/* 学部在顶栏只占一个按钮，书收进悬停下拉——十六书平铺版（2026-10-26）在新增
   三书后已到一行极限，学部菜单（2026-10-27）是顶栏的稳定形态：书增减只改
   DIVISIONS/BOOKS，顶栏按钮数不变。 */
const DIVISION_SHORT = { core: '核心', math: '数学', ai: 'AI', qcs: '量子', theory: '理论', gfx: '图形', econ: '经济', crypt: '密码', sys: '系统' };
function renderTopnav() {
  const nav = $('topnav');
  if (!nav) return;
  nav.innerHTML = '<button type="button" class="topnav-item" data-home="1" title="学习路线图">首页</button>' +
    DIVISIONS.map(d => {
      const books = d.books.map(k => BOOKS.find(b => b.key === k)).filter(Boolean);
      if (!books.length) return '';
      const items = books.map(b => {
        const first = chapters.find(c => c.exists && bookOf(c) === b.key) || chapters.find(c => bookOf(c) === b.key);
        return '<button type="button" class="nav-book" data-book="' + b.key + '"' +
          (first ? ' data-path="' + escapeHtml(first.path) + '"' : '') +
          ' title="' + b.label + '"><span class="badge ' + b.trackClass + '">' + b.trackLabel + '</span><span class="nb-name">' + b.label + '</span></button>';
      }).join('');
      return '<div class="nav-group" data-division="' + d.key + '">' +
        '<button type="button" class="topnav-item" data-division="' + d.key + '" title="' + d.label + '" aria-haspopup="true" aria-expanded="false">' + (DIVISION_SHORT[d.key] || d.label) + '</button>' +
        '<div class="nav-menu" hidden>' + items + '</div></div>';
    }).join('');
  updateTopnavActive();
}

function updateTopnavActive() {
  const nav = $('topnav');
  if (!nav) return;
  const cur = currentPath ? activeBook() : null;
  nav.querySelectorAll('.nav-group').forEach(g => {
    const on = !!cur && DIVISION_OF[cur] && DIVISION_OF[cur].key === g.dataset.division;
    g.querySelector('.topnav-item').classList.toggle('active', on);
    g.querySelector('.topnav-item').setAttribute('aria-expanded', g.classList.contains('open') ? 'true' : 'false');
  });
  const home = nav.querySelector('[data-home]');
  if (home) home.classList.toggle('active', !cur);
}

// 悬停关闭走短延迟而不是立即关：鼠标斜穿按钮与菜单间的缝隙、
// 或滑过相邻学部按钮的瞬间不至把菜单拍死（缝隙本身由 .nav-menu::before 桥面盖住）
let topnavCloseTimer = null;
function armTopnavClose() {
  if (!window.matchMedia('(hover: hover)').matches) return;
  if (topnavCloseTimer) clearTimeout(topnavCloseTimer);
  topnavCloseTimer = setTimeout(() => { topnavCloseTimer = null; closeAllNavMenus(); }, 220);
}
function cancelTopnavClose() {
  if (topnavCloseTimer) { clearTimeout(topnavCloseTimer); topnavCloseTimer = null; }
}
function closeAllNavMenus(except) {
  document.querySelectorAll('.nav-group.open').forEach(g => {
    if (g === except) return;
    g.classList.remove('open');
    g.querySelector('.nav-menu').hidden = true;
    g.querySelector('.topnav-item').setAttribute('aria-expanded', 'false');
  });
}

const topnavEl = $('topnav');
if (topnavEl) {
  topnavEl.addEventListener('click', event => {
    const book = event.target.closest('.nav-book');
    if (book) {
      closeAllNavMenus();
      if (book.dataset.path) {
        setActiveBook(book.dataset.book);
        window.location.hash = encodeURIComponent(book.dataset.path);
      }
      return;
    }
    const btn = event.target.closest('.topnav-item');
    if (!btn) return;
    if (btn.dataset.home) {
      if (window.location.hash === '#roadmap') showRoadmap();
      else window.location.hash = 'roadmap';
      return;
    }
    if (btn.dataset.division) {
      const group = btn.closest('.nav-group');
      const opening = !group.classList.contains('open');
      closeAllNavMenus();
      if (opening) {
        group.classList.add('open');
        group.querySelector('.nav-menu').hidden = false;
        btn.setAttribute('aria-expanded', 'true');
      }
    }
  });
  // 桌面悬停开合；touch 设备没有 mouseenter 轰炸，靠上面的 click 分支
  topnavEl.addEventListener('mouseover', event => {
    if (!window.matchMedia('(hover: hover)').matches) return;
    const group = event.target.closest('.nav-group');
    if (!group) return;
    cancelTopnavClose();
    closeAllNavMenus(group);
    group.classList.add('open');
    group.querySelector('.nav-menu').hidden = false;
    group.querySelector('.topnav-item').setAttribute('aria-expanded', 'true');
  });
  topnavEl.addEventListener('mouseleave', () => {
    if (window.matchMedia('(hover: hover)').matches) armTopnavClose();
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('#topnav')) { cancelTopnavClose(); closeAllNavMenus(); }
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') { cancelTopnavClose(); closeAllNavMenus(); }
  });
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
  // 复习阶段一律读作「复习 R<序号>」：序号取 phase key 自身的编号
  // （cnr1/pbr1/mr1/sr1/cr1/qar1→R1，cnr2/pbr2→R2，与各部分复习章文件名一致；
  //   2026-10-26 数学六册并入一个大类后不能再按册内先后计数，那会把概率论 R1 数成 R3）
  if (/r\d+$/.test(ph.key) && phaseBook(ph.key) !== 'cs') {
    return '复习 R' + ph.key.match(/r(\d+)$/)[1];
  }
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
  // no-cache＝强制再验证：章节被更新后读者刷新即可拿到新版，浏览器不会
  // 按启发式缓存把旧正文多留几轮（静态服务器普遍不发 Cache-Control）
  const res = await fetch(url, { cache: 'no-cache' });
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
    CHAPTERS_BASE = chapters.map(chapter => Object.assign({}, chapter));
    const serverMode = await detectServer();
    if (serverMode) await loadArticleMeta();
    renderSidebar();
    renderTopnav();
    renderRoadmap();
    updateChapterCount();
    refreshProgressMarks();

    const fromHash = decodePathFromHash();
    // 账号页允许直接用链接进入；未登录时页面自己会给登录提示
    if (['profile', 'settings', 'feedback', 'users', 'articles'].includes(fromHash)) {
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
  $('chapter-groups').dataset.book = activeBook();
  const sbTitle = document.querySelector('.sidebar-section-title');
  if (sbTitle) sbTitle.textContent = BOOK_LABEL[activeBook()];
  const groupHtml = ph => {
    const list = groups.get(ph.key) || [];
    if (!list.length) return '';
    const done = list.filter(isComplete).length;
    return `<div class="chapter-group collapsed" data-phase="${ph.key}">
      <button type="button" class="group-head" aria-expanded="false">
        <svg class="caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 6l6 6-6 6"/>
        </svg>
        <span class="group-title">${escapeHtml(phaseDisplayTitle(ph))}</span>
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
  };
  const phases = PHASES.filter(ph => phaseBook(ph.key) === activeBook() && (groups.get(ph.key) || []).length);
  let html;
  if (bookHasParts(activeBook())) {
    // 两级折叠：部分头（默认展开）→ 阶段组（照旧默认折叠）
    html = BOOK_PARTS[activeBook()].map(part => {
      const keys = part.phases.filter(k => phases.some(ph => ph.key === k));
      if (!keys.length) return '';
      const chaptersInPart = keys.flatMap(k => groups.get(k) || []);
      const done = chaptersInPart.filter(isComplete).length;
      return `<div class="part-block" data-part="${escapeHtml(part.label)}">
        <button type="button" class="part-head" aria-expanded="true" title="${escapeHtml(part.desc || '')}">
          <svg class="caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 6l6 6-6 6"/>
          </svg>
          <span class="part-title">${escapeHtml(part.label)}</span>
          <span class="part-count" title="已完成 / 全部">${done}/${chaptersInPart.length}</span>
        </button>
        <div class="part-body">${keys.map(k => groupHtml(PHASES.find(p => p.key === k))).join('')}</div>
      </div>`;
    }).join('');
  } else {
    html = phases.map(groupHtml).join('');
  }
  $('chapter-groups').innerHTML = html;
  refreshProgressMarks();
}

// 侧边栏事件委托：加载章节 / 折叠分组 / 切换面板
$('chapter-groups').addEventListener('click', e => {
  const item = e.target.closest('.chapter-item');
  if (item) {
    if (!item.disabled) loadChapter(item.dataset.path);
    return;
  }
  const partHead = e.target.closest('.part-head');
  if (partHead) {
    const block = partHead.closest('.part-block');
    const list = $('chapter-groups');
    const listScroll = list.scrollTop;
    const pageScroll = window.scrollY;
    const collapsed = block.classList.toggle('collapsed');
    partHead.setAttribute('aria-expanded', String(!collapsed));
    list.scrollTop = listScroll;
    window.requestAnimationFrame(() => {
      list.scrollTop = listScroll;
      if (Math.abs(window.scrollY - pageScroll) > 1) window.scrollTo(0, pageScroll);
    });
    return;
  }
  const head = e.target.closest('.group-head');
  if (head) {
    const group = head.closest('.chapter-group');
    const list = $('chapter-groups');
    // 折叠会改变侧栏内容高度，浏览器可能为了保持焦点而滚动列表/页面，
    // 表现为「顶栏和正文突然跳一下」。这里在切换前后锁住两个滚动位置。
    const listScroll = list.scrollTop;
    const pageScroll = window.scrollY;
    const collapsed = group.classList.toggle('collapsed');
    head.setAttribute('aria-expanded', String(!collapsed));
    list.scrollTop = listScroll;
    window.requestAnimationFrame(() => {
      list.scrollTop = listScroll;
      if (Math.abs(window.scrollY - pageScroll) > 1) window.scrollTo(0, pageScroll);
    });
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
  document.querySelectorAll('.part-block').forEach(pb => {
    let partVisible = 0;
    pb.querySelectorAll('.chapter-group').forEach(g => {
      let visible = 0;
      g.querySelectorAll('.chapter-item').forEach(el => {
        const show = !q || el.textContent.toLowerCase().includes(q);
        el.style.display = show ? '' : 'none';
        if (show) visible++;
      });
      g.style.display = visible ? '' : 'none';
      if (visible) partVisible++;
    });
    pb.style.display = partVisible ? '' : 'none';
    // 命中筛选的部分临时展开，否则折叠的部分把结果藏住
    if (q && partVisible) {
      pb.classList.remove('collapsed');
      pb.querySelector('.part-head')?.setAttribute('aria-expanded', 'true');
    }
    if (partVisible) anyVisible = true;
  });
  document.querySelectorAll('.chapter-group').forEach(g => {
    if (g.closest('.part-block')) return; // 已随所属部分处理
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
  const rail = $('toc-rail'), railList = $('toc-rail-list');
  if (!list.length) {
    placeholder.hidden = true;
    toc.hidden = false;
    toc.innerHTML = '<div class="toc-empty">本章没有二级 / 三级标题</div>';
    if (rail) rail.hidden = true;
    if (railList) railList.innerHTML = '';
    return;
  }
  placeholder.hidden = true;
  toc.hidden = false;
  const meta = chapters.find(c => c.path === currentPath);
  const itemsHTML = list.map(t =>
    `<button type="button" class="toc-item lv${t.level}" data-id="${t.id}">${escapeHtml(t.text)}</button>`
  ).join('');
  toc.innerHTML =
    (meta ? `<div class="toc-chapter">${escapeHtml(meta.name)}</div>` : '') + itemsHTML;
  if (railList) railList.innerHTML = itemsHTML;
  if (rail) rail.hidden = false;
}

function handleTocClick(event) {
  const btn = event.target.closest('.toc-item');
  if (!btn) return;
  const t = tocHeadings.find(h => h.id === btn.dataset.id);
  if (t) {
    t.el.scrollIntoView({ block: 'start' });
    flashSection(t.el);
  }
}
$('toc-list').addEventListener('click', handleTocClick);
$('toc-rail-list').addEventListener('click', handleTocClick);

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
  updateTerminalButton();
  {
    const cc = chapters.find(c => c.path === path);
    if (cc) {
      setActiveBook(bookOf(cc));
      // 跨大类跳转（顶栏切换、分享链接）时侧栏要换书重渲；同类内跳转保持展开状态
      if ($('chapter-groups').dataset.book !== bookOf(cc)) renderSidebar();
    }
  }
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
  if (p === 'profile' || p === 'settings' || p === 'feedback') { showAccountPage(p); return; }
  if (p !== currentPath) {
    const known = chapters.some(c => c.path === p);
    if (known) loadChapter(p);
  }
});

/* ══════════════ 路线图 ══════════════ */
function renderRoadmap() {
  const groups = groupByPhase(chapters);
  let cardSeq = 0;   // 入场瀑布的全局顺序（CSS 侧封顶 12 档延迟）
  // 阶段瓦片：紧凑网格的一格（编号＋短标题＋完成数＋迷你进度条），点击进该阶段第一章。
  // 旧版每个阶段一整行大卡（含简介与全部章节 chip），十六书展开后首页长逾十屏——
  // 紧凑化后书内阶段并列成行，章节明细交给侧栏与书内目录。
  const phaseTile = ph => {
    const list = groups.get(ph.key) || [];
    if (!list.length) return '';
    const done = list.filter(isComplete).length;
    const pct = Math.round(done / list.length * 100);
    const first = list.find(c => c.exists);
    return `<button type="button" class="phase-tile" data-path="${escapeHtml(first ? first.path : '')}"${first ? '' : ' disabled'} style="--i:${cardSeq++ % 12}" title="${escapeHtml(ph.title)}">
      <span class="pt-top"><span class="phase-badge">${ph.no}</span><span class="pt-count">${done}/${list.length}</span></span>
      <span class="pt-title">${escapeHtml(phaseDisplayTitle(ph))}</span>
      <span class="pt-bar"><span class="pt-fill" style="width:${pct}%"></span></span>
    </button>`;
  };
  // 首页结构＝学部 → 书卡（书头行＋书级进度＋阶段瓦片网格）。
  // 学部头与「规划中」行来自 DIVISIONS——它是全站的选课地图。
  const bookBlock = b => {
    const bookPhases = PHASES.filter(ph => phaseBook(ph.key) === b.key);
    const list = bookPhases.flatMap(ph => groups.get(ph.key) || []);
    if (!list.length) return '';
    const done = list.filter(isComplete).length;
    const pct = Math.round(done / list.length * 100);
    const first = list.find(c => c.exists);
    let body = '';
    if (bookHasParts(b.key)) {
      // 分部分的大类：每个部分一个瓦片段（部分名＋完成数一行的薄头）
      for (const part of BOOK_PARTS[b.key]) {
        const keys = part.phases.filter(k => bookPhases.some(ph => ph.key === k));
        const tiles = keys.map(k => phaseTile(PHASES.find(p => p.key === k))).join('');
        if (!tiles) continue;
        const chs = keys.flatMap(k => groups.get(k) || []);
        const d = chs.filter(isComplete).length;
        body += `<div class="tile-part"><div class="tp-head"><span class="tp-label">${escapeHtml(part.label)}</span><span class="tp-count">${d}/${chs.length} 章</span></div><div class="book-tiles">${tiles}</div></div>`;
      }
    } else {
      body = `<div class="book-tiles">${bookPhases.map(phaseTile).join('')}</div>`;
    }
    return `<section class="book-section" style="--i:${cardSeq++ % 12}">
      <header class="book-head">
        <span class="badge ${b.trackClass}">${b.trackLabel}</span>
        <h2 class="book-title">${escapeHtml(b.label)}</h2>
        <span class="book-count">${done} / ${list.length} 章完成</span>
        ${first ? `<button type="button" class="book-enter" data-book="${b.key}" data-path="${escapeHtml(first.path)}">进入 →</button>` : ''}
      </header>
      <p class="book-desc">${escapeHtml(b.desc || '')}</p>
      <div class="progress-track book-track" role="progressbar" aria-valuenow="${done}" aria-valuemin="0" aria-valuemax="${list.length}" aria-label="${escapeHtml(b.label)} 进度">
        <div class="progress-fill" style="width:${pct}%"></div>
      </div>
      ${body}
    </section>`;
  };
  $('phase-cards').innerHTML = DIVISIONS.map(d => {
    const cards = d.books.map(k => bookBlock(BOOKS.find(b => b.key === k))).join('');
    if (!cards) return '';
    const future = d.future.length ? `<p class="division-future">规划中：${escapeHtml(d.future.join('、'))}</p>` : '';
    return `<div class="division-block">
      <h2 class="division-head">${escapeHtml(d.label)}</h2>
      ${cards}${future}
    </div>`;
  }).join('');
}

// 路线图点击加载章节（事件委托）；书头卡的「进入」与顶栏书签同一条路径
$('phase-cards').addEventListener('click', e => {
  const enter = e.target.closest('.book-enter');
  if (enter && enter.dataset.path) {
    setActiveBook(enter.dataset.book);
    window.location.hash = encodeURIComponent(enter.dataset.path);
    return;
  }
  const chip = e.target.closest('.chapter-chip');
  if (chip && !chip.disabled) { loadChapter(chip.dataset.path); return; }
  const tile = e.target.closest('.phase-tile');
  if (tile && !tile.disabled && tile.dataset.path) loadChapter(tile.dataset.path);
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
  updateTerminalButton();
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
  // 首页 = 学习路线图：十四书的书头卡＋各自的阶段时间线
  $('roadmap').hidden = false;
  tocHeadings = [];
  $('toc-list').hidden = true;
  $('toc-placeholder').hidden = false;
  $('toc-rail').hidden = true;
  $('comments').hidden = true;
  $('comments-list').innerHTML = '';
  COMMENTS_PATH = null;
  COMMENTS_GEN += 1;
  updateAskFab();
  setActiveChapter(null);
  updateTopnavActive();
  document.title = 'CS Wiki · 学习路线图';
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

/* ══════════════ 零依赖降级渲染 ══════════════
   CDN（marked / KaTeX / highlight.js）不可达时，旧做法是 showError 后 return——
   结果是整页只剩一条错误提示（实测：jsdelivr 在国内网络下常被阻断，正文与公式
   全不渲染、侧栏却正常，很容易被误判成站点坏了）。这里内置一个极简渲染器：
   标题、段落、编号/无序列表、引用、代码围栏、分隔线、强调、链接、行内代码；
   公式与表格按源码显示。目标是「能读」，不追求排版，顶部另加一条降级提示条。 */
function fallbackMarkdown(md) {
  const inline = s => escapeHtml(s)
    .replace(/`([^`\n]+)`/g, (m, c) => '<code>' + c + '</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>');
  // 标题里的编号壳（$\rm \S \, 1.3$ / $\rm Chapter \, 3$）在降级模式下没有 KaTeX，
  // 直接换成可读的「§1.3」「第 3 章」，否则每个标题都以一段 LaTeX 开头
  const cleanHeading = s => s
    .replace(/\$\\rm\s*\\S\s*\\,\s*([\dA-Za-z.]+)\$/g, '§$1')
    .replace(/\$\\rm\s*Chapter\s*\\,\s*([\dA-Za-z]+)\$/g, '第 $1 章');
  const lines = String(md).replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  let list = null, fence = false, buf = [];
  const flushPara = () => { if (buf.length) { out.push('<p>' + inline(buf.join(' ')) + '</p>'); buf = []; } };
  const closeList = () => { if (list) { out.push('</' + list + '>'); list = null; } };
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    if (/^```/.test(line.trim())) {
      flushPara(); closeList();
      fence = !fence;
      out.push(fence ? '<pre><code>' : '</code></pre>');
      continue;
    }
    if (fence) { out.push(escapeHtml(raw)); continue; }
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) { flushPara(); closeList(); const n = h[1].length; out.push('<h' + n + '>' + inline(cleanHeading(h[2])) + '</h' + n + '>'); continue; }
    if (!line.trim()) { flushPara(); closeList(); continue; }
    if (/^>\s?/.test(line)) { flushPara(); closeList(); out.push('<blockquote>' + inline(line.replace(/^>\s?/, '')) + '</blockquote>'); continue; }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) { flushPara(); closeList(); out.push('<hr>'); continue; }
    const ul = /^\s{0,3}[-*+]\s+(.*)$/.exec(line);
    const ol = /^\s{0,3}\d+\.\s+(.*)$/.exec(line);
    if (ul || ol) {
      flushPara();
      const want = ul ? 'ul' : 'ol';
      if (list && list !== want) closeList();
      if (!list) { list = want; out.push('<' + want + '>'); }
      out.push('<li>' + inline(ul ? ul[1] : ol[1]) + '</li>');
      continue;
    }
    if (/^\|/.test(line)) { flushPara(); closeList(); out.push('<pre><code>' + escapeHtml(line) + '</code></pre>'); continue; }
    buf.push(line);
  }
  flushPara(); closeList();
  if (fence) out.push('</code></pre>');
  return out.join('\n');
}

function degradedNotice() {
  return '<div class="degraded-notice">渲染组件未能从 CDN 加载（marked / KaTeX / highlight.js），' +
         '已切换为内置降级排版：正文可读，数学公式与代码高亮按源码显示。' +
         '网络恢复后刷新页面即可恢复完整排版。</div>';
}

/* ══════════════ 正文渲染 ══════════════ */
function renderContent(md, path) {
  // CDN 组件缺失不再放弃渲染：走内置降级渲染器（旧实现在这里 showError 后 return，
  // 于是 CDN 被阻断的网络下整页空白——见 fallbackMarkdown 的说明）
  const degraded = !cdnReady();

  const meta = chapters.find(c => c.path === path) || {};
  const html = (degraded ? degradedNotice() : '') + (degraded ? fallbackMarkdown(md) : renderMarkdown(md));
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

  // 代码高亮 —— 即使没有标注语言也尝试自动检测（demo 块已先被替换成交互组件）
  setupDemos(content);
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
  setupAnswerFold();
  setupAskButtons();
  setupGradeButtons();
  loadComments(path);

  // 侧边栏与顶栏高亮当前章节
  setActiveChapter(path);
  updateTopnavActive();

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
  document.title = (meta.name || '') + ' — CS Wiki';

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
    // 章在部分层里：所属部分若被手动折叠过，这里一并展开，保证章可见
    const block = active.closest('.part-block');
    if (block) {
      block.classList.remove('collapsed');
      block.querySelector('.part-head')?.setAttribute('aria-expanded', 'true');
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
/* 相邻章节：按 chapters 的阅读顺序取上一/下一「存在」的章（可能跨册，与翻页按钮同源） */
function chapterNeighbors() {
  const idx = chapters.findIndex(c => c.path === currentPath);
  if (idx < 0) return { prev: null, next: null };
  let prev = null, next = null;
  for (let i = idx - 1; i >= 0 && !prev; i--) if (chapters[i].exists) prev = chapters[i];
  for (let i = idx + 1; i < chapters.length && !next; i++) if (chapters[i].exists) next = chapters[i];
  return { prev, next };
}

function updatePrevNext() {
  const nav = $('chapter-nav');
  const prevBtn = $('prev-btn'), nextBtn = $('next-btn');
  const { prev, next } = chapterNeighbors();
  if (!prev && !next) { nav.classList.remove('show'); return; }

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
  if (isDesktopSidebar()) {
    // 桌面端：汉堡按钮只在侧栏收起时出现，点它就是展开
    setSidebarCollapsed(false);
    return;
  }
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
  // transform 驱动（GPU 合成，不触发重排）；非章节视图（路线图/账号页）收回
  if (currentPath) {
    const p = max > 0 ? Math.min(1, Math.max(0, doc.scrollTop / max)) : 0;
    $('progress-bar').style.transform = 'scaleX(' + p.toFixed(4) + ')';
  } else {
    $('progress-bar').style.transform = 'scaleX(0)';
  }
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
  // 自检清单是编号列表（全书列表一律编号），选择器必须同时认 ol——
  // 只匹配 ul 时这功能静默失效（用户视角就是「自检框点不了」）
  const items = content.querySelectorAll('blockquote ul li, blockquote ol li');
  if (!items.length) return;
  const key = 'selfcheck:' + (currentPath || '');
  let saved = [];
  try { saved = JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) { saved = []; }
  const set = new Set(Array.isArray(saved) ? saved : []);

  items.forEach((li, i) => {
    // 只认「首个文本节点以 □ 开头」的项；勾选状态只替换那个标记字符，
    // 不重建 li 的 innerHTML——否则 KaTeX 渲染结果与回读链接会被 textContent 拍平
    const walker = document.createTreeWalker(li, NodeFilter.SHOW_TEXT);
    const firstText = walker.nextNode();
    if (!firstText || !/^\s*□/.test(firstText.nodeValue)) return;
    li.classList.add('checkable');
    li.setAttribute('role', 'checkbox');
    li.tabIndex = 0;
    li.title = '点击勾选／取消（回车或空格同样有效）';
    const paint = on => {
      firstText.nodeValue = firstText.nodeValue.replace(/^\s*[□✓]/, on ? '✓' : '□');
      li.classList.toggle('checked', on);
      li.setAttribute('aria-checked', String(on));
    };
    paint(set.has(i));
    const toggle = e => {
      if (e.target.closest('a')) return;   // 点回读链接时只跳转，不切换勾选
      const on = !set.has(i);
      if (on) set.add(i); else set.delete(i);
      paint(on);
      try { localStorage.setItem(key, JSON.stringify([...set])); } catch (e) { /* 存储不可用时忽略 */ }
      saveChecksToServer(currentPath, [...set]);
    };
    li.addEventListener('click', toggle);
    li.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(e); }
    });
  });
}

/* ── 答案折叠：章末「本章自测答案」与复习章「答案与提示」默认收起 ──
   教材合同要求闭卷作答，但正文里答案一直平铺可见；这里把该节包进折叠区。
   H2 标题保留在 DOM 里（本章目录的锚点不动），折叠的是其后的答案本体，
   遇到下一个 H2 或分隔线为止——桥接段与「你现在能」保持在折叠区外。 */
function setupAnswerFold() {
  const content = $('content');
  [...content.querySelectorAll('h2')].forEach(h => {
    if (h.closest('.answer-fold')) return;
    // H2 标题里带 KaTeX 源码前缀（章号公式在最前），匹配只认标题结尾这几个字
    if (!/(本章自测答案|答案与提示)\s*$/.test((h.textContent || '').trim())) return;
    const wrap = document.createElement('div');
    wrap.className = 'answer-fold';
    h.replaceWith(wrap);
    wrap.appendChild(h);
    const body = document.createElement('div');
    body.className = 'answer-body';
    body.hidden = true;
    let node = wrap.nextSibling;
    while (node) {
      if (node.nodeType === 1 && (node.tagName === 'H2' || node.tagName === 'HR')) break;
      const next = node.nextSibling;
      body.appendChild(node);
      node = next;
    }
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'answer-toggle';
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = '<span class="af-caret" aria-hidden="true">▸</span><span class="af-label">展开答案</span><span class="af-note">先闭卷作答，再核对</span>';
    wrap.appendChild(btn);
    wrap.appendChild(body);
    btn.addEventListener('click', () => {
      const open = !body.hidden;
      body.hidden = open;
      wrap.classList.toggle('open', !open);
      btn.setAttribute('aria-expanded', String(!open));
      btn.querySelector('.af-caret').textContent = open ? '▸' : '▾';
      btn.querySelector('.af-label').textContent = open ? '展开答案' : '收起答案';
    });
  });
}

/* ── 参数演示：章节里的 ```demo-<name> 代码块会被替换成交互组件 ──
   组件三守则（与可视化纪律一致）：步进/拖拽/自动共用一条幂等 render；
   数据层动画线性（步进是逐格揭示，不做假插值）；中文标签走 DOM、数字
   tabular-nums。块体是 JSON 配置，组件逻辑全部住在本文件里（CSP 禁内联）。 */
const DEMO_BUILDERS = {};

function demoShell(host, cfg, fallbackTitle) {
  host.innerHTML = `<div class="demo-head"><span class="demo-tag">互动</span><span class="demo-title">${escapeHtml(cfg.title || fallbackTitle)}</span></div><div class="demo-body"></div>` +
    (cfg.hint ? `<div class="demo-hint">${escapeHtml(cfg.hint)}</div>` : '');
  return host.querySelector('.demo-body');
}

/* gamma：黑与白按比例混合，直接平均 sRGB 与线性平均并排 */
DEMO_BUILDERS.gamma = function (host, cfg) {
  const body = demoShell(host, cfg, '拖动混合比例：直接平均 vs 线性平均');
  const s2l = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const l2s = v => Math.round(255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055));
  body.innerHTML = `
    <div class="demo-swatches">
      <figure class="demo-swatch"><div class="sw" data-sw="direct"></div><figcaption>直接平均 sRGB<span class="demo-val" data-val="direct"></span></figcaption></figure>
      <figure class="demo-swatch"><div class="sw" data-sw="linear"></div><figcaption>线性平均再转回<span class="demo-val" data-val="linear"></span></figcaption></figure>
    </div>
    <div class="demo-slider-row">
      <label>白占比例 <b class="demo-val" data-val="t"></b></label>
      <input type="range" min="0" max="100" value="50" aria-label="白色所占混合比例">
    </div>`;
  const slider = body.querySelector('input');
  const swD = body.querySelector('[data-sw="direct"]'), swL = body.querySelector('[data-sw="linear"]');
  const vD = body.querySelector('[data-val="direct"]'), vL = body.querySelector('[data-val="linear"]'), vT = body.querySelector('[data-val="t"]');
  const render = () => {
    const t = slider.value / 100;
    const d = Math.round(255 * t), l = l2s(t);
    swD.style.background = swL.style.background = '';
    swD.style.background = `rgb(${d},${d},${d})`;
    swL.style.background = `rgb(${l},${l},${l})`;
    vD.textContent = d; vL.textContent = l; vT.textContent = slider.value + '%';
  };
  slider.addEventListener('input', render);
  render();
};

/* bresenham：方格纸逐步走，判号与抬 y 一格一格揭示（不做假插值） */
DEMO_BUILDERS.bresenham = function (host, cfg) {
  const dx = cfg.dx || 5, dy = cfg.dy || 3;
  const body = demoShell(host, cfg, 'Bresenham 逐步走');
  const trace = [];
  let y = 0, d = 2 * dy - dx;
  for (let x = 0; x <= dx; x++) {
    const up = d > 0;
    trace.push({ x, y, d, up });
    if (up) { y += 1; d += 2 * (dy - dx); } else { d += 2 * dy; }
  }
  body.innerHTML = `
    <div class="demo-bres">
      <div class="bres-grid" style="--cols:${dx + 1}" role="img" aria-label="Bresenham 步进网格"></div>
      <div class="bres-side">
        <div class="bres-read">x = <b class="demo-val" data-bres="x"></b>　y = <b class="demo-val" data-bres="y"></b></div>
        <div class="bres-read">决策量 d = <b class="demo-val" data-bres="d"></b></div>
        <div class="bres-read" data-bres="verdict"></div>
        <div class="demo-ctrl">
          <button type="button" data-act="prev" aria-label="上一步">⟵ 上一步</button>
          <button type="button" data-act="next" aria-label="下一步">下一步 ⟶</button>
          <button type="button" data-act="auto" aria-label="自动播放">▶ 自动</button>
          <button type="button" data-act="reset" aria-label="重置">↺</button>
        </div>
        <div class="bres-step demo-val" data-bres="step"></div>
      </div>
    </div>`;
  const grid = body.querySelector('.bres-grid');
  for (let ry = dy; ry >= 0; ry--)
    for (let rx = 0; rx <= dx; rx++) {
      const cell = document.createElement('span');
      cell.className = 'bres-cell';
      cell.dataset.x = rx; cell.dataset.y = ry;
      grid.appendChild(cell);
    }
  const cells = {};
  grid.querySelectorAll('.bres-cell').forEach(c => { cells[c.dataset.x + ',' + c.dataset.y] = c; });
  const el = k => body.querySelector(`[data-bres="${k}"]`);
  const total = trace.length;
  let step = 0, timer = null;
  const render = () => {
    Object.values(cells).forEach(c => { c.className = 'bres-cell'; });
    for (let i = 0; i < Math.min(step, total); i++) {
      const t = trace[i];
      cells[t.x + ',' + t.y].classList.add('filled');
    }
    if (step < total) {
      const t = trace[step];
      cells[t.x + ',' + t.y].classList.add('current');
      el('x').textContent = t.x; el('y').textContent = t.y; el('d').textContent = t.d;
      el('verdict').textContent = t.up ? 'd > 0：中点在直线下方，抬 y' : 'd ≤ 0：y 不动，d 加 2·dy';
    } else {
      el('x').textContent = dx; el('y').textContent = dy; el('d').textContent = '—';
      el('verdict').textContent = '线段到头，填格完成';
    }
    el('step').textContent = `第 ${Math.min(step, total)} / ${total} 步（每步一次符号判断）`;
    body.querySelector('[data-act="auto"]').textContent = timer ? '⏸ 暂停' : '▶ 自动';
  };
  const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
  body.addEventListener('click', e => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (!act) return;
    if (act === 'prev') { stop(); step = Math.max(0, step - 1); }
    if (act === 'next') { stop(); step = Math.min(total, step + 1); }
    if (act === 'reset') { stop(); step = 0; }
    if (act === 'auto') {
      if (timer) stop();
      else timer = setInterval(() => {
        if (step >= total) { stop(); render(); return; }
        step += 1; render();
      }, 700);
    }
    render();
  });
  render();
};

/* depth：对数滑块拖视距，看 NDC 深度如何把精度堆给近处 */
DEMO_BUILDERS.depth = function (host, cfg) {
  const near = cfg.near || 0.1, far = cfg.far || 100;
  const body = demoShell(host, cfg, '拖动视距：NDC 深度的非线性');
  const k = (far + near) / (far - near), m = 2 * far * near / (far - near);
  const ndc = d => k - m / d;   // 看向 -z、视距 d>0：Z_ndc = k − m/d（与 §3.3 表同一公式）
  body.innerHTML = `
    <div class="demo-slider-row">
      <label>视距 d = <b class="demo-val" data-d></b>（滑块是对数刻度）</label>
      <input type="range" min="0" max="1000" value="500" aria-label="相机空间距离，对数刻度">
    </div>
    <div class="depth-bar">
      <span class="depth-end">near：−1</span>
      <div class="depth-track"><div class="depth-marker" data-marker></div></div>
      <span class="depth-end">far：+1</span>
    </div>
    <div class="depth-read">NDC z = <b class="demo-val" data-ndc></b>　·　比它远 1% 的墙，NDC 只差 <b class="demo-val" data-gap></b>——这就是远处 z-fighting 的来源</div>`;
  const slider = body.querySelector('input');
  const marker = body.querySelector('[data-marker]');
  const outN = body.querySelector('[data-ndc]'), outG = body.querySelector('[data-gap]'), outD = body.querySelector('[data-d]');
  const render = () => {
    const d = near * Math.pow(far / near, slider.value / 1000);
    const z = ndc(d);
    outD.textContent = d >= 1 ? d.toFixed(1) : d.toFixed(2);
    outN.textContent = z.toFixed(4);
    outG.textContent = Math.abs(ndc(d * 1.01) - z).toFixed(5);
    marker.style.left = ((z + 1) / 2 * 100).toFixed(2) + '%';
  };
  slider.addEventListener('input', render);
  render();
};

/* dh：拖双方私钥，看共享秘密由交换律必然一致 */
DEMO_BUILDERS.dh = function (host, cfg) {
  const p = cfg.p || 23, g = cfg.g || 5;
  const body = demoShell(host, cfg, '拖动双方私钥：共享秘密必然一致');
  body.innerHTML = `
    <div class="dh-grid">
      <div class="dh-side"><h4>Alice</h4>
        <input type="range" min="2" max="21" value="6" data-a aria-label="Alice 的私钥 a">
        <div class="dh-line">a = <b class="demo-val" data-av></b>　A = g<sup>a</sup> mod p = <b class="demo-val" data-A></b></div>
      </div>
      <div class="dh-mid">
        <div class="dh-line">公开：p = ${p}，g = ${g}</div>
        <div class="dh-secret">共享秘密 g<sup>ab</sup> mod p = <b class="demo-val" data-S></b></div>
        <div class="dh-line">Alice 算 B<sup>a</sup>，Bob 算 A<sup>b</sup>——交换律保证相等</div>
      </div>
      <div class="dh-side"><h4>Bob</h4>
        <input type="range" min="2" max="21" value="15" data-b aria-label="Bob 的私钥 b">
        <div class="dh-line">b = <b class="demo-val" data-bv></b>　B = g<sup>b</sup> mod p = <b class="demo-val" data-B></b></div>
      </div>
    </div>`;
  const a = body.querySelector('[data-a]'), b = body.querySelector('[data-b]');
  const render = () => {
    const av = +a.value, bv = +b.value;
    const A = Math.pow(g, av) % p, B = Math.pow(g, bv) % p;
    body.querySelector('[data-av]').textContent = av;
    body.querySelector('[data-bv]').textContent = bv;
    body.querySelector('[data-A]').textContent = A;
    body.querySelector('[data-B]').textContent = B;
    body.querySelector('[data-S]').textContent = Math.pow(B, av) % p;
  };
  a.addEventListener('input', render);
  b.addEventListener('input', render);
  render();
};

/* pigou：拖下路流量比例，看 L(x) 在均衡处高于最优（Okabe-Ito 两色） */
DEMO_BUILDERS.pigou = function (host, cfg) {
  const body = demoShell(host, cfg, '拖动下路流量比例：社会成本 L(x) 的曲线');
  body.innerHTML = `
    <div class="pigou-wrap">
      <canvas data-cv height="190"></canvas>
      <div class="pigou-read">下路比例 x = <b class="demo-val" data-x></b>　平均代价 L(x) = <b class="demo-val" data-L></b></div>
      <div class="demo-slider-row"><input type="range" min="0" max="100" value="100" aria-label="下路流量比例"></div>
    </div>`;
  const cv = body.querySelector('canvas'), ctx = cv.getContext('2d');
  const slider = body.querySelector('input');
  const L = x => x * x + (1 - x);          // 与 §6.2 同一公式
  const Y0 = 0.70, Y1 = 1.05;              // 纵轴裁剪聚焦差异（位置编码允许；披露于图注）
  let W = 480;
  const X = f => 44 + f * (W - 60);
  const Y = v => 158 - (v - Y0) / (Y1 - Y0) * 138;
  const render = () => {
    const x = slider.value / 100;
    ctx.clearRect(0, 0, W, 190);
    ctx.font = '11px system-ui';
    ctx.fillStyle = '#94a3b8';
    ctx.strokeStyle = 'rgba(148,163,184,0.3)';
    ctx.lineWidth = 1;
    [0.75, 1.0].forEach(v => {             // 只画水平网格线（读的是 y）
      ctx.beginPath(); ctx.moveTo(44, Y(v)); ctx.lineTo(W - 16, Y(v)); ctx.stroke();
      ctx.fillText(v.toFixed(2), 10, Y(v) + 4);
    });
    [0, 0.5, 1].forEach(f => ctx.fillText(f.toFixed(1), X(f) - 7, 182));
    ctx.strokeStyle = '#56b4e9'; ctx.lineWidth = 2.5; ctx.beginPath();
    for (let i = 0; i <= 100; i++) {
      const f = i / 100, px = X(f), py = Y(L(f));
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.stroke();
    ctx.fillStyle = '#e69f00'; ctx.beginPath(); ctx.arc(X(1), Y(1), 5, 0, 7); ctx.fill();
    ctx.fillStyle = '#56b4e9'; ctx.beginPath(); ctx.arc(X(0.5), Y(0.75), 5, 0, 7); ctx.fill();
    ctx.fillStyle = '#94a3b8'; ctx.fillText('均衡', X(1) - 20, Y(1) - 10); ctx.fillText('最优', X(0.5) - 10, Y(0.75) - 10);
    ctx.fillStyle = '#f87171'; ctx.beginPath(); ctx.arc(X(x), Y(L(x)), 6, 0, 7); ctx.fill();
    body.querySelector('[data-x]').textContent = x.toFixed(2);
    body.querySelector('[data-L]').textContent = L(x).toFixed(4);
  };
  const fit = () => {
    W = cv.clientWidth || 480;
    const dpr = window.devicePixelRatio || 1;
    cv.width = W * dpr; cv.height = 190 * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    render();
  };
  slider.addEventListener('input', render);
  if (window.ResizeObserver) new ResizeObserver(fit).observe(cv);
  fit();
};

function setupDemos(content) {
  content.querySelectorAll('pre code[class*="language-demo-"]').forEach(codeEl => {
    const m = /language-demo-([\w-]+)/.exec(codeEl.className);
    const builder = m && DEMO_BUILDERS[m[1]];
    const pre = codeEl.closest('pre');
    if (!builder || !pre) return;
    let cfg = {};
    try { cfg = JSON.parse(codeEl.textContent) || {}; } catch (e) { cfg = {}; }
    const host = document.createElement('div');
    host.className = 'demo-widget';
    pre.replaceWith(host);
    builder(host, cfg);
  });
}

/* ══════════════ 主题与阅读设置 ══════════════ */
const THEMES = ['dark', 'light', 'sepia'];
const ACCENTS = ['brass', 'indigo', 'jade', 'violet', 'rose', 'moss'];
const READER_PREFS = { font: 'm', measure: 'standard', accent: 'brass' };

function applyTheme(theme) {
  const value = THEMES.includes(theme) ? theme : 'dark';
  document.documentElement.setAttribute('data-theme', value);
  // 让原生控件（滚动条、输入框）跟随主题明暗
  document.documentElement.style.colorScheme = value === 'dark' ? 'dark' : 'light';
}
function currentTheme() {
  return document.documentElement.getAttribute('data-theme') || 'dark';
}
function setTheme(theme) {
  applyTheme(theme);
  try { localStorage.setItem('reader-theme', currentTheme()); } catch (e) { /* 忽略 */ }
  paintReadingSettings();
}
function initTheme() {
  let saved = null;
  try { saved = localStorage.getItem('reader-theme'); } catch (e) { saved = null; }
  const prefersLight = window.matchMedia
    && window.matchMedia('(prefers-color-scheme: light)').matches;
  applyTheme(saved || (prefersLight ? 'light' : 'dark'));
}

function paintReadingSettings() {
  document.querySelectorAll('[data-font-choice]').forEach(b => {
    b.classList.toggle('on', b.dataset.fontChoice === READER_PREFS.font);
  });
  document.querySelectorAll('[data-measure-choice]').forEach(b => {
    b.classList.toggle('on', b.dataset.measureChoice === READER_PREFS.measure);
  });
  document.querySelectorAll('[data-theme-choice]').forEach(b => {
    b.classList.toggle('on', b.dataset.themeChoice === currentTheme());
  });
  document.querySelectorAll('[data-accent-choice]').forEach(b => {
    b.classList.toggle('on', b.dataset.accentChoice === READER_PREFS.accent);
  });
  const btn = $('reader-settings');
  if (btn) btn.setAttribute('aria-expanded', $('reading-popover').hidden ? 'false' : 'true');
}

function applyReaderPrefs() {
  document.documentElement.setAttribute('data-font', READER_PREFS.font);
  document.documentElement.setAttribute('data-measure', READER_PREFS.measure);
  if (ACCENTS.includes(READER_PREFS.accent)) {
    document.documentElement.setAttribute('data-accent', READER_PREFS.accent);
  }
  paintReadingSettings();
}
function saveReaderPrefs() {
  try { localStorage.setItem('reader-prefs', JSON.stringify(READER_PREFS)); } catch (e) { /* 忽略 */ }
  applyReaderPrefs();
}
function initReaderPrefs() {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem('reader-prefs') || 'null'); } catch (e) { saved = null; }
  if (saved && typeof saved === 'object') {
    if (['s', 'm', 'l', 'xl'].includes(saved.font)) READER_PREFS.font = saved.font;
    if (['narrow', 'standard', 'wide', 'xwide'].includes(saved.measure)) READER_PREFS.measure = saved.measure;
    if (saved.accent && ACCENTS.includes(saved.accent)) READER_PREFS.accent = saved.accent;
  }
  applyReaderPrefs();
}

initTheme();
initReaderPrefs();

/* 侧栏折叠：桌面端点侧栏里的箭头直接收起；移动端仍走抽屉 */
const SIDEBAR_KEY = 'reader-sidebar-collapsed';
let SIDEBAR_COLLAPSED = false;
function isDesktopSidebar() {
  return window.matchMedia('(min-width: 861px)').matches;
}
function applySidebarCollapsed() {
  const collapsed = SIDEBAR_COLLAPSED && isDesktopSidebar();
  document.body.classList.toggle('sidebar-collapsed', collapsed);
  const btn = $('sidebar-collapse');
  if (btn) {
    const label = collapsed ? '展开目录' : '收起目录';
    btn.setAttribute('aria-expanded', String(!collapsed));
    btn.title = label;
    btn.setAttribute('aria-label', label);
  }
}
function setSidebarCollapsed(value) {
  SIDEBAR_COLLAPSED = !!value;
  try { localStorage.setItem(SIDEBAR_KEY, SIDEBAR_COLLAPSED ? '1' : '0'); } catch (e) { /* 忽略 */ }
  applySidebarCollapsed();
}
try { SIDEBAR_COLLAPSED = localStorage.getItem(SIDEBAR_KEY) === '1'; } catch (e) { /* 忽略 */ }
applySidebarCollapsed();
const sidebarCollapseBtn = $('sidebar-collapse');
if (sidebarCollapseBtn) {
  sidebarCollapseBtn.addEventListener('click', () => setSidebarCollapsed(!SIDEBAR_COLLAPSED));
}
window.addEventListener('resize', applySidebarCollapsed);

const themeToggle = $('theme-toggle');
if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const i = THEMES.indexOf(currentTheme());
    setTheme(THEMES[(i + 1) % THEMES.length]);
  });
}

/* 阅读设置浮层：点按钮打开，点外部 / Esc 关闭 */
const readerSettingsBtn = $('reader-settings');
const readingPopover = $('reading-popover');
if (readerSettingsBtn && readingPopover) {
  readerSettingsBtn.addEventListener('click', event => {
    event.stopPropagation();
    readingPopover.hidden = !readingPopover.hidden;
    if (!readingPopover.hidden) closeAccountMenu();
    paintReadingSettings();
  });
  readingPopover.addEventListener('click', event => event.stopPropagation());
  document.addEventListener('click', () => {
    if (!readingPopover.hidden) {
      readingPopover.hidden = true;
      paintReadingSettings();
    }
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !readingPopover.hidden) {
      readingPopover.hidden = true;
      paintReadingSettings();
      readerSettingsBtn.focus();
    }
  });
  readingPopover.querySelectorAll('[data-font-choice]').forEach(b => {
    b.addEventListener('click', () => {
      READER_PREFS.font = b.dataset.fontChoice;
      saveReaderPrefs();
    });
  });
  readingPopover.querySelectorAll('[data-measure-choice]').forEach(b => {
    b.addEventListener('click', () => {
      READER_PREFS.measure = b.dataset.measureChoice;
      saveReaderPrefs();
    });
  });
  readingPopover.querySelectorAll('[data-theme-choice]').forEach(b => {
    b.addEventListener('click', () => setTheme(b.dataset.themeChoice));
  });
  readingPopover.querySelectorAll('[data-accent-choice]').forEach(b => {
    b.addEventListener('click', () => {
      READER_PREFS.accent = b.dataset.accentChoice;
      saveReaderPrefs();
    });
  });
}

/* ══════════════ 在线终端（服务器版功能） ══════════════
   pwn.college 式的内置沙盒：nginx 层用 auth_request 挡住未登录读者，
   ttyd 为每个连接单独起进程、运行在受限系统账号下；静态镜像没有
   /terminal/，入口永远隐藏（body.no-server）。 */
const TERMINAL_BOOKS = new Set(['cs', 'dl', 'dlf', 'nlp', 'math', 'ml', 'gfx', 'fla', 'ct', 'econ', 'gt', 'crypt', 'cir', 'db', 'os', 'ca', 'net', 'comb', 'nt', 'gm']);
// 数学四册并一前存进 localStorage 的旧大类 key 迁到 math（ml/qai 已恢复为独立大类，不迁移）
const LEGACY_BOOK = { sde: 'math', cat: 'math', prob: 'math', cont: 'math' };
const terminalOpenBtn = $('terminal-open');
const terminalDock = $('terminal-dock');
const terminalFrame = $('terminal-frame');

function terminalBookEnabled() {
  return SERVER_MODE && currentPath && TERMINAL_BOOKS.has(activeBook());
}
function updateTerminalButton() {
  if (terminalOpenBtn) terminalOpenBtn.hidden = !terminalBookEnabled();
}
function openTerminalDock() {
  if (!terminalDock || !terminalFrame) return;
  if (terminalFrame.getAttribute('src') === 'about:blank') terminalFrame.src = 'terminal/';
  clearTimeout(terminalCloseTimer);
  terminalDock.classList.remove('closing');
  terminalDock.hidden = false;
  if (terminalOpenBtn) terminalOpenBtn.setAttribute('aria-expanded', 'true');
}
let terminalCloseTimer = 0;
function closeTerminalDock() {
  if (!terminalDock || terminalDock.hidden || terminalDock.classList.contains('closing')) return;
  // 出场动画跑完再真正隐藏（比入场快，符合「出场比入场快」的惯例）
  terminalDock.classList.add('closing');
  if (terminalOpenBtn) terminalOpenBtn.setAttribute('aria-expanded', 'false');
  terminalCloseTimer = setTimeout(() => {
    terminalDock.classList.remove('closing');
    terminalDock.hidden = true;
  }, 200);
}
function toggleTerminalDock() {
  if (terminalDock && !terminalDock.hidden) { closeTerminalDock(); return; }
  if (!ACCOUNT) { openAuth('login'); return; }
  openTerminalDock();
}
if (terminalOpenBtn) terminalOpenBtn.addEventListener('click', toggleTerminalDock);
const terminalCloseBtn = $('terminal-close');
if (terminalCloseBtn) terminalCloseBtn.addEventListener('click', closeTerminalDock);
const terminalPopoutBtn = $('terminal-popout');
if (terminalPopoutBtn) terminalPopoutBtn.addEventListener('click', () => {
  window.open('terminal/', '_blank', 'noopener');
});
const terminalResizeBtn = $('terminal-resize');
if (terminalResizeBtn) terminalResizeBtn.addEventListener('click', () => {
  const big = document.body.classList.toggle('terminal-big');
  terminalResizeBtn.textContent = big ? '还原' : '放大';
});
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === '`' && terminalOpenBtn && !terminalOpenBtn.hidden) {
    e.preventDefault();
    toggleTerminalDock();
  }
});

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
let ASK_CLOSE_TIMER = null;  // 退场动画计时器（关闭先播动画，播完再 hidden）
let ASK_MODE = 'chat';       // chat | explain | example | summary | quiz
let ASK_QUOTE = '';          // 划词引用 / 选中文本
let ASK_ABORT = null;        // 当前流式请求的 AbortController
let ASK_SUPPRESS_HISTORY = false;  // 「新对话」后不要立刻把旧记录拉回来
let ASK_LOG_GEN = 0;         // 对话区版本号：防止历史请求晚到后覆盖新提问
const ASK_MODES = {
  chat:    { label: '自由提问', placeholder: '就当前小节提问，例如：为什么这里说 300 个周期而不是 300 条指令？' },
  explain: { label: '解释这段', placeholder: '想让我解释哪段？可以先在正文里划词，再打开这里。' },
  example: { label: '举个例子', placeholder: '想让我用例子说明哪个概念？' },
  summary: { label: '本节小结', placeholder: '可以直接发送，或补充你想强调的重点。' },
  quiz:    { label: '自测 3 题', placeholder: '可以直接发送，或指定难度与考点。' },
};
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
  updateTerminalButton();   // 探测晚于首章加载完成时补刷终端入口
  if (!SERVER_MODE) {
    // 静态版也把本地阅读进度读回来，否则 ✓ 与进度条不显示
    await loadServerProgress();
    refreshProgressMarks();
    if (currentPath) updateResumeBar();
    return false;
  }
  await refreshAccount();
  return true;
}

async function loadArticleMeta() {
  // 管理员在后台改的标题/分类/状态/阶段/隐藏，作为构建产物之上的覆盖层。
  try {
    const data = await api('/article-meta');
    const overrides = new Map(((data && data.items) || []).map(item => [item.path, item]));
    const base = CHAPTERS_BASE.length ? CHAPTERS_BASE : chapters;
    chapters = base
      .filter(chapter => !(overrides.get(chapter.path) || {}).hidden)
      .map(chapter => {
        const overlay = overrides.get(chapter.path);
        if (!overlay) return chapter;
        return Object.assign({}, chapter, {
          name: overlay.title || chapter.name,
          track: overlay.track || chapter.track,
          status: overlay.status || chapter.status,
          phase: overlay.phase || chapter.phase,
        });
      });
  } catch (e) {
    // 覆盖层读取失败时保持构建期 chapters.json 的数据
  }
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
    closeAccountMenu();
  }
  // 供样式判断是否显示「收藏 / 问 AI」这类需要账号的控件
  document.body.classList.toggle('has-account', !!ACCOUNT);
  updateMyProgress();
  renderAccountPageTabs();
  renderCommentsComposer();
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
    : (AUTH_MODE === 'register' ? '注册 CS Wiki' : '登录 CS Wiki');
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
  // 悬浮按钮常驻：打开时滑到抽屉左缘、变成「收起」开关——同一个按钮负责开也负责关
  fab.hidden = !(SERVER_MODE && !!currentPath);
  fab.classList.toggle('open', ASK_OPEN);
  fab.textContent = ASK_OPEN ? '收起' : '问 AI';
  fab.title = ASK_OPEN ? '收起问答（Esc）' : '就当前小节问 AI';
  fab.setAttribute('aria-expanded', ASK_OPEN ? 'true' : 'false');
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

/* —— 习题批改（苏格拉底式）：章末习题列表项内嵌作答面板，AI 批改不直接给答案 ——
   只在服务器版启用（静态版 no-server 一并隐藏按钮）；与「问 AI」共用同一额度池。 */
const GRADE_SECTION_RE = /应用与辨析|交错练习|闭卷回忆|本章自测|思考题|习题/;

function setupGradeButtons() {
  if (!SERVER_MODE) return;
  const content = $('content');
  content.querySelectorAll('h2').forEach(h => {
    if (!h.id || h.dataset.gradeReady) return;
    // h2 的 textContent 含挂在上面的「问 AI」按钮，只取文本节点
    const label = Array.from(h.childNodes)
      .filter(n => n.nodeType === 3).map(n => n.textContent).join('');
    if (!GRADE_SECTION_RE.test(label)) return;
    h.dataset.gradeReady = '1';
    let node = h.nextElementSibling;
    while (node && !/^(H1|H2)$/.test(node.tagName)) {
      if (node.tagName === 'OL') {
        node.querySelectorAll(':scope > li').forEach(li => {
          if (li.querySelector('.grade-btn')) return;
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'grade-btn';
          btn.textContent = 'AI 批改';
          btn.title = '写下你的作答，AI 判对错并引导你补全';
          btn.addEventListener('click', ev => {
            ev.preventDefault();
            toggleGradePanel(li, label.replace(/\s+/g, ' ').trim());
          });
          li.appendChild(btn);
        });
      }
      node = node.nextElementSibling;
    }
  });
}

function toggleGradePanel(li, headingTitle) {
  let panel = li.querySelector(':scope > .grade-panel');
  if (panel) {
    panel.hidden = !panel.hidden;
    if (!panel.hidden) panel.querySelector('textarea').focus();
    return;
  }
  panel = document.createElement('div');
  panel.className = 'grade-panel';
  panel.innerHTML =
    '<textarea class="grade-input" aria-label="习题作答"' +
    ' placeholder="把你的作答写在这里。批改是苏格拉底式的：AI 先判定对错，再引导你自己补全，不会直接发参考答案。"></textarea>' +
    '<div class="grade-actions"><button type="button" class="grade-submit">提交批改</button>' +
    '<span class="grade-status"></span></div>' +
    '<div class="grade-feedback" hidden></div>';
  li.appendChild(panel);
  panel.querySelector('.grade-submit').addEventListener('click', () => {
    submitGrade(li, panel, headingTitle);
  });
  panel.querySelector('textarea').focus();
}

async function submitGrade(li, panel, headingTitle) {
  const ta = panel.querySelector('textarea');
  const statusEl = panel.querySelector('.grade-status');
  const fbEl = panel.querySelector('.grade-feedback');
  const submit = panel.querySelector('.grade-submit');
  const answer = ta.value.trim();
  if (!answer) { statusEl.textContent = '先写点什么再提交'; ta.focus(); return; }
  if (!ACCOUNT) { openAuth('login'); return; }
  // 习题原文：克隆后摘掉面板/按钮与 KaTeX 的 mathml 副本，避免公式重复与自引用
  const clone = li.cloneNode(true);
  clone.querySelectorAll('.grade-panel, .grade-btn, .katex-mathml').forEach(el => el.remove());
  const question = (clone.textContent || '').replace(/\s+/g, ' ').trim();
  submit.disabled = true; ta.disabled = true;
  statusEl.textContent = '批改中…';
  fbEl.hidden = true; fbEl.innerHTML = '';
  try {
    const data = await api('/grade', {
      method: 'POST',
      body: { path: currentPath, question, answer, section_title: headingTitle },
    });
    applyAskQuota(data);
    fbEl.innerHTML = answerHtml(data.answer);
    fbEl.hidden = false;
    highlightAnswer(fbEl);
    statusEl.textContent = '';
    submit.textContent = '再改一版';
  } catch (err) {
    const status = err && err.status;
    if (status === 401) {
      ACCOUNT = null;
      renderAccount();
      openAuth('login');
    } else {
      statusEl.textContent = (err && err.message) || '批改失败，请稍后重试';
    }
    if (status === 429 && err.data) {
      applyAskQuota(err.data);
      statusEl.textContent = ((err && err.message) || '今日免费额度已用尽') +
        '　在「设置」里填写自己的 API Key 即可不限次数。';
    }
  } finally {
    submit.disabled = false; ta.disabled = false;
  }
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

/* —— 提问模式与引用 —— */
function setAskMode(mode) {
  ASK_MODE = ASK_MODES[mode] ? mode : 'chat';
  const meta = ASK_MODES[ASK_MODE];
  const input = $('ask-input');
  if (input) input.placeholder = meta.placeholder;
  document.querySelectorAll('#ask-quick button').forEach(b => {
    b.classList.toggle('on', b.dataset.mode === ASK_MODE);
  });
}

function setAskQuote(text) {
  ASK_QUOTE = String(text || '').trim().slice(0, 1500);
  const box = $('ask-quote');
  const body = $('ask-quote-text');
  if (!box || !body) return;
  box.hidden = !ASK_QUOTE;
  body.textContent = ASK_QUOTE;
}

function openAsk(opts) {
  opts = opts || {};
  if (!SERVER_MODE) { toast('问答功能需要在服务器版使用'); return; }
  if (!currentPath) { toast('请先打开一章再提问'); return; }
  const firstOpen = !ASK_OPEN;
  ASK_OPEN = true;
  const panel = $('ask-panel');
  if (ASK_CLOSE_TIMER) { clearTimeout(ASK_CLOSE_TIMER); ASK_CLOSE_TIMER = null; }
  panel.classList.remove('closing');
  if (panel.hidden) {
    panel.hidden = false;
    // 退出动画可能刚播到一半就被打断，强制重放入场动画
    panel.style.animation = 'none';
    void panel.offsetWidth;
    panel.style.animation = '';
  }
  $('ask-kicker').textContent = BOOK_LABEL[activeBook()] + ' · 助教';
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

  if (opts.mode) setAskMode(opts.mode);
  if (opts.quote !== undefined) setAskQuote(opts.quote);
  if (opts.prefill !== undefined) $('ask-input').value = opts.prefill;

  $('ask-send').disabled = false;
  if (!ACCOUNT) {
    renderAskNotice('登录后即可提问。AI 会结合当前小节回答，也可以先在正文里划词再问。' +
      '<br><button type="button" class="btn primary" id="ask-login-btn">登录 / 注册</button>');
    $('ask-send').disabled = true;
    $('ask-input').disabled = true;
    const b = $('ask-login-btn');
    if (b) b.addEventListener('click', () => openAuth('login'));
    return;
  }
  $('ask-input').disabled = false;
  if (firstOpen && !ASK_SUPPRESS_HISTORY) loadAskHistory();
  if (opts.focus) setTimeout(() => $('ask-input').focus(), 60);
}

function closeAsk() {
  if (!ASK_OPEN) return;
  ASK_OPEN = false;
  hideAskAlert();
  updateAskFab();
  const panel = $('ask-panel');
  if (panel.hidden) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    panel.hidden = true;
    return;
  }
  // 先播退场动画再真正隐藏，避免抽屉「瞬间消失」
  panel.classList.add('closing');
  ASK_CLOSE_TIMER = setTimeout(() => {
    ASK_CLOSE_TIMER = null;
    panel.classList.remove('closing');
    panel.hidden = true;
  }, 180);
}
// 切章时清空对话视图；下次打开会拉取新章的记录
function resetAskForChapter() {
  if (ASK_OPEN) closeAsk();
  ASK_SECTION = null;
  ASK_SUPPRESS_HISTORY = false;
  ASK_LOG_GEN += 1;
  setAskQuote('');
  setAskMode('chat');
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
function renderAskNotice(html) {
  ASK_LOG_GEN += 1;
  $('ask-log').innerHTML = '<div class="qa-empty">' + html + '</div>';
}

function fmtAskTime(value) {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  const pad = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
    ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}

/* —— 渲染 —— */
function answerHtml(text) {
  const src = String(text || '');
  try {
    if (typeof marked !== 'undefined' && typeof marked.parse === 'function') {
      return renderMarkdown(src);
    }
  } catch (e) { /* 落到纯文本 */ }
  return escapeHtml(src).replace(/\n/g, '<br>');
}
function renderAnswerMarkdown(text) {
  return '<div class="answer-md">' + answerHtml(text) + '</div>';
}

function highlightAnswer(el) {
  if (!el || typeof hljs === 'undefined') return;
  el.querySelectorAll('pre code').forEach(block => {
    try { hljs.highlightElement(block); } catch (e) { /* 忽略 */ }
  });
}

function userBubbleHTML(text, quote) {
  return '<div class="bubble me">' + escapeHtml(text) +
    (quote ? '<div class="bubble-quote">' + escapeHtml(quote) + '</div>' : '') + '</div>';
}

function aiBubbleHTML(text, meta) {
  meta = meta || {};
  const q = escapeHtml(meta.q || '');
  const mode = escapeHtml(meta.mode || 'chat');
  const quote = escapeHtml(meta.quote || '');
  return '<div class="bubble ai" data-q="' + q + '" data-mode="' + mode + '" data-quote="' + quote + '">' +
    renderAnswerMarkdown(text || '') +
    '<div class="bubble-actions">' +
      '<button type="button" data-act="copy">复制</button>' +
      (text && meta.q ? '<button type="button" data-act="regen">重答</button>' : '') +
    '</div></div>';
}

function renderAskLog(items, pendingQ) {
  ASK_LOG_GEN += 1;
  const log = $('ask-log');
  let html = '';
  if (!items.length && !pendingQ) {
    html += '<div class="qa-empty">就当前文章提问，AI 会结合你所在小节的正文回答；本节没讲到的，它会明确说“本节没有讲到”。' +
      '<br>也可以先在正文里划词，点「解释」或「问 AI」。</div>';
  }
  items.forEach(it => {
    html += userBubbleHTML(it.question || '');
    html += aiBubbleHTML(it.answer || '', { q: it.question || '', mode: 'chat' });
    if (it.created_at) html += '<div class="bubble-time">' + escapeHtml(fmtAskTime(it.created_at)) + '</div>';
  });
  if (pendingQ) {
    html += userBubbleHTML(pendingQ);
    html += '<div class="bubble ai bubble-pending"><div class="answer-md"></div></div>';
  }
  log.innerHTML = html;
  log.querySelectorAll('.bubble.ai:not(.bubble-pending)').forEach(highlightAnswer);
  log.scrollTop = log.scrollHeight;
}

function appendUserBubble(text, quote) {
  ASK_LOG_GEN += 1;
  const log = $('ask-log');
  log.insertAdjacentHTML('beforeend', userBubbleHTML(text, quote));
  log.scrollTop = log.scrollHeight;
}

function appendPendingBubble(meta) {
  ASK_LOG_GEN += 1;
  const log = $('ask-log');
  log.insertAdjacentHTML('beforeend',
    '<div class="bubble ai bubble-pending" data-q="' + escapeHtml(meta.q || '') +
    '" data-mode="' + escapeHtml(meta.mode || 'chat') +
    '" data-quote="' + escapeHtml(meta.quote || '') + '"><div class="answer-md"></div>' +
    '<div class="bubble-actions"><button type="button" data-act="copy">复制</button></div></div>');
  const el = log.lastElementChild;
  log.scrollTop = log.scrollHeight;
  return el;
}

function appendErrorBubble(message, withLogin) {
  ASK_LOG_GEN += 1;
  const log = $('ask-log');
  log.insertAdjacentHTML('beforeend',
    '<div class="bubble err">' + escapeHtml(message) +
    (withLogin ? '<br><button type="button" class="btn primary" id="ask-login-btn">登录</button>' : '') +
    '</div>');
  const b = $('ask-login-btn');
  if (b) b.addEventListener('click', () => openAuth('login'));
  log.scrollTop = log.scrollHeight;
}

async function loadAskHistory() {
  if (!currentPath || !ACCOUNT) return;
  const gen = ASK_LOG_GEN;
  try {
    // 按文章拉全部记录，不再按 section_title 过滤（否则切小节就看不到别的节）
    const d = await api('/ask/history?path=' + encodeURIComponent(currentPath) + '&limit=50');
    // 请求期间用户已经发了新问题（或点了新对话）：不要用旧历史覆盖对话区
    if (gen !== ASK_LOG_GEN || ASK_BUSY) return;
    const items = ((d && d.items) || []).slice().reverse();   // 接口按时间倒序，反转成正序
    renderAskLog(items);
  } catch (e) {
    if (gen !== ASK_LOG_GEN || ASK_BUSY) return;
    renderAskLog([]);
    showAskAlert('加载历史对话失败：' + escapeHtml(e.message || '未知错误'));
  }
}
function updateAskQuota() { const el = $('ask-quota'); if (el) el.innerHTML = ACCOUNT ? quotaHTML() : '登录后可使用'; }

function applyAskQuota(data) {
  if (!ACCOUNT || !data) return;
  ACCOUNT.quota = ACCOUNT.quota || { used: 0, limit: 0 };
  if (typeof data.used === 'number') ACCOUNT.quota.used = data.used;
  if (typeof data.limit === 'number') ACCOUNT.quota.limit = data.limit;
  updateAskQuota();
}

/* —— 发送（流式） —— */
const ASK_DEFAULT_QUESTIONS = {
  explain: '请解释本节的核心概念。',
  example: '请用一个具体例子说明本节概念。',
  summary: '请总结本小节。',
  quiz: '请出 3 道自测题。',
};
const ASK_EXPLAIN_SELECTION = '请解释我选中的这段内容。';

async function submitAsk(event) {
  event.preventDefault();
  if (ASK_BUSY || !SERVER_MODE || !currentPath) return;
  let q = $('ask-input').value.trim();
  if (!q) q = (ASK_MODE === 'explain' && ASK_QUOTE)
    ? ASK_EXPLAIN_SELECTION
    : (ASK_DEFAULT_QUESTIONS[ASK_MODE] || '');
  if (!q) {
    if (!ACCOUNT) { openAuth('login'); return; }
    $('ask-input').focus();
    return;
  }
  if (!ACCOUNT) { openAuth('login'); return; }
  await runAsk(q, { mode: ASK_MODE, quote: ASK_QUOTE });
}

async function runAsk(q, opts) {
  opts = opts || {};
  if (ASK_BUSY) return;
  // 上下文在发送这一刻取：用户中途滚动到别的小节，下一条就用新的
  // 上下文始终以"发送这一刻的滚动位置"为准，不依赖打开面板时的小节；
  // 取不到小节（例如章节没有 h2/h3）时退回本章第一个小节，仍可提问。
  const anchorId = currentSectionAnchor() || (tocHeadings[0] && tocHeadings[0].id);
  const t = anchorId ? tocHeadings.find(x => x.id === anchorId) : null;
  ASK_SECTION = t ? { id: t.id, title: t.text } : { id: '', title: currentChapterName() };

  const mode = opts.mode || 'chat';
  const quote = String(opts.quote || '').slice(0, 1500);

  ASK_BUSY = true;
  $('ask-send').disabled = true;
  $('ask-stop').hidden = false;
  hideAskAlert();
  if (!opts.skipUser) appendUserBubble(q, quote);
  const aiEl = appendPendingBubble({ q, mode, quote });
  $('ask-input').value = '';
  autoGrowAskInput();

  const ctrl = new AbortController();
  ASK_ABORT = ctrl;
  let answer = '';
  let renderTimer = null;
  let pendingRender = false;

  const paint = final => {
    const target = aiEl.querySelector('.answer-md');
    if (target) target.innerHTML = answerHtml(answer);
    if (answer) aiEl.classList.remove('bubble-pending');
    if (final) {
      aiEl.classList.remove('bubble-pending');
      highlightAnswer(aiEl);
      // 补上“重答”按钮（流式开始时内容为空，所以初始没有）
      const actions = aiEl.querySelector('.bubble-actions');
      if (actions && !actions.querySelector('[data-act="regen"]')) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.dataset.act = 'regen';
        btn.textContent = '重答';
        actions.appendChild(btn);
      }
    }
    const log = $('ask-log');
    if (log && (final || log.scrollHeight - log.scrollTop - log.clientHeight < 160)) {
      log.scrollTop = log.scrollHeight;
    }
  };
  const schedulePaint = () => {
    if (renderTimer || pendingRender) return;
    pendingRender = true;
    renderTimer = setTimeout(() => {
      renderTimer = null;
      pendingRender = false;
      paint(false);
    }, 90);
  };

  try {
    const res = await fetch(API_BASE + '/ask/stream', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: currentPath,
        section_id: ASK_SECTION.id,
        section_title: ASK_SECTION.title,
        question: q,
        mode,
        selection: quote,
      }),
      signal: ctrl.signal,
    });

    if (!res.ok) {
      const text = await res.text();
      let data = null;
      try { data = JSON.parse(text); } catch (e) { /* 非 JSON */ }
      const err = new Error((data && data.error) || ('HTTP ' + res.status));
      err.status = res.status;
      err.data = data;
      throw err;
    }

    if (!res.body || typeof res.body.getReader !== 'function') {
      // 极老浏览器：退回一次性响应
      const data = await res.json();
      answer = (data && data.answer) || '';
      applyAskQuota(data);
      paint(true);
    } else {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      while (true) {
        const step = await reader.read();
        if (step.done) break;
        buf += decoder.decode(step.value, { stream: true });
        let cut;
        while ((cut = buf.indexOf('\n\n')) >= 0) {
          const frame = buf.slice(0, cut);
          buf = buf.slice(cut + 2);
          frame.split('\n').forEach(line => {
            if (!line.startsWith('data:')) return;
            const raw = line.slice(5).trim();
            if (!raw) return;
            let obj = null;
            try { obj = JSON.parse(raw); } catch (e) { return; }
            if (obj.delta) {
              answer += obj.delta;
              schedulePaint();
            }
            if (obj.error) {
              const err = new Error(obj.error);
              err.status = 503;
              throw err;
            }
            if (obj.done) applyAskQuota(obj);
          });
        }
      }
      paint(true);
    }

    if (!answer) throw new Error('没有返回内容');
    // 同步进内存历史，切回本章时无需重新请求也能看到
    (ASK_HISTORY_CACHE[currentPath] = ASK_HISTORY_CACHE[currentPath] || [])
      .push({ question: q, answer, created_at: '' });
    ASK_SUPPRESS_HISTORY = false;
  } catch (err) {
    if (renderTimer) { clearTimeout(renderTimer); renderTimer = null; }
    if (err && err.name === 'AbortError') {
      paint(true);
      if (!answer) aiEl.remove();
      toast('已停止生成');
    } else if (answer) {
      // 已经收到一部分内容：保留它，错误单独提示
      paint(true);
      showAskAlert(escapeHtml((err && err.message) || '回答中断，请重试'));
      if (err && err.status === 429) {
        applyAskQuota(err.data);
        showAskAlert(escapeHtml((err && err.message) || '今日免费额度已用尽') +
          '　在「设置」里填写自己的 API Key 即可不限次数。');
      }
    } else {
      aiEl.remove();
      const status = err && err.status;
      if (status === 401) {
        ACCOUNT = null;
        renderAccount();
        appendErrorBubble('登录状态已失效，请重新登录。', true);
        $('ask-input').disabled = true;
        $('ask-send').disabled = true;
      } else {
        appendErrorBubble((err && err.message) || '提问失败，请稍后重试', false);
        if (status === 429) {
          applyAskQuota(err.data);
          showAskAlert(escapeHtml((err && err.message) || '今日免费额度已用尽') +
            '　在「设置」里填写自己的 API Key 即可不限次数。');
        }
      }
    }
  } finally {
    ASK_BUSY = false;
    ASK_ABORT = null;
    $('ask-stop').hidden = true;
    if (ACCOUNT) $('ask-send').disabled = false;
  }
}

/* —— AI 抽屉的交互 —— */
function autoGrowAskInput() {
  const el = $('ask-input');
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 200) + 'px';
}

const askInputEl = $('ask-input');
if (askInputEl) {
  askInputEl.addEventListener('input', autoGrowAskInput);
  askInputEl.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      $('ask-form').requestSubmit();
    }
  });
}
const askStopBtn = $('ask-stop');
if (askStopBtn) {
  askStopBtn.addEventListener('click', () => {
    if (ASK_ABORT) ASK_ABORT.abort();
  });
}
const askQuick = $('ask-quick');
if (askQuick) {
  askQuick.addEventListener('click', event => {
    const btn = event.target.closest('button[data-mode]');
    if (!btn) return;
    setAskMode(btn.dataset.mode);
    const def = (ASK_MODE === 'explain' && ASK_QUOTE)
      ? ASK_EXPLAIN_SELECTION
      : ASK_DEFAULT_QUESTIONS[ASK_MODE];
    if (def) $('ask-input').value = def;
    $('ask-input').focus();
  });
}
const askQuoteX = $('ask-quote-x');
if (askQuoteX) askQuoteX.addEventListener('click', () => setAskQuote(''));

const askNewBtn = $('ask-new');
if (askNewBtn) {
  askNewBtn.addEventListener('click', () => {
    if (ASK_ABORT) ASK_ABORT.abort();
    $('ask-log').innerHTML = '';
    ASK_SUPPRESS_HISTORY = true;
    setAskQuote('');
    setAskMode('chat');
    renderAskNotice('新对话已开始。AI 仍会以当前小节为上下文。');
    $('ask-input').focus();
  });
}

const askQuotaLink = $('ask-quota-link');
if (askQuotaLink) {
  askQuotaLink.addEventListener('click', () => {
    if (ACCOUNT) gotoAccountPage('settings');
    else openAuth('login');
  });
}

const askLogEl = $('ask-log');
if (askLogEl) {
  askLogEl.addEventListener('click', event => {
    const btn = event.target.closest('[data-act]');
    if (!btn) return;
    const bubble = btn.closest('.bubble.ai');
    if (!bubble) return;
    if (btn.dataset.act === 'copy') {
      const text = (bubble.querySelector('.answer-md') || {}).innerText || '';
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => toast('已复制'), () => toast('复制失败'));
      } else {
        toast('当前浏览器不支持复制');
      }
      return;
    }
    if (btn.dataset.act === 'regen') {
      const q = bubble.dataset.q;
      if (!q) return;
      const mode = bubble.dataset.mode || 'chat';
      const quote = bubble.dataset.quote || '';
      bubble.remove();
      runAsk(q, { mode, quote, skipUser: true });
    }
  });
}

/* —— 划词提问：选中正文后浮出「解释 / 问 AI」 —— */
let selAiEl = null;
let selAiTimer = null;

function hideSelectionAI() {
  if (selAiEl) selAiEl.hidden = true;
}

function selectedTextInContent() {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || !sel.rangeCount) return '';
  const content = $('content');
  if (!content) return '';
  const anchor = sel.anchorNode;
  const focus = sel.focusNode;
  if (!anchor || !focus || !content.contains(anchor) || !content.contains(focus)) return '';
  const text = sel.toString().trim();
  return text.length >= 6 && text.length <= 1500 ? text : '';
}

function showSelectionAI() {
  const text = selectedTextInContent();
  if (!text) { hideSelectionAI(); return; }
  if (!selAiEl) {
    selAiEl = document.createElement('div');
    selAiEl.className = 'sel-ai';
    selAiEl.id = 'sel-ai';
    selAiEl.innerHTML = '<button type="button" data-sel="explain">解释</button>' +
                        '<button type="button" data-sel="ask">问 AI</button>';
    document.body.appendChild(selAiEl);
    selAiEl.addEventListener('mousedown', event => event.preventDefault());
    selAiEl.addEventListener('click', event => {
      const btn = event.target.closest('button[data-sel]');
      if (!btn) return;
      const quote = selectedTextInContent();
      if (!quote) return;
      hideSelectionAI();
      if (btn.dataset.sel === 'explain') {
        openAsk({ mode: 'explain', quote, prefill: ASK_EXPLAIN_SELECTION, focus: true });
      } else {
        openAsk({ mode: 'chat', quote, focus: true });
      }
    });
  }
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return;
  const rect = sel.getRangeAt(0).getBoundingClientRect();
  if (!rect || (!rect.width && !rect.height)) { hideSelectionAI(); return; }
  selAiEl.hidden = false;
  const width = selAiEl.offsetWidth || 140;
  let left = rect.left + rect.width / 2 - width / 2;
  left = Math.max(8, Math.min(window.innerWidth - width - 8, left));
  let top = rect.top - (selAiEl.offsetHeight || 36) - 8;
  if (top < 8) top = rect.bottom + 8;
  selAiEl.style.left = left + 'px';
  selAiEl.style.top = Math.max(8, top) + 'px';
}

document.addEventListener('mouseup', () => {
  clearTimeout(selAiTimer);
  selAiTimer = setTimeout(showSelectionAI, 30);
});
document.addEventListener('keyup', event => {
  if (event.key === 'Escape') { hideSelectionAI(); return; }
  clearTimeout(selAiTimer);
  selAiTimer = setTimeout(showSelectionAI, 60);
});
document.addEventListener('mousedown', event => {
  if (selAiEl && !selAiEl.contains(event.target)) hideSelectionAI();
});
window.addEventListener('scroll', hideSelectionAI, { passive: true });
window.addEventListener('resize', hideSelectionAI);

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
let ACCOUNT_PAGE = null;      // profile | settings | feedback | users | articles

function renderAccountPageTabs() {
  ['feedback-tab', 'users-tab', 'articles-tab'].forEach(id => {
    const tab = $(id);
    if (tab) tab.hidden = !isAdmin();
  });
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
  const allowed = ['settings', 'feedback', 'users', 'articles'].includes(kind) ? kind : 'profile';
  const adminOnly = ['feedback', 'users', 'articles'].includes(allowed);
  ACCOUNT_PAGE = (adminOnly && !isAdmin()) ? 'profile' : allowed;
  closeAccountMenu();
  $('search-results').hidden = true;
  // 正文相关视图全部让位；不重置 currentPath，这样点侧栏章节能立刻回到原章
  $('loading').hidden = true;
  $('error').hidden = true;
  $('roadmap').hidden = true;
  $('content').hidden = true;
  $('doc-head').hidden = true;
  $('chapter-nav').classList.remove('show');
  $('toc-rail').hidden = true;
  $('comments').hidden = true;
  $('account-page').hidden = false;
  renderAccountPageTabs();
  const isSettings = ACCOUNT_PAGE === 'settings';
  const isFeedback = ACCOUNT_PAGE === 'feedback';
  const isUsers = ACCOUNT_PAGE === 'users';
  const isArticles = ACCOUNT_PAGE === 'articles';
  const title = isSettings ? '设置'
    : (isFeedback ? '反馈管理' : (isUsers ? '用户管理' : (isArticles ? '文章管理' : '我的主页')));
  $('account-page-title').textContent = title;
  $('account-page-sub').textContent = isSettings
    ? '配置你自己的 DeepSeek API Key（提问不再受每日限额）、联系邮箱与账号安全。'
    : (isFeedback
      ? '查看读者提交的问题与建议；处理完的条目可以标记为已解决。'
      : (isUsers
        ? '查看账号、调整角色、重置密码或删除用户。固定管理员 admin 与当前账号受保护。'
        : (isArticles
          ? '调整章节的显示标题、分类、状态、阶段与是否隐藏；只影响站点显示，不改 Markdown 正文。'
          : '阅读进度、收藏的小节与提问记录都保存在账号里，换一台设备登录即可继续。')));
  document.title = title + ' — CS Wiki';
  if (isSettings) { renderSettingsBody(); loadSettings(); }
  else if (isFeedback) loadFeedbackAdmin();
  else if (isUsers) loadAdminUsers();
  else if (isArticles) loadAdminArticles();
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

/* ══════════════ 反馈：Markdown / LaTeX 编辑器 ══════════════
   工具栏动作与选区处理移植自 acm-training-oj 的
   frontend/src/components/markdown-editor/toolbar-actions.ts。 */
let FEEDBACK_BUSY = false;
let FEEDBACK_PREVIEW_TIMER = null;

function renderUserMarkdown(text) {
  const wrap = document.createElement('div');
  wrap.innerHTML = answerHtml(String(text || ''));
  // 不加载外部图片：反馈里嵌图会把管理员 IP 暴露给第三方图床
  wrap.querySelectorAll('img').forEach(img => img.remove());
  return wrap.innerHTML;
}

function setFeedbackMsg(text, kind) {
  const el = $('feedback-msg');
  if (!el) return;
  el.textContent = text || '';
  el.className = kind || '';
}

function updateFeedbackCount() {
  const input = $('feedback-input');
  const count = $('feedback-count');
  if (input && count) count.textContent = input.value.length + ' / 8000';
}

function renderFeedbackPreviewNow() {
  const input = $('feedback-input');
  const preview = $('feedback-preview');
  if (!input || !preview) return;
  preview.innerHTML = input.value.trim()
    ? renderUserMarkdown(input.value)
    : '<div class="fe-empty">预览会显示在这里</div>';
}

function scheduleFeedbackPreview() {
  clearTimeout(FEEDBACK_PREVIEW_TIMER);
  FEEDBACK_PREVIEW_TIMER = setTimeout(renderFeedbackPreviewNow, 180);
}

function onFeedbackInput() {
  updateFeedbackCount();
  if (!$('feedback-preview').hidden) scheduleFeedbackPreview();
}

function setFeedbackPreview(on) {
  const body = $('feedback-body');
  const preview = $('feedback-preview');
  const btn = $('feedback-preview-toggle');
  if (!body || !preview || !btn) return;
  body.classList.toggle('split', on);
  preview.hidden = !on;
  btn.setAttribute('aria-pressed', String(on));
  btn.textContent = on ? '编辑' : '预览';
  if (on) renderFeedbackPreviewNow();
}

function openFeedback() {
  if (!SERVER_MODE) { toast('反馈功能需要在服务器版使用'); return; }
  if (!ACCOUNT) { toast('登录后可以提交反馈'); openAuth('login'); return; }
  $('feedback-modal').hidden = false;
  setFeedbackMsg('');
  updateFeedbackCount();
  setFeedbackPreview(false);
  renderFeedbackPreviewNow();
  setTimeout(() => $('feedback-input').focus(), 60);
}

function closeFeedback() {
  $('feedback-modal').hidden = true;
}

async function submitFeedback() {
  if (FEEDBACK_BUSY) return;
  const input = $('feedback-input');
  const content = input.value.trim();
  if (content.length < 10) {
    setFeedbackMsg('至少写 10 个字。', 'err');
    input.focus();
    return;
  }
  if (!ACCOUNT) { openAuth('login'); return; }
  FEEDBACK_BUSY = true;
  const btn = $('feedback-submit');
  btn.disabled = true;
  setFeedbackMsg('提交中…', '');
  try {
    await api('/feedback', {
      method: 'POST',
      body: {
        content,
        contact: $('feedback-contact').value.trim(),
        path: currentPath || '',
      },
    });
    setFeedbackMsg('已提交，谢谢你的反馈。', 'ok');
    input.value = '';
    $('feedback-contact').value = '';
    updateFeedbackCount();
    renderFeedbackPreviewNow();
    setTimeout(closeFeedback, 1200);
  } catch (err) {
    if (err && err.status === 401) {
      ACCOUNT = null;
      renderAccount();
      openAuth('login');
    }
    setFeedbackMsg((err && err.message) || '提交失败，请稍后重试', 'err');
  } finally {
    FEEDBACK_BUSY = false;
    btn.disabled = false;
  }
}

/* —— 选区工具（对应 OJ toolbar-actions.ts 的四个 helper） —— */
function feExpandLineRange(value, start, end) {
  const lineStart = value.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
  const nextBreak = value.indexOf('\n', end);
  return { start: lineStart, end: nextBreak === -1 ? value.length : nextBreak };
}

function feSurroundInline(value, start, end, prefix, suffix, placeholder) {
  const hasSelection = start !== end;
  const base = hasSelection ? value.slice(start, end) : placeholder;
  return {
    nextValue: prefix + base + suffix,
    replaceStart: start,
    replaceEnd: end,
    selectionStart: prefix.length,
    selectionEnd: hasSelection ? prefix.length + base.length : prefix.length + placeholder.length,
  };
}

function fePrefixLines(value, start, end, prefix) {
  const hasSelection = start !== end;
  const range = feExpandLineRange(value, start, end);
  const block = value.slice(range.start, range.end);
  const nextValue = block.split('\n').map(line => prefix + line).join('\n');
  const caret = hasSelection
    ? nextValue.length
    : Math.min(nextValue.length, prefix.length + block.length);
  return {
    nextValue,
    replaceStart: range.start,
    replaceEnd: range.end,
    selectionStart: caret,
    selectionEnd: caret,
  };
}

function feSurroundBlock(value, start, end, prefix, suffix, placeholder) {
  const hasSelection = start !== end;
  const range = feExpandLineRange(value, start, end);
  const block = value.slice(range.start, range.end);
  const reuseLine = !hasSelection && block.trim().length > 0;
  const base = hasSelection || reuseLine ? block : placeholder;
  const insertPlaceholder = !hasSelection && !reuseLine;
  const contentEnd = prefix.length + base.length;
  return {
    nextValue: prefix + base + suffix,
    replaceStart: range.start,
    replaceEnd: range.end,
    selectionStart: insertPlaceholder ? prefix.length : contentEnd,
    selectionEnd: contentEnd,
  };
}

const FEEDBACK_ACTIONS = {
  'h1': ctx => fePrefixLines(ctx.value, ctx.start, ctx.end, '# '),
  'h2': ctx => fePrefixLines(ctx.value, ctx.start, ctx.end, '## '),
  'bold': ctx => feSurroundInline(ctx.value, ctx.start, ctx.end, '**', '**', 'text'),
  'italic': ctx => feSurroundInline(ctx.value, ctx.start, ctx.end, '*', '*', 'text'),
  'quote': ctx => fePrefixLines(ctx.value, ctx.start, ctx.end, '> '),
  'list': ctx => fePrefixLines(ctx.value, ctx.start, ctx.end, '- '),
  'code': ctx => feSurroundBlock(ctx.value, ctx.start, ctx.end, '```text\n', '\n```', 'content'),
  'link': ctx => feSurroundInline(ctx.value, ctx.start, ctx.end, '[', '](https://example.com)', 'link text'),
  'math-inline': ctx => feSurroundInline(ctx.value, ctx.start, ctx.end, '$', '$', 'x'),
  'math-block': ctx => feSurroundBlock(ctx.value, ctx.start, ctx.end, '$$\n', '\n$$', 'x'),
};

const FEEDBACK_FORMULAS = {
  frac: { text: String.raw`\frac{a}{b}`, block: false },
  sqrt: { text: String.raw`\sqrt{x}`, block: false },
  sum: { text: String.raw`\sum_{i=1}^{n}`, block: false },
  int: { text: String.raw`\int_{a}^{b}`, block: false },
  aligned: {
    text: '\\begin{aligned}\n  a &= b \\\\\n  c &= d\n\\end{aligned}',
    block: true,
  },
  alpha: { text: String.raw`\alpha`, block: false },
  theta: { text: String.raw`\theta`, block: false },
  le: { text: String.raw`\le`, block: false },
  ge: { text: String.raw`\ge`, block: false },
  to: { text: String.raw`\to`, block: false },
  infty: { text: String.raw`\infty`, block: false },
};

function feApplyAction(id) {
  const input = $('feedback-input');
  const fn = FEEDBACK_ACTIONS[id];
  if (!input || !fn) return;
  const value = input.value;
  const result = fn({ value, start: input.selectionStart, end: input.selectionEnd });
  const before = value.slice(0, result.replaceStart);
  const after = value.slice(result.replaceEnd);
  input.value = before + result.nextValue + after;
  const start = before.length + result.selectionStart;
  const end = before.length + result.selectionEnd;
  input.focus();
  input.setSelectionRange(start, end);
  onFeedbackInput();
}

function feInsertText(text) {
  const input = $('feedback-input');
  if (!input) return;
  const start = input.selectionStart;
  const end = input.selectionEnd;
  const value = input.value;
  input.value = value.slice(0, start) + text + value.slice(end);
  const caret = start + text.length;
  input.focus();
  input.setSelectionRange(caret, caret);
  onFeedbackInput();
}

/* —— 反馈事件绑定 —— */
const feedbackOpenBtn = $('feedback-open');
if (feedbackOpenBtn) feedbackOpenBtn.addEventListener('click', openFeedback);
const feedbackLinkBtn = $('feedback-link');
if (feedbackLinkBtn) feedbackLinkBtn.addEventListener('click', openFeedback);
const feedbackCloseBtn = $('feedback-close');
if (feedbackCloseBtn) feedbackCloseBtn.addEventListener('click', closeFeedback);
const feedbackModalEl = $('feedback-modal');
if (feedbackModalEl) {
  feedbackModalEl.addEventListener('click', event => {
    if (event.target === feedbackModalEl) closeFeedback();
  });
}
const feedbackInputEl = $('feedback-input');
if (feedbackInputEl) {
  feedbackInputEl.addEventListener('input', onFeedbackInput);
  feedbackInputEl.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      submitFeedback();
      return;
    }
    if (event.ctrlKey || event.metaKey) {
      const key = event.key.toLowerCase();
      if (key === 'b' || key === 'i' || key === 'e') {
        event.preventDefault();
        feApplyAction(key === 'b' ? 'bold' : (key === 'i' ? 'italic' : 'math-inline'));
        return;
      }
    }
    if (event.key === 'Tab') {
      event.preventDefault();
      feInsertText('  ');
      return;
    }
    if (event.key === 'Escape') closeFeedback();
  });
}
const feedbackPreviewToggle = $('feedback-preview-toggle');
if (feedbackPreviewToggle) {
  feedbackPreviewToggle.addEventListener('click', () => {
    setFeedbackPreview(!$('feedback-body').classList.contains('split'));
  });
}
const feedbackSubmitBtn = $('feedback-submit');
if (feedbackSubmitBtn) feedbackSubmitBtn.addEventListener('click', submitFeedback);
const feedbackFormula = $('feedback-formula');
if (feedbackFormula) {
  feedbackFormula.addEventListener('change', event => {
    const item = FEEDBACK_FORMULAS[event.target.value];
    if (item) {
      feInsertText(item.block
        ? '$$\n' + item.text + '\n$$'
        : '$' + item.text + '$');
    }
    event.target.value = '';
  });
}
document.querySelectorAll('#feedback-toolbar [data-fe-action]').forEach(btn => {
  btn.addEventListener('mousedown', event => event.preventDefault());
  btn.addEventListener('click', () => feApplyAction(btn.dataset.feAction));
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !$('feedback-modal').hidden) closeFeedback();
});

/* —— 管理员反馈列表 —— */
async function loadFeedbackAdmin() {
  const body = $('account-page-body');
  if (!SERVER_MODE || !ACCOUNT || !isAdmin()) {
    body.innerHTML = pageLoginPromptHTML();
    bindPageLogin();
    return;
  }
  body.innerHTML = pageLoadingHTML('正在加载反馈…');
  try {
    const data = await api('/feedback?limit=200');
    renderFeedbackAdminItems((data && data.items) || []);
  } catch (err) {
    body.innerHTML = pageErrorHTML((err && err.message) || '加载失败', 'fb-retry');
    const retry = $('fb-retry');
    if (retry) retry.addEventListener('click', loadFeedbackAdmin);
  }
}

function renderFeedbackAdminItems(items) {
  const body = $('account-page-body');
  if (!items.length) {
    body.innerHTML = '<div class="page-card"><div class="empty-note">还没有收到反馈。</div></div>';
    return;
  }
  const pending = items.filter(item => item.status !== 'resolved').length;
  let html = '<div class="page-card"><div class="card-sub">共 ' + items.length +
    ' 条反馈，待处理 <b>' + pending + '</b> 条。</div></div>';
  items.forEach(item => {
    const resolved = item.status === 'resolved';
    const id = parseInt(item.id, 10) || 0;
    html += '<div class="feedback-item" data-id="' + id + '">' +
      '<div class="fi-head">' +
        '<span class="fi-user">' + escapeHtml(item.username || '未知用户') + '</span>' +
        '<span class="fi-status ' + (resolved ? 'resolved' : 'open') + '">' +
          (resolved ? '已处理' : '待处理') + '</span>' +
        '<span class="fi-time">' + escapeHtml(fmtAskTime(item.created_at)) + '</span>' +
      '</div>' +
      '<div class="fi-meta">' +
        (item.path ? '章节：' + escapeHtml(item.path) : '未关联章节') +
        (item.contact ? ' · 联系：' + escapeHtml(item.contact) : '') +
      '</div>' +
      '<div class="fi-body">' + renderUserMarkdown(item.content) + '</div>' +
      '<div class="fi-actions">' +
        '<button type="button" data-fb-toggle="' + (resolved ? 'open' : 'resolved') + '">' +
          (resolved ? '重新打开' : '标记已处理') + '</button>' +
      '</div></div>';
  });
  body.innerHTML = html;
}

const accountPageBodyEl = $('account-page-body');
if (accountPageBodyEl) {
  accountPageBodyEl.addEventListener('click', async event => {
    const btn = event.target.closest('[data-fb-toggle]');
    if (!btn) return;
    const card = btn.closest('.feedback-item');
    const id = card ? parseInt(card.dataset.id, 10) : 0;
    if (!id) return;
    btn.disabled = true;
    try {
      await api('/feedback/status', {
        method: 'POST',
        body: { id, status: btn.dataset.fbToggle },
      });
      await loadFeedbackAdmin();
    } catch (err) {
      toast((err && err.message) || '操作失败');
      btn.disabled = false;
    }
  });
}

/* ══════════════ 章节评论 ══════════════ */
let COMMENTS_GEN = 0;
let COMMENTS_PATH = null;
let COMMENT_BUSY = false;

function renderCommentsComposer() {
  const logged = !!ACCOUNT;
  const login = $('comments-login');
  const form = $('comment-form');
  if (login) login.hidden = logged;
  if (form) form.hidden = !logged;
}

function setCommentMsg(text, kind) {
  const el = $('comment-msg');
  if (!el) return;
  el.textContent = text || '';
  el.className = kind || '';
}

function renderComments(items, count) {
  const list = $('comments-list');
  const countEl = $('comment-count');
  if (countEl) countEl.textContent = count ? '(' + count + ')' : '';
  if (!items.length) {
    list.innerHTML = '<div class="comment-empty">还没有评论，来写第一条吧。</div>';
    return;
  }
  list.innerHTML = items.map(item => {
    const name = item.username || '未知用户';
    const initial = String(name).charAt(0).toUpperCase();
    const deleteBtn = item.can_delete
      ? '<button type="button" class="comment-delete" data-comment-delete="' +
        Number(item.id) + '">删除</button>'
      : '';
    return '<article class="comment-item" data-id="' + Number(item.id) + '">' +
      '<div class="comment-head">' +
        '<span class="comment-avatar">' + escapeHtml(initial) + '</span>' +
        '<span class="comment-user">' + escapeHtml(name) + '</span>' +
        '<span class="comment-time">' + escapeHtml(fmtAskTime(item.created_at)) + '</span>' +
        deleteBtn +
      '</div>' +
      '<div class="comment-body">' + renderUserMarkdown(item.content) + '</div>' +
    '</article>';
  }).join('');
}

async function loadComments(path) {
  if (!SERVER_MODE || !path) { $('comments').hidden = true; return; }
  COMMENTS_PATH = path;
  const gen = ++COMMENTS_GEN;
  const section = $('comments');
  const list = $('comments-list');
  section.hidden = false;
  renderCommentsComposer();
  list.innerHTML = '<div class="comment-empty">正在加载评论…</div>';
  try {
    const data = await api('/comments?path=' + encodeURIComponent(path) + '&limit=200');
    if (gen !== COMMENTS_GEN || path !== currentPath) return;
    renderComments((data && data.items) || [], (data && data.count) || 0);
  } catch (err) {
    if (gen !== COMMENTS_GEN || path !== currentPath) return;
    list.innerHTML = '<div class="comment-empty">评论加载失败：' +
      escapeHtml((err && err.message) || '未知错误') + '</div>';
  }
}

async function submitComment(event) {
  event.preventDefault();
  if (COMMENT_BUSY || !currentPath) return;
  const input = $('comment-input');
  const content = input.value.trim();
  if (!content) {
    setCommentMsg('评论不能为空。', 'err');
    input.focus();
    return;
  }
  if (!ACCOUNT) { openAuth('login'); return; }
  COMMENT_BUSY = true;
  const btn = $('comment-submit');
  btn.disabled = true;
  setCommentMsg('发表中…', '');
  try {
    await api('/comments', { method: 'POST', body: { path: currentPath, content } });
    input.value = '';
    setCommentMsg('已发表。', 'ok');
    await loadComments(currentPath);
  } catch (err) {
    if (err && err.status === 401) {
      ACCOUNT = null;
      renderAccount();
      openAuth('login');
    }
    setCommentMsg((err && err.message) || '发表失败，请稍后重试', 'err');
  } finally {
    COMMENT_BUSY = false;
    btn.disabled = false;
  }
}

async function deleteComment(id) {
  if (!id || !ACCOUNT) return;
  if (!window.confirm('删除这条评论？')) return;
  try {
    await api('/comments/delete', { method: 'POST', body: { id } });
    if (currentPath) await loadComments(currentPath);
  } catch (err) {
    setCommentMsg((err && err.message) || '删除失败', 'err');
  }
}

const commentFormEl = $('comment-form');
if (commentFormEl) commentFormEl.addEventListener('submit', submitComment);
const commentInputEl = $('comment-input');
if (commentInputEl) {
  commentInputEl.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      commentFormEl.requestSubmit();
    }
  });
}
const commentsLoginBtn = $('comments-login-btn');
if (commentsLoginBtn) commentsLoginBtn.addEventListener('click', () => openAuth('login'));
const commentsRefreshBtn = $('comments-refresh');
if (commentsRefreshBtn) {
  commentsRefreshBtn.addEventListener('click', () => {
    if (currentPath) loadComments(currentPath);
  });
}
const commentsListEl = $('comments-list');
if (commentsListEl) {
  commentsListEl.addEventListener('click', event => {
    const btn = event.target.closest('[data-comment-delete]');
    if (!btn) return;
    const id = parseInt(btn.dataset.commentDelete, 10);
    if (id) deleteComment(id);
  });
}

/* ══════════════ 管理员：用户管理 ══════════════ */
function adminUserRoleLabel(role) {
  return role === 'admin' ? '管理员' : '普通用户';
}

async function loadAdminUsers() {
  const body = $('account-page-body');
  if (!SERVER_MODE || !ACCOUNT || !isAdmin()) {
    body.innerHTML = pageLoginPromptHTML();
    bindPageLogin();
    return;
  }
  body.innerHTML = pageLoadingHTML('正在加载用户…');
  try {
    const data = await api('/admin/users');
    renderAdminUsers((data && data.items) || []);
  } catch (err) {
    body.innerHTML = pageErrorHTML((err && err.message) || '加载失败', 'users-retry');
    const retry = $('users-retry');
    if (retry) retry.addEventListener('click', loadAdminUsers);
  }
}

function renderAdminUsers(items) {
  const body = $('account-page-body');
  if (!items.length) {
    body.innerHTML = '<div class="page-card"><div class="empty-note">没有用户。</div></div>';
    return;
  }
  const admins = items.filter(item => item.role === 'admin').length;
  let html = '<div class="page-card"><div class="card-sub">共 ' + items.length +
    ' 个用户，' + admins + ' 个管理员。固定管理员 admin 与当前账号受保护。</div></div>';
  items.forEach(item => {
    const id = parseInt(item.id, 10) || 0;
    const locked = item.protected || item.is_self;
    // 额度：null=跟随全局；-1=不限；其他=管理员定制值。终端默认开。
    const qo = (item.quota_override === null || item.quota_override === undefined) ? null : parseInt(item.quota_override, 10);
    const quotaText = qo === null ? '全局默认' : (qo === -1 ? '不限' : qo + '（定制）');
    const termOn = !!item.terminal_enabled;
    const lastLogin = item.last_login ? fmtAskTime(item.last_login) : '从未登录';
    const roleOptions = ['user', 'admin'].map(role =>
      '<option value="' + role + '"' + (item.role === role ? ' selected' : '') + '>' +
      adminUserRoleLabel(role) + '</option>').join('');
    html += '<div class="admin-user-item" data-id="' + id + '">' +
      '<div class="au-head">' +
        '<span class="au-name">' + escapeHtml(item.username || '未知用户') + '</span>' +
        '<span class="au-role ' + (item.role === 'admin' ? 'is-admin' : '') + '">' +
          adminUserRoleLabel(item.role) + '</span>' +
        (item.is_self ? '<span class="au-badge">当前账号</span>' : '') +
        (item.protected ? '<span class="au-badge">固定管理员</span>' : '') +
      '</div>' +
      '<div class="au-meta">注册：' + escapeHtml(fmtAskTime(item.created_at)) +
        ' · 上次登录：' + escapeHtml(lastLogin) +
        (item.email_masked ? ' · 邮箱：' + escapeHtml(item.email_masked) : '') +
        ' · 每日额度：' + quotaText +
      '</div>' +
      '<div class="au-stats">读完 ' + (item.read_chapters || 0) + ' 章 · 问 AI ' +
        (item.asked || 0) + ' 次 · 评论 ' + (item.comments || 0) + ' 条 · 反馈 ' +
        (item.feedback || 0) + ' 条</div>' +
      '<div class="au-actions">' +
        '<select data-user-role' + (locked ? ' disabled' : '') + '>' + roleOptions + '</select>' +
        '<button type="button" data-user-role-save' + (locked ? ' disabled' : '') + '>保存角色</button>' +
        '<input type="number" data-user-quota min="-1" max="10000" step="1"' +
          ' value="' + (qo === null ? '' : qo) + '" placeholder="全局"' +
          ' title="每日免费额度：留空=跟随全局，-1=不限，0–10000=具体次数">' +
        '<button type="button" data-user-quota-save>存额度</button>' +
        '<button type="button" data-user-terminal data-enabled="' + (termOn ? 1 : 0) + '"' +
          ' title="控制该用户能否使用站内在线终端">' + (termOn ? '停用终端' : '开通终端') + '</button>' +
        '<button type="button" data-user-password' +
          (item.is_self ? ' disabled title="请用账号菜单里的修改密码"' : '') + '>重置密码</button>' +
        '<button type="button" class="danger" data-user-delete' +
          (locked ? ' disabled' : '') + '>删除用户</button>' +
      '</div>' +
    '</div>';
  });
  body.innerHTML = html;
}

async function saveAdminUserRole(btn) {
  const item = btn.closest('.admin-user-item');
  const id = item ? parseInt(item.dataset.id, 10) : 0;
  const select = item ? item.querySelector('[data-user-role]') : null;
  if (!id || !select) return;
  btn.disabled = true;
  try {
    await api('/admin/users/role', { method: 'POST', body: { user_id: id, role: select.value } });
    toast('角色已更新');
    await loadAdminUsers();
  } catch (err) {
    toast((err && err.message) || '更新失败');
    btn.disabled = false;
  }
}

async function saveAdminUserQuota(btn) {
  const item = btn.closest('.admin-user-item');
  const id = item ? parseInt(item.dataset.id, 10) : 0;
  const input = item ? item.querySelector('[data-user-quota]') : null;
  if (!id || !input) return;
  const raw = input.value.trim();
  const limit = raw === '' ? null : parseInt(raw, 10);
  if (limit !== null && (isNaN(limit) || limit < -1 || limit > 10000)) {
    toast('额度范围：留空恢复全局，-1 不限，0–10000 具体次数');
    return;
  }
  btn.disabled = true;
  try {
    await api('/admin/users/quota', { method: 'POST', body: { user_id: id, limit } });
    toast(limit === null ? '已恢复全局额度' : '每日额度已更新为 ' + (limit === -1 ? '不限' : limit));
    await loadAdminUsers();
  } catch (err) {
    toast((err && err.message) || '更新失败');
    btn.disabled = false;
  }
}

async function toggleAdminUserTerminal(btn) {
  const item = btn.closest('.admin-user-item');
  const id = item ? parseInt(item.dataset.id, 10) : 0;
  if (!id) return;
  const enable = btn.dataset.enabled !== '1';
  btn.disabled = true;
  try {
    await api('/admin/users/terminal', { method: 'POST', body: { user_id: id, enabled: enable } });
    toast(enable ? '已开通在线终端' : '已停用在线终端');
    await loadAdminUsers();
  } catch (err) {
    toast((err && err.message) || '更新失败');
    btn.disabled = false;
  }
}

async function resetAdminUserPassword(btn) {
  const item = btn.closest('.admin-user-item');
  const id = item ? parseInt(item.dataset.id, 10) : 0;
  const name = item ? item.querySelector('.au-name').textContent : '';
  if (!id) return;
  const password = window.prompt('为 ' + name + ' 设置新密码（至少 8 位）：');
  if (!password) return;
  try {
    await api('/admin/users/password', { method: 'POST', body: { user_id: id, password } });
    toast('密码已重置，该用户需要重新登录');
  } catch (err) {
    toast((err && err.message) || '重置失败');
  }
}

async function deleteAdminUser(btn) {
  const item = btn.closest('.admin-user-item');
  const id = item ? parseInt(item.dataset.id, 10) : 0;
  const name = item ? item.querySelector('.au-name').textContent : '';
  if (!id) return;
  if (!window.confirm('删除用户 ' + name + ' 及其全部进度、评论、反馈数据？')) return;
  btn.disabled = true;
  try {
    await api('/admin/users/delete', { method: 'POST', body: { user_id: id } });
    toast('用户已删除');
    await loadAdminUsers();
  } catch (err) {
    toast((err && err.message) || '删除失败');
    btn.disabled = false;
  }
}

/* ══════════════ 管理员：文章管理 ══════════════ */
const ARTICLE_TRACK_OPTIONS = [
  ['', '自动'], ['core', '核心'], ['recommended', '建议'], ['optional', '选读'],
];
const ARTICLE_STATUS_OPTIONS = [
  ['', '自动'], ['complete', '完成'], ['outline', '提纲'],
];
const ARTICLE_PHASE_OPTIONS = [
  ['', '自动'], ['1', '第一阶段'], ['2', '第二阶段'], ['3', '第三阶段'],
  ['4', '第四阶段'], ['5', '第五阶段'], ['6', '第六阶段'],
  ['optional', '选读分支'], ['capstone', '最终实践'], ['appendix', '附录'],
];

function adminOptions(options, selected) {
  return options.map(([value, label]) =>
    '<option value="' + escapeHtml(value) + '"' +
    (String(selected) === value ? ' selected' : '') + '>' +
    escapeHtml(label) + '</option>').join('');
}

async function loadAdminArticles() {
  const body = $('account-page-body');
  if (!SERVER_MODE || !ACCOUNT || !isAdmin()) {
    body.innerHTML = pageLoginPromptHTML();
    bindPageLogin();
    return;
  }
  body.innerHTML = pageLoadingHTML('正在加载文章…');
  try {
    const data = await api('/admin/articles');
    renderAdminArticles((data && data.items) || []);
  } catch (err) {
    body.innerHTML = pageErrorHTML((err && err.message) || '加载失败', 'articles-retry');
    const retry = $('articles-retry');
    if (retry) retry.addEventListener('click', loadAdminArticles);
  }
}

function renderAdminArticles(items) {
  const body = $('account-page-body');
  if (!items.length) {
    body.innerHTML = '<div class="page-card"><div class="empty-note">没有文章。</div></div>';
    return;
  }
  const hidden = items.filter(item => item.hidden).length;
  let html = '<div class="page-card"><div class="card-sub">共 ' + items.length +
    ' 篇，隐藏 ' + hidden + ' 篇。修改只影响站点显示，不改 Markdown 正文。</div></div>';
  items.forEach(item => {
    const path = item.path || '';
    html += '<div class="admin-article-item" data-path="' + escapeHtml(path) + '">' +
      '<div class="aa-head"><b>' + escapeHtml(item.name || path) + '</b>' +
        '<span class="aa-path">' + escapeHtml(path) + '</span></div>' +
      '<div class="aa-fields">' +
        '<label>标题<input type="text" data-field="title" maxlength="160" value="' +
          escapeHtml(item.title || '') + '" placeholder="留空则用原章节名"></label>' +
        '<label>分类<select data-field="track">' +
          adminOptions(ARTICLE_TRACK_OPTIONS, item.track || '') + '</select></label>' +
        '<label>状态<select data-field="status">' +
          adminOptions(ARTICLE_STATUS_OPTIONS, item.status || '') + '</select></label>' +
        '<label>阶段<select data-field="phase">' +
          adminOptions(ARTICLE_PHASE_OPTIONS, item.phase || '') + '</select></label>' +
        '<label class="aa-hidden"><input type="checkbox" data-field="hidden"' +
          (item.hidden ? ' checked' : '') + '> 隐藏</label>' +
        '<button type="button" data-article-save>保存</button>' +
        '<button type="button" data-article-open>查看</button>' +
      '</div>' +
      '<div class="aa-msg" role="status"></div>' +
    '</div>';
  });
  body.innerHTML = html;
}

async function saveAdminArticle(btn) {
  const item = btn.closest('.admin-article-item');
  if (!item) return;
  const path = item.dataset.path;
  const title = item.querySelector('[data-field="title"]').value.trim();
  const track = item.querySelector('[data-field="track"]').value;
  const status = item.querySelector('[data-field="status"]').value;
  const phase = item.querySelector('[data-field="phase"]').value;
  const hidden = item.querySelector('[data-field="hidden"]').checked;
  const msg = item.querySelector('.aa-msg');
  btn.disabled = true;
  if (msg) { msg.textContent = '保存中…'; msg.className = 'aa-msg'; }
  try {
    await api('/admin/articles/update', {
      method: 'POST',
      body: { path, title, track, status, phase, hidden },
    });
    if (msg) { msg.textContent = '已保存'; msg.className = 'aa-msg ok'; }
    toast('文章设置已保存');
  } catch (err) {
    if (msg) { msg.textContent = (err && err.message) || '保存失败'; msg.className = 'aa-msg err'; }
  } finally {
    btn.disabled = false;
  }
}

const accountPageBody = $('account-page-body');
if (accountPageBody) {
  accountPageBody.addEventListener('click', event => {
    const roleBtn = event.target.closest('[data-user-role-save]');
    if (roleBtn) { saveAdminUserRole(roleBtn); return; }
    const pwdBtn = event.target.closest('[data-user-password]');
    if (pwdBtn) { resetAdminUserPassword(pwdBtn); return; }
    const delBtn = event.target.closest('[data-user-delete]');
    if (delBtn) { deleteAdminUser(delBtn); return; }
    const quotaBtn = event.target.closest('[data-user-quota-save]');
    if (quotaBtn) { saveAdminUserQuota(quotaBtn); return; }
    const termBtn = event.target.closest('[data-user-terminal]');
    if (termBtn) { toggleAdminUserTerminal(termBtn); return; }
    const saveBtn = event.target.closest('[data-article-save]');
    if (saveBtn) { saveAdminArticle(saveBtn); return; }
    const openBtn = event.target.closest('[data-article-open]');
    if (openBtn) {
      const item = openBtn.closest('.admin-article-item');
      if (item && item.dataset.path) window.location.hash = encodeURIComponent(item.dataset.path);
    }
  });
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
    animateStatNumbers();
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

  // 分册进度：按当前章节表把已读路径归到各大类（read_paths 覆盖全部已读章）
  const readSet = new Set(d.read_paths || []);
  const bookStats = (typeof BOOKS !== 'undefined' && typeof bookOf === 'function' && chapters.length)
    ? BOOKS.map(b => {
        const chs = chapters.filter(c => bookOf(c) === b.key);
        const read = chs.filter(c => readSet.has(c.path)).length;
        return { label: b.label, read, total: chs.length };
      }).filter(s => s.total > 0)
    : [];
  const bookHTML = bookStats.map(s => {
    const pct = s.total ? Math.round(s.read / s.total * 100) : 0;
    return '<div class="bk-row">' +
      '<span class="bk-name">' + escapeHtml(s.label) + '</span>' +
      '<span class="bk-bar"><span class="bk-fill" style="width:' + pct + '%"></span></span>' +
      '<span class="bk-num">' + s.read + ' / ' + s.total + '</span>' +
    '</div>';
  }).join('');

  // 免费额度：limit=-1 不限（管理员/绑定 Key）；custom=管理员单独定制过
  const q = d.quota || {};
  const quotaText = d.has_key
    ? '已绑定专属 API Key，提问不限次'
    : ('今日免费额度 ' + (q.used || 0) + ' / ' + (q.limit === -1 ? '不限' : (q.limit || 0)) +
       (q.custom ? '（管理员定制）' : ''));

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
      <div class="stat-grid" style="grid-template-columns:repeat(3,1fr)">
        <div class="stat-cell"><div class="stat-num" data-count="${stats.read_chapters || 0}">${escapeHtml(String(stats.read_chapters || 0))}</div><div class="stat-cap">已读章数</div></div>
        <div class="stat-cell"><div class="stat-num" style="font-size:.86rem">${escapeHtml(fmtDuration(stats.read_seconds))}</div><div class="stat-cap">累计阅读</div></div>
        <div class="stat-cell"><div class="stat-num" data-count="${stats.streak_days || 0}">${escapeHtml(String(stats.streak_days || 0))}</div><div class="stat-cap">连续学习 · 天</div></div>
        <div class="stat-cell"><div class="stat-num" data-count="${stats.asked || 0}">${escapeHtml(String(stats.asked || 0))}</div><div class="stat-cap">提问次数</div></div>
        <div class="stat-cell"><div class="stat-num" data-count="${stats.graded || 0}">${escapeHtml(String(stats.graded || 0))}</div><div class="stat-cap">习题批改</div></div>
        <div class="stat-cell"><div class="stat-num" data-count="${d.bookmark_count || 0}">${escapeHtml(String(d.bookmark_count || 0))}</div><div class="stat-cap">收藏小节</div></div>
      </div>
      <p class="card-sub" style="margin-top:.7rem">${quotaText}</p>
    </div>

    ${bookStats.length ? `
    <div class="page-card">
      <h2>分册进度</h2>
      <p class="card-sub">每个大类里已读完的章节占比（章末检查表全勾即计为已读）。</p>
      <div class="bk-list">${bookHTML}</div>
    </div>` : ''}

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

function animateStatNumbers() {
  // 数字从 0 滚到目标值：给统计一点「正在计算」的实体感；尊重减少动态设置
  const reduced = window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return;
  document.querySelectorAll('#account-page-body .stat-num[data-count]').forEach(el => {
    const target = parseInt(el.dataset.count, 10) || 0;
    if (target <= 0) return;
    const dur = 700;
    const t0 = performance.now();
    const step = now => {
      const k = Math.min(1, (now - t0) / dur);
      const eased = 1 - Math.pow(1 - k, 3);
      el.textContent = String(Math.round(target * eased));
      if (k < 1) requestAnimationFrame(step);
    };
    el.textContent = '0';
    requestAnimationFrame(step);
  });
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
function closeAccountMenu() {
  const menu = $('account-menu');
  if (menu) menu.hidden = true;
  const chip = $('account-chip');
  if (chip) chip.setAttribute('aria-expanded', 'false');
}

$('account-chip').addEventListener('click', () => {
  if (!ACCOUNT) { openAuth('login'); return; }
  const m = $('account-menu');
  m.hidden = !m.hidden;
  $('account-chip').setAttribute('aria-expanded', String(!m.hidden));
  if (!m.hidden) {
    // 两个下拉菜单互斥，避免同时盖在顶栏下方
    $('reading-popover').hidden = true;
    paintReadingSettings();
  }
});
document.addEventListener('click', e => {
  const menu = $('account-menu');
  if (menu && !menu.hidden && !e.target.closest('#account-menu') && !e.target.closest('#account-chip')) {
    closeAccountMenu();
  }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeAccountMenu();
});

/* 键盘翻章：←/→ 上一章、下一章（与页面底部的翻页按钮走同一个 neighbor 逻辑）。
   输入类元素里不拦截，抽屉/登录框打开时不抢键，也不与浏览器/系统的组合键冲突。 */
document.addEventListener('keydown', e => {
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
  if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
  const t = e.target;
  if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName || ''))) return;
  const askPanel = $('ask-panel'), authModal = $('auth-modal');
  if ((askPanel && !askPanel.hidden) || (authModal && !authModal.hidden)) return;
  const termDock = $('terminal-dock');
  if (termDock && !termDock.hidden) return;
  if (!currentPath) return;
  const { prev, next } = chapterNeighbors();
  const target = e.key === 'ArrowLeft' ? prev : next;
  if (!target) return;
  e.preventDefault();
  loadChapter(target.path);
});

async function logoutAccount() {
  try { await api('/auth/logout', { method: 'POST' }); } catch (e) { /* 忽略 */ }
  closeAccountMenu();
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
$('menu-password').addEventListener('click', () => { closeAccountMenu(); openAuth('password'); });
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
$('ask-fab').addEventListener('click', () => {
  if (ASK_OPEN) closeAsk();
  else openAsk({ focus: true });
});
$('ask-form').addEventListener('submit', submitAsk);
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (!$('ask-panel').hidden) closeAsk();
  else if (!$('auth-modal').hidden) closeAuth();
});
// 点击抽屉外部收起。各「问 AI」入口（悬浮按钮、标题旁按钮、划词浮层）与登录框在白名单里，
// 避免「点开的那一下同时也算外部点击」和打断登录流程。
document.addEventListener('click', e => {
  if (!ASK_OPEN) return;
  const t = e.target;
  if (!t || !t.closest) return;
  if (t.closest('#ask-panel') || t.closest('#ask-fab') || t.closest('.h-ask') ||
      t.closest('.sel-ai') || t.closest('.reading-popover') || t.closest('#auth-modal')) return;
  closeAsk();
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