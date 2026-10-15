import cv2
import numpy as np

img = np.zeros((10, 10, 4), dtype=np.uint8)
img[:, :, 3] = 255 # solid
img[0, 0, 3] = 0 # transparent

# How to use kmeans with alpha?
# Best way is to just apply a mask and only cluster non-transparent pixels.
