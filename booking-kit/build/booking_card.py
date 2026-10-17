#!/usr/bin/env python3
"""
Puretek Global Cleaning - weekly Saturday "Now Booking Next Week" card (Facebook).
1080x1350: real job photo on top, black-and-gold booking band below.

Fonts and logo resolve from the Brand Assets folder next to this build/ folder
(same layout as stat_card.py), or from --brand DIR.

Usage:
  python3 booking_card.py PHOTO OUT.png [--headline "..."] [--brand DIR]
"""
import argparse, os, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageOps

W, H = 1080, 1350
PHOTO_H = 700
HERE = os.path.dirname(os.path.abspath(__file__))

GOLD, GOLD_LIGHT = (196, 158, 76), (230, 198, 128)
CREAM, BLACK, MUTED = (240, 234, 220), (10, 9, 8), (205, 200, 187)

EYEBROW = "NOW BOOKING NEXT WEEK"
DEFAULT_HEADLINE = "Next week's openings are filling up."
SERVICES = "Initial Deep Cleans  ·  Move-In / Move-Out  ·  Recurring Service"
AREAS = "WEST HOUSTON · KATY · CYPRESS · SUGAR LAND · MISSOURI CITY"
PHONE = "CALL OR TEXT  346-615-4646"
WEB = "WWW.PURETEKGLOBAL.NET"
REQUIRED = ["Outfit-Bold.ttf", "Lora-Bold.ttf", "Lora-Regular.ttf"]


def main():
    p = argparse.ArgumentParser()
    p.add_argument("photo"); p.add_argument("out")
    p.add_argument("--headline", default=DEFAULT_HEADLINE)
    p.add_argument("--brand", default=os.path.dirname(HERE))
    a = p.parse_args()

    fonts = os.path.join(a.brand, "fonts")
    miss = [x for x in REQUIRED if not os.path.isfile(os.path.join(fonts, x))]
    if miss:
        sys.exit("FONTS MISSING in %s: %s (do not substitute system fonts)" % (fonts, miss))
    F = lambda n, s: ImageFont.truetype(os.path.join(fonts, n), s)
    outfit = lambda s: F("Outfit-Bold.ttf", s)

    img = Image.new("RGB", (W, H), BLACK)

    # --- photo, cover-cropped into the top area, gentle fade into the band
    ph = ImageOps.exif_transpose(Image.open(a.photo)).convert("RGB")
    ph = ImageOps.fit(ph, (W, PHOTO_H), Image.LANCZOS, centering=(0.5, 0.55))
    img.paste(ph, (0, 0))
    fade = Image.new("L", (W, PHOTO_H), 0)
    fd = ImageDraw.Draw(fade)
    for y in range(PHOTO_H - 170, PHOTO_H):
        fd.line([(0, y), (W, y)], fill=int(255 * ((y - (PHOTO_H - 170)) / 170) ** 1.6))
    top = Image.new("L", (W, PHOTO_H), 0)
    td = ImageDraw.Draw(top)
    for y in range(0, 120):
        td.line([(0, y), (W, y)], fill=int(90 * (1 - y / 120) ** 1.4))
    mask = Image.fromarray(__import__("numpy").maximum(
        __import__("numpy").array(fade), __import__("numpy").array(top)))
    img.paste(Image.new("RGB", (W, PHOTO_H), BLACK), (0, 0), mask)
    d = ImageDraw.Draw(img)


    # --- frame with gold corner ticks (matches stat_card.py)
    m, t = 46, 24
    d.rectangle([m, m, W - m, H - m], outline=(100, 82, 44), width=1)
    for (x, y, dx, dy) in [(m, m, 1, 1), (W - m, m, -1, 1), (m, H - m, 1, -1), (W - m, H - m, -1, -1)]:
        d.line([x, y, x + dx * t, y], fill=GOLD, width=3)
        d.line([x, y, x, y + dy * t], fill=GOLD, width=3)

    inner = W - 2 * m - 60

    def spaced(y, text, size, fill, sp, max_w=inner):
        while size > 12:
            fnt = outfit(size)
            ws = [d.textlength(c, font=fnt) for c in text]
            tot = sum(ws) + sp * (len(text) - 1)
            if tot <= max_w:
                break
            size -= 1
        x = (W - tot) / 2
        for c, w in zip(text, ws):
            d.text((x, y), c, font=fnt, fill=fill); x += w + sp
        return y + fnt.size

    def center(y, text, fnt, fill):
        b = d.textbbox((0, 0), text, font=fnt)
        d.text(((W - (b[2] - b[0])) / 2, y - b[1]), text, font=fnt, fill=fill)
        return y + (b[3] - b[1])

    def wrap(y, text, fnt, fill, max_w, gap):
        words = text.split()
        if d.textlength(text, font=fnt) <= max_w:
            lines = [text]
        else:  # balanced two-line split: no orphan words
            best = None
            for i in range(1, len(words)):
                l1, l2 = " ".join(words[:i]), " ".join(words[i:])
                w1, w2 = d.textlength(l1, font=fnt), d.textlength(l2, font=fnt)
                if max(w1, w2) <= max_w and (best is None or abs(w1 - w2) < best[0]):
                    best = (abs(w1 - w2), [l1, l2])
            if best is None:
                sys.exit("LAYOUT OVERFLOW: line too long for two lines: %r" % text)
            lines = best[1]
        for ln in lines:
            y = center(y, ln, fnt, fill) + gap
        return y - gap

    y = spaced(652, EYEBROW, 38, GOLD, 6)
    d.line([(W - 110) / 2, y + 22, (W + 110) / 2, y + 22], fill=GOLD, width=2)
    hs = 56
    while hs > 40 and d.textlength(a.headline, font=F("Lora-Bold.ttf", hs)) > 2 * 860:
        hs -= 2
    y = wrap(y + 58, a.headline, F("Lora-Bold.ttf", hs), CREAM, 860, 16)
    y = wrap(y + 30, SERVICES, F("Lora-Regular.ttf", 27), MUTED, 900, 10)
    y = spaced(y + 34, AREAS, 22, GOLD_LIGHT, 2)

    cta_rule = 1172
    if y + 24 > cta_rule:
        sys.exit("LAYOUT OVERFLOW: headline too long (ends at %d). Shorten it." % y)
    logo = Image.open(os.path.join(a.brand, "new gold white logo.png")).convert("RGBA")
    logo = logo.crop(logo.getbbox())
    lw = 150
    logo = logo.resize((lw, int(logo.height * lw / logo.width)), Image.LANCZOS)
    ly = int((y + cta_rule) / 2 - logo.height / 2)
    if ly < y + 14:
        sys.exit("LAYOUT OVERFLOW: no room for the logo. Shorten the headline.")
    img.paste(logo, ((W - lw) // 2, ly), logo)
    d.line([(W - 110) / 2, cta_rule, (W + 110) / 2, cta_rule], fill=GOLD, width=2)
    center(1198, PHONE, outfit(44), CREAM)
    spaced(1262, WEB, 24, GOLD, 5)

    img.save(a.out, optimize=True)
    print("OK", a.out, "headline_size=%d services_end=%d" % (hs, y))


if __name__ == "__main__":
    main()
