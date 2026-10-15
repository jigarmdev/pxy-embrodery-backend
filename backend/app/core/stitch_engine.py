import math
import numpy as np
from shapely.geometry import Polygon, MultiPolygon, LineString
from shapely.affinity import rotate
from typing import List, Tuple

def group_lanes(rows):
    """Group scanline segments into lanes: chains of segments that overlap their neighbour in the next row.
    rows: list (per scanline, in order) of lists of (xmin, xmax, payload). Returns a list of lanes, each a list of payloads.
    Sewing one lane at a time means the thread goes *around* a hole instead of crossing it on every row."""
    lanes, open_lanes = [], []
    for row in rows:
        used, now_open = set(), []
        for xmin, xmax, payload in row:
            lane = None
            for cand in open_lanes:
                if id(cand) in used:
                    continue
                if xmin <= cand[-1][1] and xmax >= cand[-1][0]:
                    lane = cand
                    break
            if lane is None:
                lane = []
                lanes.append(lane)
            used.add(id(lane))
            lane.append((xmin, xmax, payload))
            now_open.append(lane)
        open_lanes = now_open
    return [[p for _, _, p in lane] for lane in lanes]


class StitchEngine:
    """Calculates physical needle penetrations for vector geometries."""

    @staticmethod
    def generate_tatami_fill(
        poly: Polygon,
        angle_deg: float = 45.0,
        row_spacing_mm: float = 0.4,
        stitch_len_mm: float = 3.8,
        pull_comp_mm: float = 0.25,
        offset_fraction: float = 0.25
    ) -> List[Tuple[float, float, str]]:
        """
        Slices a polygon into directional Tatami stitches with pull compensation.
        """
        stitches = []
        if poly.is_empty:
            return stitches

        # Apply pull compensation (expand polygon perpendicular to stress)
        buffered_poly = poly.buffer(pull_comp_mm)

        # Rotate polygon to horizontal alignment
        rot_poly = rotate(buffered_poly, -angle_deg, origin=(0, 0))
        min_x, min_y, max_x, max_y = rot_poly.bounds

        # Generate scanlines, each as a list of left->right segments (shapely does not guarantee a direction)
        y_coords = np.arange(min_y + (row_spacing_mm / 2.0), max_y, row_spacing_mm)
        rows = []
        for row_idx, y in enumerate(y_coords):
            scanline = LineString([(min_x - 10, y), (max_x + 10, y)])
            intersection = rot_poly.intersection(scanline)
            parts = []
            if intersection.geom_type == 'LineString':
                parts.append(intersection)
            elif intersection.geom_type in ('MultiLineString', 'GeometryCollection'):
                parts.extend(g for g in intersection.geoms if g.geom_type == 'LineString')
            row = []
            for g in parts:
                if g.is_empty or len(g.coords) < 2 or g.length < 0.2:
                    continue
                a, b = sorted([g.coords[0], g.coords[-1]])
                row.append((a[0], b[0], (row_idx, a, b)))
            row.sort(key=lambda t: t[0])
            rows.append(row)

        # Sew one lane at a time (rows alternate direction inside a lane), nearest lane next
        lanes = group_lanes(rows)
        pending = list(lanes)
        last = None
        while pending:
            if last is None:
                lane = pending.pop(0)
            else:
                i = min(range(len(pending)), key=lambda k: (pending[k][0][1][0] - last[0]) ** 2 + (pending[k][0][1][1] - last[1]) ** 2)
                lane = pending.pop(i)
            for n, (row_idx, a, b) in enumerate(lane):
                length = math.hypot(b[0] - a[0], b[1] - a[1])
                # Pattern offset shift per row so needle holes don't line up
                pattern_shift = (row_idx * offset_fraction * stitch_len_mm) % stitch_len_mm
                dists = [0.0]
                d = pattern_shift if pattern_shift > 0.3 else pattern_shift + stitch_len_mm
                while d < length - 0.3:
                    dists.append(d)
                    d += stitch_len_mm
                dists.append(length)
                if n % 2:
                    dists = dists[::-1]  # walk the row backwards: alternating rows keeps the thread path short
                for d in dists:
                    t = d / length
                    stitches.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, 'STITCH'))
                last = stitches[-1][:2]

        # Rotate stitch points back to original orientation
        rad = np.radians(angle_deg)
        cos_a, sin_a = np.cos(rad), np.sin(rad)
        final_stitches = []

        for x, y, cmd in stitches:
            orig_x = x * cos_a - y * sin_a
            orig_y = x * sin_a + y * cos_a
            final_stitches.append((orig_x, orig_y, cmd))

        return final_stitches

    @staticmethod
    def generate_underlay_grid(
        poly: Polygon,
        top_angle_deg: float = 45.0,
        grid_spacing_mm: float = 1.5
    ) -> List[Tuple[float, float, str]]:
        """Generates perpendicular underlay grid to stabilize fabric."""
        underlay_angle = top_angle_deg + 90.0
        return StitchEngine.generate_tatami_fill(
            poly,
            angle_deg=underlay_angle,
            row_spacing_mm=grid_spacing_mm,
            stitch_len_mm=4.5,
            pull_comp_mm=0.0
        )

    @staticmethod
    def generate_edge_walk_underlay(
        poly,
        inset_mm: float = 0.5,
        stitch_len_mm: float = 2.5
    ) -> List[Tuple[float, float, str]]:
        """Running stitch just inside the outline; anchors the fabric before the top fill."""
        stitches = []
        inner = poly.buffer(-inset_mm)
        if inner.is_empty:
            return stitches
        geoms = inner.geoms if inner.geom_type == 'MultiPolygon' else [inner]
        for g in geoms:
            ring = g.exterior
            if ring.length < 2.0:
                continue
            n = max(3, int(ring.length / stitch_len_mm))
            for i in range(n + 1):
                pt = ring.interpolate(i / n, normalized=True)
                stitches.append((pt.x, pt.y, 'JUMP' if i == 0 else 'STITCH'))
        return stitches

    @staticmethod
    def generate_fill_underlay(
        poly,
        top_angle_deg: float = 45.0,
        min_area_mm2: float = 12.0
    ) -> List[Tuple[float, float, str]]:
        """Edge walk + sparse perpendicular grid. Skipped for tiny shapes (not worth the bulk)."""
        if poly.area < min_area_mm2:
            return []
        stitches = StitchEngine.generate_edge_walk_underlay(poly)
        stitches += StitchEngine.generate_underlay_grid(
            poly.buffer(-0.5), top_angle_deg=top_angle_deg, grid_spacing_mm=2.0
        )
        return stitches

    @staticmethod
    def generate_contour_satin(
        poly,
        satin_width_mm: float = 2.0,
        density_mm: float = 0.4
    ) -> List[Tuple[float, float, str]]:
        """
        Generates a photorealistic satin column that dynamically wraps along the contours of a shape.
        """
        stitches = []
        if poly.is_empty:
            return stitches
            
        if poly.geom_type == 'MultiPolygon':
            for geom in poly.geoms:
                stitches.extend(StitchEngine.generate_contour_satin(geom, satin_width_mm, density_mm))
            return stitches
            
        boundary = poly.exterior
        length = boundary.length
        
        # Don't try to satin tiny noise
        if length < 1.0:
            return stitches
            
        num_points = int(length / density_mm)
        
        for i in range(num_points):
            t = (i * density_mm) / length
            pt = boundary.interpolate(t, normalized=True)
            
            # Calculate tangent/normal to find the exact dynamic curve angle
            delta = 0.001
            t_next = min(1.0, t + delta)
            pt_next = boundary.interpolate(t_next, normalized=True)
            
            dx = pt_next.x - pt.x
            dy = pt_next.y - pt.y
            
            # Normal angle is perpendicular to the tangent
            normal_angle = np.arctan2(dy, dx) + np.pi / 2
            
            # Alternate sides for zigzag (Satin)
            side = 1 if i % 2 == 0 else -1
            
            # Apply pull compensation to avoid shrinking
            adjusted_width = satin_width_mm * 1.1 
            
            sx = pt.x + np.cos(normal_angle) * (adjusted_width / 2.0) * side
            sy = pt.y + np.sin(normal_angle) * (adjusted_width / 2.0) * side
            
            cmd = 'JUMP' if i == 0 else 'STITCH'
            stitches.append((sx, sy, cmd))
            
        return stitches
