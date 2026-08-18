import numpy as np
from typing import List, Tuple, Dict, Any

class EmbroideryEstimator:
    """Production metrics and financial calculation engine."""

    @staticmethod
    def calculate_metrics(
        stitches: List[Tuple[float, float, str]],
        machine_spm: int = 750,
        rate_per_1k_inr: float = 45.0,
        thread_cost_per_meter_inr: float = 0.15,
        base_setup_fee_inr: float = 150.0
    ) -> Dict[str, Any]:
        total_stitches = len(stitches)
        if total_stitches == 0:
            return {"stitch_count": 0, "top_thread_m": 0, "runtime_min": 0, "total_price_inr": 0}

        # Calculate total top thread length (mm -> meters with 18% slack factor)
        coords = np.array([[s[0], s[1]] for s in stitches])
        deltas = np.diff(coords, axis=0)
        segment_lengths_mm = np.sqrt((deltas ** 2).sum(axis=1))

        top_thread_meters = (np.sum(segment_lengths_mm) / 1000.0) * 1.18
        bobbin_meters = top_thread_meters * 0.35

        color_changes = sum(1 for s in stitches if s[2] == 'STOP')
        trims = sum(1 for s in stitches if s[2] == 'JUMP') // 3

        # Runtime formula: Stitches/SPM + 25s per color change + 6s per trim
        runtime_minutes = (total_stitches / machine_spm) + (color_changes * (25.0 / 60.0)) + (trims * (6.0 / 60.0))

        # Commercial pricing calculation
        stitch_fee = (total_stitches / 1000.0) * rate_per_1k_inr
        thread_material_cost = top_thread_meters * thread_cost_per_meter_inr
        total_price = base_setup_fee_inr + stitch_fee + thread_material_cost

        return {
            "stitch_count": total_stitches,
            "color_changes": color_changes,
            "top_thread_meters": round(float(top_thread_meters), 2),
            "bobbin_thread_meters": round(float(bobbin_meters), 2),
            "estimated_runtime_minutes": round(float(runtime_minutes), 1),
            "pricing_breakdown": {
                "base_setup_fee": base_setup_fee_inr,
                "stitch_fee": round(float(stitch_fee), 2),
                "thread_material_cost": round(float(thread_material_cost), 2),
                "total_estimated_price": round(float(total_price), 2),
                "currency": "INR (₹)"
            }
        }
