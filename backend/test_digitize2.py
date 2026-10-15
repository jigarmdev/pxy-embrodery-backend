import asyncio
from shapely.geometry import Polygon
from app.core.stitch_engine import StitchEngine

# Self intersecting polygon
points = [(0,0), (10,10), (10,0), (0,10)]
poly = Polygon(points)
poly = poly.buffer(0) # Returns MultiPolygon
print(type(poly))

try:
    StitchEngine.generate_contour_satin(poly)
    print("Success")
except Exception as e:
    import traceback
    traceback.print_exc()
