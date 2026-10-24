#!/usr/bin/env python3
"""
Puretek Global Cleaning / PTG Multiservices - black-and-gold 1080x1350 stat card.

Self-contained and MACHINE-INDEPENDENT. Fonts and logo resolve from this repo's
own Brand Assets folder, so the build no longer depends on any sandbox that may
or may not be mounted on a given run. See BUILD_NOTES.md for why.

Usage:
  python3 stat_card.py out.png --eyebrow "..." --stat "64%" --subhead "..." \
      --headline "..." --supporting "..." [--cta-file cta.txt] [--logo PATH]
"""
import argparse, os, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H = 1080, 1350
HERE = os.path.dirname(os.path.abspath(__file__))
BRAND = os.path.dirname(HERE)
FONT_DIR = os.path.join(BRAND, "fonts")
DEFAULT_LOGO = os.path.join(BRAND, "new gold white logo.png")
DEFAULT_CTA = os.path.join(HERE, "cta.txt")

GOLD, GOLD_LIGHT = (196, 158, 76), (230, 198, 128)
CREAM, BLACK = (240, 234, 220), (10, 9, 8)

REQUIRED = ["BricolageGrotesque-Bold.ttf", "Outfit-Bold.ttf",
            "Lora-Bold.ttf", "Lora-Regular.ttf"]


def _preflight():
    missing = [f for f in REQUIRED if not os.path.isfile(os.path.join(FONT_DIR, f))]
    if missing:
        sys.exit("FONTS MISSING in %s: %s\nThe card cannot be built to brand without them. "
                 "Do not substitute system fonts." % (FONT_DIR, ", ".join(missing)))


def f(name, size):
    return ImageFont.truetype(os.path.join(FONT_DIR, name), size)


stat_font = lambda s: f("BricolageGrotesque-Bold.ttf", s)
lora      = lambda s: f("Lora-Regular.ttf", s)
lora_b    = lambda s: f("Lora-Bold.ttf", s)
outfit_b  = lambda s: f("Outfit-Bold.ttf", s)


def build(EYEBROW, STAT, SUBHEAD, HEADLINE, SUPPORTING, OUT_PATH,
          PHONE_LINE, WEBSITE, LOGO_PATH):
    _preflight()
    img = Image.new("RGB", (W, H), BLACK)
    draw = ImageDraw.Draw(img)

    vign = Image.new("L", (W, H), 0)
    vd = ImageDraw.Draw(vign)
    cx, cy, maxr = W // 2, 420, 620
    for r in range(maxr, 0, -4):
        vd.ellipse([cx - r, cy - r, cx + r, cy + r], fill=int(20 * (1 - r / maxr)))
    vign = vign.filter(ImageFilter.GaussianBlur(50))
    img = Image.composite(Image.new("RGB", (W, H), (32, 27, 15)), img, vign)
    draw = ImageDraw.Draw(img)

    margin, tick = 46, 24
    draw.rectangle([margin, margin, W - margin, H - margin], outline=(100, 82, 44), width=1)
    for (x, y, dx, dy) in [(margin, margin, 1, 1), (W - margin, margin, -1, 1),
                           (margin, H - margin, 1, -1), (W - margin, H - margin, -1, -1)]:
        draw.line([x, y, x + dx * tick, y], fill=GOLD, width=3)
        draw.line([x, y, x, y + dy * tick], fill=GOLD, width=3)

    def center_text(y, text, font, fill, spacing=0):
        if spacing:
            widths = [draw.textlength(ch, font=font) for ch in text]
            x = (W - (sum(widths) + spacing * (len(text) - 1))) / 2
            for ch, wch in zip(text, widths):
                draw.text((x, y), ch, font=font, fill=fill)
                x += wch + spacing
            return
        b = draw.textbbox((0, 0), text, font=font)
        draw.text(((W - (b[2] - b[0])) / 2, y), text, font=font, fill=fill)

    def fit_spaced(text, size, max_w, spacing=1):
        """Shrink a letter-spaced line until it fits inside the margins."""
        while size > 12:
            fnt = outfit_b(size)
            total = sum(draw.textlength(c, font=fnt) for c in text) + spacing * (len(text) - 1)
            if total <= max_w:
                return fnt
            size -= 1
        return outfit_b(12)

    def wrap_center(y, text, font, fill, max_width, line_gap=14):
        lines, cur = [], ""
        for w in text.split():
            t = (cur + " " + w).strip()
            if draw.textlength(t, font=font) <= max_width:
                cur = t
            else:
                lines.append(cur); cur = w
        if cur:
            lines.append(cur)
        yy = y
        for ln in lines:
            b = draw.textbbox((0, 0), ln, font=font)
            draw.text(((W - (b[2] - b[0])) / 2, yy), ln, font=font, fill=fill)
            yy += (b[3] - b[1]) + line_gap
        return yy

    inner = W - 2 * margin - 40
    center_text(104, EYEBROW, fit_spaced(EYEBROW, 30, inner, 5), GOLD, spacing=5)
    rule_w = 100
    draw.line([(W - rule_w) / 2, 162, (W + rule_w) / 2, 162], fill=GOLD, width=2)

    ss = 260
    while draw.textlength(STAT, font=stat_font(ss)) > W - 140 and ss > 140:
        ss -= 8
    sf = stat_font(ss)
    b = draw.textbbox((0, 0), STAT, font=sf)
    stat_top = 210
    center_text(stat_top - b[1], STAT, sf, CREAM)
    stat_bottom = stat_top + (b[3] - b[1])

    subhead_y = stat_bottom + 40
    center_text(subhead_y, SUBHEAD, fit_spaced(SUBHEAD, 23, inner, 1), GOLD_LIGHT, spacing=1)
    rule2_y = subhead_y + 80
    draw.line([(W - rule_w) / 2, rule2_y, (W + rule_w) / 2, rule2_y], fill=(100, 82, 44), width=1)

    body_end = wrap_center(rule2_y + 44, HEADLINE, lora_b(45), CREAM, 830, 14)
    body_end = wrap_center(body_end + 24, SUPPORTING, lora(29), (205, 200, 187), 810, 10)

    cta_rule_y, phone_y, web_y = 1180, 1208, 1254

    logo = Image.open(LOGO_PATH).convert("RGBA")
    logo = logo.crop(logo.getbbox())
    logo = logo.resize((270, int(logo.height * (270 / logo.width))), Image.LANCZOS)
    logo_y = int(((body_end + 14) + (cta_rule_y - 20)) / 2 - logo.height / 2)
    if logo_y < body_end + 8:
        sys.exit("LAYOUT OVERFLOW: body text runs into the logo. Shorten HEADLINE or SUPPORTING.")
    img.paste(logo, ((W - logo.width) // 2, logo_y), logo)

    draw.line([(W - rule_w) / 2, cta_rule_y, (W + rule_w) / 2, cta_rule_y], fill=GOLD, width=2)
    center_text(phone_y, PHONE_LINE, outfit_b(32), CREAM)
    center_text(web_y, WEBSITE, outfit_b(22), GOLD, spacing=4)

    img.save(OUT_PATH)
    print("OK %s  stat_font=%d  body_end=%d  logo_y=%d" % (OUT_PATH, ss, body_end, logo_y))


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("out")
    for a in ("eyebrow", "stat", "subhead", "headline", "supporting"):
        p.add_argument("--" + a, required=True)
    p.add_argument("--cta-file", default=DEFAULT_CTA)
    p.add_argument("--logo", default=DEFAULT_LOGO)
    a = p.parse_args()
    with open(a.cta_file) as fh:
        lines = [l.strip() for l in fh if l.strip() and not l.startswith("#")]
    build(a.eyebrow, a.stat, a.subhead, a.headline, a.supporting,
          a.out, lines[0], lines[1], a.logo)
