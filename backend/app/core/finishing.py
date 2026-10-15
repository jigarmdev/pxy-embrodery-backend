"""Post-processing that turns raw stitch paths into machine-safe sequences.

Operates on (x, y, cmd) tuples in mm. Trims are expressed as JUMPs (machines
trim on jumps); locks are ordinary tiny STITCHes, so no new command types.
"""
import math
from typing import List, Tuple

Stitch = Tuple[float, float, str]

MAX_STITCH_MM = 4.5      # longer stitches are split
MIN_STITCH_MM = 0.3      # shorter stitches are dropped
JUMP_ABOVE_MM = 6.0      # gaps larger than this become a jump (trim) instead of a travel stitch
LOCK_MM = 0.5            # tie-in / tie-off stitch size
MIN_LOCK_RUN_MM = 3.0    # runs shorter than this (seeds, picots) are not worth locking


def _dist(a, b) -> float:
    return math.hypot(b[0] - a[0], b[1] - a[1])


def _split_runs(stitches: List[Stitch], jump_above_mm: float) -> List[List[Tuple[float, float]]]:
    """Break the path into continuous stitch runs at JUMPs and large gaps."""
    runs: List[List[Tuple[float, float]]] = []
    cur: List[Tuple[float, float]] = []
    for x, y, cmd in stitches:
        if cmd == 'JUMP':
            if cur:
                runs.append(cur)
            cur = [(x, y)]
            continue
        if cmd != 'STITCH':
            continue
        if cur and _dist(cur[-1], (x, y)) > jump_above_mm:
            runs.append(cur)
            cur = []
        cur.append((x, y))
    if cur:
        runs.append(cur)
    return [r for r in runs if len(r) >= 2]


def _resample(run, max_mm: float, min_mm: float) -> List[Tuple[float, float]]:
    """Split over-long stitches evenly and drop near-duplicate points."""
    out = [run[0]]
    for pt in run[1:]:
        d = _dist(out[-1], pt)
        if d < min_mm:
            continue
        n = math.ceil(d / max_mm)
        start = out[-1]
        for i in range(1, n + 1):
            t = i / n
            out.append((start[0] + (pt[0] - start[0]) * t, start[1] + (pt[1] - start[1]) * t))
    return out


def _lock(p, toward, size: float) -> List[Tuple[float, float]]:
    """Two tiny back-and-forth stitches at p, heading toward `toward`."""
    d = _dist(p, toward)
    if d == 0:
        return []
    q = (p[0] + (toward[0] - p[0]) / d * size, p[1] + (toward[1] - p[1]) / d * size)
    return [q, p, q]


def finish_stitches(
    stitches: List[Stitch],
    max_stitch_mm: float = MAX_STITCH_MM,
    min_stitch_mm: float = MIN_STITCH_MM,
    jump_above_mm: float = JUMP_ABOVE_MM,
    lock_mm: float = LOCK_MM,
    add_locks: bool = True,
) -> List[Stitch]:
    """Split long stitches, drop tiny ones, jump large gaps, add lock stitches."""
    result: List[Stitch] = []
    for run in _split_runs(stitches, jump_above_mm):
        run = _resample(run, max_stitch_mm, min_stitch_mm)
        if len(run) < 2:
            continue
        result.append((run[0][0], run[0][1], 'JUMP'))
        lock_this = add_locks and sum(_dist(a, b) for a, b in zip(run, run[1:])) >= MIN_LOCK_RUN_MM
        if lock_this:
            # tie-in: sew a short lock into the path, then continue from the start point
            for x, y in _lock(run[0], run[1], lock_mm):
                result.append((x, y, 'STITCH'))
        for x, y in run:
            result.append((x, y, 'STITCH'))
        if lock_this:
            for x, y in _lock(run[-1], run[-2], lock_mm):
                result.append((x, y, 'STITCH'))
    return result
