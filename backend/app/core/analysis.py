"""Measured analysis of a finished design: the numbers come from the stitches, not from estimates.

Works on colour blocks: [{"color": "#rrggbb" | None, "stitches": [[x_mm, y_mm, code], ...]}] with
code 0 = stitch, 1 = jump, 2 = trim. Used both for freshly generated designs and for any uploaded DST.
"""
import math
from typing import Any, Dict, List, Optional, Sequence

import numpy as np

from .thread_mapper import nearest_named

TRIM_AFTER_MM = 5.0         # a jump longer than this is cut (trimmed) by the machine
SHORT_MM, LONG_MM = 0.3, 7.0
DENSE_MM_PER_MM2 = 7.0      # thread laid per mm2 beyond which fabric puckers and needles break

# fabric id -> (needle, stabilizer, note). Ids match the frontend fabric list.
FABRIC_RECS = {
    "cotton":    ("75/11 Sharp",        "Cut-away, medium",            "Standard woven: easy to hoop."),
    "aida":      ("75/11 Sharp",        "None or light tear-away",     "Evenweave: hoop without stretching."),
    "denim":     ("90/14 Denim/Jeans",  "Tear-away, medium",           "Heavy woven: use a strong needle and go slower."),
    "silk":      ("65/9 Microtex",      "Tear-away plus topping",      "Delicate: lower the density about 20%."),
    "fleece":    ("75/11 Ball Point",   "Cut-away plus water-soluble topping", "Pile and stretch: topping stops stitches sinking."),
    "leather":   ("90/14 Leather",      "No-show mesh or tear-away",   "Needle holes are permanent: keep stitch count low."),
    "towel":     ("75/11 Ball Point",   "Cut-away plus wash-away topping", "Terry pile: always use topping."),
    "linen":     ("80/12 Sharp",        "Light tear-away",             "Crisp natural fibre."),
    "organza":   ("65/9 Microtex",      "Water-soluble only",          "Sheer: nothing that shows through."),
    "polyester": ("75/11 Ball Point",   "Cut-away",                    "Athletic knit: reduce foot pressure."),
    "canvas":    ("90/14 Denim/Jeans",  "Tear-away or none",           "Very stable, ideal for fills."),
    "felt":      ("75/11 Sharp",        "None needed",                 "Non-woven: no stabilizer required."),
}
STRETCHY = {"fleece", "polyester", "silk", "towel"}


def _lengths(stitches) -> List[float]:
    out, prev = [], None
    for x, y, code in stitches:
        if code == 0 and prev is not None:
            out.append(math.hypot(x - prev[0], y - prev[1]))
        prev = (x, y) if code != 1 else None  # the first stitch after a jump has no length
    return out


def analyze(blocks: Sequence[Dict[str, Any]], fabric: str = "cotton", hoop: Optional[Dict[str, float]] = None,
            generation_ms: Optional[int] = None) -> Dict[str, Any]:
    pts = [(s[0], s[1]) for b in blocks for s in b["stitches"]]
    if not pts:
        return {"empty": True}
    xs, ys = zip(*pts)
    width, height = max(xs) - min(xs), max(ys) - min(ys)

    stitch_count = sum(1 for b in blocks for s in b["stitches"] if s[2] == 0)
    jumps = trims = 0
    all_len: List[float] = []
    per_block = []
    for b in blocks:
        prev = None
        for x, y, code in b["stitches"]:
            if code == 1:
                jumps += 1
                if prev is not None and math.hypot(x - prev[0], y - prev[1]) > TRIM_AFTER_MM:
                    trims += 1
            elif code == 2:
                trims += 1
            prev = (x, y)
        lens = _lengths(b["stitches"])
        all_len += lens
        per_block.append((b, sum(1 for s in b["stitches"] if s[2] == 0), sum(lens)))

    lens = np.array(all_len) if all_len else np.zeros(1)
    top_thread_m = float(lens.sum()) / 1000.0 * 1.15           # +15% for the thread that goes down through the fabric
    colour_changes = max(0, len(blocks) - 1)

    # how much thread lies on each square millimetre: every stitch is sampled along its length, so a long satin
    # stitch spreads its thread over the cells it crosses instead of piling it up at its midpoint
    seg = []
    for b in blocks:
        prev = None
        for x, y, code in b["stitches"]:
            if code == 0 and prev is not None:
                seg.append((prev[0], prev[1], x, y))
            prev = (x, y) if code != 1 else None
    if seg:
        a_ = np.array(seg, float)
        length = np.hypot(a_[:, 2] - a_[:, 0], a_[:, 3] - a_[:, 1])
        n = np.maximum(1, np.ceil(length / 0.5)).astype(int)
        idx = np.repeat(np.arange(len(a_)), n)
        k = np.concatenate([np.arange(c) for c in n]) if len(n) < 200000 else (np.arange(len(idx)) - np.repeat(np.cumsum(n) - n, n))
        t = (k + 0.5) / n[idx]
        px = a_[idx, 0] + (a_[idx, 2] - a_[idx, 0]) * t
        py = a_[idx, 1] + (a_[idx, 3] - a_[idx, 1]) * t
        w = (length / n)[idx]
        cells = np.stack([np.floor(px).astype(np.int64), np.floor(py).astype(np.int64)], axis=1)
        _, inv = np.unique(cells, axis=0, return_inverse=True)
        dens = np.bincount(inv.ravel(), weights=w)
    else:
        dens = np.zeros(1)
    dense_share = float((dens > DENSE_MM_PER_MM2).sum()) / max(1, len(dens))

    score = stitch_count / 1000.0 + len(blocks) * 1.2 + jumps / 50.0
    complexity = "Simple" if score < 4 else "Moderate" if score < 12 else "Complex" if score < 30 else "Very complex"
    runtime_min = stitch_count / 750.0 + colour_changes * 25 / 60.0 + trims * 6 / 60.0

    needle, stab, note = FABRIC_RECS.get(fabric, FABRIC_RECS["cotton"])
    if (stitch_count > 12000 or dense_share > 0.1) and "Cut-away" not in stab and "water" not in stab.lower():
        stab = "Cut-away, medium (heavy design)"
    if fabric in STRETCHY and "Cut-away" not in stab:
        stab = "Cut-away (stretchy fabric)"
    thread = "40 wt polyester or rayon" if min(width, height) > 12 else "60 wt polyester (small design)"

    warnings: List[Dict[str, str]] = []
    n = max(1, len(all_len))
    if (lens < SHORT_MM).sum() / n > 0.02:
        warnings.append({"level": "warn", "code": "short", "message": f"{int((lens < SHORT_MM).sum())} stitches are shorter than {SHORT_MM} mm and may break thread."})
    if (lens > LONG_MM).any():
        warnings.append({"level": "warn", "code": "long", "message": f"{int((lens > LONG_MM).sum())} stitches are longer than {LONG_MM:g} mm and may snag."})
    if stitch_count and jumps / max(1, stitch_count) > 0.05:
        warnings.append({"level": "info", "code": "jumps", "message": f"{jumps} jumps ({trims} trims): sewing will pause for trimming. Fewer, larger shapes sew faster."})
    if dense_share > 0.05:
        warnings.append({"level": "warn", "code": "dense", "message": f"{dense_share * 100:.0f}% of the stitched area is very dense; it may pucker the fabric. Raise the density spacing."})
    if len(blocks) > 8:
        warnings.append({"level": "info", "code": "colours", "message": f"{len(blocks)} thread colours means {colour_changes} colour changes. Reduce the colour count to sew faster."})
    if hoop and (width > hoop["w"] + 1 or height > hoop["h"] + 1):
        warnings.append({"level": "warn", "code": "hoop", "message": f"Design ({width:.0f} × {height:.0f} mm) is larger than the hoop ({hoop['w']:.0f} × {hoop['h']:.0f} mm)."})

    colours = []
    for b, count, length in per_block:
        hexc = b.get("color")
        item: Dict[str, Any] = {"stitches": count, "length_m": round(length / 1000.0, 2)}
        if hexc:
            name, near = nearest_named(hexc)
            item.update({"hex": hexc, "name": name, "nearest_hex": near})
        colours.append(item)

    return {
        "stitch_count": stitch_count, "jumps": jumps, "trims": trims, "colors": len(blocks), "color_changes": colour_changes,
        "width_mm": round(width, 1), "height_mm": round(height, 1),
        "top_thread_m": round(top_thread_m, 2), "bobbin_thread_m": round(top_thread_m * 0.35, 2),
        "avg_stitch_mm": round(float(lens.mean()), 2), "max_stitch_mm": round(float(lens.max()), 2),
        "dense_share": round(dense_share, 3), "complexity": complexity,
        "runtime_min": round(runtime_min, 1),
        "recommend": {"needle": needle, "stabilizer": stab, "thread": thread, "note": note, "fabric": fabric},
        "warnings": warnings, "colours": colours,
        "generation_ms": generation_ms,
    }


def blocks_from_flat(stitches: Sequence[Sequence]) -> List[Dict[str, Any]]:
    """Digitizer output (x, y, cmd, r, g, b) -> colour blocks. One block per STOP."""
    blocks: List[Dict[str, Any]] = []
    code = {"STITCH": 0, "JUMP": 1, "TRIM": 2}
    for s in stitches:
        cmd = s[2]
        if cmd == "STOP":
            color = f"#{int(s[3]):02x}{int(s[4]):02x}{int(s[5]):02x}" if len(s) >= 6 and s[3] is not None else None
            # the jump that leads into the first colour arrives before its STOP: it belongs to that colour's block
            if blocks and blocks[-1]["color"] is None and not any(p[2] == 0 for p in blocks[-1]["stitches"]):
                blocks[-1]["color"] = color
            else:
                blocks.append({"color": color, "stitches": []})
            continue
        if cmd not in code:
            continue
        if not blocks:
            blocks.append({"color": None, "stitches": []})
        blocks[-1]["stitches"].append([float(s[0]), float(s[1]), code[cmd]])
    return [b for b in blocks if any(p[2] == 0 for p in b["stitches"])]
