$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$adminRoot = Join-Path $projectRoot 'node_modules\hexo-admin\www'
$indexPath = Join-Path $adminRoot 'index.html'
$scriptPath = Join-Path $adminRoot 'zh-admin.js'

if (-not (Test-Path -LiteralPath $indexPath)) {
  Write-Host 'hexo-admin is not installed; skip localization.'
  exit 0
}

$index = Get-Content -LiteralPath $indexPath -Raw -Encoding UTF8
$index = $index.Replace('<html lang="en">', '<html lang="zh-CN">')
$index = $index.Replace('<title>Hexo Admin</title>', '<title>Purslane 后台</title>')
if ($index -notmatch 'zh-admin\.js') {
  $index = $index.Replace('<script src="//ajax.aspnetcdn.com/ajax/jquery/jquery-1.9.0.min.js"></script>', '<script src="//ajax.aspnetcdn.com/ajax/jquery/jquery-1.9.0.min.js"></script>' + "`r`n" + '<script src="zh-admin.js"></script>')
}
Set-Content -LiteralPath $indexPath -Value $index -Encoding UTF8

@'
(function () {
  var textMap = {
    'Hexo Admin': 'Purslane 后台',
    'Posts': '文章',
    'Pages': '页面',
    'About': '说明',
    'Deploy': '发布',
    'Settings': '设置',
    'New Post': '新建文章',
    'New Page': '新建页面',
    'Save': '保存',
    'Publish': '发布文章',
    'Unpublish': '转为草稿',
    'Delete': '删除',
    'Rename': '重命名',
    'Date': '日期',
    'Author': '作者',
    'Tags': '标签',
    'Categories': '分类',
    'This is the Hexo Admin Plugin': '这是 Purslane Notes 的本地写作后台',
    'Goal: Provide an awesome UI around the hexo cli.': '用途：用图形化页面管理 Hexo 文章、页面和发布流程。'
  };

  var placeholderMap = {
    'Deploy/commit message': '发布/提交说明',
    'Title': '标题'
  };

  function localizeNode(node) {
    if (!node || !node.childNodes) return;
    node.childNodes.forEach(function (child) {
      if (child.nodeType === Node.TEXT_NODE) {
        var raw = child.nodeValue;
        var trimmed = raw.trim();
        if (textMap[trimmed]) child.nodeValue = raw.replace(trimmed, textMap[trimmed]);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        localizeNode(child);
      }
    });
  }

  function localizeAttributes() {
    document.querySelectorAll('input, textarea, button').forEach(function (el) {
      var value = el.getAttribute('value');
      var placeholder = el.getAttribute('placeholder');
      var title = el.getAttribute('title');
      if (value && textMap[value]) el.setAttribute('value', textMap[value]);
      if (placeholder && placeholderMap[placeholder]) el.setAttribute('placeholder', placeholderMap[placeholder]);
      if (title && textMap[title]) el.setAttribute('title', textMap[title]);
    });
  }

  function addHelper() {
    if (document.getElementById('purslane-admin-helper')) return;
    var box = document.createElement('div');
    box.id = 'purslane-admin-helper';
    box.style.cssText = 'position:fixed;right:18px;bottom:18px;z-index:9999;background:#222;color:#fff;padding:10px 12px;border-radius:8px;font-size:13px;line-height:1.6;box-shadow:0 4px 20px rgba(0,0,0,.18);';
    box.innerHTML = 'Purslane 后台<br>文章目录：source/_posts<br><a style="color:#9ee" href="/" target="_blank">查看前台</a>';
    document.body.appendChild(box);
  }

  function run() {
    document.title = 'Purslane 后台';
    localizeNode(document.body);
    localizeAttributes();
    addHelper();
  }

  document.addEventListener('DOMContentLoaded', run);
  setInterval(run, 800);
})();
'@ | Set-Content -LiteralPath $scriptPath -Encoding UTF8

Write-Host 'hexo-admin localized.'
