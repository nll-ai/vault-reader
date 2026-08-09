# /// script
# dependencies = ["pillow"]
# ///
"""Generate PWA icons (192, 512, 512-maskable) for the vault reader."""
from PIL import Image, ImageDraw

def make_icon(size: int, maskable: bool = False) -> Image.Image:
    img = Image.new("RGBA", (size, size), (17, 17, 17, 255))
    d = ImageDraw.Draw(img)

    # Maskable icons need content within the center ~80% safe zone.
    inset = int(size * 0.12) if maskable else int(size * 0.10)
    page_l = inset
    page_r = size - inset
    page_t = inset
    page_b = size - inset
    radius = max(4, size // 10)

    # White page body with rounded corners.
    d.rounded_rectangle([page_l, page_t, page_r, page_b], radius=radius, fill=(255, 255, 255, 255))

    # Folded corner (gray triangle, top-right).
    corner = int(size * 0.26)
    fold_x = page_r - corner
    fold_y = page_t + corner
    d.polygon([(fold_x, page_t), (page_r, page_t), (page_r, fold_y)], fill=(204, 204, 204, 255))

    # Text lines (dark).
    line_color = (17, 17, 17, 255)
    line_w = max(2, size // 32)
    lx1 = page_l + int(size * 0.10)
    lx2 = page_r - int(size * 0.10)
    for i, frac in enumerate([0.50, 0.62, 0.74]):
        y = page_t + int((page_b - page_t) * frac)
        end = lx2 if i < 2 else page_l + int((page_r - page_l) * 0.60)
        d.rounded_rectangle([lx1, y, end, y + line_w], radius=line_w // 2, fill=line_color)

    return img

import os
out = os.path.join(os.path.dirname(__file__), "..", "public")
make_icon(192).save(os.path.join(out, "icon-192.png"))
make_icon(512).save(os.path.join(out, "icon-512.png"))
make_icon(512, maskable=True).save(os.path.join(out, "icon-512-maskable.png"))
print("Wrote icon-192.png, icon-512.png, icon-512-maskable.png")
