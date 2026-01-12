# Image verification with basic CV (no heavy ML models)
import base64
import io
import logging
import os
from typing import List, Tuple

import cv2
import numpy as np
import onnxruntime as ort
from PIL import Image

logger = logging.getLogger(__name__)

# Lightweight YOLOv8n ONNX config (keeps footprint small for Railway)
YOLO_MODEL_URL = "https://github.com/ultralytics/assets/releases/download/v0.0.0/yolov8n.onnx"
YOLO_MODEL_PATH = os.getenv(
    "YOLO_ONNX_PATH",
    os.path.join(os.path.dirname(__file__), "models", "yolov8n.onnx"),
)
YOLO_INPUT_SIZE = 640
YOLO_CONF_THRESHOLD = 0.35
YOLO_IOU_THRESHOLD = 0.45

_ort_session = None


# COCO class ID to waste type mapping
COCO_CLASS_NAMES = [
    "person", "bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck", "boat",
    "traffic light", "fire hydrant", "stop sign", "parking meter", "bench", "bird", "cat", "dog",
    "horse", "sheep", "cow", "elephant", "bear", "zebra", "giraffe", "backpack", "umbrella",
    "handbag", "tie", "suitcase", "frisbee", "skis", "snowboard", "sports ball", "kite",
    "baseball bat", "baseball glove", "skateboard", "surfboard", "tennis racket", "bottle",
    "wine glass", "cup", "fork", "knife", "spoon", "bowl", "banana", "apple", "sandwich",
    "orange", "broccoli", "carrot", "hot dog", "pizza", "donut", "cake", "chair", "couch",
    "potted plant", "bed", "dining table", "toilet", "tv", "laptop", "mouse", "remote", "keyboard",
    "cell phone", "microwave", "oven", "toaster", "sink", "refrigerator", "book", "clock",
    "vase", "scissors", "teddy bear", "hair drier", "toothbrush"
]

# Map COCO classes to app waste types
PLASTIC_CLASSES = {"bottle", "cup", "wine glass", "fork", "knife", "spoon", "bowl", "toothbrush"}
ORGANIC_CLASSES = {"banana", "apple", "sandwich", "orange", "broccoli", "carrot", "hot dog", "pizza", "donut", "cake"}
SEWAGE_CLASSES = {"toilet", "sink"}
TOXIC_CLASSES = set()  # COCO doesn't have battery/chemical classes; will default based on context


def _classify_waste_type(detections: List[dict]) -> str:
    """Map YOLO detections to app waste type classes."""
    if not detections:
        return "mixed"  # default fallback
    
    detected_classes = set()
    for det in detections:
        class_id = det.get("class_id", -1)
        if 0 <= class_id < len(COCO_CLASS_NAMES):
            detected_classes.add(COCO_CLASS_NAMES[class_id])
    
    # Priority logic: sewage > organic > plastic > mixed
    if detected_classes & SEWAGE_CLASSES:
        return "sewage"
    
    has_organic = bool(detected_classes & ORGANIC_CLASSES)
    has_plastic = bool(detected_classes & PLASTIC_CLASSES)
    
    if has_organic and has_plastic:
        return "mixed"
    if has_organic:
        return "organic"
    if has_plastic:
        return "plastic"
    
    # Multiple diverse objects → mixed; single unknown → mixed
    if len(detected_classes) > 2:
        return "mixed"
    
    return "mixed"  # default


def _ensure_model_downloaded():
    """Download YOLO ONNX weights once if missing."""
    os.makedirs(os.path.dirname(YOLO_MODEL_PATH), exist_ok=True)
    if os.path.exists(YOLO_MODEL_PATH):
        return

    import requests

    logger.info(f"⬇️ Downloading YOLOv8n ONNX to {YOLO_MODEL_PATH} ...")
    resp = requests.get(YOLO_MODEL_URL, stream=True, timeout=20)
    resp.raise_for_status()
    with open(YOLO_MODEL_PATH, "wb") as f:
        for chunk in resp.iter_content(chunk_size=8192):
            if chunk:
                f.write(chunk)
    logger.info("✅ YOLOv8n ONNX download complete")


def _load_ort_session():
    """Lazy-load ONNX Runtime session with conservative threading."""
    global _ort_session
    if _ort_session is not None:
        return _ort_session

    _ensure_model_downloaded()

    sess_opts = ort.SessionOptions()
    sess_opts.intra_op_num_threads = 1
    sess_opts.inter_op_num_threads = 1
    providers = ["CPUExecutionProvider"]

    logger.info("⚙️ Loading YOLOv8n ONNX session (CPU)...")
    _ort_session = ort.InferenceSession(YOLO_MODEL_PATH, sess_options=sess_opts, providers=providers)
    logger.info("✅ YOLOv8n ONNX session ready")
    return _ort_session


def _letterbox(image: np.ndarray, size: int = YOLO_INPUT_SIZE) -> Tuple[np.ndarray, float, Tuple[int, int]]:
    """Resize with unchanged aspect ratio using padding (YOLO-style)."""
    h, w = image.shape[:2]
    scale = size / max(h, w)
    new_w, new_h = int(round(w * scale)), int(round(h * scale))
    resized = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_LINEAR)
    pad_w, pad_h = size - new_w, size - new_h
    top, bottom = pad_h // 2, pad_h - pad_h // 2
    left, right = pad_w // 2, pad_w - pad_w // 2
    padded = cv2.copyMakeBorder(resized, top, bottom, left, right, cv2.BORDER_CONSTANT, value=(114, 114, 114))
    return padded, scale, (left, top)


def _nms(boxes: np.ndarray, scores: np.ndarray, iou_thr: float) -> List[int]:
    """Simple NMS for single-class boxes."""
    idxs = scores.argsort()[::-1]
    keep = []
    while idxs.size > 0:
        i = idxs[0]
        keep.append(i)
        if idxs.size == 1:
            break
        ious = _iou(boxes[i], boxes[idxs[1:]])
        idxs = idxs[1:][ious < iou_thr]
    return keep


def _iou(box: np.ndarray, boxes: np.ndarray) -> np.ndarray:
    """Compute IoU between one box and many boxes."""
    x1 = np.maximum(box[0], boxes[:, 0])
    y1 = np.maximum(box[1], boxes[:, 1])
    x2 = np.minimum(box[2], boxes[:, 2])
    y2 = np.minimum(box[3], boxes[:, 3])
    inter = np.maximum(0, x2 - x1) * np.maximum(0, y2 - y1)
    area1 = (box[2] - box[0]) * (box[3] - box[1])
    area2 = (boxes[:, 2] - boxes[:, 0]) * (boxes[:, 3] - boxes[:, 1])
    union = area1 + area2 - inter + 1e-6
    return inter / union


def _run_yolo(image_array: np.ndarray):
    """Run YOLOv8n ONNX and return detections (boxes, scores, class ids)."""
    session = _load_ort_session()

    # Ensure RGB uint8
    if image_array.dtype != np.uint8:
        image_array = image_array.astype(np.uint8)
    if image_array.shape[2] == 4:
        image_array = cv2.cvtColor(image_array, cv2.COLOR_RGBA2RGB)

    img, scale, (pad_x, pad_y) = _letterbox(image_array, YOLO_INPUT_SIZE)
    img = img.astype(np.float32) / 255.0
    img = np.transpose(img, (2, 0, 1))  # HWC -> CHW
    img = np.expand_dims(img, axis=0)   # BCHW

    outputs = session.run(None, {session.get_inputs()[0].name: img})
    preds = outputs[0]
    # YOLOv8 ONNX: (1, 84, N)
    preds = np.squeeze(preds, axis=0)  # (84, N)
    boxes = preds[:4, :]
    scores = preds[4:, :]

    class_scores = scores.max(axis=0)
    class_ids = scores.argmax(axis=0)

    mask = class_scores >= YOLO_CONF_THRESHOLD
    if not np.any(mask):
        return []

    boxes = boxes[:, mask]
    class_scores = class_scores[mask]
    class_ids = class_ids[mask]

    # xywh -> xyxy
    x, y, w, h = boxes
    x1 = (x - w / 2 - pad_x) / scale
    y1 = (y - h / 2 - pad_y) / scale
    x2 = (x + w / 2 - pad_x) / scale
    y2 = (y + h / 2 - pad_y) / scale
    boxes_xyxy = np.stack([x1, y1, x2, y2], axis=1)

    keep = _nms(boxes_xyxy, class_scores, YOLO_IOU_THRESHOLD)
    return [
        {
            "box": boxes_xyxy[i].tolist(),
            "score": float(class_scores[i]),
            "class_id": int(class_ids[i]),
        }
        for i in keep
    ]

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
        
        # More relaxed heuristic: use confidence-based threshold instead of strict indicator count
        score = 0
        if edge_density > 0.12:  # Lowered from 0.15
            score += 1
        if color_variance > 2500:  # Lowered from 3000
            score += 1
        if laplacian_var > 120:  # Lowered from 150
            score += 1
        
        # Calculate confidence based on how many indicators passed
        confidence = min(0.85, score / 3.0 + 0.3)
        
        # Accept if confidence >= 0.50 (at least 1 strong indicator) instead of requiring 2/3
        is_garbage = confidence >= 0.50
        
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
        
        # First try YOLOv8n ONNX; fall back to heuristic if it fails or finds nothing
        try:
            detections = _run_yolo(image_array)
            if detections:
                top = max(detections, key=lambda d: d['score'])
                detected_waste_type = _classify_waste_type(detections)
                return {
                    'is_garbage': True,
                    'confidence': float(top['score']),
                    'wasteType': detected_waste_type,
                    'detected_items': [
                        {
                            'item': COCO_CLASS_NAMES[top['class_id']] if 0 <= top['class_id'] < len(COCO_CLASS_NAMES) else f"object_{top['class_id']}",
                            'confidence': float(top['score']),
                            'box': top['box'],
                        }
                    ],
                    'message': f'{detected_waste_type.capitalize()} waste detected (YOLOv8n)',
                }
            logger.info("⚠️ YOLO found no confident detections; falling back to heuristic")
        except Exception as yolo_err:
            logger.error(f"❌ YOLO inference failed: {yolo_err}; using heuristic fallback")

        # Use basic CV detection as fallback
        is_garbage, conf = basic_garbage_detection(image_array)
        return {
            'is_garbage': bool(is_garbage),
            'confidence': float(conf),
            'wasteType': 'mixed',  # heuristic can't classify type, default to mixed
            'detected_items': [{'item': 'waste area', 'confidence': float(conf)}],
            'message': 'Waste area detected (heuristic)' if is_garbage else 'No garbage detected. Please take a clearer photo of waste area.'
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
        
        # Try YOLO before/after detection to validate removal of trash-like objects
        yolo_before = []
        yolo_after = []
        try:
            yolo_before = _run_yolo(before_array)
            yolo_after = _run_yolo(after_array)
            logger.info(f"🧠 YOLO before: {len(yolo_before)} detections, after: {len(yolo_after)} detections")
        except Exception as yolo_err:
            logger.error(f"❌ YOLO cleaning verification failed: {yolo_err}; falling back to CV deltas")

        # Calculate image difference
        before_gray = cv2.cvtColor(before_array, cv2.COLOR_RGB2GRAY) if len(before_array.shape) > 2 else before_array
        after_gray = cv2.cvtColor(after_array, cv2.COLOR_RGB2GRAY) if len(after_array.shape) > 2 else after_array
        
        diff = cv2.absdiff(before_gray, after_gray)
        
        # Calculate similarity percentage (lower difference = higher similarity)
        similarity = 100 - (np.sum(diff) / (diff.shape[0] * diff.shape[1] * 255) * 100)
        difference_percent = 100 - similarity
        
        logger.info(f"📊 Similarity: {similarity:.1f}%, Difference: {difference_percent:.1f}%")
        
        # Base heuristic: significant change + edge reduction
        is_cleaned = difference_percent > 30
        
        # Additional check: verify after image has less clutter
        before_edges = cv2.Canny(before_gray, 50, 150)
        after_edges = cv2.Canny(after_gray, 50, 150)
        
        before_edge_density = np.sum(before_edges > 0) / before_edges.size
        after_edge_density = np.sum(after_edges > 0) / after_edges.size
        
        logger.info(f"🧹 Before edge density: {before_edge_density:.3f}, After edge density: {after_edge_density:.3f}")
        
        clutter_reduced = after_edge_density < before_edge_density * 0.7
        if clutter_reduced:
            logger.info("✅ Clutter reduced - area appears cleaned (edge delta)")
            is_cleaned = True

        # YOLO signal: if before had detections and after has none or sharply lower scores, mark cleaned
        if yolo_before:
            before_max = max(d['score'] for d in yolo_before)
            after_max = max((d['score'] for d in yolo_after), default=0.0)
            if not yolo_after or after_max < before_max * 0.4:
                logger.info("✅ YOLO confirms removal (detections dropped)")
                is_cleaned = True
            else:
                logger.info("⚠️ YOLO still sees objects after cleaning attempt")

        message = 'Area successfully cleaned!' if is_cleaned else 'Please ensure the area is properly cleaned.'
        logger.info(f"Result: is_cleaned={is_cleaned}, message={message}")
        
        return {
            'is_cleaned': is_cleaned,
            'similarity': float(similarity),
            'difference': float(difference_percent),
            'yolo_before_detections': len(yolo_before),
            'yolo_after_detections': len(yolo_after),
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
