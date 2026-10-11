"""Render the README brand banner. Requires Python + Pillow; uses bundled fonts.

Run from any directory: python tools/build-readme-banner.py
"""
from pathlib import Path
import math

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "image"
WIDTH, HEIGHT, SCALE = 1600, 720, 2
FRAMES, DURATION = 75, 80
BG = "#111719"
GREEN = "#65e6b4"
WHITE = "#f0f5f3"


def font(size, medium=False):
    name = "Roboto-Medium.ttf" if medium else "Roboto-Regular.ttf"
    return ImageFont.truetype(str(ROOT / "vendor/fonts" / name), size * SCALE)


def render(phase):
    im = Image.new("RGB", (WIDTH * SCALE, HEIGHT * SCALE), BG)
    d = ImageDraw.Draw(im)

    def line(points, fill, width=1):
        d.line([(round(x * SCALE), round(y * SCALE)) for x, y in points], fill=fill,
               width=width * SCALE, joint="curve")

    def rect(box, fill=None, outline=None, radius=0, width=1):
        d.rounded_rectangle(tuple(round(v * SCALE) for v in box), radius=radius * SCALE,
                            fill=fill, outline=outline, width=width * SCALE)

    def text(x, y, label, size, color, medium=False):
        d.text((x * SCALE, y * SCALE), label, font=font(size, medium), fill=color)

    def circle(x, y, r, color, width=1, fill=None):
        d.ellipse(((x-r)*SCALE, (y-r)*SCALE, (x+r)*SCALE, (y+r)*SCALE),
                  outline=color, fill=fill, width=width*SCALE)

    # Architectural backdrop: oversized panel, sparse grid and circuit traces.
    rect((950, 20, WIDTH-20, HEIGHT-20), fill="#152220", radius=32)
    for x in range(992, WIDTH-32, 40):
        for y in range(48, HEIGHT-32, 40):
            circle(x, y, 1, "#30433d", fill="#30433d")
    rect((1, 1, WIDTH-2, HEIGHT-2), outline="#35463f", radius=32, width=2)
    rect((80, 68, 132, 72), fill=GREEN, radius=2)
    text(151, 57, "TTP / ENGINEERING PORTFOLIO", 19, "#bdcec7", True)
    circle(1393, 67, 4, GREEN, fill=GREEN)
    text(1409, 55, "QUALITY FIRST", 14, "#bdcec7", True)

    # Large editorial typography stays still while the brand emblem animates.
    text(76, 158, "TRAN TAN", 104, WHITE, True)
    text(73, 263, "PHAT", 142, GREEN, True)
    rect((441, 379, 458, 396), fill=GREEN, radius=3)
    text(80, 445, "SENIOR QA ENGINEER", 34, WHITE, True)
    text(80, 499, "Precision in every release.", 25, "#a9bdb3")
    for x, label, w in ((80, "AUTOMATION", 183), (279, "API TESTING", 173), (468, "QUALITY", 141)):
        rect((x, 564, x+w, 610), fill="#1b2a25", outline="#3a5145", radius=23)
        text(x+23, 578, label, 16, "#cfddd6", True)

    # The TTP tile is now the centerpiece of a single animated orbit.
    cx, cy = 1260, 350
    circle(cx, cy, 239, "#2c493b")
    circle(cx, cy, 211, "#426b52", width=2)
    circle(cx, cy, 177, "#2c493b")
    line([(cx-264, cy), (cx-224, cy)], "#5d8068", 2)
    line([(cx+224, cy), (cx+264, cy)], "#5d8068", 2)
    line([(cx, cy-264), (cx, cy-224)], "#5d8068", 2)
    line([(cx, cy+224), (cx, cy+264)], "#5d8068", 2)
    for angle in (30, 150, 270):
        a = math.radians(angle)
        x, y = cx+239*math.cos(a), cy+239*math.sin(a)
        circle(x, y, 7, "#79b48d", width=2, fill="#152220")
    for points in ([(1002, 514), (1002, 569), (1052, 619), (1140, 619)],
                   [(1518, 186), (1518, 143), (1480, 105), (1385, 105)]):
        line(points, "#395844", 2)
        circle(*points[0], 4, "#698c72", fill="#152220")

    rect((1118, 208, 1402, 492), fill="#1c3027", outline="#578466", radius=58, width=2)
    rect((1132, 222, 1388, 478), outline="#345541", radius=47)
    for x in (1152, 1220):
        rect((x, 282, x+57, 300), fill=WHITE)
        rect((x+19, 298, x+37, 385), fill=WHITE)
    rect((1290, 282, 1308, 385), fill=WHITE)
    rect((1301, 282, 1366, 346), fill=WHITE, radius=21)
    rect((1308, 300, 1348, 328), fill="#1c3027", radius=8)
    line([(1152, 434), (1237, 434)], "#7b9d86", 5)
    pulse = (math.sin(phase * math.tau) + 1) / 2
    ring = tuple(round(a + (b-a)*pulse) for a, b in zip((60, 91, 70), (110, 207, 155)))
    rect((1118, 208, 1402, 492), outline=ring, radius=58, width=3)
    check_color = tuple(round(a + (b-a)*pulse) for a, b in zip((91, 195, 147), (143, 255, 198)))
    line([(1292, 426), (1312, 447), (1353, 405)], check_color, 9)
    angle = phase * math.tau - math.pi/2
    for i in range(24, -1, -1):
        a = angle - i*.025
        color = tuple(round(v*(1-i/34)) for v in (101, 230, 180))
        circle(cx+211*math.cos(a), cy+211*math.sin(a), 3 if i else 7, color, fill=color)
    text(1174, 637, "BUILD WITH TRUST", 19, "#b2d1bc", True)
    line([(80, 650), (867, 650)], "#334b3e")
    text(80, 674, "TEST / REFINE / RELEASE", 15, "#8eac9a", True)
    text(661, 674, "QUALITY BY DESIGN", 15, "#8eac9a", True)
    return im.resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS)


def main():
    frames = [render(i / FRAMES) for i in range(FRAMES)]
    frames[0].save(OUT / "readme-banner.png", optimize=True)
    # Shared palette prevents flicker and keeps GIF delta frames compact.
    palette = frames[0].quantize(colors=128, method=Image.Quantize.MEDIANCUT)
    indexed = [frame.quantize(palette=palette, dither=Image.Dither.NONE) for frame in frames]
    indexed[0].save(OUT / "readme-banner.gif", save_all=True, append_images=indexed[1:],
                    duration=DURATION, loop=0, optimize=True, disposal=1)
    print(f"Created {WIDTH}x{HEIGHT} banner, {FRAMES} frames, {FRAMES*DURATION/1000:g}s loop")
    print(f"GIF: {(OUT / 'readme-banner.gif').stat().st_size / 1024:.0f} KiB")


if __name__ == "__main__":
    main()
