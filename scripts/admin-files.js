'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

function safe(base, rel) {
  const root = path.resolve(base);
  const target = path.resolve(root, rel || '');
  if (target !== root && !target.startsWith(root + path.sep)) throw Error('路径不在博客目录内');
  return target;
}

module.exports = function adminFiles(hexo) {
  hexo.extend.route.post('/admin/api/files/new', async (req, res) => {
    try {
      const body = req.body || {};
      const folder = String(body.folder || 'source/_posts');
      const title = String(body.title || '未命名');
      const file = title.replace(/[\\/:*?"<>|]/g, '-') + '.md';
      const target = safe(hexo.base_dir, path.join(folder, file));
      const noteId = crypto.randomUUID();
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, `---\ntitle: ${title}\nnote_id: ${noteId}\ndate: ${new Date().toISOString().slice(0, 19).replace('T', ' ')}\ncategories:\n  - Notes\ntags: []\nreferences: []\n---\n\n`, 'utf8');
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: true, note_id: noteId, source: path.relative(hexo.base_dir, target) }));
    } catch (error) {
      res.statusCode = 400;
      res.end(JSON.stringify({ ok: false, message: error.message }));
    }
  });

  hexo.extend.route.post('/admin/api/files/move', async (req, res) => {
    try {
      const body = req.body || {};
      const from = safe(hexo.base_dir, String(body.from || ''));
      const to = safe(hexo.base_dir, String(body.to || ''));
      await fs.mkdir(path.dirname(to), { recursive: true });
      await fs.rename(from, to);
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: true }));
    } catch (error) {
      res.statusCode = 400;
      res.end(JSON.stringify({ ok: false, message: error.message }));
    }
  });
};
