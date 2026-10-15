"""Satin columns that follow a stroke.

Narrow shapes (lettering, borders, line art) are sewn the way digitizers do it: a zigzag that runs *along* the
stroke, every stitch crossing the stroke's local width at a right angle to its direction. The centre line and the
width come from the shape's medial axis (skeleton + distance transform), so curves, tapers and branches work.
"""
import math
from typing import List, Optional, Tuple

import cv2
import numpy as np
from shapely.geometry import MultiPolygon, Polygon
from skimage.morphology import medial_axis

Stitch = Tuple[float, float, str]
Pt = Tuple[float, float]

MIN_PATH_MM = 2.0        # shorter skeleton branches are noise (spurs from rough edges), not strokes
MAX_RASTER_PX = 9_000_000


def _polys(g) -> List[Polygon]:
    if g.is_empty:
        return []
    if isinstance(g, Polygon):
        return [g]
    return [p for sub in getattr(g, 'geoms', []) for p in _polys(sub)]


def _rasterize(poly: Polygon, ppm: float):
    """Polygon -> binary mask. Returns (mask, origin_x_mm, origin_y_mm, ppm); image y points down."""
    minx, miny, maxx, maxy = poly.bounds
    pad = 1.5
    while ((maxx - minx + 2 * pad) * ppm) * ((maxy - miny + 2 * pad) * ppm) > MAX_RASTER_PX:
        ppm *= 0.7
    ox, oy = minx - pad, maxy + pad
    w = int(math.ceil((maxx - minx + 2 * pad) * ppm)) + 1
    h = int(math.ceil((maxy - miny + 2 * pad) * ppm)) + 1
    mask = np.zeros((h, w), np.uint8)

    def px(coords):
        return np.array([[round((x - ox) * ppm), round((oy - y) * ppm)] for x, y in coords], np.int32)

    cv2.fillPoly(mask, [px(poly.exterior.coords)], 1)
    for ring in poly.interiors:
        cv2.fillPoly(mask, [px(ring.coords)], 0)
    return mask, ox, oy, ppm


_DIRS = [(-1, -1), (0, -1), (1, -1), (-1, 0), (1, 0), (-1, 1), (0, 1), (1, 1)]


def _skeleton_paths(skel: np.ndarray, min_len_px: float) -> List[List[Tuple[int, int]]]:
    """Walk the skeleton into ordered pixel paths: the main stroke first, then branches that start on a junction."""
    ys, xs = np.nonzero(skel)
    pix = set(zip(xs.tolist(), ys.tolist()))
    if not pix:
        return []

    def nbrs(p):
        return [(p[0] + dx, p[1] + dy) for dx, dy in _DIRS if (p[0] + dx, p[1] + dy) in pix]

    deg = {p: len(nbrs(p)) for p in pix}
    visited = set()
    paths: List[List[Tuple[int, int]]] = []

    def walk(path):
        cur = path[-1]
        prev = path[-2] if len(path) > 1 else None
        while True:
            cand = [q for q in nbrs(cur) if q not in visited]
            if not cand:
                break
            if prev is not None:  # keep going as straight as possible through junctions
                d = (cur[0] - prev[0], cur[1] - prev[1])
                cand.sort(key=lambda q: -((q[0] - cur[0]) * d[0] + (q[1] - cur[1]) * d[1]) / math.hypot(q[0] - cur[0], q[1] - cur[1]))
            q = cand[0]
            path.append(q)
            visited.add(q)
            prev, cur = cur, q
        return path

    while len(visited) < len(pix):
        remaining = [p for p in pix if p not in visited]
        # start from a free end if there is one, otherwise from any pixel (closed loop)
        ends = [p for p in remaining if deg[p] <= 1]
        start = min(ends) if ends else min(remaining)
        # a branch should begin on the junction it grows from, so the columns meet
        anchor = next((q for q in nbrs(start) if q in visited), None)
        path = [anchor, start] if anchor else [start]
        visited.add(start)
        walk(path)
        length = sum(math.hypot(b[0] - a[0], b[1] - a[1]) for a, b in zip(path, path[1:]))
        if length >= min_len_px:
            paths.append(path)
    paths.sort(key=len, reverse=True)
    return paths


def _smooth(a: np.ndarray, win: int) -> np.ndarray:
    if win < 3 or len(a) < 3:
        return a
    win = min(win, len(a) | 1)
    k = np.ones(win) / win
    pad = win // 2
    padded = np.pad(a, ((pad, pad),) + ((0, 0),) * (a.ndim - 1), mode='edge')
    if a.ndim == 1:
        return np.convolve(padded, k, mode='valid')
    return np.stack([np.convolve(padded[:, i], k, mode='valid') for i in range(a.shape[1])], axis=1)


def _resample(points: np.ndarray, radius: np.ndarray, step: float):
    """Resample a polyline (and its radius) at even arc-length steps."""
    seg = np.hypot(*np.diff(points, axis=0).T)
    s = np.concatenate([[0.0], np.cumsum(seg)])
    if s[-1] < 1e-6:
        return points[:1], radius[:1]
    n = max(2, int(s[-1] / step) + 1)
    t = np.linspace(0, s[-1], n)
    return (np.stack([np.interp(t, s, points[:, 0]), np.interp(t, s, points[:, 1])], axis=1), np.interp(t, s, radius))


def column_paths(poly: Polygon, ppm: float = 10.0):
    """Centre lines of a narrow polygon with the stroke half-width at every point.
    Returns a list of (points_mm Nx2, half_width_mm N)."""
    mask, ox, oy, ppm = _rasterize(poly, ppm)
    skel, dist = medial_axis(mask.astype(bool), return_distance=True)
    out = []
    for path in _skeleton_paths(skel, MIN_PATH_MM * ppm):
        pts = np.array(path, float)
        rad = np.array([dist[y, x] for x, y in path], float) / ppm
        win = max(3, int(0.9 * ppm) | 1)
        pts, rad = _smooth(pts, win), _smooth(rad, int(1.6 * ppm) | 1)
        mm = np.stack([ox + pts[:, 0] / ppm, oy - pts[:, 1] / ppm], axis=1)  # back to mm, y up
        out.append((mm, rad))
    return out


def _tangents(p: np.ndarray, span: int = 2) -> np.ndarray:
    n = len(p)
    t = np.zeros_like(p)
    for i in range(n):
        a, b = p[max(0, i - span)], p[min(n - 1, i + span)]
        d = b - a
        m = math.hypot(d[0], d[1]) or 1.0
        t[i] = d / m
    return t


def satin_column_stitches(poly, density: float = 0.4, pull: float = 0.25, underlay: bool = True) -> List[Stitch]:
    """Raw stitches (explicit JUMPs between columns) for every stroke in `poly`."""
    out: List[Stitch] = []
    for part in _polys(poly):
        if part.is_empty or part.area < 0.3:
            continue
        for centre, rad in column_paths(part):
            # extend both ends by the local radius so the column covers the rounded cap of the stroke
            t = _tangents(centre)
            centre = np.vstack([centre[0] - t[0] * rad[0] * 0.9, centre, centre[-1] + t[-1] * rad[-1] * 0.9])
            rad = np.concatenate([[rad[0] * 0.6], rad, [rad[-1] * 0.6]])
            pts, r = _resample(centre, rad, density)
            if len(pts) < 2:
                continue
            tan = _tangents(pts, span=2)
            normal = np.stack([-tan[:, 1], tan[:, 0]], axis=1)
            half = np.maximum(r + pull, 0.3)

            has_underlay = underlay and half.mean() >= 0.8
            if has_underlay:
                # centre run first (a firm spine under the satin), then back along the same line
                spine, _ = _resample(centre, rad, 2.0)
                run = [(float(x), float(y)) for x, y in spine]
                out += [(run[0][0], run[0][1], 'JUMP')] + [(x, y, 'STITCH') for x, y in run[1:]]
                out += [(x, y, 'STITCH') for x, y in run[-2::-1]]

            side = 1
            for i, (p, n, h) in enumerate(zip(pts, normal, half)):
                q = p + n * h * side
                # each column starts with a cut unless the spine run already brought the needle here
                out.append((float(q[0]), float(q[1]), 'JUMP' if (i == 0 and not has_underlay) else 'STITCH'))
                side = -side
    return out


def hairline_stitches(poly, step: float = 2.0) -> List[Stitch]:
    """Lines too thin to be a satin column (<~0.9 mm): a single running stitch down the middle."""
    out: List[Stitch] = []
    for part in _polys(poly):
        if part.is_empty:
            continue
        for centre, rad in column_paths(part):
            pts, _ = _resample(centre, rad, step)
            if len(pts) >= 2:
                out += [(float(pts[0][0]), float(pts[0][1]), 'JUMP')] + [(float(x), float(y), 'STITCH') for x, y in pts[1:]]
    return out
