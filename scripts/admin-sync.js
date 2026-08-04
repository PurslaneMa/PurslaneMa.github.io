'use strict';
const { execFile } = require('node:child_process');
module.exports = function adminSync(hexo) {
  hexo.extend.route.post('/admin/api/sync', (req, res) => {
    const run = (file, args) => new Promise((resolve, reject) => execFile(file, args, { cwd: hexo.base_dir, windowsHide: true }, (error, stdout, stderr) => error ? reject(new Error((stderr || stdout || error.message).trim())) : resolve(stdout)));
    (async () => {
      await run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build']);
      await run('git', ['add', '-A']);
      try { await run('git', ['commit', '-m', 'Update blog content']); } catch (e) { if (!/nothing to commit/i.test(e.message)) throw e; }
      await run('git', ['push', 'origin', 'main']);
      res.statusCode = 200; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify({ ok: true, message: '已生成并同步到 GitHub' }));
    })().catch(error => { res.statusCode = 500; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify({ ok: false, message: error.message })); });
  });
};
