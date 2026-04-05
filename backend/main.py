import io
import uuid
import zipfile
import time
from pathlib import Path

import cv2
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from blur_engine import detect_faces, blur_faces, encode_jpeg

app = FastAPI(title="Face Blurer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path(__file__).parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

FRONTEND_DIR = Path(__file__).parent.parent / "frontend" / "dist"

MAX_AGE_SECONDS = 3600  # 1 hour


def _cleanup_old_files():
    """Delete uploads older than MAX_AGE_SECONDS."""
    now = time.time()
    for f in UPLOAD_DIR.iterdir():
        if f.is_file() and (now - f.stat().st_mtime) > MAX_AGE_SECONDS:
            f.unlink(missing_ok=True)


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/detect")
async def detect(files: list[UploadFile] = File(...)):
    _cleanup_old_files()

    results = []
    for file in files:
        image_bytes = await file.read()
        image, faces = detect_faces(image_bytes)

        image_id = str(uuid.uuid4())
        h, w = image.shape[:2]
        save_path = UPLOAD_DIR / f"{image_id}.jpg"
        cv2.imwrite(str(save_path), image)

        results.append({
            "image_id": image_id,
            "filename": file.filename,
            "width": w,
            "height": h,
            "faces": faces,
        })

    return {"results": results}


class BlurRequest(BaseModel):
    image_id: str
    blur_padding: float = 0.3
    blur_intensity: int = 5
    blur_shape: str = "rect"
    faces: list[dict]


@app.post("/api/blur")
def blur_image(req: BlurRequest):
    image_path = UPLOAD_DIR / f"{req.image_id}.jpg"
    if not image_path.exists():
        return Response(status_code=404, content="Image not found")

    image = cv2.imread(str(image_path))
    result = blur_faces(image, req.faces, req.blur_padding, req.blur_intensity, req.blur_shape)
    jpeg_bytes = encode_jpeg(result)

    return Response(content=jpeg_bytes, media_type="image/jpeg")


class BlurAllImage(BaseModel):
    image_id: str
    filename: str = "image.jpg"
    faces: list[dict]


class BlurAllRequest(BaseModel):
    images: list[BlurAllImage]
    blur_padding: float = 0.3
    blur_intensity: int = 5
    blur_shape: str = "rect"


@app.post("/api/blur-all")
def blur_all(req: BlurAllRequest):
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for item in req.images:
            image_path = UPLOAD_DIR / f"{item.image_id}.jpg"
            if not image_path.exists():
                continue
            image = cv2.imread(str(image_path))
            result = blur_faces(image, item.faces, req.blur_padding, req.blur_intensity, req.blur_shape)
            jpeg_bytes = encode_jpeg(result)
            zf.writestr(item.filename, jpeg_bytes)

    return Response(
        content=buf.getvalue(),
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=blurred_images.zip"},
    )


@app.delete("/api/cleanup")
def cleanup():
    count = 0
    for f in UPLOAD_DIR.iterdir():
        if f.is_file():
            f.unlink(missing_ok=True)
            count += 1
    return {"deleted": count}


# Serve frontend static files (production)
if FRONTEND_DIR.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIR / "assets"), name="assets")

    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        file_path = FRONTEND_DIR / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(FRONTEND_DIR / "index.html")
