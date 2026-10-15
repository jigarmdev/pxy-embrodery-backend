import cv2
import numpy as np
from typing import List, Dict, Tuple, Optional
import json

class DesignAreaDetector:
    def __init__(self):
        # Predefined garment templates and their optimal print areas
        self.garment_templates = {
            "t_shirt": {
                "name": "T-Shirt",
                "main_area_ratio": {"x": 0.30, "y": 0.20, "width": 0.40, "height": 0.45},
                "alternative_areas": [
                    {"x": 0.30, "y": 0.20, "width": 0.15, "height": 0.12, "name": "right_chest"},
                    {"x": 0.55, "y": 0.20, "width": 0.15, "height": 0.12, "name": "left_chest"},
                    {"x": 0.30, "y": 0.65, "width": 0.40, "height": 0.25, "name": "lower_front"}
                ]
            },
            "hoodie": {
                "name": "Hoodie",
                "main_area_ratio": {"x": 0.30, "y": 0.25, "width": 0.40, "height": 0.35},
                "alternative_areas": [
                    {"x": 0.30, "y": 0.25, "width": 0.15, "height": 0.12, "name": "right_chest"},
                    {"x": 0.55, "y": 0.25, "width": 0.15, "height": 0.12, "name": "left_chest"},
                    {"x": 0.35, "y": 0.05, "width": 0.30, "height": 0.15, "name": "hood_area"}
                ]
            },
            "polo": {
                "name": "Polo Shirt",
                "main_area_ratio": {"x": 0.30, "y": 0.25, "width": 0.40, "height": 0.40},
                "alternative_areas": [
                    {"x": 0.30, "y": 0.25, "width": 0.15, "height": 0.12, "name": "right_chest"},
                    {"x": 0.55, "y": 0.25, "width": 0.15, "height": 0.12, "name": "left_chest"}
                ]
            },
            "tank_top": {
                "name": "Tank Top",
                "main_area_ratio": {"x": 0.25, "y": 0.20, "width": 0.50, "height": 0.45},
                "alternative_areas": [
                    {"x": 0.25, "y": 0.65, "width": 0.50, "height": 0.25, "name": "lower_front"}
                ]
            }
        }

    def detect_garment_type(self, image: np.ndarray) -> str:
        """
        Detect the type of garment using computer vision techniques
        """
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Apply edge detection
        edges = cv2.Canny(gray, 50, 150, apertureSize=3)
        
        # Find contours
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        if not contours:
            return "t_shirt"  # Default fallback
        
        # Find the largest contour (assuming it's the garment)
        largest_contour = max(contours, key=cv2.contourArea)
        
        # Calculate aspect ratio and other features
        x, y, w, h = cv2.boundingRect(largest_contour)
        aspect_ratio = w / h if h > 0 else 1
        
        # Calculate contour area ratio
        contour_area = cv2.contourArea(largest_contour)
        bounding_area = w * h
        area_ratio = contour_area / bounding_area if bounding_area > 0 else 0
        
        # Simple heuristic classification
        if aspect_ratio > 1.2:
            return "hoodie"
        elif aspect_ratio < 0.8:
            return "tank_top"
        elif area_ratio > 0.7:
            return "t_shirt"
        else:
            return "polo"

    def detect_fabric_region(self, image: np.ndarray) -> Optional[Tuple[int, int, int, int]]:
        """
        Detect the main fabric region of the garment using deep learning (rembg)
        """
        try:
            from rembg import remove, new_session  # lazy: heavy optional dependency
            # Convert BGR (OpenCV default) to RGB for the neural network
            rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            
            # Use u2netp (4.7MB) instead of default (1GB) to prevent slow timeouts
            session = new_session("u2netp")
            # rembg removes the background and returns a BGRA image
            output = remove(rgb_image, session=session)
            
            # Extract the alpha channel as the mask
            if len(output.shape) == 3 and output.shape[2] == 4:
                mask = output[:, :, 3]
            else:
                return None
                
            # Clean up the mask slightly
            kernel = np.ones((5, 5), np.uint8)
            mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
            
            # Find contours
            contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            if not contours:
                return None
            
            # Find the largest contour which should be the garment
            largest_contour = max(contours, key=cv2.contourArea)
            
            # Get bounding rectangle
            return cv2.boundingRect(largest_contour)
        except Exception:
            return None

    def find_dynamic_plain_area(self, image: np.ndarray, fabric_region: Tuple[int, int, int, int]) -> Dict[str, int]:
        """
        Dynamically finds the largest vertical segment in the center of the garment 
        that is free of heavy horizontal edges (like pockets, collars, and hems).
        """
        fx, fy, fw, fh = fabric_region
        
        # Define central region of interest (ROI) where prints typically go (middle 40%)
        roi_x = fx + int(fw * 0.30)
        roi_w = int(fw * 0.40)
        
        # Restrict the vertical search to avoid the very top (hoods/necks) and bottom (hems)
        top_margin = int(fh * 0.20)
        bottom_margin = int(fh * 0.10)
        roi_y = fy + top_margin
        roi_h = fh - top_margin - bottom_margin
        
        if roi_h <= 0 or roi_w <= 0:
            return {"x": roi_x, "y": fy + int(fh * 0.2), "width": roi_w, "height": int(fh * 0.35)}
        
        # Crop to the central column
        roi_image = image[roi_y:roi_y+roi_h, roi_x:roi_x+roi_w]
        
        # Convert to grayscale
        gray = cv2.cvtColor(roi_image, cv2.COLOR_BGR2GRAY)
        
        # Apply Sobel operator in the Y direction to find HORIZONTAL edges (pockets, seams)
        # This ignores vertical edges like zippers
        sobel_y = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
        abs_sobel_y = np.absolute(sobel_y)
        
        # Normalize to 0-255 safely
        max_val = np.max(abs_sobel_y)
        if max_val > 0:
            sobel_8u = np.uint8(255 * abs_sobel_y / max_val)
        else:
            sobel_8u = np.zeros_like(abs_sobel_y, dtype=np.uint8)
        
        # Threshold to get strong horizontal edges
        _, edges = cv2.threshold(sobel_8u, 50, 255, cv2.THRESH_BINARY)
        
        # Project edges horizontally to find vertical bands of horizontal seams
        horizontal_projection = np.sum(edges, axis=1)
        
        # Smooth projection
        kernel_size = max(1, int(fh * 0.03))
        smoothed = np.convolve(horizontal_projection, np.ones(kernel_size)/kernel_size, mode='same')
        
        # Consider a row "plain" if horizontal edge density is very low
        threshold = roi_w * 255 * 0.05
        is_plain = smoothed < threshold
        
        # Find the longest continuous sequence of plain rows
        best_start, best_length = 0, 0
        current_start, current_length = 0, 0
        
        for i in range(len(is_plain)):
            if is_plain[i]:
                if current_length == 0:
                    current_start = i
                current_length += 1
            else:
                if current_length > best_length:
                    best_length = current_length
                    best_start = current_start
                current_length = 0
                
        if current_length > best_length:
            best_length = current_length
            best_start = current_start
            
        # Add safety margins inside the detected plain area (5%)
        margin = int(best_length * 0.05)
        final_h = max(10, best_length - 2 * margin)
        final_y = roi_y + best_start + margin
        
        # If the detected area is too small, fallback
        if final_h < fh * 0.15:
            return {
                "x": roi_x,
                "y": fy + int(fh * 0.25),
                "width": roi_w,
                "height": int(fh * 0.30)
            }
            
        return {
            "x": roi_x,
            "y": final_y,
            "width": roi_w,
            "height": final_h
        }

    def calculate_design_areas(self, image: np.ndarray, garment_type: str) -> Dict:
        """
        Calculate optimal design areas based on garment type and image dimensions
        """
        height, width = image.shape[:2]
        
        # Get garment template
        template = self.garment_templates.get(garment_type, self.garment_templates["t_shirt"])
        
        # Detect actual fabric region
        fabric_region = self.detect_fabric_region(image)
        
        if fabric_region:
            fx, fy, fw, fh = fabric_region
            # Use detected region as base for calculations
            base_x, base_y, base_w, base_h = fx, fy, fw, fh
            # Calculate dynamic plain area for main design
            main_design_area = self.find_dynamic_plain_area(image, fabric_region)
        else:
            # Fallback to full image dimensions
            base_x, base_y, base_w, base_h = 0, 0, width, height
            # Calculate main design area from fallback template
            main_area = template["main_area_ratio"]
            main_design_area = {
                "x": int(base_x + base_w * main_area["x"]),
                "y": int(base_y + base_h * main_area["y"]),
                "width": int(base_w * main_area["width"]),
                "height": int(base_h * main_area["height"])
            }
        
        # Calculate alternative areas
        alternative_areas = []
        for alt_area in template["alternative_areas"]:
            area = {
                "x": int(base_x + base_w * alt_area["x"]),
                "y": int(base_y + base_h * alt_area["y"]),
                "width": int(base_w * alt_area["width"]),
                "height": int(base_h * alt_area["height"]),
                "name": alt_area["name"]
            }
            alternative_areas.append(area)
        
        # Helper function to check if two rectangles overlap
        def is_overlap(r1, r2):
            if r1["x"] >= r2["x"] + r2["width"] or r2["x"] >= r1["x"] + r1["width"]:
                return False
            if r1["y"] >= r2["y"] + r2["height"] or r2["y"] >= r1["y"] + r1["height"]:
                return False
            return True

        # Filter alternative areas to ensure they do NOT overlap with the main area
        # or with each other. This guarantees a clean UI with no intersecting boxes,
        # while keeping at least 1 good design area (the main one).
        non_overlapping_alt_areas = []
        for alt in alternative_areas:
            overlaps_main = is_overlap(main_design_area, alt)
            overlaps_existing = any(is_overlap(existing, alt) for existing in non_overlapping_alt_areas)
            
            if not overlaps_main and not overlaps_existing:
                non_overlapping_alt_areas.append(alt)
        
        return {
            "imageSize": {"width": width, "height": height},
            "designArea": main_design_area,
            "garmentType": template["name"],
            "printableAreas": non_overlapping_alt_areas,
            "detectedFabricRegion": {
                "x": base_x, "y": base_y, "width": base_w, "height": base_h
            } if fabric_region else None
        }

    def process_image(self, image_path: str) -> Dict:
        """
        Main function to process an image and return design area information
        """
        # Load image
        image = cv2.imread(image_path)
        if image is None:
            raise ValueError("Could not load image")
        
        # Detect garment type
        garment_type = self.detect_garment_type(image)
        
        # Calculate design areas
        result = self.calculate_design_areas(image, garment_type)
        
        return result

    def process_image_array(self, image_array: np.ndarray) -> Dict:
        """
        Process image from numpy array
        """
        # Detect garment type
        garment_type = self.detect_garment_type(image_array)
        
        # Calculate design areas
        result = self.calculate_design_areas(image_array, garment_type)
        
        return result