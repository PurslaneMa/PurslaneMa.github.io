#!/usr/bin/env python3
"""《速通笔记》站点品牌资产生成脚本（可重复运行、幂等）。

生成物（全部落在本脚本所在目录 assets/）：
- og-cover.png         1200x630 社交分享封面（og:image / twitter:image）
- icon-192.png         192x192 应用图标（PWA manifest，圆角）
- icon-512.png         512x512 应用图标（PWA manifest，圆角）
- apple-touch-icon.png 180x180 iOS 主屏图标（不透明、不透明角）
- manifest.json        Web App Manifest（name/short_name = 速通笔记）

视觉语言与站点 / favicon 一致：底色 #0a0f1f → #101a33，强调色 #6366f1 → #22d3ee。
只使用 Pillow 绘制几何图形与系统字体，不依赖任何外链素材。

用法：
    python assets/make_assets.py
"""
import json
import os
import sys

from PIL import Image, ImageChops, ImageDraw, ImageFont, ImageOps

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)

# ── 品牌色（与 reader.html 的 CSS 变量一致）─────────────────────────────
BG_TOP = (10, 15, 31)        # #0a0f1f
BG_BOTTOM = (16, 26, 51)     # #101a33
TILE_TOP = (19, 29, 51)      # #131d33（图标底板渐变起点）
TILE_BOTTOM = (10, 15, 31)   # #0a0f1f
TEXT = (230, 236, 248)       # #e6ecf8
DIM = (148, 166, 196)        # #94a6c4
ACCENT1 = (99, 102, 241)     # #6366f1
ACCENT2 = (34, 211, 238)     # #22d3ee

# ── 字体：Windows 自带中文黑体，缺失时逐级回退 ──────────────────────────
FONT_BOLD_CANDIDATES = [
    r'C:\Windows\Fonts\msyhbd.ttc',
    r'C:\Windows\Fonts\simhei.ttf',
    r'C:\Windows\Fonts\msyh.ttc',
    '/usr/share/fonts/opentype/noto/NotoSansCJKsc-Bold.otf',
    '/System/Library/Fonts/PingFang.ttc',
]
FONT_REG_CANDIDATES = [
    r'C:\Windows\Fonts\msyh.ttc',
    r'C:\Windows\Fonts\simhei.ttf',
    '/usr/share/fonts/opentype/noto/NotoSansCJKsc-Regular.otf',
    '/System/Library/Fonts/PingFang.ttc',
]

TITLE = '速通笔记'
SUBTITLE = '从 OJ 到开发部署 · 算法竞赛生的计算机补全课'
FOOTER = '64 章 · 终端 / 系统 / 网络 / Git / 数据库 / 前后端 / Docker / AI 工程'
DESCRIPTION = ('面向算法竞赛生的计算机速通教材：从 OJ 到开发部署，'
               '覆盖终端、系统、网络、Git、数据库、前后端、Docker 与 AI 工程，共 64 章。')

# 生成后用于自检的字符集（标题/副标题/页脚全部字符）
ALL_TEXT = TITLE + SUBTITLE + FOOTER


# ══════════════ 字体与字形自检 ══════════════
def _first_existing(paths):
    for p in paths:
        if os.path.exists(p):
            return p
    raise SystemExit('找不到可用的中文字体，请手动指定：' + repr(paths))


def load_font(path, size, index=0):
    """加载字体；.ttc 用 index 选具体字重。"""
    kw = {}
    if path.lower().endswith('.ttc'):
        kw['index'] = index
    try:
        return ImageFont.truetype(path, size, **kw)
    except Exception:
        return ImageFont.truetype(path, size)


def missing_glyphs(path, text, index=0):
    """用 fontTools 读 cmap，返回字体中缺失（会渲染成豆腐块）的字符列表。

    这是判断「有没有方块字」的权威依据：字体 cmap 里没有该码位，
    FreeType 就只能画 .notdef（空心方块）。
    """
    try:
        from fontTools.ttLib import TTCollection, TTFont
    except Exception:                                  # 无 fontTools 时退化为渲染比对
        return _missing_glyphs_by_render(path, text, index)
    if path.lower().endswith('.ttc'):
        font = TTCollection(path).fonts[index]
    else:
        font = TTFont(path, fontNumber=index)
    cmap = font.getBestCmap()
    return sorted({ch for ch in text if ch.strip() and ord(ch) not in cmap})


def _missing_glyphs_by_render(path, text, index=0, size=48):
    """回退方案：逐字渲染，与「必然缺失」的码位（U+FDD0 非字符）位图比对。"""
    font = load_font(path, size, index)
    probe = Image.new('L', (size * 3, size * 3), 0)
    ImageDraw.Draw(probe).text((size, size), '\ufdd0', font=font, fill=255)
    notdef = probe.tobytes()
    bad = []
    for ch in sorted(set(text)):
        if not ch.strip():
            continue
        img = Image.new('L', (size * 3, size * 3), 0)
        ImageDraw.Draw(img).text((size, size), ch, font=font, fill=255)
        if img.tobytes() == notdef:
            bad.append(ch)
    return bad


def fit_font(path, text, max_width, start_size, index=0, min_size=12):
    """从 start_size 起逐级缩小，返回第一个不超宽的字号（避免出框）。"""
    size = start_size
    while size > min_size:
        f = load_font(path, size, index)
        if f.getlength(text) <= max_width:
            return f, size
        size -= 1
    return load_font(path, min_size, index), min_size


# ══════════════ 基础绘制工具 ══════════════
def _ramp(size, dx, dy, steps=192):
    """按方向向量 (dx, dy) 生成 0→255 的 L 渐变，再放大到目标尺寸。

    在 steps×steps 的小图上逐像素算（3.6 万次），再 BICUBIC 放大，
    既避免了对大图逐像素处理，也不依赖 numpy。
    """
    g = Image.new('L', (steps, steps))
    px = g.load()
    for y in range(steps):
        fy = y / (steps - 1) * dy
        for x in range(steps):
            v = x / (steps - 1) * dx + fy
            px[x, y] = 0 if v <= 0 else (255 if v >= 1 else int(round(v * 255)))
    return g.resize(size, Image.Resampling.BICUBIC)


def vgradient(size, top, bottom):
    """竖直线性渐变（top 在上）。"""
    return ImageOps.colorize(_ramp(size, 0.0, 1.0), black=top, white=bottom)


def hgradient(size, left, right):
    """水平线性渐变（left 在左）。"""
    return ImageOps.colorize(_ramp(size, 1.0, 0.0), black=left, white=right)


def diag_gradient(size, c1, c2):
    """左上 → 右下对角渐变。"""
    return ImageOps.colorize(_ramp(size, 0.5, 0.5), black=c1, white=c2)


def radial_glow(size, center, radius, color, intensity):
    """低分辨率逐像素算径向衰减再放大（纯 Pillow，无 numpy 依赖）。"""
    w, h = size
    sw, sh = max(2, w // 8), max(2, h // 8)
    small = Image.new('L', (sw, sh), 0)
    px = small.load()
    cx, cy = center[0] * sw, center[1] * sh
    r = max(1.0, radius * sw)
    peak = 255.0 * intensity
    for y in range(sh):
        dy = y - cy
        for x in range(sw):
            d = ((x - cx) ** 2 + dy * dy) ** 0.5
            if d < r:
                t = 1.0 - d / r
                px[x, y] = int(peak * t * t)      # 平方衰减，边缘更柔和
    glow = small.resize(size, Image.Resampling.LANCZOS)
    return ImageOps.colorize(glow, black=(0, 0, 0), white=color)


def rounded_mask(size, radius):
    m = Image.new('L', size, 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius=radius, fill=255)
    return m


def book_glyph_mask(size, box, ss=4):
    """几何拼出的「摊开的书」形状遮罩（与 favicon 的书页同一语言）。

    返回整幅画布大小的 L 遮罩，书页画在 box 指定的区域内，便于直接当
    paste 的 mask 用。两页 = 两个圆角矩形，中缝留白；页面上抠掉三条横线当文字。
    """
    W, H = size[0] * ss, size[1] * ss
    m = Image.new('L', (W, H), 0)
    d = ImageDraw.Draw(m)
    gx0, gy0, gx1, gy1 = (int(v * ss) for v in box)
    gw, gh = gx1 - gx0, gy1 - gy0
    gap = 0.035                                   # 中缝半宽（相对整宽）
    r = int(gw * 0.075)
    left = (gx0, gy0 + int(gh * 0.04), gx0 + int(gw * (0.5 - gap)), gy1 - int(gh * 0.04))
    right = (gx0 + int(gw * (0.5 + gap)), gy0 + int(gh * 0.04), gx1, gy1 - int(gh * 0.04))
    for page in (left, right):
        d.rounded_rectangle(page, radius=r, fill=255)
    # 页面上的「文字」：三条横线，从每页内缩 22%
    inset = 0.22
    bar_h = max(1, int(gh * 0.055))
    for frac in (0.30, 0.48, 0.66):
        cy = gy0 + int(gh * frac)
        for page in (left, right):
            pw = page[2] - page[0]
            bx0 = page[0] + int(pw * inset)
            bx1 = page[2] - int(pw * inset)
            if frac > 0.6:                        # 末行短一点，像段落收尾
                bx1 = bx0 + int((bx1 - bx0) * 0.6)
            d.rectangle((bx0, cy, bx1, cy + bar_h), fill=0)
    return m.resize(size, Image.Resampling.LANCZOS)


def paste_glow(base, layer):
    return ImageChops.add(base, layer)


# ══════════════ 应用图标 ══════════════
def make_icon(size, rounded=True, radius_ratio=0.20, glyph_ratio=0.60, opaque=False, ss=4):
    """深色底板 + 渐变书页。rounded=False / opaque=True 用于 apple-touch-icon。"""
    W = size * ss
    base = vgradient((W, W), TILE_TOP, TILE_BOTTOM)
    base = paste_glow(base, radial_glow((W, W), (0.22, 0.14), 0.85,
                                        (46, 54, 120), 0.55))      # 左上偏冷光
    base = paste_glow(base, radial_glow((W, W), (0.86, 0.92), 0.80,
                                        (16, 74, 92), 0.38))       # 右下青色余晖

    if rounded:
        mask = rounded_mask((W, W), int(W * radius_ratio))
    else:
        mask = Image.new('L', (W, W), 255)

    out = Image.new('RGBA', (W, W), (0, 0, 0, 0))
    out.paste(base, (0, 0), mask)

    g = glyph_ratio * W
    box = ((W - g) / 2, (W - g) / 2, (W + g) / 2, (W + g) / 2)
    glyph = book_glyph_mask((W, W), box)
    fill = diag_gradient((W, W), ACCENT1, ACCENT2)
    out.paste(fill, (0, 0), glyph)

    if opaque:                                     # apple-touch-icon：压到不透明底
        flat = Image.new('RGBA', (W, W), TILE_BOTTOM + (255,))
        flat.alpha_composite(out)
        out = flat
    return out.resize((size, size), Image.Resampling.LANCZOS)


# ══════════════ 社交分享封面 ══════════════
def make_og_cover(w=1200, h=630, font_bold=None, font_reg=None):
    img = vgradient((w, h), BG_TOP, BG_BOTTOM)
    img = paste_glow(img, radial_glow((w, h), (0.12, 0.04), 0.72, (58, 62, 150), 0.62))
    img = paste_glow(img, radial_glow((w, h), (0.95, 0.98), 0.66, (18, 78, 96), 0.45))
    img = paste_glow(img, radial_glow((w, h), (0.60, 0.55), 0.75, (26, 30, 80), 0.35))

    pad = 96

    # 图标：圆角深色底板 + 渐变书页（与 favicon / app icon 同一图形）
    tile = 144
    tile_img = make_icon(tile, rounded=True, radius_ratio=0.22, glyph_ratio=0.58)
    img.paste(tile_img, (pad, 92), tile_img)
    # 图标外圈加一圈很淡的强调色描边（RGBA 叠加，避免生硬实线）
    overlay = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(overlay).rounded_rectangle(
        (pad, 92, pad + tile - 1, 92 + tile - 1),
        radius=int(tile * 0.22), outline=(129, 140, 248, 96), width=2)
    img = Image.alpha_composite(img.convert('RGBA'), overlay).convert('RGB')
    d = ImageDraw.Draw(img)

    # 主标题
    title_font, _ = fit_font(font_bold, TITLE, w - pad * 2, 118)
    d.text((pad, 316), TITLE, font=title_font, fill=TEXT, anchor='lm')

    # 渐变短横线
    rule_w, rule_h = 132, 7
    rule = hgradient((rule_w, rule_h), ACCENT1, ACCENT2)
    img.paste(rule, (pad, 396))

    # 副标题
    sub_font, sub_size = fit_font(font_reg, SUBTITLE, w - pad * 2, 36)
    d.text((pad, 452), SUBTITLE, font=sub_font, fill=DIM, anchor='lm')

    # 分隔细线 + 右下角小字
    d.line((pad, 528, w - pad, 528), fill=(41, 57, 90), width=1)
    foot_font, _ = fit_font(font_reg, FOOTER, w - pad * 2, 22)
    d.text((w - pad, 570), FOOTER, font=foot_font, fill=(120, 138, 168), anchor='rm')

    # 底部品牌色条
    img.paste(hgradient((w, 6), ACCENT1, ACCENT2), (0, h - 6))
    return img


# ══════════════ 清单与写盘 ══════════════
def build_manifest():
    return {
        'name': '速通笔记',
        'short_name': '速通笔记',
        'description': DESCRIPTION,
        # 注意：start_url 是相对 manifest 自身的 URL 解析的。本文件发布在
        # assets/manifest.json，所以 "." 指向 assets/；若希望 PWA 启动页是首页，
        # 把下面这行改成 '../'（或把 manifest 复制一份到站点根目录）。
        'start_url': '../',   # manifest 位于 /assets/ 下，'../' 指回站点首页
        'display': 'standalone',
        'background_color': '#0a0f1f',
        'theme_color': '#0a0f1f',
        'lang': 'zh-CN',
        'icons': [
            {'src': 'icon-192.png', 'sizes': '192x192', 'type': 'image/png',
             'purpose': 'any maskable'},
            {'src': 'icon-512.png', 'sizes': '512x512', 'type': 'image/png',
             'purpose': 'any maskable'},
        ],
    }


def selfcheck(expect, preview=True):
    """读回生成的 PNG 做自检：尺寸、是否纯色（方差/颜色数）、中间区域留一份预览小图。

    预览文件写在系统临时目录，不落到仓库里。
    """
    from PIL import ImageStat
    ok = True
    tmp = os.environ.get('TEMP') or os.environ.get('TMPDIR') or '/tmp'
    for name, size in expect.items():
        path = os.path.join(HERE, name)
        if not os.path.exists(path):
            print(f'  [缺失] {name}', file=sys.stderr)
            ok = False
            continue
        im = Image.open(path)
        ncolors = len(im.convert('RGB').getcolors(maxcolors=1 << 24) or [])
        st = ImageStat.Stat(im.convert('RGB'))
        flat = max(st.stddev) < 1.0
        dim_ok = im.size == size
        print(f'  {name}: {im.size[0]}x{im.size[1]} mode={im.mode} '
              f'颜色数={ncolors} stddev={[round(v, 1) for v in st.stddev]} '
              f'{"尺寸OK" if dim_ok else "尺寸错误!"} {"纯色!" if flat else "非纯色OK"}')
        ok = ok and dim_ok and not flat and ncolors > 64
        if preview and name == 'og-cover.png':
            w, h = im.size
            out = os.path.join(tmp, 'preview_og_mid.png')
            im.crop((w // 8, h // 8, w - w // 8, h - h // 8)).save(out)
            print(f'    中间区域预览（临时文件）: {out}')
    return ok


def manifest_selfcheck():
    with open(os.path.join(HERE, 'manifest.json'), encoding='utf-8') as fh:
        m = json.load(fh)
    need = ['name', 'short_name', 'start_url', 'display', 'background_color',
            'theme_color', 'lang', 'description', 'icons']
    miss = [k for k in need if k not in m]
    bad_icons = [i for i in m.get('icons', [])
                 if not os.path.exists(os.path.join(HERE, i['src']))]
    print(f'  manifest.json: 字段齐全={not miss} icons 文件存在={not bad_icons} '
          f'name={m["name"]}')
    return not miss and not bad_icons


def main():
    bold_path = _first_existing(FONT_BOLD_CANDIDATES)
    reg_path = _first_existing(FONT_REG_CANDIDATES)
    print(f'字体：粗体 {bold_path} / 常规 {reg_path}')

    # 先自检字形，出现豆腐块直接报错退出
    bad = []
    for path in {bold_path, reg_path}:
        miss = missing_glyphs(path, ALL_TEXT)
        if miss:
            bad.append((path, miss))
    if bad:
        for path, miss in bad:
            print(f'  [豆腐字] {path} 缺少字形：{"".join(miss)}', file=sys.stderr)
        raise SystemExit('字体缺字，请更换字体后再生成（避免渲染出方块）')
    print(f'字形自检通过：{len(set(ALL_TEXT))} 个字符在粗体/常规字体中均有字形（无豆腐块）')

    og = make_og_cover(font_bold=bold_path, font_reg=reg_path)
    og.save(os.path.join(HERE, 'og-cover.png'), optimize=True)

    for size in (192, 512):
        make_icon(size).save(os.path.join(HERE, f'icon-{size}.png'), optimize=True)

    # apple-touch-icon：不透明满幅方图，交给 iOS 自己切圆角，彻底避开透明问题
    make_icon(180, rounded=False, glyph_ratio=0.62, opaque=True).save(
        os.path.join(HERE, 'apple-touch-icon.png'), optimize=True)

    with open(os.path.join(HERE, 'manifest.json'), 'w', encoding='utf-8') as fh:
        json.dump(build_manifest(), fh, ensure_ascii=False, indent=2)
        fh.write('\n')

    print('生成后自检：')
    ok = selfcheck({
        'og-cover.png': (1200, 630),
        'icon-192.png': (192, 192),
        'icon-512.png': (512, 512),
        'apple-touch-icon.png': (180, 180),
    })
    ok = manifest_selfcheck() and ok
    for name in sorted(os.listdir(HERE)):
        if name.endswith('.png') or name == 'manifest.json':
            print(f'    {name:24s} {os.path.getsize(os.path.join(HERE, name)):>8d} B')
    print('品牌资产已写入', HERE)
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
