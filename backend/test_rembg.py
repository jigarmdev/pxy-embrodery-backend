import cv2
import numpy as np
from app.core.design_detector import DesignAreaDetector

img = np.zeros((100, 100, 3), dtype=np.uint8)
detector = DesignAreaDetector()
detector.process_image_array(img)
print("SUCCESS")
