# Image verification with basic CV (no heavy ML models)
import cv2
import numpy as np
from PIL import Image
import io
import base64
import logging

logger = logging.getLogger(__name__)

def decode_base64_image(image_base64: str):
    """Safely decode base64 image string with proper padding"""
    try:
        # Handle data URI strings (e.g., "data:image/jpeg;base64,...")
        if ',' in image_base64:
            image_base64 = image_base64.split(',')[1]
        
        # Add padding if needed
        missing_padding = len(image_base64) % 4
        if missing_padding:
            image_base64 += '=' * (4 - missing_padding)
        
        # Decode base64
        image_data = base64.b64decode(image_base64)
        image = Image.open(io.BytesIO(image_data))
        return np.array(image)
    except Exception as e:
        logger.error(f"❌ Base64 decode error: {str(e)}")
        raise ValueError(f"Failed to decode image: {str(e)}")

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
        
        logger.info(f"🔍 Image metrics - Edge density: {edge_density:.4f}, Color variance: {color_variance:.2f}, Laplacian: {laplacian_var:.2f}")
        
        # More strict heuristic: require multiple indicators
        # Most regular photos will have some complexity, so we need higher thresholds
        score = 0
        if edge_density > 0.15:  # Increased from 0.1
            score += 1
        if color_variance > 3000:  # Increased from 2000
            score += 1
        if laplacian_var > 150:  # Increased from 100
            score += 1
        
        # Require at least 2 out of 3 indicators for garbage
        is_garbage = score >= 2
        confidence = min(0.85, score / 3.0 + 0.3)
        
        logger.info(f"{'✅' if is_garbage else '❌'} Garbage detection: score={score}/3, is_garbage={is_garbage}, confidence={confidence:.2f}")
        
        return is_garbage, confidence
    except Exception as e:
        logger.error(f"❌ Detection error: {str(e)}")
        return False, 0.0  # Changed from True to False - reject by default on error

async def verify_garbage_image(image_base64: str) -> dict:
    """
    Verify if image contains garbage/waste using basic CV detection
    (YOLOv8 removed to reduce image size for Railway deployment)
    """
    try:
        # Reject obvious URL inputs that cannot be decoded
        if image_base64.startswith("http"):
            raise ValueError("Expected base64 image data, received a URL instead")

        image_array = decode_base64_image(image_base64)
        
        # Use basic CV detection
        is_garbage, conf = basic_garbage_detection(image_array)
        return {
            'is_garbage': bool(is_garbage),
            'confidence': float(conf),
            'detected_items': [{'item': 'waste area', 'confidence': float(conf)}],
            'message': 'Waste area detected' if is_garbage else 'No garbage detected. Please take a clearer photo of waste area.'
        }
    
    except Exception as e:
        logger.error(f"❌ Error verifying garbage image: {str(e)}")
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
        logger.info("🔍 Verifying cleaning with image comparison...")
        
        # Decode both images with proper padding
        before_array = decode_base64_image(before_image_base64)
        after_array = decode_base64_image(after_image_base64)
        
        logger.info(f"📸 Before image shape: {before_array.shape}, After image shape: {after_array.shape}")
        
        # Resize after_array to match before_array dimensions if needed
        if before_array.shape != after_array.shape:
            logger.info(f"📏 Resizing after image from {after_array.shape} to {before_array.shape}")
            after_image_pil = Image.fromarray(after_array)
            after_image_pil = after_image_pil.resize((before_array.shape[1], before_array.shape[0]))
            after_array = np.array(after_image_pil)
        
        # Calculate image difference
        before_gray = cv2.cvtColor(before_array, cv2.COLOR_RGB2GRAY) if len(before_array.shape) > 2 else before_array
        after_gray = cv2.cvtColor(after_array, cv2.COLOR_RGB2GRAY) if len(after_array.shape) > 2 else after_array
        
        diff = cv2.absdiff(before_gray, after_gray)
        
        # Calculate similarity percentage (lower difference = higher similarity)
        similarity = 100 - (np.sum(diff) / (diff.shape[0] * diff.shape[1] * 255) * 100)
        difference_percent = 100 - similarity
        
        logger.info(f"📊 Similarity: {similarity:.1f}%, Difference: {difference_percent:.1f}%")
        
        # Consider cleaned if difference is >30% (significant change detected)
        is_cleaned = difference_percent > 30
        
        # Additional check: verify after image has less clutter
        before_edges = cv2.Canny(before_gray, 50, 150)
        after_edges = cv2.Canny(after_gray, 50, 150)
        
        before_edge_density = np.sum(before_edges > 0) / before_edges.size
        after_edge_density = np.sum(after_edges > 0) / after_edges.size
        
        logger.info(f"🧹 Before edge density: {before_edge_density:.3f}, After edge density: {after_edge_density:.3f}")
        
        # After image should have fewer edges (less clutter)
        clutter_reduced = after_edge_density < before_edge_density * 0.7
        
        if clutter_reduced:
            logger.info("✅ Clutter reduced - area appears cleaned")
            is_cleaned = True
        
        message = 'Area successfully cleaned!' if is_cleaned else 'Please ensure the area is properly cleaned.'
        logger.info(f"Result: is_cleaned={is_cleaned}, message={message}")
        
        return {
            'is_cleaned': is_cleaned,
            'similarity': float(similarity),
            'difference': float(difference_percent),
            'message': message
        }
    
    except Exception as e:
        logger.error(f"❌ Error verifying cleaning: {str(e)}")
        return {
            'is_cleaned': False,
            'similarity': 0,
            'difference': 0,
            'message': f'Error processing images: {str(e)}'
        }
