#!/usr/bin/env python3
"""Slice the three AI-generated icon sheets (5 x 2 grid, flat magenta #FF00FF background) into
transparent PNGs in public/dontsay/art/. Usage: python3 scripts/slice_dontsay_art.py A.png B.png C.png
Order of arguments = sheet A (colours + vegetables), B (drinks, car, fruit), C (filter icons).
Background is removed by flood fill from the cell border, so magenta seen THROUGH glass stays.
Cells marked None are empty (the generator's sparkle watermark sits there) and are skipped."""
import sys, os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'dontsay', 'art')
SIZE = 512          # output square, icon fitted with PAD margin
PAD = 0.06
SHEETS = [
    ['swatch-red', 'swatch-yellow', 'swatch-orange', 'swatch-blue', 'swatch-green',
     'carrot', 'potato', 'tomato', 'broccoli', None],
    ['water', 'tea', 'coffee', 'juice', 'car',
     'banana', 'orange', 'kiwi', 'grapes', None],
    ['sky', 'football', 'soccer', 'ice', 'snow',
     'fish', 'whale', None, None, None],
]
MAG = np.array([255, 0, 255], float)

# Glass icons: magenta seen through the glass tints it pink. Pull that pink back to neutral.
GLASS = {'water', 'juice', 'ice'}

def cut(cell: np.ndarray, name: str = '') -> Image.Image:
    rgb = cell[..., :3].astype(float)
    d = np.sqrt(((rgb - MAG) ** 2).sum(-1))
    lab, _ = ndi.label(d < 70)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    # outside background (border-connected) + any pure magenta anywhere (handle holes, gaps in broccoli / grapes)
    bg = np.isin(lab, list(border)) | (d < 35)
    # soft edge: pixels touching the background get a partial alpha and the magenta is removed from their colour
    ring = ndi.binary_dilation(bg, iterations=3) & ~bg
    a = np.ones(d.shape)
    a[bg] = 0
    ra = np.clip((d - 55) / 150, 0.05, 1)
    a[ring] = ra[ring]
    out = rgb.copy()
    m = ring & (a < 1)
    out[m] = np.clip((rgb[m] - (1 - a[m, None]) * MAG) / a[m, None], 0, 255)
    if name in GLASS:
        e = np.clip(np.minimum(out[..., 0], out[..., 2]) - out[..., 1], 0, None)
        out[..., 0] -= e * 0.85
        out[..., 2] -= e * 0.85
    img = np.dstack([np.clip(out, 0, 255), a * 255]).astype(np.uint8)
    return Image.fromarray(img, 'RGBA')

def main(paths):
    os.makedirs(OUT, exist_ok=True)
    for path, names in zip(paths, SHEETS):
        im = np.array(Image.open(path).convert('RGB'))
        h, w = im.shape[:2]
        cw, ch = w / 5, h / 2
        for i, name in enumerate(names):
            if not name:
                continue
            r, c = divmod(i, 5)
            cell = im[int(r * ch):int((r + 1) * ch), int(c * cw):int((c + 1) * cw)]
            rgba = cut(cell, name)
            bbox = rgba.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
            rgba = rgba.crop(bbox)
            s = SIZE * (1 - 2 * PAD) / max(rgba.size)
            rgba = rgba.resize((max(1, round(rgba.width * s)), max(1, round(rgba.height * s))), Image.LANCZOS)
            canvas = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
            canvas.paste(rgba, ((SIZE - rgba.width) // 2, (SIZE - rgba.height) // 2), rgba)
            canvas.save(os.path.join(OUT, name + '.png'), optimize=True)
            print(name, rgba.size)

if __name__ == '__main__':
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    main(sys.argv[1:])
