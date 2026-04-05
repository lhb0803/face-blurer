import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
from pathlib import Path


MODEL_PATH = Path(__file__).parent / "blaze_face_short_range.tflite"

_detector = None


def _get_detector():
    global _detector
    if _detector is None:
        base_options = python.BaseOptions(model_asset_path=str(MODEL_PATH))
        options = vision.FaceDetectorOptions(
            base_options=base_options,
            min_detection_confidence=0.5,
        )
        _detector = vision.FaceDetector.create_from_options(options)
    return _detector


def detect_faces(image_bytes: bytes) -> tuple[np.ndarray, list[dict]]:
    """Detect faces in an image.

    Returns (cv2_image, faces) where faces is a list of
    {"x": int, "y": int, "w": int, "h": int, "confidence": float}.
    """
    arr = np.frombuffer(image_bytes, dtype=np.uint8)
    image = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Cannot decode image")

    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
    result = _get_detector().detect(mp_image)

    h, w = image.shape[:2]
    faces = []
    for det in result.detections:
        bb = det.bounding_box
        x = max(0, bb.origin_x)
        y = max(0, bb.origin_y)
        fw = min(bb.width, w - x)
        fh = min(bb.height, h - y)
        if fw > 0 and fh > 0:
            faces.append({
                "x": x, "y": y, "w": fw, "h": fh,
                "confidence": round(det.categories[0].score, 3),
            })

    return image, faces


def blur_faces(
    image: np.ndarray,
    faces: list[dict],
    blur_padding: float = 0.3,
    blur_intensity: int = 5,
    blur_shape: str = "rect",
) -> np.ndarray:
    """Apply Gaussian blur to face regions.

    blur_padding: fraction to expand the face box (0.0 = tight, 1.0 = 2x size)
    blur_intensity: 1-10, controls kernel size and sigma
    blur_shape: "rect" or "circle"
    """
    img_h, img_w = image.shape[:2]
    kernel = blur_intensity * 20 + 1  # maps 1->21, 10->201
    if kernel % 2 == 0:
        kernel += 1
    sigma = blur_intensity * 4

    result = image.copy()
    for face in faces:
        x, y, w, h = face["x"], face["y"], face["w"], face["h"]

        # Expand box by padding
        pad_x = int(w * blur_padding)
        pad_y = int(h * blur_padding)
        x1 = max(0, x - pad_x)
        y1 = max(0, y - pad_y)
        x2 = min(img_w, x + w + pad_x)
        y2 = min(img_h, y + h + pad_y)

        roi = result[y1:y2, x1:x2]
        if roi.size == 0:
            continue

        blurred_roi = cv2.GaussianBlur(roi, (kernel, kernel), sigma)

        if blur_shape == "circle":
            # Create elliptical mask
            mask = np.zeros(roi.shape[:2], dtype=np.uint8)
            cx = (x2 - x1) // 2
            cy = (y2 - y1) // 2
            axes = ((x2 - x1) // 2, (y2 - y1) // 2)
            cv2.ellipse(mask, (cx, cy), axes, 0, 0, 360, 255, -1)
            mask_3ch = mask[:, :, np.newaxis] / 255.0
            roi_blended = (blurred_roi * mask_3ch + roi * (1 - mask_3ch)).astype(np.uint8)
            result[y1:y2, x1:x2] = roi_blended
        else:
            result[y1:y2, x1:x2] = blurred_roi

    return result


def encode_jpeg(image: np.ndarray, quality: int = 92) -> bytes:
    """Encode cv2 image to JPEG bytes."""
    _, buf = cv2.imencode(".jpg", image, [cv2.IMWRITE_JPEG_QUALITY, quality])
    return buf.tobytes()
