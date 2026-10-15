import asyncio
import cv2
import numpy as np
from PIL import Image
import io
from app.main import digitize_sample_shape

async def run():
    # Create a dummy test image
    img = np.zeros((100, 100, 3), dtype=np.uint8)
    cv2.circle(img, (50, 50), 30, (255, 0, 0), -1)
    is_success, buffer = cv2.imencode(".jpg", img)
    io_buf = io.BytesIO(buffer)
    
    class MockFile:
        async def read(self):
            return io_buf.getvalue()
            
    try:
        res = await digitize_sample_shape(80, 80, "Satin", "cotton", MockFile())
        print("Success! Stitches:", len(res["stitches"]))
    except Exception as e:
        import traceback
        traceback.print_exc()

asyncio.run(run())
