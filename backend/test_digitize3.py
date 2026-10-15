import asyncio
from shapely.geometry import Polygon, MultiPolygon
from app.core.stitch_engine import StitchEngine

poly1 = Polygon([(0,0), (10,0), (10,10), (0,10)])
poly2 = Polygon([(20,20), (30,20), (30,30), (20,30)])
mpoly = MultiPolygon([poly1, poly2])

try:
    StitchEngine.generate_contour_satin(mpoly)
    print("Success")
except Exception as e:
    import traceback
    traceback.print_exc()
