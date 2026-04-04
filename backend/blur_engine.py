import cv2
import numpy as np
import mediapipe as mp


_face_detection = None


def _get_detector():
    global _face_detection
    if _face_detection is None:
        _face_detection = mp.solutions.face_detection.FaceDetection(
            model_selection=1, min_detection_confidence=0.5
        )
    return _face_detection


def detect_faces(image_bytes: bytes) -> tuple[np.ndarray, list[dict]]:
    """Detect faces in an image.

    Returns (cv2_image, faces) where faces is a list of
    {"x": int, "y": int, "w": int, "h": int, "confidence": float}.
    """
    arr = np.frombuffer(image_bytes, dtype=np.uint8)
    image = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Cannot decode image")

    h, w = image.shape[:2]
    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    results = _get_detector().process(rgb)

    faces = []
    if results.detections:
        for det in results.detections:
            bb = det.location_data.relative_bounding_box
            x = max(0, int(bb.xmin * w))
            y = max(0, int(bb.ymin * h))
            fw = min(int(bb.width * w), w - x)
            fh = min(int(bb.height * h), h - y)
            if fw > 0 and fh > 0:
                faces.append({
                    "x": x, "y": y, "w": fw, "h": fh,
                    "confidence": round(det.score[0], 3),
                })

    return image, faces


def blur_faces(
    image: np.ndarray,
    faces: list[dict],
    blur_size: int = 51,
    blur_intensity: int = 5,
) -> np.ndarray:
    """Apply Gaussian blur to face regions."""
    # Ensure blur_size is odd
    if blur_size % 2 == 0:
        blur_size += 1
    blur_size = max(3, min(blur_size, 201))

    result = image.copy()
    for face in faces:
        x, y, w, h = face["x"], face["y"], face["w"], face["h"]
        roi = result[y:y+h, x:x+w]
        if roi.size == 0:
            continue
        blurred = cv2.GaussianBlur(roi, (blur_size, blur_size), blur_intensity)
        result[y:y+h, x:x+w] = blurred

    return result


def encode_jpeg(image: np.ndarray, quality: int = 92) -> bytes:
    """Encode cv2 image to JPEG bytes."""
    _, buf = cv2.imencode(".jpg", image, [cv2.IMWRITE_JPEG_QUALITY, quality])
    return buf.tobytes()
