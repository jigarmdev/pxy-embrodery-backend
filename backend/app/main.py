from fastapi import FastAPI, UploadFile, File, Form, Response, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.stitch_engine import StitchEngine
from app.core.estimator import EmbroideryEstimator
from app.core.dst_writer import DSTWriter
from app.core.finishing import finish_stitches
from app.core.stitch_methods import generate_shape_stitches, CATEGORIES, UNDERLAYS
from app.core.image_prep import prepare_image, ImageError, BACKGROUNDS
from app.core.analysis import analyze, blocks_from_flat
import math
import time
from typing import Optional
from functools import lru_cache
from shapely.geometry import Point
from shapely import affinity
from app.core.quality import parse_dst
from app.core.design_detector import DesignAreaDetector
from shapely.geometry import box, Polygon
import json
import numpy as np
import cv2
import io
import os
import uuid
import shutil
from pathlib import Path
from PIL import Image

app = FastAPI(title="pxy888 Embroidery CAD/CAM API", version="1.0.0")

# ── Product images folder (served as static) ──────────────────────────────
# Resolve relative to this file so it works from any cwd
BASE_DIR     = Path(__file__).resolve().parent.parent.parent  # repo root
PRODUCTS_DIR = BASE_DIR / "frontend" / "public" / "images" / "products"
PRODUCTS_DIR.mkdir(parents=True, exist_ok=True)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"status": "ok", "message": "pxy888 Embroidery CAD/CAM API is running. Use /docs to view the API documentation."}

@app.get("/api/stitch-methods")
async def stitch_methods():
    """Every stitch method the digitizer supports, with its category."""
    return {"methods": [{"id": k, "category": v} for k, v in CATEGORIES.items()]}

def _clean_ring(cnt) -> list:
    """Pixel-chain contour -> smooth outline: a short moving average removes the stair-steps, then Douglas-Peucker thins it."""
    pts = cnt.reshape(-1, 2).astype(np.float64)
    n = len(pts)
    if n >= 12:
        k = 2
        ext = np.concatenate([pts[-k:], pts, pts[:k]])
        pts = np.stack([np.convolve(ext[:, i], np.ones(2 * k + 1) / (2 * k + 1), mode="valid") for i in range(2)], axis=1)
    approx = cv2.approxPolyDP(pts.astype(np.float32).reshape(-1, 1, 2), 0.35, True)
    return [tuple(map(float, p)) for p in approx.reshape(-1, 2)]


def _order_shapes(shapes, start):
    """Greedy nearest-neighbour order of shapes (each a stitch list) so the needle travels as little as possible."""
    pending = list(shapes)
    cur = start
    out = []
    while pending:
        i = min(range(len(pending)), key=lambda k: math.hypot(pending[k][0][0] - cur[0], pending[k][0][1] - cur[1]))
        s = pending.pop(i)
        out.append(s)
        cur = s[-1][:2]
    return out


# ── real-life stitch method previews ──────────────────────────────────────
def _sample_shape():
    """A 38 x 26 mm ring with a crossbar: shows fill, edge behaviour, a hole and a thin stroke for every method."""
    outer = affinity.scale(Point(0, 0).buffer(1.0, 48), 19.0, 13.0)
    inner = affinity.scale(Point(0, 0).buffer(1.0, 32), 7.0, 4.5)
    bar = box(-9.0, -1.4, 9.0, 1.4)   # a thin crossbar: shows how Auto sews strokes (satin column) next to the solid ring
    return outer.difference(inner).union(bar)


@lru_cache(maxsize=256)
def _method_preview(method: str, density: float, pull: float, underlay: str, angle: Optional[float], stitch_len: Optional[float]):
    stitches = generate_shape_stitches(method, _sample_shape(), density=density, pull=pull, rgb=(150, 60, 60),
                                       underlay=underlay, angle=angle, stitch_len=stitch_len)
    pts = [[round(x, 2), round(y, 2), 1 if c == "JUMP" else 0] for x, y, c in stitches]
    return {"stitches": pts, "stitch_count": sum(1 for p in pts if p[2] == 0)}


@app.get("/api/stitch-methods/preview")
def stitch_method_preview(
    method: Optional[str] = None,
    density: float = 0.4,
    pull_comp: float = 0.25,
    underlay: str = "auto",
    angle: Optional[float] = None,
    stitch_len: Optional[float] = None,
):
    """Stitches for a sample shape, made by the real generators, so the UI can show what each
    stitch method actually looks like. Omit `method` to get all of them."""
    if underlay not in UNDERLAYS:
        raise HTTPException(status_code=422, detail=f"underlay must be one of {', '.join(UNDERLAYS)}")
    if method is not None and method.lower() not in CATEGORIES:
        raise HTTPException(status_code=404, detail="unknown stitch method")
    density = min(2.0, max(0.2, density))
    pull_comp = min(1.0, max(0.0, pull_comp))
    ids = [method.lower()] if method else list(CATEGORIES)
    return {
        "sample_mm": [38, 26],
        "methods": {m: _method_preview(m, round(density, 2), round(pull_comp, 2), underlay, angle, stitch_len) for m in ids},
    }

@app.post("/api/digitize")
async def digitize_sample_shape(
    width_mm: float = Form(80.0),
    height_mm: float = Form(80.0),
    stitch_type: str = Form("Tatami"),
    fabric: str = Form("cotton"),
    underlay: str = Form("auto"),
    pull_comp: Optional[float] = Form(None, ge=0.0, le=1.0),
    density: Optional[float] = Form(None, ge=0.2, le=2.0),
    angle: Optional[float] = Form(None, ge=0.0, le=180.0),
    stitch_len: Optional[float] = Form(None, ge=1.0, le=7.0),
    fit_content: bool = Form(True),
    max_colors: int = Form(8, ge=1, le=16),
    background: str = Form("auto"),
    enclosed_as_fabric: bool = Form(True),
    min_area_mm2: float = Form(1.0, ge=0.0, le=50.0),
    file: UploadFile = File(None)
):
    """Digitize an image. width_mm x height_mm is the hoop: the design is scaled to fill it.
    pull_comp / density / angle / stitch_len override the fabric profile when given."""
    if not (10.0 <= width_mm <= 1000.0 and 10.0 <= height_mm <= 1000.0):
        raise HTTPException(status_code=422, detail="width_mm and height_mm must be between 10 and 1000")
    if underlay not in UNDERLAYS:
        raise HTTPException(status_code=422, detail=f"underlay must be one of {', '.join(UNDERLAYS)}")
    if background not in BACKGROUNDS:
        raise HTTPException(status_code=422, detail=f"background must be one of {', '.join(BACKGROUNDS)}")
    started = time.perf_counter()
    fabric_profiles = {
        "cotton": {"pull_comp": 0.25, "density": 0.40},
        "denim": {"pull_comp": 0.20, "density": 0.42},
        "fleece": {"pull_comp": 0.40, "density": 0.36},
        "leather": {"pull_comp": 0.15, "density": 0.45},
        "silk": {"pull_comp": 0.30, "density": 0.45},
        "default": {"pull_comp": 0.20, "density": 0.40}
    }
    prof = dict(fabric_profiles.get(fabric.lower(), fabric_profiles["default"]))
    if pull_comp is not None:
        prof["pull_comp"] = pull_comp
    if density is not None:
        prof["density"] = density
    opts = dict(underlay=underlay, angle=angle, stitch_len=stitch_len)
    
    all_stitches = []
    palette = []
    prep_info = {}
    rw = rh = 0
    crop_cx = crop_cy = 0.0
    scale = 1.0

    if file:
        contents = await file.read()
        if len(contents) > 15 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="Image is larger than 15 MB")
        try:
            prep = prepare_image(contents, max_colors=max_colors, background=background, enclosed_as_fabric=enclosed_as_fabric)
        except ImageError as e:
            raise HTTPException(status_code=422, detail=str(e))

        labels = prep.labels
        rw, rh = prep.size
        crop_cx, crop_cy = rw / 2.0, rh / 2.0
        if fit_content:
            # Scale the artwork itself to the hoop, not the whole canvas: crop to the artwork's bounding box
            ys, xs = np.where(labels >= 0)
            pad = 2
            x0, x1 = max(int(xs.min()) - pad, 0), min(int(xs.max()) + 1 + pad, rw)
            y0, y1 = max(int(ys.min()) - pad, 0), min(int(ys.max()) + 1 + pad, rh)
            labels = labels[y0:y1, x0:x1]
            crop_cx, crop_cy = (x0 + x1) / 2.0, (y0 + y1) / 2.0
        h, w_img = labels.shape
        scale = min(width_mm / max(w_img, 1), height_mm / max(h, 1))
        min_px = min_area_mm2 / (scale * scale)       # specks smaller than this are noise, not detail
        min_hole_px = 0.25 / (scale * scale)

        to_mm = lambda pts: [((x - w_img / 2) * scale, -((y - h / 2) * scale)) for x, y in pts]
        cursor = (0.0, 0.0)
        # biggest colour first: it is usually the base layer, details are sewn on top
        for ci in sorted(range(len(prep.colors)), key=lambda i: -prep.shares[i]):
            r, g, b = (int(v) for v in prep.colors[ci])
            mask = (labels == ci).astype(np.uint8) * 255
            contours, hierarchy = cv2.findContours(mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
            if not contours or hierarchy is None:
                continue
            hierarchy = hierarchy[0]
            shapes = []
            for i, cnt in enumerate(contours):
                if hierarchy[i][3] != -1:            # a hole: it is attached to its parent below
                    continue
                if cv2.contourArea(cnt) < min_px or len(cnt) < 3:
                    continue
                exterior = _clean_ring(cnt)
                if len(exterior) < 3:
                    continue
                interiors = []
                child = hierarchy[i][2]
                while child != -1:
                    if cv2.contourArea(contours[child]) >= min_hole_px:
                        hole = _clean_ring(contours[child])
                        if len(hole) >= 3:
                            interiors.append(to_mm(hole))
                    child = hierarchy[child][0]
                poly = Polygon(to_mm(exterior), interiors)
                if not poly.is_valid:
                    poly = poly.buffer(0)
                if poly.is_empty:
                    continue
                stitches = generate_shape_stitches(stitch_type, poly, density=prof["density"], pull=prof["pull_comp"], rgb=(r, g, b), **opts)
                if stitches:
                    shapes.append(stitches)
            if not shapes:
                continue
            block = []
            for st in _order_shapes(shapes, cursor):   # nearest next shape: fewer and shorter jumps
                block.extend(st)
            cursor = block[-1][:2]
            # one colour change per colour, however many shapes it has
            all_stitches.append((block[0][0], block[0][1], 'JUMP', r, g, b))
            all_stitches.append((block[0][0], block[0][1], 'STOP', r, g, b))
            all_stitches.extend((sx, sy, cmd, r, g, b) for sx, sy, cmd in block)
            palette.append({"hex": f"#{r:02x}{g:02x}{b:02x}", "rgb": [r, g, b], "share": round(prep.shares[ci], 4)})
        prep_info = {"background": prep.background, "colors_found": len(prep.colors)}

    if not all_stitches:
        # Fallback to a basic square if no image
        poly = box(-width_mm/2, -height_mm/2, width_mm/2, height_mm/2)
        all_stitches = [(sx, sy, cmd, 0, 0, 0) for sx, sy, cmd in generate_shape_stitches(stitch_type, poly, prof["density"], prof["pull_comp"], **opts)]

    metrics = EmbroideryEstimator.calculate_metrics([s[:3] for s in all_stitches])

    # Where the source image sits in design space, so a client can overlay the original on the stitches:
    # a pixel (u, v) of the image resized to `resized` lands at ((u - crop_center_x) * scale, -(v - crop_center_y) * scale) mm.
    placement = None
    if file:
        placement = {"scale": scale, "resized": [rw, rh], "crop_center": [crop_cx, crop_cy]}

    gen_ms = round((time.perf_counter() - started) * 1000)
    return {
        "stitches": all_stitches,
        "metrics": metrics,
        "placement": placement,
        "palette": palette,
        "image": prep_info,
        "generation_ms": gen_ms,
        "analysis": analyze(blocks_from_flat(all_stitches), fabric=fabric.lower(), hoop={"w": width_mm, "h": height_mm}, generation_ms=gen_ms),
    }

from pydantic import BaseModel
from typing import List, Tuple, Union, Any, Optional
import pyembroidery
from app.core.thread_mapper import map_to_closest_thread, nearest_named

class DSTRequest(BaseModel):
    name: Optional[str] = None
    stitches: List[Any]



EXPORT_FORMATS = {
    "dst": pyembroidery.write_dst, "pes": pyembroidery.write_pes, "exp": pyembroidery.write_exp,
    "jef": pyembroidery.write_jef, "vp3": pyembroidery.write_vp3, "xxx": pyembroidery.write_xxx,
}


def _build_pattern(req: "DSTRequest") -> pyembroidery.EmbPattern:
    pattern = pyembroidery.EmbPattern()
    # DST header label (LA:) is 16 chars of printable ASCII
    label = "".join(ch for ch in (req.name or "") if 32 <= ord(ch) < 127).strip()[:16]
    if label:
        pattern.extras["name"] = label

    started = False  # a colour change before the first stitch would shift every colour by one in formats that store them
    for s in req.stitches:
        if len(s) < 3:
            continue
        x = float(s[0]) if s[0] is not None else 0.0
        y = float(s[1]) if s[1] is not None else 0.0
        cmd = str(s[2])
        px, py = x * 10.0, y * 10.0   # machine units are 0.1 mm
        if cmd == "STITCH":
            started = True
            pattern.add_stitch_absolute(cmd=pyembroidery.STITCH, x=px, y=py)
        elif cmd == "JUMP":
            pattern.add_stitch_absolute(cmd=pyembroidery.JUMP, x=px, y=py)
        elif cmd == "STOP":
            if started:
                pattern.add_stitch_absolute(cmd=pyembroidery.COLOR_CHANGE, x=px, y=py)
            if len(s) == 6 and s[3] is not None:
                rgb = (int(s[3]), int(s[4]), int(s[5]))
                near_name, _ = nearest_named(f"#{rgb[0]:02x}{rgb[1]:02x}{rgb[2]:02x}")
                t = pyembroidery.EmbThread()
                t.color = (rgb[0] << 16) | (rgb[1] << 8) | rgb[2]   # exact design colour, not a snapped catalogue colour
                t.description = near_name
                pattern.add_thread(t)
    pattern.add_stitch_absolute(cmd=pyembroidery.END, x=0, y=0)
    return pattern


@app.post("/api/export/{fmt}")
async def export_design(fmt: str, req: DSTRequest):
    """Write the design as a machine file. DST is universal; PES (Brother/Baby Lock), JEF (Janome), EXP (Melco),
    VP3 (Husqvarna/Pfaff) and XXX (Singer) also carry the thread colours."""
    fmt = fmt.lower()
    writer = EXPORT_FORMATS.get(fmt)
    if writer is None:
        raise HTTPException(status_code=404, detail=f"Unknown format '{fmt}'. Use one of: {', '.join(EXPORT_FORMATS)}")
    if not any(len(s) >= 3 and s[2] == "STITCH" for s in req.stitches):
        raise HTTPException(status_code=422, detail="Nothing to export: the design has no stitches")
    pattern = _build_pattern(req)
    buf = io.BytesIO()
    try:
        writer(pattern, buf)
    except Exception as e:  # a format-specific limit (e.g. too many colours) should be a clear message, not a 500
        raise HTTPException(status_code=422, detail=f"Could not write {fmt.upper()}: {e}")
    safe = "".join(ch if ch.isalnum() or ch in "-_." else "_" for ch in (req.name or "embroidery_pxy888").strip()) or "embroidery_pxy888"
    return Response(
        content=buf.getvalue(),
        media_type="application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{safe}.{fmt}"'},
    )


@app.post("/api/export/dst")
async def export_dst_legacy(req: DSTRequest):
    """Direct alias for /api/export/dst for complete backwards-compatibility."""
    return await export_design("dst", req)



@app.post("/api/dst/parse")
async def parse_dst_file(file: UploadFile = File(...), fabric: str = Form("cotton")):
    """Decode a real .dst file (with pyembroidery) so the frontend can preview exactly what a machine will sew."""
    data = await file.read()
    if len(data) > 20 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="DST file too large")
    try:
        result = parse_dst(data, file.filename or "design.dst")
    except Exception:
        raise HTTPException(status_code=400, detail="Could not read this file as a DST embroidery file")
    result["name"] = file.filename or "design.dst"
    result["analysis"] = analyze([{"color": None, "stitches": b["stitches"]} for b in result["blocks"]], fabric=fabric.lower())
    return result

@app.post("/api/detect-design-area")
async def detect_design_area(file: UploadFile = File(...)):
    """
    Detect design areas on garment images using computer vision.
    Also saves the uploaded image to frontend/public/images/products/
    and returns its public URL path.
    """
    try:
        # Validate file type
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")

        # Read image bytes once
        contents = await file.read()

        # ── Save to products folder ───────────────────────────────────────
        ext       = Path(file.filename or "upload.jpg").suffix.lower() or ".jpg"
        safe_name = f"{uuid.uuid4().hex}{ext}"
        save_path = PRODUCTS_DIR / safe_name

        with open(save_path, "wb") as f:
            f.write(contents)

        saved_url = f"/images/products/{safe_name}"

        # ── CV detection ─────────────────────────────────────────────────
        pil_image = Image.open(io.BytesIO(contents))
        if pil_image.mode != 'RGB':
            pil_image = pil_image.convert('RGB')

        image_array = np.array(pil_image)
        image_array = cv2.cvtColor(image_array, cv2.COLOR_RGB2BGR)

        detector = DesignAreaDetector()
        result   = detector.process_image_array(image_array)

        # Attach the saved path so the frontend can display it
        result["savedImageUrl"] = saved_url
        result["savedImageName"] = safe_name

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")

@app.get("/api/garment-templates")
async def get_garment_templates():
    """
    Get available garment templates and their design area configurations
    """
    detector = DesignAreaDetector()
    return {
        "templates": detector.garment_templates
    }

@app.get("/api/product-images")
async def list_product_images():
    """
    List all saved product images from frontend/public/images/products/
    """
    allowed = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
    images = []
    for p in sorted(PRODUCTS_DIR.iterdir(), key=lambda x: x.stat().st_mtime, reverse=True):
        if p.suffix.lower() in allowed:
            images.append({
                "name": p.name,
                "url":  f"/images/products/{p.name}",
                "size": p.stat().st_size,
                "modified": p.stat().st_mtime,
            })
    return {"images": images}

@app.delete("/api/product-images/{filename}")
async def delete_product_image(filename: str):
    """
    Delete a saved product image
    """
    # Prevent path traversal
    safe = Path(filename).name
    target = PRODUCTS_DIR / safe
    if not target.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    target.unlink()
    return {"deleted": safe}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
