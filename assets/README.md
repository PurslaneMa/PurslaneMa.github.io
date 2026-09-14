# assets/ —— 《速通笔记》品牌资产

这些图全部由 `assets/make_assets.py` 用 Pillow 现场绘制（几何图形 + Windows 自带中文黑体，无外链素材）后写入本目录：

| 文件 | 尺寸 | 用途 |
| --- | --- | --- |
| `og-cover.png` | 1200×630 | 社交分享封面（`og:image` / `twitter:image`） |
| `icon-192.png` | 192×192 | PWA / 站点图标（圆角，含透明角） |
| `icon-512.png` | 512×512 | PWA / 站点图标（圆角，含透明角） |
| `apple-touch-icon.png` | 180×180 | iOS 主屏图标（满幅不透明，无透明通道问题） |
| `manifest.json` | — | Web App Manifest（name/short_name = 速通笔记，`start_url` = `.`，`display` = standalone） |

改完文案或配色后重新生成（幂等，可反复运行；脚本会读回图片自检尺寸/非纯色/字形无豆腐块）：

```bash
python assets/make_assets.py
```

`build-pages.py` 会把整个 `assets/` 目录复制到部署产物里，因此站点上的引用路径是 `assets/xxx.png`。
