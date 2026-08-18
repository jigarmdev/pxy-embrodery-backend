import numpy as np
from shapely.geometry import Polygon, MultiPolygon, LineString
from shapely.affinity import rotate
from typing import List, Tuple

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

        # Generate scanlines
        y_coords = np.arange(min_y + (row_spacing_mm / 2.0), max_y, row_spacing_mm)
        forward = True
        row_idx = 0

        for y in y_coords:
            scanline = LineString([(min_x - 10, y), (max_x + 10, y)])
            intersection = rot_poly.intersection(scanline)

            segments = []
            if intersection.geom_type == 'LineString':
                segments.append(intersection)
            elif intersection.geom_type == 'MultiLineString':
                segments.extend(intersection.geoms)

            for seg in segments:
                p_start, p_end = (seg.coords[0], seg.coords[-1]) if forward else (seg.coords[-1], seg.coords[0])
                length = seg.length
                if length < 0.2:
                    continue

                # Pattern offset shift per row
                pattern_shift = (row_idx * offset_fraction * stitch_len_mm) % stitch_len_mm
                num_points = max(2, int(np.ceil(length / stitch_len_mm)))

                # Sample points along line segment
                for i in range(num_points):
                    t = (i * stitch_len_mm + pattern_shift) / length
                    if 0.0 <= t <= 1.0:
                        pt = seg.interpolate(t, normalized=True)
                        stitches.append((pt.x, pt.y, 'STITCH'))

            forward = not forward
            row_idx += 1

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
