"""Rebuild responsive profile and small raster brand assets (requires Pillow).

Keep the full portrait ratio so the existing object-position crop is preserved.
Original photos and provider artwork remain untouched.
"""
from pathlib import Path
from PIL import Image, ImageOps

root = Path(__file__).resolve().parent.parent
with Image.open(root / 'image/1217VUTP0792.JPG') as source:
    portrait = ImageOps.exif_transpose(source).convert('RGB')
    for width in (320, 640):
        image = portrait.resize((width, round(portrait.height * width / portrait.width)), Image.Resampling.LANCZOS)
        image.save(root / f'image/avatar-{width}.webp', quality=85, method=6)
        image.save(root / f'image/avatar-{width}.jpg', quality=85, optimize=True, progressive=True)
with Image.open(root / 'image/tools/facebook-circle.png') as source:
    image = ImageOps.exif_transpose(source).convert('RGBA')
    image.thumbnail((96, 96), Image.Resampling.LANCZOS)
    image.save(root / 'image/tools/facebook-circle-96.png', optimize=True)
print('Responsive portraits and 96px Facebook mark generated.')
