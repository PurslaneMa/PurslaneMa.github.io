const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const adminRoot = path.join(projectRoot, "node_modules", "hexo-admin", "www");
const indexPath = path.join(adminRoot, "index.html");
const scriptPath = path.join(adminRoot, "zh-admin.js");

if (!fs.existsSync(indexPath)) {
  console.log("hexo-admin is not installed; skip localization.");
  process.exit(0);
}

let index = fs.readFileSync(indexPath, "utf8");
index = index.replace('<html lang="en">', '<html lang="zh-CN">');
index = index.replace("<title>Hexo Admin</title>", "<title>Purslane Admin</title>");
if (!index.includes("zh-admin.js")) {
  index = index.replace(
    '<script src="//ajax.aspnetcdn.com/ajax/jquery/jquery-1.9.0.min.js"></script>',
    '<script src="//ajax.aspnetcdn.com/ajax/jquery/jquery-1.9.0.min.js"></script>\n<script src="zh-admin.js"></script>'
  );
}
fs.writeFileSync(indexPath, index, "utf8");

fs.writeFileSync(
  scriptPath,
  String.raw`
(function () {
  var textMap = {
    'Hexo Admin': 'Purslane \u540e\u53f0',
    'Posts': '\u6587\u7ae0',
    'Pages': '\u9875\u9762',
    'About': '\u8bf4\u660e',
    'Deploy': '\u53d1\u5e03',
    'Settings': '\u8bbe\u7f6e',
    'New Post': '\u65b0\u5efa\u6587\u7ae0',
    'New Page': '\u65b0\u5efa\u9875\u9762',
    'Save': '\u4fdd\u5b58',
    'Publish': '\u53d1\u5e03\u6587\u7ae0',
    'Unpublish': '\u8f6c\u4e3a\u8349\u7a3f',
    'Delete': '\u5220\u9664',
    'Rename': '\u91cd\u547d\u540d',
    'Date': '\u65e5\u671f',
    'Author': '\u4f5c\u8005',
    'Tags': '\u6807\u7b7e',
    'Categories': '\u5206\u7c7b'
  };
  function run() {
    document.title = 'Purslane \u540e\u53f0';
    document.querySelectorAll('body *').forEach(function (el) {
      if (el.childNodes.length === 1 && el.childNodes[0].nodeType === Node.TEXT_NODE) {
        var t = el.textContent.trim();
        if (textMap[t]) el.textContent = textMap[t];
      }
    });
  }
  document.addEventListener('DOMContentLoaded', run);
  setInterval(run, 1000);
})();
`,
  "utf8"
);

console.log("hexo-admin localized.");
