# Image verification with YOLOv8 (lazy loading to avoid startup crashes)
import cv2
import numpy as np
from PIL import Image
import io
import base64

# Lazy load YOLO to prevent import errors on startup
_yolo_model = None
_yolo_available = None

def get_yolo_model():
    """Lazy load YOLO model"""
    global _yolo_model, _yolo_available
    
    if _yolo_available is False:
        return None
    
    if _yolo_model is None:
        try:
            from ultralytics import YOLO
            _yolo_model = YOLO('yolov8n.pt')  # Download model on first use
            _yolo_available = True
            print("✅ YOLOv8 loaded successfully")
        except Exception as e:
            print(f"⚠️ YOLOv8 unavailable: {str(e)}")
            print("   Using basic CV detection instead")
            _yolo_available = False
            _yolo_model = None
    
    return _yolo_model

GARBAGE_CLASSES = [
    'bottle', 'cup', 'trash', 'waste', 'garbage',
    'can', 'box', 'paper', 'cardboard', 'package', 'debris',
    'plastic', 'bag'
]

def basic_garbage_detection(image_array):
    """Fallback garbage detection using basic CV techniques"""
    try:
        # Convert to grayscale
        gray = cv2.cvtColor(image_array, cv2.COLOR_RGB2GRAY)
        
        # Check for clutter/mess indicators
        # 1. High edge density (messy areas have more edges)
        edges = cv2.Canny(gray, 50, 150)
        edge_density = np.sum(edges > 0) / edges.size
        
        # 2. Color variance (garbage often has varied colors)
        color_variance = np.var(image_array)
        
        # 3. Texture complexity
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        
        # Simple heuristic: if image has high complexity, likely garbage
        is_garbage = edge_density > 0.1 or color_variance > 2000 or laplacian_var > 100
        confidence = min(0.85, (edge_density * 5 + color_variance / 5000 + laplacian_var / 200))
        
        return is_garbage, confidence
    except:
        return True, 0.5  # Default to accepting image

async def verify_garbage_image(image_base64: str) -> dict:
    """
    Verify if image contains garbage/waste
    Uses YOLOv8 if available, otherwise falls back to basic CV
    """
    try:
        # Reject obvious URL inputs that cannot be decoded
        if image_base64.startswith("http"):
            raise ValueError("Expected base64 image data, received a URL instead")

        # Handle data URI strings (e.g., "data:image/jpeg;base64,...")
        if ',' in image_base64 and 'base64' in image_base64.split(',')[0]:
            image_base64 = image_base64.split(',')[1]

        # Decode base64 image
        image_data = base64.b64decode(image_base64)
        image = Image.open(io.BytesIO(image_data))
        image_array = np.array(image)
        
        # Try YOLOv8 first
        model = get_yolo_model()
        
        if model is not None:
            try:
                # Run YOLO detection
                results = model(image_array, verbose=False)
                
                # Check for garbage-related objects
                detections = results[0]
                garbage_detected = False
                max_confidence = 0
                detected_items = []
                
                if detections.boxes:
                    for box in detections.boxes:
                        class_id = int(box.cls[0])
                        confidence = float(box.conf[0])
                        class_name = model.names[class_id].lower()
                        
                        # Check if detected object is garbage-related
                        if any(garbage_word in class_name for garbage_word in GARBAGE_CLASSES):
                            garbage_detected = True
                            max_confidence = max(max_confidence, confidence)
                            detected_items.append({
                                'item': class_name,
                                'confidence': round(confidence, 2)
                            })
                
                if garbage_detected:
                    return {
                        'is_garbage': bool(True),
                        'confidence': float(max_confidence),
                        'detected_items': detected_items,
                        'message': f'Garbage detected: {", ".join([d["item"] for d in detected_items])}'
                    }
                else:
                    # Even if YOLO didn't detect, use basic CV as backup
                    is_garbage, conf = basic_garbage_detection(image_array)
                    if is_garbage:
                        return {
                            'is_garbage': bool(is_garbage),
                            'confidence': float(conf),
                            'detected_items': [{'item': 'waste area', 'confidence': float(conf)}],
                            'message': 'Waste area detected'
                        }
                    else:
                        return {
                            'is_garbage': bool(False),
                            'confidence': float(0),
                            'detected_items': [],
                            'message': 'No garbage detected. Please take a clearer photo of waste area.'
                        }
            
            except Exception as yolo_error:
                print(f"YOLO detection error: {yolo_error}")
                # Fallback to basic detection
                is_garbage, conf = basic_garbage_detection(image_array)
                return {
                    'is_garbage': bool(is_garbage),
                    'confidence': float(conf),
                    'detected_items': [{'item': 'waste', 'confidence': float(conf)}],
                    'message': 'Image verified (basic detection)'
                }
        
        else:
            # Use basic CV detection
            is_garbage, conf = basic_garbage_detection(image_array)
            return {
                'is_garbage': bool(is_garbage),
                'confidence': float(conf),
                'detected_items': [{'item': 'waste', 'confidence': float(conf)}],
                'message': 'Image verified (basic detection)'
            }
    
    except Exception as e:
        return {
            'is_garbage': bool(False),
            'confidence': float(0),
            'detected_items': [],
            'message': f'Error processing image: {str(e)}'
        }

async def verify_cleaning_image(before_image_base64: str, after_image_base64: str) -> dict:
    """
    Compare before and after images to verify cleaning
    """
    try:
        # Decode both images
        before_data = base64.b64decode(before_image_base64)
        after_data = base64.b64decode(after_image_base64)
        
        before_image = Image.open(io.BytesIO(before_data))
        after_image = Image.open(io.BytesIO(after_data))
        
        # Convert to numpy arrays
        before_array = np.array(before_image)
        after_array = np.array(after_image)
        
        # Resize after_array to match before_array dimensions if needed
        if before_array.shape != after_array.shape:
            after_image = after_image.resize(before_image.size)
            after_array = np.array(after_image)
        
        # Calculate image difference
        diff = cv2.absdiff(
            cv2.cvtColor(before_array, cv2.COLOR_RGB2GRAY) if len(before_array.shape) > 2 else before_array,
            cv2.cvtColor(after_array, cv2.COLOR_RGB2GRAY) if len(after_array.shape) > 2 else after_array
        )
        
        # Calculate similarity percentage (lower difference = higher similarity)
        similarity = 100 - (np.sum(diff) / (diff.shape[0] * diff.shape[1] * 255) * 100)
        
        # Consider cleaned if similarity is low (>30% difference)
        is_cleaned = (100 - similarity) > 30
        
        # Additional check: verify after image has less clutter
        before_gray = cv2.cvtColor(before_array, cv2.COLOR_RGB2GRAY) if len(before_array.shape) > 2 else before_array
        after_gray = cv2.cvtColor(after_array, cv2.COLOR_RGB2GRAY) if len(after_array.shape) > 2 else after_array
        
        before_edges = cv2.Canny(before_gray, 50, 150)
        after_edges = cv2.Canny(after_gray, 50, 150)
        
        before_edge_density = np.sum(before_edges > 0) / before_edges.size
        after_edge_density = np.sum(after_edges > 0) / after_edges.size
        
        # After image should have fewer edges (less clutter)
        clutter_reduced = after_edge_density < before_edge_density * 0.7
        
        is_cleaned = is_cleaned or clutter_reduced
        
        return {
            'is_cleaned': is_cleaned,
            'similarity': float(similarity),
            'difference': float(100 - similarity),
            'message': 'Area successfully cleaned!' if is_cleaned else 'Please ensure the area is properly cleaned.'
        }
    
    except Exception as e:
        return {
            'is_cleaned': False,
            'similarity': 0,
            'message': f'Error processing images: {str(e)}'
        }
