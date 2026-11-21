#!/usr/bin/env python3
"""Cut hint sheets (sheet-01.png..sheet-10.png, 5 cols x 2 rows) into transparent 512x512 PNGs.
Sheet k, column c -> sheet position 5(k-1)+c, then POS_TO_ID gives the round id (30-round layout). Top row = image 1, bottom row = image 2.
Usage: python3 scripts/search-hints-cut.py [--src DIR] [--out public/search/hints] [--manifest src/search/hint-images.json]
Needs: pillow numpy scipy. No network."""
import argparse, json, os, sys, glob
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

COLS, ROWS, SIZE, MARGIN = 5, 2, 512, 0.08
WHITE_TOL = 12          # per channel, flood fill from border
SPECK = 0.002           # ignore specks < 0.2% of cell area
LEAK_LIMIT = 0.35

def nonwhite(a, tol=WHITE_TOL):
    return (255 - a[..., :3].astype(int)).max(axis=2) > tol

def bbox_of(mask, cell_area):
    lab, n = ndi.label(mask, structure=np.ones((3, 3)))
    if n == 0: return None
    sizes = ndi.sum(mask, lab, range(1, n + 1))
    keep = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s >= SPECK * cell_area])
    ys, xs = np.where(keep)
    if len(ys) == 0: return None
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1

def touches_edge(b, w, h):
    return b[0] <= 1 or b[1] <= 1 or b[2] >= w - 1 or b[3] >= h - 1

def split_equal(a):
    h, w = a.shape[:2]; cw, ch = w / COLS, h / ROWS; boxes = []
    for r in range(ROWS):
        for c in range(COLS):
            x0, y0 = int(round(c * cw)), int(round(r * ch))
            x1, y1 = int(round((c + 1) * cw)), int(round((r + 1) * ch))
            cell = nonwhite(a[y0:y1, x0:x1])
            b = bbox_of(cell, cell.size)
            if b is None or touches_edge(b, x1 - x0, y1 - y0): return None
            boxes.append((c, r, (b[0] + x0, b[1] + y0, b[2] + x0, b[3] + y0)))
    return boxes

def split_components(a):
    h, w = a.shape[:2]; m = nonwhite(a)
    d = ndi.binary_dilation(m, iterations=max(3, w // 120))
    lab, n = ndi.label(d)
    if n < 10: return None
    sizes = ndi.sum(m, lab, range(1, n + 1))
    top = sorted(np.argsort(sizes)[::-1][:10] + 1)
    items = []
    for l in top:
        ys, xs = np.where((lab == l) & m)
        items.append(((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1), xs.mean(), ys.mean()))
    items.sort(key=lambda t: t[1]); out = []
    for c in range(COLS):
        pair = sorted(items[c * 2:c * 2 + 2], key=lambda t: t[2])
        if len(pair) != 2: return None
        for r, it in enumerate(pair): out.append((c, r, it[0]))
    return out

# Cells where white INSIDE the outline is really a hole or trapped sticker rim, not part of the object.
# value = minimum size of an enclosed pale region (fraction of the object's bbox) that is made transparent.
HOLE_CELLS = {'hint-01-2': 0.002,  # spider web gaps
              'hint-19-1': 0.03,   # donut hole
              'hint-21-1': 0.03}   # gold ring hole

# The sheets were cut for 50 rounds (position 1-50). The video now has 30 rounds, so each sheet position maps to the
# round id it has today; positions of removed rounds map to None and are skipped.
POS_TO_ID = {1:1,2:2,3:3,4:4,5:5,6:6,7:7,8:8,9:9,10:10,
             17:11,18:12,19:13,20:14,21:15,24:16,23:17,22:18,25:19,26:20,
             35:21,36:22,37:23,34:24,38:25,39:26,40:27,41:28,42:29,43:30}

def remove_bg(rgb, hole_frac=0):
    """Flood fill white from the border only; return RGBA + fraction of bbox area lost to leaks."""
    a = rgb.astype(int)
    # background = white OR the pale, colourless sticker border/shadow Gemini adds (light + low saturation)
    near = ((255 - a).max(axis=2) <= WHITE_TOL) | ((a.min(axis=2) >= 190) & ((a.max(axis=2) - a.min(axis=2)) <= 22))
    lab, _ = ndi.label(near)
    edge = set(lab[0, :]) | set(lab[-1, :]) | set(lab[:, 0]) | set(lab[:, -1]); edge.discard(0)
    bg = np.isin(lab, list(edge))
    if hole_frac:
        ys0, xs0 = np.where(~bg)
        bb0 = (xs0.max() - xs0.min() + 1) * (ys0.max() - ys0.min() + 1)
        l2, n2 = ndi.label(near & ~bg)
        for i in range(1, n2 + 1):
            if (l2 == i).sum() >= hole_frac * bb0: bg |= (l2 == i)
    alpha = np.where(bg, 0.0, 1.0)
    alpha = ndi.gaussian_filter(alpha, 0.8)               # 1-2 px feather
    alpha[bg & (alpha < 0.02)] = 0
    # decontaminate white fringe: edge pixels pulled toward nearest opaque interior colour
    inner = ndi.binary_erosion(~bg, iterations=2)
    fringe = (~bg) & ~inner
    idx = ndi.distance_transform_edt(~inner, return_distances=False, return_indices=True)
    fixed = a.copy()
    fixed[fringe] = a[idx[0][fringe], idx[1][fringe]]
    rgba = np.dstack([fixed, (alpha * 255).round().astype(int)]).clip(0, 255).astype(np.uint8)
    # leak check: background pixels that sit inside the closed outline of the object
    ink = a.min(axis=2) < 140
    closed = ndi.binary_closing(ink, structure=np.ones((3, 3)), iterations=3)
    inside = ndi.binary_fill_holes(closed)
    ys, xs = np.where(inside)
    if len(ys) == 0: return rgba, 1.0
    bb = (xs.max() - xs.min() + 1) * (ys.max() - ys.min() + 1)
    lost = (inside & bg).sum() / bb
    return rgba, lost

def finish(rgba):
    ys, xs = np.where(rgba[..., 3] > 8)
    im = Image.fromarray(rgba).crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    s = max(im.size); pad = int(round(s * (1 + 2 * MARGIN)))
    sq = Image.new('RGBA', (pad, pad), (0, 0, 0, 0))
    sq.paste(im, ((pad - im.width) // 2, (pad - im.height) // 2))
    return sq.resize((SIZE, SIZE), Image.LANCZOS)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--src', default='/mnt/user-data/uploads')
    ap.add_argument('--out', default='public/search/hints')
    ap.add_argument('--manifest', default='src/search/hint-images.json')
    ap.add_argument('--report', default='out/hints-cut-report.json')
    A = ap.parse_args()
    os.makedirs(A.out, exist_ok=True); os.makedirs(os.path.dirname(A.report), exist_ok=True)
    report = {'sheets': {}, 'flags': [], 'failed_sheets': {}}
    for k in range(1, 11):
        f = os.path.join(A.src, f'sheet-{k:02d}.png')
        if not os.path.exists(f):
            report['failed_sheets'][k] = 'file missing'; continue
        im = Image.open(f).convert('RGB'); a = np.array(im)
        cells, mode = split_equal(a), 'equal'
        if cells is None: cells, mode = split_components(a), 'components'
        if cells is None or len(cells) != 10:
            report['failed_sheets'][k] = 'could not find exactly 10 objects'; continue
        report['sheets'][k] = {'mode': mode, 'size': im.size}
        for c, r, (x0, y0, x1, y1) in cells:
            rid = POS_TO_ID.get(5 * (k - 1) + c + 1)
            if rid is None: continue
            pad = 6
            crop = a[max(0, y0 - pad):y1 + pad, max(0, x0 - pad):x1 + pad]
            crop = np.pad(crop, ((4, 4), (4, 4), (0, 0)), constant_values=255)  # guarantee white border for flood fill
            name = f'hint-{rid:02d}-{r+1}'
            rgba, lost = remove_bg(crop, HOLE_CELLS.get(name, 0))
            if lost > LEAK_LIMIT: report['flags'].append({'file': f'hint-{rid:02d}-{r+1}.png', 'why': f'leak {lost:.0%}'})
            finish(rgba).save(os.path.join(A.out, f'hint-{rid:02d}-{r+1}.png'))
    man = {}
    for rid in range(1, 31):
        p = [f'hint-{rid:02d}-{i}.png' for i in (1, 2)]
        if all(os.path.exists(os.path.join(A.out, x)) for x in p): man[str(rid)] = p
    json.dump(man, open(A.manifest, 'w'), indent=2)
    json.dump(report, open(A.report, 'w'), indent=2)
    print(f'rounds in manifest: {len(man)}; failed sheets: {report["failed_sheets"]}; flags: {report["flags"]}')

if __name__ == '__main__':
    main()
