"""End-to-end: image -> /api/digitize -> /api/export/dst -> validate + quality."""
from pathlib import Path

import cv2
import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.core.quality import analyze_stitches, validate_dst
from app.main import app

client = TestClient(app)
IMAGES = Path(__file__).resolve().parents[2] / "frontend" / "public" / "images"


def _synthetic_logo() -> bytes:
    img = np.full((300, 300, 3), 255, np.uint8)
    cv2.circle(img, (150, 150), 100, (200, 30, 30), -1)
    cv2.rectangle(img, (110, 110), (190, 190), (20, 20, 160), -1)
    cv2.line(img, (40, 260), (260, 260), (0, 0, 0), 6)  # thin stroke
    return cv2.imencode(".png", img)[1].tobytes()


def _sources():
    yield "synthetic", _synthetic_logo()
    for name in ("shark.jpg", "dob.jpeg"):
        p = IMAGES / name
        if p.exists():
            yield name, p.read_bytes()


@pytest.fixture(params=list(_sources()), ids=lambda p: p[0])
def pipeline(request):
    name, data = request.param
    r = client.post("/api/digitize", data={"width_mm": 80, "height_mm": 80},
                    files={"file": (name, data, "image/png")})
    assert r.status_code == 200
    stitches = r.json()["stitches"]
    r = client.post("/api/export/dst", json={"stitches": stitches})
    assert r.status_code == 200
    return name, stitches, r.content


def test_dst_is_valid(pipeline):
    _, _, dst = pipeline
    report = validate_dst(dst)
    assert report["ok"], report["errors"]


def test_roundtrip_preserves_design(pipeline):
    _, stitches, dst = pipeline
    q = analyze_stitches(stitches)
    report = validate_dst(dst)
    assert report["stitch_count"] > 0
    # DST cannot encode a colour change before the first stitch
    assert report["color_changes"] == q["color_changes"] - 1
    w = report["bounds_mm"][2] - report["bounds_mm"][0]
    h = report["bounds_mm"][3] - report["bounds_mm"][1]
    assert w <= 85 and h <= 85, "design exceeds requested 80mm size"


def test_stitch_quality(pipeline):
    name, stitches, _ = pipeline
    q = analyze_stitches(stitches)
    print(f"\n[{name}] {q}")
    assert q["too_long"] == 0, "stitches longer than 7mm"
    assert q["too_short"] / max(q["stitches"], 1) < 0.02, "too many <0.3mm stitches"


def test_parse_endpoint_matches_dst(pipeline):
    name, stitches, dst = pipeline
    r = client.post("/api/dst/parse", files={"file": ("x.dst", dst, "application/octet-stream")})
    assert r.status_code == 200
    body = r.json()
    report = validate_dst(dst)
    assert body["stats"]["stitches"] == report["stitch_count"]
    assert body["stats"]["color_blocks"] >= 1
    assert body["stats"]["width_mm"] <= 85


def test_parse_endpoint_rejects_garbage():
    r = client.post("/api/dst/parse", files={"file": ("x.dst", b"not a dst", "application/octet-stream")})
    assert r.status_code == 400
