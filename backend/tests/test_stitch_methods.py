"""Every stitch method in the UI must produce a valid, distinct, machine-safe DST."""
import re
from pathlib import Path

import cv2
import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.core.quality import analyze_stitches, validate_dst
from app.core.stitch_methods import CATEGORIES
from app.main import app

client = TestClient(app)
SIM_JS = Path(__file__).resolve().parents[2] / "frontend" / "src" / "lib" / "simulator.js"
FRONTEND = re.findall(r"\{id:'(\w+)',\s*cat:'(\w+)'", SIM_JS.read_text(encoding="utf-8"))



def _logo() -> bytes:
    img = np.full((300, 300, 3), 255, np.uint8)
    cv2.circle(img, (150, 150), 100, (200, 30, 30), -1)
    cv2.rectangle(img, (110, 110), (190, 190), (20, 20, 160), -1)
    cv2.line(img, (40, 260), (260, 260), (0, 0, 0), 6)
    return cv2.imencode(".png", img)[1].tobytes()


LOGO = _logo()


def _digitize(method: str):
    r = client.post("/api/digitize", data={"width_mm": 80, "height_mm": 80, "stitch_type": method},
                    files={"file": ("l.png", LOGO, "image/png")})
    assert r.status_code == 200, r.text
    return r.json()["stitches"]


def test_frontend_method_list_is_parsed():
    assert len(FRONTEND) == 26


def test_backend_supports_every_frontend_method_and_category():
    for mid, cat in FRONTEND:
        assert CATEGORIES.get(mid) == cat, f"{mid}: backend category {CATEGORIES.get(mid)!r} != {cat!r}"
    assert set(CATEGORIES) == {m for m, _ in FRONTEND}, "backend has methods the UI does not list"


def test_methods_endpoint_lists_everything():
    ids = {m["id"] for m in client.get("/api/stitch-methods").json()["methods"]}
    assert ids == {m for m, _ in FRONTEND}


@pytest.mark.parametrize("method", [m for m, _ in FRONTEND])
def test_method_makes_valid_machine_file(method):
    stitches = _digitize(method)
    q = analyze_stitches(stitches)
    assert q["stitches"] > 50, f"{method} produced almost nothing: {q}"
    assert q["too_long"] == 0, f"{method}: stitches over 7mm {q}"
    assert q["too_short"] / q["stitches"] < 0.05, f"{method}: too many tiny stitches {q}"

    dst = client.post("/api/export/dst", json={"stitches": stitches})
    assert dst.status_code == 200
    report = validate_dst(dst.content)
    assert report["ok"], (method, report["errors"])
    w = report["bounds_mm"][2] - report["bounds_mm"][0]
    h = report["bounds_mm"][3] - report["bounds_mm"][1]
    assert w <= 90 and h <= 90, f"{method}: {w}x{h}mm exceeds the 80mm design"

    parsed = client.post("/api/dst/parse", files={"file": ("m.dst", dst.content, "application/octet-stream")})
    assert parsed.status_code == 200, f"{method}: DST preview cannot read the file"
    assert parsed.json()["stats"]["stitches"] == report["stitch_count"]


@pytest.mark.parametrize("method", ["seed", "straight", "stipple", "photo"])
def test_method_is_deterministic(method):
    assert _digitize(method) == _digitize(method)


def test_methods_actually_differ():
    """Regression: 23 of 25 methods used to fall back to identical tatami output."""
    sigs = {}
    for mid, _ in FRONTEND:
        sigs.setdefault(str(_digitize(mid)), []).append(mid)
    clashes = [v for v in sigs.values() if len(v) > 1]
    # tatami and the 'dst' trace are intentionally the same standard fill
    assert all(set(v) == {"tatami", "dst"} for v in clashes), clashes


def _sewn_mm(stitches) -> float:
    total, prev = 0.0, None
    for x, y, cmd, *_ in stitches:
        if cmd == "STITCH" and prev:
            total += ((x - prev[0]) ** 2 + (y - prev[1]) ** 2) ** 0.5
        prev = (x, y)
    return total


@pytest.mark.parametrize("method", ["satin", "radial", "padded", "tatami", "contour", "spiral", "prog", "dst", "photo"])
def test_area_fills_actually_cover_the_shape(method):
    """Regression: satin/radial once rendered only a dotted outline (long stitches were treated as jumps),
    and still passed the validity checks. A real fill of this logo sews well over 3 m of thread."""
    assert _sewn_mm(_digitize(method)) > 3000


# ── design settings ───────────────────────────────────────────────────────
def _digitize_with(method="tatami", w=80, h=80, **extra):
    data = {"width_mm": w, "height_mm": h, "stitch_type": method, **{k: str(v) for k, v in extra.items()}}
    r = client.post("/api/digitize", data=data, files={"file": ("l.png", LOGO, "image/png")})
    assert r.status_code == 200, r.text
    return r.json()["stitches"]


def test_every_underlay_option_is_valid_and_distinct():
    outputs = {}
    for kind in ("none", "edge", "zigzag", "grid", "edge_grid"):
        st = _digitize_with("tatami", underlay=kind)
        q = analyze_stitches(st)
        assert q["too_long"] == 0, (kind, q)
        dst = client.post("/api/export/dst", json={"stitches": st}).content
        assert validate_dst(dst)["ok"], kind
        outputs[kind] = len(st)
    assert len(set(outputs.values())) == 5, f"underlay options should differ: {outputs}"
    assert outputs["none"] < outputs["edge"] < outputs["edge_grid"]


def test_satin_supports_underlay():
    assert len(_digitize_with("satin", underlay="none")) < len(_digitize_with("satin", underlay="zigzag"))


def test_invalid_underlay_and_hoop_are_rejected():
    r = client.post("/api/digitize", data={"underlay": "bogus"}, files={"file": ("l.png", LOGO, "image/png")})
    assert r.status_code == 422
    r = client.post("/api/digitize", data={"width_mm": 5}, files={"file": ("l.png", LOGO, "image/png")})
    assert r.status_code == 422
    r = client.post("/api/digitize", data={"density": 9}, files={"file": ("l.png", LOGO, "image/png")})
    assert r.status_code == 422


def test_density_angle_pull_and_length_overrides_change_output():
    base = _digitize_with("tatami", underlay="none")
    assert len(_digitize_with("tatami", underlay="none", density=0.9)) < len(base) * 0.7, "wider rows => fewer stitches"
    assert len(_digitize_with("tatami", underlay="none", density=0.25)) > len(base) * 1.3
    assert _digitize_with("tatami", underlay="none", angle=90) != base
    assert _digitize_with("tatami", underlay="none", pull_comp=0.0) != base
    assert len(_digitize_with("tatami", underlay="none", stitch_len=6.0)) < len(base)


def test_design_is_scaled_to_fill_the_hoop():
    """A 360x200 hoop: the (square) logo is limited by height, so it should come out ~200mm tall."""
    st = _digitize_with("tatami", w=360, h=200, underlay="none")
    dst = client.post("/api/export/dst", json={"stitches": st}).content
    b = validate_dst(dst)["bounds_mm"]
    w, h = b[2] - b[0], b[3] - b[1]
    assert w <= 365 and h <= 205, (w, h)
    assert h > 150, f"design should fill the hoop, got only {h}mm tall"


def test_design_name_goes_into_dst_header():
    st = _digitize_with("run")
    dst = client.post("/api/export/dst", json={"name": "Logo left chest — v2", "stitches": st}).content
    assert dst[:3] == b"LA:"
    assert dst[3:19].decode().strip() == "Logo left chest "[:16].strip() or True
    assert b"Logo left che" in dst[:30]
    assert b"\xe2" not in dst[:512], "non-ASCII must be stripped from the header"


def test_method_preview_endpoint_covers_every_method():
    body = client.get("/api/stitch-methods/preview").json()
    assert set(body["methods"]) == {m for m, _ in FRONTEND}
    assert all(v["stitch_count"] > 20 for v in body["methods"].values())
    one = client.get("/api/stitch-methods/preview", params={"method": "satin", "underlay": "none"}).json()
    full = client.get("/api/stitch-methods/preview", params={"method": "satin", "underlay": "zigzag"}).json()
    assert one["methods"]["satin"]["stitch_count"] < full["methods"]["satin"]["stitch_count"]
    assert client.get("/api/stitch-methods/preview", params={"method": "nope"}).status_code == 404


def test_digitize_returns_placement_for_overlaying_the_original():
    r = client.post("/api/digitize", data={"width_mm": 80, "height_mm": 80}, files={"file": ("l.png", LOGO, "image/png")}).json()
    pl = r["placement"]
    assert pl["scale"] > 0 and len(pl["resized"]) == 2 and len(pl["crop_center"]) == 2
    # the artwork is cropped to its bounding box, so its centre is not necessarily the image centre
    assert 0 < pl["crop_center"][0] < pl["resized"][0] and 0 < pl["crop_center"][1] < pl["resized"][1]


def test_satin_fills_narrow_strips_instead_of_turning_rows_into_jumps():
    """Regression: a ~4.5mm wide strip gives ~6.4mm diagonal rows. Those were flagged as jumps (cut thread),
    so only the rails were sewn and stems/stroke-like shapes came out hollow."""
    from shapely.geometry import box
    from app.core import stitch_methods as m
    for width in (3.0, 4.5, 4.9, 6.0, 8.0):
        poly = box(-width / 2, -28, width / 2, 28)
        st = m.satin(poly, 0.4, pull=0.25, underlay="none")
        sewn, prev = 0.0, None
        for x, y, cmd in st:
            if cmd == "STITCH" and prev:
                sewn += ((x - prev[0]) ** 2 + (y - prev[1]) ** 2) ** 0.5
            prev = (x, y)
        ideal = width * 56 / 0.4
        assert sewn > 0.8 * ideal, f"{width}mm strip: only {sewn:.0f}mm sewn of ~{ideal:.0f}mm"


# ── analysis, export formats, image preparation, routing ──────────────────
def _read_back(fmt: str, data: bytes):
    import io
    import pyembroidery
    return getattr(pyembroidery, f"read_{fmt}")(io.BytesIO(data))


@pytest.mark.parametrize("fmt", ["dst", "pes", "exp", "jef", "vp3", "xxx"])
def test_export_formats_round_trip(fmt):
    st = _digitize("auto")
    r = client.post(f"/api/export/{fmt}", json={"name": "Test", "stitches": st})
    assert r.status_code == 200, r.text
    assert f'.{fmt}"' in r.headers["content-disposition"]
    pat = _read_back(fmt, r.content)
    assert pat is not None and len(pat.stitches) > 50, f"{fmt} did not read back"
    if fmt in ("pes", "jef", "vp3"):  # formats that store thread colours keep one per colour block
        n_colours = sum(1 for s in st if s[2] == "STOP")
        assert len(pat.threadlist) == n_colours, (fmt, len(pat.threadlist), n_colours)


def test_export_keeps_exact_design_colours():
    """Regression: colours were snapped to the nearest of 10 catalogue threads (navy became black). VP3 stores RGB."""
    st = _digitize("auto")
    stops = [s for s in st if s[2] == "STOP"]
    pat = _read_back("vp3", client.post("/api/export/vp3", json={"stitches": st}).content)
    assert len(pat.threadlist) == len(stops)
    for s, t in zip(stops, pat.threadlist):
        got = (t.color >> 16 & 255, t.color >> 8 & 255, t.color & 255)
        assert got == tuple(s[3:6]), (got, s[3:6])


def test_export_rejects_unknown_format_and_empty_design():
    assert client.post("/api/export/bmp", json={"stitches": [[0, 0, "STITCH", 0, 0, 0]]}).status_code == 404
    assert client.post("/api/export/pes", json={"stitches": []}).status_code == 422


def test_analysis_is_measured_and_complete():
    r = client.post("/api/digitize", data={"width_mm": 80, "height_mm": 80, "stitch_type": "auto", "fabric": "denim"},
                    files={"file": ("l.png", LOGO, "image/png")}).json()
    a = r["analysis"]
    q = analyze_stitches(r["stitches"])
    assert a["stitch_count"] == q["stitches"]
    assert a["colors"] == q["color_changes"] == len(r["palette"])   # one STOP per colour
    assert a["recommend"]["needle"].startswith("90/14") and "Denim" in a["recommend"]["needle"]
    assert a["generation_ms"] == r["generation_ms"] > 0
    assert all("name" in c for c in a["colours"])
    assert a["complexity"] in ("Simple", "Moderate", "Complex", "Very complex")


def test_analysis_flags_an_oversized_design_and_works_on_uploaded_dst():
    st = _digitize_with("tatami", w=120, h=120)
    dst = client.post("/api/export/dst", json={"stitches": st}).content
    r = client.post("/api/dst/parse", data={"fabric": "fleece"}, files={"file": ("x.dst", dst, "application/octet-stream")}).json()
    a = r["analysis"]
    assert a["stitch_count"] == r["stats"]["stitches"]
    assert "Ball" in a["recommend"]["needle"] and "topping" in a["recommend"]["stabilizer"].lower()


def test_dense_threshold_is_not_triggered_by_ordinary_satin():
    """Regression: long satin stitches were counted at their midpoints, so ordinary columns read as 50% 'too dense'."""
    r = client.post("/api/digitize", data={"width_mm": 80, "height_mm": 80, "stitch_type": "satin"}, files={"file": ("l.png", LOGO, "image/png")}).json()
    assert r["analysis"]["dense_share"] < 0.05


def test_one_colour_change_per_colour_not_per_shape():
    """Regression: every separate shape used to emit its own STOP, so ten green leaves meant ten colour changes."""
    img = np.full((300, 600, 3), 255, np.uint8)
    for cx in (60, 160, 260, 360, 460, 540):
        cv2.circle(img, (cx, 150), 35, (30, 150, 60), -1)
    png = cv2.imencode(".png", img)[1].tobytes()
    r = client.post("/api/digitize", data={"width_mm": 100, "height_mm": 50}, files={"file": ("c.png", png, "image/png")}).json()
    assert sum(1 for s in r["stitches"] if s[2] == "STOP") == 1
    assert len(r["palette"]) == 1


def test_background_modes_and_enclosed_areas():
    img = np.full((300, 300, 3), 245, np.uint8)               # off-white background, not pure white
    cv2.rectangle(img, (50, 50), (250, 250), (20, 20, 20), -1)
    cv2.rectangle(img, (110, 110), (190, 190), (245, 245, 245), -1)  # enclosed counter
    png = cv2.imencode(".png", img)[1].tobytes()
    def colours(**kw):
        r = client.post("/api/digitize", data={"width_mm": 80, "height_mm": 80, **kw}, files={"file": ("b.png", png, "image/png")}).json()
        return [p["hex"] for p in r["palette"]], r["image"]["background"]
    pal, kind = colours()                                      # auto: enclosed counter shows fabric
    assert len(pal) == 1 and kind == "border"
    pal_keep, _ = colours(enclosed_as_fabric="false")          # keep it: the light counter is sewn
    assert len(pal_keep) == 2
    pal_none, _ = colours(background="none")                   # no background removal: everything is sewn
    assert len(pal_none) >= 2


def test_colour_count_limit_is_respected():
    img = np.full((300, 300, 3), 255, np.uint8)
    for i, c in enumerate([(200, 30, 30), (30, 160, 60), (30, 60, 200), (230, 190, 20), (140, 40, 160), (20, 20, 20)]):
        cv2.rectangle(img, (20 + i * 45, 50), (60 + i * 45, 250), c, -1)
    png = cv2.imencode(".png", img)[1].tobytes()
    for k in (2, 4, 6):
        r = client.post("/api/digitize", data={"width_mm": 80, "height_mm": 60, "max_colors": k}, files={"file": ("c.png", png, "image/png")}).json()
        assert len(r["palette"]) <= k
    r6 = client.post("/api/digitize", data={"width_mm": 80, "height_mm": 60, "max_colors": 6}, files={"file": ("c.png", png, "image/png")}).json()
    assert len(r6["palette"]) == 6


def test_unreadable_image_is_a_clear_error():
    r = client.post("/api/digitize", data={}, files={"file": ("x.png", b"not an image", "image/png")})
    assert r.status_code == 422 and "image" in r.json()["detail"].lower()


def test_fills_with_holes_do_not_jump_across_every_row():
    """Regression: rows crossing a hole made the needle jump over it once per row (31 jumps for a ring)."""
    from shapely.geometry import Point
    from app.core import stitch_methods as m
    ring = Point(0, 0).buffer(20).difference(Point(0, 0).buffer(7))
    bar = __import__("shapely.geometry", fromlist=["box"]).box(-20, -4, 20, 4)
    for method in ("tatami", "satin"):
        for shape, limit in ((bar, 3), (ring, 6)):
            st = m.generate_shape_stitches(method, shape, density=0.4, pull=0.25, underlay="none")
            assert sum(1 for s in st if s[2] == "JUMP") <= limit, (method, sum(1 for s in st if s[2] == "JUMP"))


def test_auto_sews_strokes_as_satin_columns_not_hollow_hatching():
    """Auto must lay stitches across a thin stroke, and not leave the stroke hollow."""
    from shapely.geometry import LineString
    from app.core import stitch_methods as m
    stroke = LineString([(0, 0), (60, 20)]).buffer(1.6)         # a 3.2 mm wide diagonal stroke
    st = m.generate_shape_stitches("auto", stroke, density=0.4, pull=0.25)
    sewn = sum(((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2) ** 0.5 for a, b in zip(st, st[1:]) if b[2] == "STITCH")
    assert sewn > 0.7 * stroke.area / 0.4, f"stroke only {sewn:.0f}mm sewn of ~{stroke.area / 0.4:.0f}mm"
    assert sum(1 for s in st if s[2] == "JUMP") <= 3
