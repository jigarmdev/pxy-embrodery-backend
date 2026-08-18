from fastapi import FastAPI, UploadFile, File, Form, Response
from fastapi.middleware.cors import CORSMiddleware
from app.core.stitch_engine import StitchEngine
from app.core.estimator import EmbroideryEstimator
from app.core.dst_writer import DSTWriter
from shapely.geometry import box, Polygon
import json
import numpy as np
import cv2

app = FastAPI(title="pxy888 Embroidery CAD/CAM API", version="1.0.0")

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


@app.post("/api/digitize")
async def digitize_sample_shape(
    width_mm: float = Form(80.0),
    height_mm: float = Form(80.0),
    stitch_type: str = Form("Tatami"),
    fabric: str = Form("cotton"),
    file: UploadFile = File(None)
):
    fabric_profiles = {
        "cotton": {"pull_comp": 0.25, "density": 0.40},
        "denim": {"pull_comp": 0.20, "density": 0.42},
        "fleece": {"pull_comp": 0.40, "density": 0.36},
        "leather": {"pull_comp": 0.15, "density": 0.45},
        "silk": {"pull_comp": 0.30, "density": 0.45},
        "default": {"pull_comp": 0.20, "density": 0.40}
    }
    prof = fabric_profiles.get(fabric.lower(), fabric_profiles["default"])
    
    poly = None
    if file:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE)
        
        # Binarize and find contours
        _, thresh = cv2.threshold(img, 127, 255, cv2.THRESH_BINARY_INV)
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        if contours:
            largest_contour = max(contours, key=cv2.contourArea)
            x, y, w, h = cv2.boundingRect(largest_contour)
            
            # Normalize points to mm coordinates centered at 0,0
            scale_x = width_mm / max(w, 1)
            scale_y = height_mm / max(h, 1)
            scale = min(scale_x, scale_y)
            
            points = []
            for pt in largest_contour:
                px = (pt[0][0] - x - w/2) * scale
                py = (pt[0][1] - y - h/2) * scale
                points.append((px, -py))
                
            if len(points) >= 3:
                poly = Polygon(points)
                
    if poly is None:
        poly = box(-width_mm/2, -height_mm/2, width_mm/2, height_mm/2)

    if not poly.is_valid:
        poly = poly.buffer(0)

    underlay = StitchEngine.generate_underlay_grid(poly, top_angle_deg=45.0)
    top_stitches = StitchEngine.generate_tatami_fill(poly, angle_deg=45.0, row_spacing_mm=prof["density"], pull_comp_mm=prof["pull_comp"])

    all_stitches = underlay + top_stitches
    metrics = EmbroideryEstimator.calculate_metrics(all_stitches)

    return {
        "stitches": all_stitches,
        "metrics": metrics
    }

from pydantic import BaseModel
from typing import List, Tuple

class DSTRequest(BaseModel):
    stitches: List[Tuple[float, float, str]]

@app.post("/api/export/dst")
async def export_dst(req: DSTRequest):
    valid_stitches = []
    for s in req.stitches:
        if s[0] is not None and s[1] is not None:
            valid_stitches.append((float(s[0]), float(s[1]), str(s[2])))
            
    dst_binary = DSTWriter.write_dst(valid_stitches, design_name="PXY888")

    return Response(
        content=dst_binary,
        media_type="application/octet-stream",
        headers={"Content-Disposition": "attachment; filename=embroidery_pxy888.dst"}
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
