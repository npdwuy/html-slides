#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Đóng gói bài giảng “Ban ngày” thành một file HTML, và sinh file ghi chú giáo viên.

Cách dùng:
    python build.py <nguồn.html> --out <bài-giảng.html> --notes <ghi-chú-giáo-viên.html>
                    [--fonts <thư mục có fonts.json>]

- Các <link rel="stylesheet"> và <script src> trỏ tới file cục bộ được nhúng thẳng vào file ra.
  Link http(s) (Google Fonts, KaTeX) giữ nguyên; khi mất mạng slide dùng font có sẵn của máy.
- --fonts: nhúng font (base64) để chạy offline với đúng font. Thư mục cần file fonts.json dạng
  [{"family": "Source Serif 4", "file": "SourceSerif4-Regular.woff2", "weight": "400", "style": "normal"}, …]
- Ghi chú giáo viên lấy từ <aside class="notes"> của từng slide và <template id="notes-extra">.
"""
import argparse
import base64
import html
import io
import json
import os
import re
import sys

REMOTE = re.compile(r'^(https?:)?//')


def read(path):
    with io.open(path, encoding='utf-8') as f:
        return f.read()


def write(path, text):
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    with io.open(path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(text)


def inline_assets(src, base_dir):
    def css(m):
        href = m.group(1)
        if REMOTE.match(href):
            return m.group(0)
        return '<style>\n' + read(os.path.normpath(os.path.join(base_dir, href))) + '\n</style>'

    def js(m):
        path = m.group(1)
        if REMOTE.match(path):
            return m.group(0)
        code = read(os.path.normpath(os.path.join(base_dir, path))).replace('</script', '<\\/script')
        return '<script>\n' + code + '\n</script>'

    out = re.sub(r'<link\s+rel="stylesheet"\s+href="([^"]+)"\s*/?>', css, src)
    out = re.sub(r'<script\s+src="([^"]+)"\s*>\s*</script>', js, out)
    return out


def embed_fonts(src, font_dir):
    manifest = json.loads(read(os.path.join(font_dir, 'fonts.json')))
    faces = []
    for f in manifest:
        with open(os.path.join(font_dir, f['file']), 'rb') as fh:
            data = base64.b64encode(fh.read()).decode('ascii')
        faces.append('@font-face{font-family:"%s";font-weight:%s;font-style:%s;font-display:swap;'
                     'src:url(data:font/woff2;base64,%s) format("woff2");}'
                     % (f['family'], f.get('weight', '400'), f.get('style', 'normal'), data))
    src = re.sub(r'<link[^>]+(fonts\.googleapis\.com|fonts\.gstatic\.com|cdnjs\.cloudflare\.com/ajax/libs/KaTeX)[^>]*>\s*', '', src)
    return src.replace('</head>', '<style>\n' + '\n'.join(faces) + '\n</style>\n</head>', 1)


def strip_tags(s):
    return html.unescape(re.sub(r'<[^>]+>', '', s)).strip()


def parse_slides(src):
    cfg_m = re.search(r'<script type="application/json" id="deck-config">(.*?)</script>', src, re.S)
    cfg = json.loads(cfg_m.group(1)) if cfg_m else {}
    chapters = {str(c['id']): c for c in cfg.get('chapters', [])}
    slides = []
    for m in re.finditer(r'<section\s+class="slide([^"]*)"([^>]*)>(.*?)</section>', src, re.S):
        attr_text, body = m.group(2), m.group(3)
        attrs = dict(re.findall(r'([\w-]+)="([^"]*)"', attr_text))
        title = html.unescape(attrs.get('data-title', ''))
        if not title:
            h = re.search(r'<h[12][^>]*>(.*?)</h[12]>', body, re.S)
            title = strip_tags(h.group(1)) if h else '(không có tiêu đề)'
        notes = re.search(r'<aside class="notes">(.*?)</aside>', body, re.S)
        slides.append({
            'n': len(slides) + 1,
            'title': title,
            'ch': attrs.get('data-ch', ''),
            'min': float(attrs['data-min']) if attrs.get('data-min') else None,
            'optional': bool(re.search(r'\bdata-optional\b', attr_text)),
            'notes': notes.group(1).strip() if notes else '',
        })
    extra = re.search(r'<template id="notes-extra">(.*?)</template>', src, re.S)
    return cfg, chapters, slides, (extra.group(1).strip() if extra else '')


NOTES_CSS = """
:root { --ink:#1c1c1c; --mut:#4a4741; --line:#d6d2c6; --c2:#0f4c7a; --c5:#0a5c4b; --bg:#fbfaf6; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--ink); font: 17px/1.6 "Source Serif 4", Cambria, "Times New Roman", serif; }
main { max-width: 860px; margin: 0 auto; padding: 32px 22px 80px; }
h1 { font-size: 30px; font-weight: 600; margin: 0 0 4px; line-height: 1.2; }
.kick { color: var(--mut); font-size: 16px; margin: 0 0 16px; }
h2 { font-size: 22px; margin: 34px 0 10px; padding-bottom: 4px; border-bottom: 2px solid var(--line); }
table { border-collapse: collapse; width: 100%; font-size: 15.5px; margin: 6px 0 12px; }
th, td { text-align: left; padding: 6px 10px 6px 0; border-bottom: 1px solid var(--line); vertical-align: top; }
th { color: var(--mut); font-weight: 600; }
td.num, th.num { text-align: right; }
.stats { display: flex; flex-wrap: wrap; gap: 10px 24px; font-size: 16px; color: var(--mut); }
.stats b { color: var(--ink); }
.slide { background: #fff; border: 1px solid var(--line); border-radius: 10px; padding: 14px 18px 8px; margin: 14px 0; break-inside: avoid; page-break-inside: avoid; }
.slide h3 { font-size: 19px; margin: 0 0 2px; line-height: 1.3; }
.slide h3 .no { display: inline-block; min-width: 2.1em; color: var(--c2); }
.slide .meta { font-size: 14.5px; color: var(--mut); margin-bottom: 8px; }
.slide.opt { border-style: dashed; }
.chapter { font-size: 20px; margin: 30px 0 4px; color: var(--c2); }
pre, code { font-family: "JetBrains Mono", Consolas, monospace; font-size: 14px; }
pre { background: #f4f2ec; padding: 8px 10px; border-radius: 6px; overflow-x: auto; }
a { color: var(--c2); }
.small { font-size: 14.5px; color: var(--mut); }
@media print { body { background: #fff; font-size: 12pt; } main { max-width: none; padding: 0 10mm; } .slide { border-color: #bbb; } a { color: inherit; } }
"""


def fmt_min(x):
    return ('%g' % x).replace('.', ',') if x is not None else '?'


def build_notes(cfg, chapters, slides, extra, src_name):
    title = cfg.get('title', 'Bài giảng')
    core = [s for s in slides if not s['optional']]
    opt = [s for s in slides if s['optional']]
    core_min = sum(s['min'] or 0 for s in core)
    opt_min = sum(s['min'] or 0 for s in opt)
    order = []
    for s in slides:
        if s['ch'] not in order:
            order.append(s['ch'])
    rows = []
    for ch in order:
        name = chapters.get(ch, {}).get('name', ch or 'Khác')
        cs = [s for s in core if s['ch'] == ch]
        os_ = [s for s in opt if s['ch'] == ch]
        first = min(s['n'] for s in slides if s['ch'] == ch)
        last = max(s['n'] for s in slides if s['ch'] == ch)
        rows.append('<tr><td>%s</td><td class="num">%d–%d</td><td class="num">%d</td><td class="num">%s′</td><td class="num">%d</td><td class="num">%s′</td></tr>'
                    % (html.escape(name), first, last, len(cs), fmt_min(sum(s['min'] or 0 for s in cs)), len(os_), fmt_min(sum(s['min'] or 0 for s in os_))))
    rows.append('<tr><th>Cộng</th><th></th><th class="num">%d</th><th class="num">%s′</th><th class="num">%d</th><th class="num">%s′</th></tr>'
                % (len(core), fmt_min(core_min), len(opt), fmt_min(opt_min)))
    timing = ('<table><tr><th>Phần</th><th class="num">Slide</th><th class="num">Lõi</th><th class="num">Phút lõi</th>'
              '<th class="num">Tùy chọn</th><th class="num">Phút tùy chọn</th></tr>' + ''.join(rows) + '</table>')
    parts = []
    last_ch = None
    for s in slides:
        if s['ch'] != last_ch:
            last_ch = s['ch']
            parts.append('<div class="chapter">%s</div>' % html.escape(chapters.get(s['ch'], {}).get('name', s['ch'])))
        meta = '%s phút · %s' % (fmt_min(s['min']), 'tùy chọn (bật bằng phím O)' if s['optional'] else 'lõi')
        parts.append('<section class="slide%s"><h3><span class="no">%d.</span>%s</h3><div class="meta">%s</div>%s</section>'
                     % (' opt' if s['optional'] else '', s['n'], html.escape(s['title']), meta,
                        s['notes'] or '<p class="small">(Chưa có ghi chú.)</p>'))
    total = cfg.get('totalMinutes')
    stats = ('<div class="stats"><span><b>%d</b> slide</span><span><b>%d</b> lõi · <b>%d</b> tùy chọn</span>'
             '<span>đường lõi <b>%s phút</b>%s</span><span>tùy chọn thêm %s phút</span></div>'
             % (len(slides), len(core), len(opt), fmt_min(core_min),
                (' trên %s phút' % total) if total else '', fmt_min(opt_min)))
    return ('<!doctype html>\n<html lang="vi">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
            '<title>Ghi chú giáo viên · %s</title>\n'
            '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&amp;family=JetBrains+Mono:wght@500&amp;display=swap">\n'
            '<style>%s</style>\n</head>\n<body>\n<main>\n'
            '<div class="kick">Ghi chú giáo viên · %s</div>\n<h1>%s</h1>\n%s\n'
            '<p class="small">Tệp này sinh tự động từ %s, cùng nguồn với slide. Muốn sửa ghi chú thì sửa nguồn rồi build lại.</p>\n'
            '<h2>Thời lượng</h2>\n%s\n%s\n<h2>Ghi chú từng slide</h2>\n%s\n</main>\n</body>\n</html>\n'
            % (html.escape(title), NOTES_CSS, html.escape(cfg.get('subtitle', '')), html.escape(title), stats,
               html.escape(src_name), timing, extra, '\n'.join(parts)))


def main():
    ap = argparse.ArgumentParser(description='Đóng gói bài giảng Ban ngày')
    ap.add_argument('src')
    ap.add_argument('--out', required=True)
    ap.add_argument('--notes')
    ap.add_argument('--fonts')
    a = ap.parse_args()

    src = read(a.src)
    base = os.path.dirname(os.path.abspath(a.src))
    cfg, chapters, slides, extra = parse_slides(src)

    out = inline_assets(src, base)
    if a.fonts:
        out = embed_fonts(out, a.fonts)
    banner = '<!-- Tệp sinh tự động từ %s bằng templates/ban-ngay/build.py. Đừng sửa trực tiếp. -->\n' % os.path.basename(a.src)
    out = out.replace('<!doctype html>', '<!doctype html>\n' + banner, 1)
    write(a.out, out)

    if a.notes:
        write(a.notes, build_notes(cfg, chapters, slides, extra, os.path.basename(a.src)))

    core = [s for s in slides if not s['optional']]
    problems = [s for s in slides if not s['notes'] or s['min'] is None]
    print('slides=%d core=%d optional=%d core_min=%s optional_min=%s out=%s (%d KB)'
          % (len(slides), len(core), len(slides) - len(core), fmt_min(sum(s['min'] or 0 for s in core)),
             fmt_min(sum(s['min'] or 0 for s in slides if s['optional'])), a.out, os.path.getsize(a.out) // 1024))
    for s in problems:
        print('  CẢNH BÁO slide %d “%s”: %s' % (s['n'], s['title'], 'thiếu ghi chú' if not s['notes'] else 'thiếu data-min'))
    return 1 if problems else 0


if __name__ == '__main__':
    sys.exit(main())
