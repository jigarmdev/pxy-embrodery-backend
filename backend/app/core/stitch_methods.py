"""All stitch methods offered by the UI, as machine stitch generators.

Every method takes a shapely polygon (mm, y-up) and returns raw (x, y, cmd)
tuples. Explicit JUMPs mark places where the thread should be cut; the shared
`finish_stitches` pass then splits long stitches, adds locks and jumps big gaps,
so every method yields a DST-safe sequence.

Method ids match STITCHES in frontend/src/lib/simulator.js.
"""
import math
from typing import Callable, Dict, List, Tuple

import numpy as np
import shapely
from shapely.geometry import LineString, Polygon
from shapely.geometry.polygon import orient

from .finishing import finish_stitches
from .satin_column import hairline_stitches, satin_column_stitches
from .stitch_engine import StitchEngine, group_lanes

Stitch = Tuple[float, float, str]
Pt = Tuple[float, float]

# id -> category, mirrors CATS/STITCHES in the frontend
CATEGORIES: Dict[str, str] = {
    'auto': 'fill', 'satin': 'fill', 'tatami': 'fill', 'seed': 'fill', 'spiral': 'fill', 'contour': 'fill', 'radial': 'fill',
    'run': 'line', 'bean': 'line', 'stem': 'line', 'back': 'line', 'straight': 'line',
    'chain': 'loop', 'feather': 'loop', 'blanket': 'loop', 'fly': 'loop',
    'cross': 'special', 'padded': 'special', 'motif': 'special', 'stipple': 'special',
    'zigzag': 'edge', 'scallop': 'edge', 'picot': 'edge',
    'prog': 'digital', 'dst': 'digital', 'photo': 'digital',
}


# ── geometry helpers ──────────────────────────────────────────────────────
def _polys(g) -> List[Polygon]:
    if g.is_empty:
        return []
    if g.geom_type == 'Polygon':
        return [g]
    return [p for sub in getattr(g, 'geoms', []) for p in _polys(sub)]


def _lines(g) -> List[LineString]:
    if g.is_empty:
        return []
    if g.geom_type == 'LineString':
        return [g]
    return [l for sub in getattr(g, 'geoms', []) for l in _lines(sub)]


def _rings(poly, min_len: float = 2.0):
    """Exterior and hole rings, oriented so the left of travel is inside the material."""
    out = []
    for p in _polys(poly):
        p = orient(p, 1.0)
        out.append(p.exterior)
        out.extend(p.interiors)
    return [r for r in out if r.length >= min_len]


def _frames(ring, step: float):
    """Points along a ring with unit tangents: (x, y, ux, uy)."""
    length = ring.length
    n = max(3, int(length / step))
    out = []
    for i in range(n):
        d = i * length / n
        a = ring.interpolate(d)
        b = ring.interpolate((d + 0.05) % length)
        ux, uy = b.x - a.x, b.y - a.y
        m = math.hypot(ux, uy) or 1.0
        out.append((a.x, a.y, ux / m, uy / m))
    return out


def _lanes(poly, angle_deg: float, spacing: float) -> List[List[Tuple[Pt, Pt]]]:
    """Scanline segments through the polygon grouped into lanes (see group_lanes). Each lane is a list of (start, end)
    segments in original coordinates, ordered row by row, every segment oriented left -> right in the scan frame."""
    from shapely.affinity import rotate
    rot = rotate(poly, -angle_deg, origin=(0, 0))
    minx, miny, maxx, maxy = rot.bounds
    rad = math.radians(angle_deg)
    c, s = math.cos(rad), math.sin(rad)
    back = lambda x, y: (x * c - y * s, x * s + y * c)
    rows = []
    y = miny + spacing / 2.0
    while y < maxy:
        segs = [g for g in _lines(rot.intersection(LineString([(minx - 1, y), (maxx + 1, y)]))) if g.length >= 0.2]
        ends = sorted((sorted([g.coords[0], g.coords[-1]]) for g in segs), key=lambda e: e[0][0])
        rows.append([(e[0][0], e[-1][0], (back(*e[0]), back(*e[-1]))) for e in ends])
        y += spacing
    return group_lanes(rows)


def _inside(poly, xs, ys):
    return shapely.contains_xy(poly, xs, ys)


def _grid_points(poly, spacing: float, margin: float = 0.3) -> List[List[Pt]]:
    """Grid points inside the polygon, grouped in rows (for snake ordering)."""
    safe = poly.buffer(-margin)
    if safe.is_empty:
        return []
    minx, miny, maxx, maxy = safe.bounds
    xs = np.arange(minx + spacing / 2, maxx, spacing)
    rows = []
    for y in np.arange(miny + spacing / 2, maxy, spacing):
        ok = _inside(safe, xs, np.full_like(xs, y))
        pts = [(float(x), float(y)) for x, k in zip(xs, ok) if k]
        if pts:
            rows.append(pts)
    return rows


def _snake(rows: List[List[Pt]]) -> List[Pt]:
    out: List[Pt] = []
    for i, r in enumerate(rows):
        out.extend(r if i % 2 == 0 else r[::-1])
    return out


def _run(pts: List[Pt], jump_first: bool = True) -> List[Stitch]:
    return [(x, y, 'JUMP' if (i == 0 and jump_first) else 'STITCH') for i, (x, y) in enumerate(pts)]


def _rng(poly) -> np.random.Generator:
    """Deterministic per-shape randomness: same image always gives the same file."""
    minx, miny, maxx, maxy = poly.bounds
    return np.random.default_rng(int(abs(minx * 7919 + miny * 104729 + poly.area * 1299709)) % (2 ** 32))


# ── fills ─────────────────────────────────────────────────────────────────
class _Path:
    """Collects points. Only the first point of a new segment can become a JUMP (thread cut), and only when it is
    far from where the needle was: a long stitch inside a segment is a real stitch, never a jump."""

    def __init__(self, far: float = 6.0):
        self.out: List[Stitch] = []
        self.last = None
        self.far = far

    def add(self, p: Pt, new_segment: bool = False):
        jump = self.last is None or (new_segment and math.hypot(p[0] - self.last[0], p[1] - self.last[1]) > self.far)
        self.out.append((p[0], p[1], 'JUMP' if jump else 'STITCH'))
        self.last = p


def _satin_core(poly, density: float, angle: float = 45.0) -> List[Stitch]:
    """Zigzag across the shape. Narrow areas get true edge-to-edge satin; wide areas
    (a satin stitch over ~7mm snags) are cut into staggered ~4.6mm pieces instead."""
    path = _Path()
    for lane in _lanes(poly, angle, density):
        for k, (a, b) in enumerate(lane):
            if k % 2:
                a, b = b, a
            length = math.hypot(b[0] - a[0], b[1] - a[1])
            pts = [a, b]
            if length > 6.5:
                n = math.ceil(length / 4.6)
                stagger = 0.5 if (k // 2) % 2 else 0.0
                inner = [(i + stagger) / n for i in range(1, n)] if not stagger else [(i + stagger) / n for i in range(n)]
                pts = [a] + [(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t) for t in inner] + [b]
            for i, p in enumerate(pts):
                path.add(p, new_segment=(i == 0))
    return path.out


def seed(poly, **_) -> List[Stitch]:
    """Small straight stitches at random angles, ordered as a snake to keep travel short."""
    rng = _rng(poly)
    n = min(3000, int(poly.area / 3.0))
    if n < 1:
        return []
    minx, miny, maxx, maxy = poly.bounds
    xs, ys = rng.uniform(minx, maxx, n * 2), rng.uniform(miny, maxy, n * 2)
    keep = _inside(poly, xs, ys)
    xs, ys = xs[keep][:n], ys[keep][:n]
    ang = rng.uniform(0, math.pi, len(xs))
    ln = rng.uniform(1.4, 2.4, len(xs))
    ex, ey = xs + np.cos(ang) * ln, ys + np.sin(ang) * ln
    ok = _inside(poly, ex, ey)
    order = sorted(range(len(xs)), key=lambda i: (int(ys[i] // 3.0), xs[i] if int(ys[i] // 3.0) % 2 == 0 else -xs[i]))
    out: List[Stitch] = []
    for i in order:
        if ok[i]:
            out += [(float(xs[i]), float(ys[i]), 'JUMP'), (float(ex[i]), float(ey[i]), 'STITCH')]
    return out


def _concentric(poly, spacing: float, inside_out: bool) -> List[Stitch]:
    cur = poly.buffer(-spacing / 2.0)
    levels: List[List[Pt]] = []
    while not cur.is_empty and len(levels) < 200:
        for ring in _rings(cur, 1.5):
            levels.append([(x, y) for x, y, _, _ in _frames(ring, 2.5)])
        cur = cur.buffer(-spacing)
    if inside_out:
        levels.reverse()
    out: List[Stitch] = []
    prev = None
    for pts in levels:
        if prev is not None:  # start each ring at the point nearest the previous end
            j = min(range(len(pts)), key=lambda i: (pts[i][0] - prev[0]) ** 2 + (pts[i][1] - prev[1]) ** 2)
            pts = pts[j:] + pts[:j]
        close = (math.hypot(pts[0][0] - prev[0], pts[0][1] - prev[1]) < 3.0) if prev else False
        out += _run(pts + [pts[0]], jump_first=not close)
        prev = pts[0]
    return out


def contour(poly, density: float, **_) -> List[Stitch]:
    return _concentric(poly, max(density, 0.4), inside_out=False)


def spiral(poly, density: float, **_) -> List[Stitch]:
    return _concentric(poly, max(density * 1.1, 0.45), inside_out=True)


def radial(poly, **_) -> List[Stitch]:
    c = poly.centroid  # spokes simply jump over a hole at the centre
    minx, miny, maxx, maxy = poly.bounds
    radius = math.hypot(maxx - minx, maxy - miny)
    n = int(max(36, min(360, math.pi * radius / 1.2)))
    path = _Path()
    forward = True
    for i in range(n):
        th = 2 * math.pi * i / n
        spoke = LineString([(c.x, c.y), (c.x + math.cos(th) * radius, c.y + math.sin(th) * radius)])
        segs = [g for g in _lines(poly.intersection(spoke)) if g.length >= 0.3]
        segs.sort(key=lambda g: g.distance(c))
        pts: List[Pt] = []
        spans = set()
        for g in segs:
            a, b = g.coords[0], g.coords[-1]
            if math.hypot(a[0] - c.x, a[1] - c.y) > math.hypot(b[0] - c.x, b[1] - c.y):
                a, b = b, a
            if i % 2 and not pts and g.length > 6:  # long-short: odd spokes start further out, thinning the dense centre
                t = 2.5 / g.length
                a = (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
            pts += [a, b]
            spans.update({(a, b), (b, a)})
        if not forward:
            pts.reverse()
        if pts:
            prev = None
            for idx, p in enumerate(pts):
                is_spoke = prev is not None and (prev, p) in spans
                if is_spoke:
                    d = math.hypot(p[0] - prev[0], p[1] - prev[1])
                    m = math.ceil(d / 4.0)  # a spoke is a run of ~4mm stitches, never one long thread
                    for j in range(1, m):
                        path.add((prev[0] + (p[0] - prev[0]) * j / m, prev[1] + (p[1] - prev[1]) * j / m))
                path.add(p, new_segment=not is_spoke)  # a point that is not the far end of a spoke starts a new segment
                prev = p
            forward = not forward
    return path.out


# ── lines (along the outline) ─────────────────────────────────────────────
def _outline(poly, step: float) -> List[List[Pt]]:
    return [[(x, y) for x, y, _, _ in _frames(r, step)] for r in _rings(poly)]


def run(poly, **_) -> List[Stitch]:
    out: List[Stitch] = []
    for pts in _outline(poly, 2.5):
        out += _run(pts + [pts[0]])
    return out


def back(poly, **_) -> List[Stitch]:
    out: List[Stitch] = []
    for pts in _outline(poly, 1.5):
        out += _run(pts + [pts[0]])
    return out


def bean(poly, **_) -> List[Stitch]:
    out: List[Stitch] = []
    for pts in _outline(poly, 2.5):
        p = pts + [pts[0]]
        out += _run(p + p[::-1] + p)  # forward, back, forward
    return out


def stem(poly, **_) -> List[Stitch]:
    out: List[Stitch] = []
    for pts in _outline(poly, 1.2):
        n = len(pts)
        seq = [pts[0]]
        for i in range(n):
            seq += [pts[(i + 2) % n], pts[(i + 1) % n]]  # two forward, one back: twisted rope
        out += _run(seq)
    return out


def straight(poly, **_) -> List[Stitch]:
    """Free stitches with similar direction and varied length (fur / grass / hair)."""
    rng = _rng(poly)
    n = min(1500, int(poly.area / 6.0))
    if n < 1:
        return []
    minx, miny, maxx, maxy = poly.bounds
    xs, ys = rng.uniform(minx, maxx, n * 2), rng.uniform(miny, maxy, n * 2)
    keep = _inside(poly, xs, ys)
    xs, ys = xs[keep][:n], ys[keep][:n]
    ang = math.radians(60) + rng.uniform(-0.45, 0.45, len(xs))
    ln = rng.uniform(3.0, 6.0, len(xs))
    ex, ey = xs + np.cos(ang) * ln, ys + np.sin(ang) * ln
    ok = _inside(poly, ex, ey)
    order = sorted(range(len(xs)), key=lambda i: (int(ys[i] // 4.0), xs[i] if int(ys[i] // 4.0) % 2 == 0 else -xs[i]))
    out: List[Stitch] = []
    for i in order:
        if ok[i]:
            out += [(float(xs[i]), float(ys[i]), 'JUMP'), (float(ex[i]), float(ey[i]), 'STITCH')]
    return out


# ── loops (decorated outline) ─────────────────────────────────────────────
def _loop_method(poly, step: float, build: Callable) -> List[Stitch]:
    out: List[Stitch] = []
    for ring in _rings(poly):
        fr = _frames(ring, step)
        seq: List[Pt] = []
        for i, f in enumerate(fr):
            seq += build(i, f, fr[(i + 1) % len(fr)])
        seq.append((fr[0][0], fr[0][1]))
        out += _run(seq)
    return out


def chain(poly, **_) -> List[Stitch]:
    def build(i, f, nxt):
        x, y, ux, uy = f
        nx, ny = -uy, ux
        return [(x + ux * 1.2 * math.sin(t) + nx * 0.6 * (1 - math.cos(t)),
                 y + uy * 1.2 * math.sin(t) + ny * 0.6 * (1 - math.cos(t)))
                for t in np.linspace(0, 2 * math.pi, 9)[:-1]]
    return _loop_method(poly, 2.2, build)


def feather(poly, **_) -> List[Stitch]:
    def build(i, f, nxt):
        x, y, ux, uy = f
        side = 1 if i % 2 == 0 else -1
        nx, ny = -uy * side, ux * side
        return [(x, y), (x + nx * 1.7 + ux * 1.0, y + ny * 1.7 + uy * 1.0), (x + ux * 1.0, y + uy * 1.0)]
    return _loop_method(poly, 2.0, build)


def blanket(poly, **_) -> List[Stitch]:
    def build(i, f, nxt):
        x, y, ux, uy = f
        q = (x - uy * 1.8, y + ux * 1.8)  # bar leaning into the fabric
        # alternate direction so the edge bars and inner bars connect as a snake
        return [q, (x, y)] if i % 2 == 0 else [(x, y), q]
    return _loop_method(poly, 1.6, build)


def fly(poly, **_) -> List[Stitch]:
    def build(i, f, nxt):
        x, y, ux, uy = f
        nx, ny = -uy, ux
        a = (x - ux * 1.2 + nx * 0.2, y - uy * 1.2 + ny * 0.2)
        m = (x + nx * 1.2, y + ny * 1.2)
        b = (x + ux * 1.2 + nx * 0.2, y + uy * 1.2 + ny * 0.2)
        t = (x + nx * 2.4, y + ny * 2.4)
        return [a, m, b, m, t]
    return _loop_method(poly, 3.0, build)


# ── special ───────────────────────────────────────────────────────────────
def cross(poly, **_) -> List[Stitch]:
    d = 1.0
    out: List[Stitch] = []
    for x, y in _snake(_grid_points(poly, 2.4)):
        out += [(x - d, y - d, 'STITCH'), (x + d, y + d, 'STITCH'), (x + d, y - d, 'STITCH'), (x - d, y + d, 'STITCH')]
    if out:
        out[0] = (out[0][0], out[0][1], 'JUMP')
    return out


def motif(poly, **_) -> List[Stitch]:
    d = 1.1
    out: List[Stitch] = []
    for x, y in _snake(_grid_points(poly, 3.0, margin=0.6)):
        out += [(x + d, y, 'STITCH'), (x, y + d, 'STITCH'), (x - d, y, 'STITCH'), (x, y - d, 'STITCH'), (x + d, y, 'STITCH')]
    if out:
        out[0] = (out[0][0], out[0][1], 'JUMP')
    return out


def stipple(poly, **_) -> List[Stitch]:
    """One continuous wavy serpentine."""
    out: List[Stitch] = []
    nx, ny = -math.sin(math.radians(15)), math.cos(math.radians(15))
    for lane in _lanes(poly, 15.0, 2.0):
        for k, (a, b) in enumerate(lane):
            if k % 2:
                a, b = b, a
            length = math.hypot(b[0] - a[0], b[1] - a[1])
            n = max(2, int(length / 1.0))
            for i in range(n + 1):
                t = i / n
                w = 0.7 * math.sin(2 * math.pi * t * length / 4.0) if 0 < i < n else 0.0
                out.append((a[0] + (b[0] - a[0]) * t + nx * w, a[1] + (b[1] - a[1]) * t + ny * w, 'STITCH'))
        if out and lane:
            out.append((out[-1][0], out[-1][1], 'STITCH'))
    if out:
        out[0] = (out[0][0], out[0][1], 'JUMP')
    return out


# ── edge ──────────────────────────────────────────────────────────────────
def zigzag(poly, **_) -> List[Stitch]:
    out: List[Stitch] = []
    for ring in _rings(poly):
        seq = []
        for i, (x, y, ux, uy) in enumerate(_frames(ring, 0.6)):
            s = 0.9 if i % 2 == 0 else -0.9
            seq.append((x - uy * s, y + ux * s))
        out += _run(seq + [seq[0]])
    return out


def scallop(poly, **_) -> List[Stitch]:
    out: List[Stitch] = []
    for ring in _rings(poly, 6.0):
        fr = _frames(ring, 4.0)
        seq: List[Pt] = []
        for i, (x, y, ux, uy) in enumerate(fr):
            nx_, ny_, _, _ = fr[(i + 1) % len(fr)]
            m = ((x + nx_) / 2, (y + ny_) / 2)
            r = math.hypot(nx_ - x, ny_ - y) / 2
            inx, iny = -uy, ux
            for t in np.linspace(0, math.pi, 6):
                arc = (m[0] + (x - m[0]) * math.cos(t) + inx * r * math.sin(t),
                       m[1] + (y - m[1]) * math.cos(t) + iny * r * math.sin(t))
                seq += [arc, m]
        out += _run(seq)
    return out


def picot(poly, **_) -> List[Stitch]:
    out: List[Stitch] = []
    for ring in _rings(poly, 4.0):
        fr = _frames(ring, 1.3)
        seq: List[Pt] = []
        for i, (x, y, ux, uy) in enumerate(fr):
            seq.append((x, y))
            if i % 3 == 0:
                ox, oy = uy, -ux  # outward normal
                seq += [(x + ux * 0.9 * math.sin(t) + ox * 0.7 * (1 - math.cos(t)),
                         y + uy * 0.9 * math.sin(t) + oy * 0.7 * (1 - math.cos(t)))
                        for t in np.linspace(0, 2 * math.pi, 8)[1:-1]] + [(x, y)]
        seq.append((fr[0][0], fr[0][1]))
        out += _run(seq)
    return out


# ── underlay + layered fills ──────────────────────────────────────────────
UNDERLAYS = ('auto', 'none', 'edge', 'zigzag', 'grid', 'edge_grid')
_SATIN_OPTS = dict(max_stitch_mm=7.0, jump_above_mm=1e9)  # satin stitches are long on purpose and place their own JUMPs


def _underlay(poly, kind: str, top_angle: float, min_area_mm2: float = 12.0) -> List[Stitch]:
    """Foundation stitching sewn before the top fill (edge run / zigzag / grid)."""
    if kind == 'none' or poly.area < min_area_mm2:
        return []
    inner = poly.buffer(-0.5)
    out: List[Stitch] = []
    if kind in ('edge', 'edge_grid'):
        out += finish_stitches(StitchEngine.generate_edge_walk_underlay(poly))
    if kind in ('grid', 'edge_grid') and not inner.is_empty:
        out += finish_stitches(StitchEngine.generate_underlay_grid(inner, top_angle_deg=top_angle, grid_spacing_mm=2.0))
    if kind == 'zigzag' and not inner.is_empty:
        out += finish_stitches(_satin_core(inner, 1.8, top_angle + 90.0), **_SATIN_OPTS)
    return out


def _tatami(poly, angle, spacing, pull, stitch_len=3.8, offset=0.25) -> List[Stitch]:
    return StitchEngine.generate_tatami_fill(poly, angle_deg=angle, row_spacing_mm=spacing,
                                             stitch_len_mm=stitch_len, pull_comp_mm=pull, offset_fraction=offset)


def _fill(poly, density, pull, underlay, angle, stitch_len, default_angle=45.0, default_len=3.8, offset=0.25):
    ang = default_angle if angle is None else angle
    kind = 'edge_grid' if underlay == 'auto' else underlay
    length = stitch_len or default_len
    # the stitch cap and jump threshold must follow the requested length, or longer settings would be re-split / cut
    top = finish_stitches(_tatami(poly, ang, density, pull, length, offset),
                         max_stitch_mm=max(4.5, length + 0.7), jump_above_mm=max(6.0, length + 1.5))
    return _underlay(poly, kind, ang) + top


def satin(poly, density, pull=0.0, underlay='auto', angle=None, **_):
    """Zigzag satin: true edge-to-edge on narrow shapes, staggered pieces on wide ones."""
    ang = 45.0 if angle is None else angle
    kind = 'edge' if underlay == 'auto' else underlay
    return _underlay(poly, kind, ang) + finish_stitches(_satin_core(poly.buffer(pull), density, ang), **_SATIN_OPTS)


def tatami(poly, density, pull, underlay='auto', angle=None, stitch_len=None, **_):
    return _fill(poly, density, pull, underlay, angle, stitch_len)


def dst(poly, density, pull, underlay='auto', angle=None, stitch_len=None, **_):
    return _fill(poly, density, pull, underlay, angle, stitch_len)


def prog(poly, density, pull, underlay='auto', angle=None, stitch_len=None, **_):
    """Aligned grid snake-scan (no brick offset), like a programmed fill."""
    return _fill(poly, density, pull, underlay, angle, stitch_len, default_angle=0.0, default_len=3.0, offset=0.0)


def photo(poly, density, pull, rgb=(0, 0, 0), underlay='auto', angle=None, stitch_len=None, **_):
    """Tone by density: dark colours get tighter rows, light colours sparser."""
    lum = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255.0
    return _fill(poly, max(0.3, density * (0.8 + 0.8 * lum)), pull, underlay, angle, stitch_len)


def padded(poly, density, pull, **_):
    """Raised satin: diagonal pad, perpendicular pad, then satin on top."""
    pad1 = finish_stitches(_tatami(poly.buffer(-0.3), 45.0, 0.8, 0.0))
    pad2 = finish_stitches(_tatami(poly.buffer(-0.3), 135.0, 0.8, 0.0))
    return pad1 + pad2 + finish_stitches(_satin_core(poly.buffer(pull), density), **_SATIN_OPTS)


# ── auto: the right stitch for each part of a shape ───────────────────────
AUTO_COLUMN_MAX_MM = 6.4   # strokes up to this wide become satin columns; anything wider is a fill
AUTO_HAIRLINE_MM = 0.9     # strokes thinner than this are a single running stitch


def _avg_width(p) -> float:
    """Average width of a thin shape: area over half the perimeter (exact for a strip)."""
    return 2.0 * p.area / max(p.length, 1e-6)


def auto(poly, density, pull, underlay='auto', angle=None, stitch_len=None, **_):
    """Smart mode, like professional auto-digitizing: wide areas get a tatami fill with underlay, strokes and lettering
    get satin columns that follow them, hairlines get a running stitch."""
    r = AUTO_COLUMN_MAX_MM / 2.0
    wide = poly.buffer(-r).buffer(r)                    # morphological opening: only the thick parts survive
    fills = [p for p in _polys(wide) if p.area >= 3.0]
    covered = wide.buffer(0.3) if not wide.is_empty else wide
    narrow = poly.difference(covered) if not wide.is_empty else poly
    out: List[Stitch] = []

    for p in fills:  # solid areas first, so the columns sit on top
        out += _fill(p, density, pull, underlay, angle, stitch_len)

    cols: List[Stitch] = []
    lines: List[Stitch] = []
    for p in _polys(narrow):
        if p.area < 0.5:
            continue
        w = _avg_width(p)
        touches_fill = (not wide.is_empty) and p.distance(wide) < 0.5
        if touches_fill and p.area < 10.0:              # corner / edge residue of the opening, not a real stroke
            continue
        if w < AUTO_HAIRLINE_MM:
            if not touches_fill:                        # a sliver left along a fill's edge is not a real line
                lines += hairline_stitches(p)
        else:
            cols += satin_column_stitches(p, max(density, 0.3), pull)
    out += finish_stitches(cols, **_SATIN_OPTS) if cols else []
    out += finish_stitches(lines) if lines else []
    return out


# ── registry / entry point ────────────────────────────────────────────────
# layered methods do their own underlay + finishing; raw generators are finished centrally
_LAYERED = {'auto': auto, 'satin': satin, 'tatami': tatami, 'dst': dst, 'prog': prog, 'photo': photo, 'padded': padded}
_RAW = {
    'seed': seed, 'spiral': spiral, 'contour': contour, 'radial': radial,
    'run': run, 'bean': bean, 'stem': stem, 'back': back, 'straight': straight,
    'chain': chain, 'feather': feather, 'blanket': blanket, 'fly': fly,
    'cross': cross, 'motif': motif, 'stipple': stipple,
    'zigzag': zigzag, 'scallop': scallop, 'picot': picot,
}
# radial spokes are long on purpose and place their own JUMPs
_FINISH_OPTS = {'radial': dict(max_stitch_mm=4.0, jump_above_mm=1e9)}
SUPPORTED = sorted(set(_LAYERED) | set(_RAW))
DEFAULT_METHOD = 'auto'


def generate_shape_stitches(method: str, poly, density: float = 0.4, pull: float = 0.25,
                            rgb: Tuple[int, int, int] = (0, 0, 0), underlay: str = 'auto',
                            angle: float = None, stitch_len: float = None) -> List[Stitch]:
    """Machine-ready (x, y, cmd) stitches for one shape using the named method and settings."""
    method = (method or DEFAULT_METHOD).lower()
    if method not in CATEGORIES:
        method = DEFAULT_METHOD
    if underlay not in UNDERLAYS:
        underlay = 'auto'
    kw = dict(density=density, pull=pull, rgb=rgb, underlay=underlay, angle=angle, stitch_len=stitch_len)
    if method in _LAYERED:
        return _LAYERED[method](poly, **kw)
    return finish_stitches(_RAW[method](poly, **kw), **_FINISH_OPTS.get(method, {}))
