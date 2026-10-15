import io
from typing import Any, Dict, List, Sequence, Tuple

import numpy as np
import pyembroidery

MAX_DST_MOVE_UNITS = 121      # DST single-record limit, 0.1 mm units
MIN_STITCH_MM = 0.3
MAX_STITCH_MM = 7.0


def analyze_stitches(stitches: Sequence[Tuple]) -> Dict[str, Any]:
    """Quality metrics for a (x, y, cmd, ...) stitch list, coordinates in mm."""
    pts = [(s[0], s[1]) for s in stitches if s[2] == 'STITCH']
    lengths: List[float] = []
    prev = None
    for s in stitches:
        if s[2] == 'STITCH':
            if prev is not None:
                lengths.append(float(np.hypot(s[0] - prev[0], s[1] - prev[1])))
            prev = (s[0], s[1])
        else:
            prev = (s[0], s[1])  # a jump/stop moves the needle
            if s[2] == 'JUMP':
                prev = None      # first stitch after a jump has no stitch length
    arr = np.array(lengths) if lengths else np.zeros(1)
    return {
        "stitches": len(pts),
        "jumps": sum(1 for s in stitches if s[2] == 'JUMP'),
        "trims": sum(1 for s in stitches if s[2] == 'TRIM'),
        "color_changes": sum(1 for s in stitches if s[2] == 'STOP'),
        "avg_len_mm": round(float(arr.mean()), 3),
        "max_len_mm": round(float(arr.max()), 3),
        "too_long": int((arr > MAX_STITCH_MM).sum()),
        "too_short": int((arr < MIN_STITCH_MM).sum()),
    }


def validate_dst(data: bytes) -> Dict[str, Any]:
    """Structural checks on DST bytes; returns {'ok': bool, 'errors': [...], ...}."""
    errors: List[str] = []
    if len(data) < 515:
        return {"ok": False, "errors": ["file shorter than header + end record"]}
    header = data[:512]
    body = data[512:]
    if len(body) % 3 != 0:
        errors.append("body is not a multiple of 3 bytes")
    if body[-3:] != bytes([0x00, 0x00, 0xF3]):
        errors.append("missing END record")
    if not header.startswith(b"LA:"):
        errors.append("header missing LA: label")

    n_records = len(body) // 3
    claimed = None
    for field in header.split(b"\r"):
        if field.startswith(b"ST:"):
            try:
                claimed = int(field[3:].strip())
            except ValueError:
                errors.append("unparseable ST: field")
    if claimed is not None and claimed != n_records:
        errors.append(f"header ST:{claimed} != {n_records} records")

    pattern = pyembroidery.read_dst(io.BytesIO(data))
    if pattern is None:
        errors.append("pyembroidery could not parse file")
        return {"ok": False, "errors": errors}
    bounds = pattern.bounds()
    stitch_cmds = [s[2] & pyembroidery.COMMAND_MASK for s in pattern.stitches]
    return {
        "ok": not errors,
        "errors": errors,
        "records": n_records,
        "stitch_count": sum(1 for c in stitch_cmds if c == pyembroidery.STITCH),
        "color_changes": sum(1 for c in stitch_cmds if c == pyembroidery.COLOR_CHANGE),
        "jumps": sum(1 for c in stitch_cmds if c == pyembroidery.JUMP),
        "bounds_mm": tuple(round(b / 10.0, 1) for b in bounds),
    }


def parse_dst(data: bytes) -> Dict[str, Any]:
    """Decode DST bytes into colour blocks for previewing (coordinates in mm, y down)."""
    pattern = pyembroidery.read_dst(io.BytesIO(data))
    if pattern is None or not pattern.stitches:
        raise ValueError("not a readable DST file")

    header: Dict[str, str] = {}
    for field in data[:512].split(b"\r"):
        if len(field) > 3 and field[2:3] == b":":
            header[field[:2].decode("ascii", "ignore")] = field[3:].decode("ascii", "ignore").strip()

    blocks: List[Dict[str, Any]] = [{"stitches": []}]
    last = (0.0, 0.0)
    lengths: List[float] = []
    n_stitch = n_jump = n_trim = 0
    for x, y, cmd in pattern.stitches:
        c = cmd & pyembroidery.COMMAND_MASK
        mx, my = round(x / 10.0, 2), round(y / 10.0, 2)
        if c == pyembroidery.COLOR_CHANGE:
            if blocks[-1]["stitches"]:
                blocks.append({"stitches": []})
        elif c == pyembroidery.END:
            break
        elif c in (pyembroidery.STITCH, pyembroidery.JUMP, pyembroidery.TRIM):
            code = {pyembroidery.STITCH: 0, pyembroidery.JUMP: 1, pyembroidery.TRIM: 2}[c]
            if c == pyembroidery.STITCH:
                n_stitch += 1
                lengths.append(float(np.hypot(mx - last[0], my - last[1])))
            elif c == pyembroidery.JUMP:
                n_jump += 1
            else:
                n_trim += 1
            blocks[-1]["stitches"].append([mx, my, code])
        last = (mx, my)
    blocks = [b for b in blocks if b["stitches"]]

    xs = [s[0] for b in blocks for s in b["stitches"]]
    ys = [s[1] for b in blocks for s in b["stitches"]]
    arr = np.array(lengths) if lengths else np.zeros(1)
    return {
        "header": header,
        "blocks": blocks,
        "bounds_mm": [min(xs), min(ys), max(xs), max(ys)],
        "stats": {
            "stitches": n_stitch,
            "jumps": n_jump,
            "trims": n_trim,
            "color_blocks": len(blocks),
            "width_mm": round(max(xs) - min(xs), 1),
            "height_mm": round(max(ys) - min(ys), 1),
            "avg_stitch_mm": round(float(arr.mean()), 2),
            "max_stitch_mm": round(float(arr.max()), 2),
            "file_bytes": len(data),
        },
    }
