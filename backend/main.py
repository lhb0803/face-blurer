import io
import os
import uuid
import zipfile

import boto3
import cv2
import numpy as np
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from mangum import Mangum
from pydantic import BaseModel

from blur_engine import detect_faces, blur_faces, encode_jpeg

app = FastAPI(title="Face Blurer API")

FRONTEND_ORIGIN = os.environ.get("FRONTEND_ORIGIN", "*")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN] if FRONTEND_ORIGIN != "*" else ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

S3_BUCKET = os.environ.get("S3_BUCKET", "face-blurer-uploads")
S3_REGION = os.environ.get("AWS_REGION", "ap-northeast-2")
s3 = boto3.client("s3", region_name=S3_REGION,
                   endpoint_url=f"https://s3.{S3_REGION}.amazonaws.com")


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/upload-url")
def get_upload_url():
    """Generate presigned URL for client to upload directly to S3."""
    image_id = str(uuid.uuid4())
    key = f"uploads/{image_id}.jpg"

    url = s3.generate_presigned_url(
        "put_object",
        Params={"Bucket": S3_BUCKET, "Key": key, "ContentType": "image/jpeg"},
        ExpiresIn=300,
    )

    return {"upload_url": url, "image_id": image_id, "s3_key": key}


class DetectRequest(BaseModel):
    image_id: str
    s3_key: str
    filename: str = "image.jpg"


@app.post("/api/detect")
def detect(req: DetectRequest):
    """Detect faces from an image already uploaded to S3."""
    obj = s3.get_object(Bucket=S3_BUCKET, Key=req.s3_key)
    image_bytes = obj["Body"].read()

    image, faces = detect_faces(image_bytes)
    h, w = image.shape[:2]

    return {
        "image_id": req.image_id,
        "s3_key": req.s3_key,
        "filename": req.filename,
        "width": w,
        "height": h,
        "faces": faces,
    }


class BlurRequest(BaseModel):
    image_id: str
    s3_key: str
    blur_padding: float = 0.3
    blur_intensity: int = 5
    blur_shape: str = "rect"
    faces: list[dict]


@app.post("/api/blur")
def blur_image(req: BlurRequest):
    """Blur faces, save result to S3, return presigned download URL."""
    obj = s3.get_object(Bucket=S3_BUCKET, Key=req.s3_key)
    image_bytes = obj["Body"].read()

    arr = np.frombuffer(image_bytes, dtype=np.uint8)
    image = cv2.imdecode(arr, cv2.IMREAD_COLOR)

    result = blur_faces(image, req.faces, req.blur_padding, req.blur_intensity, req.blur_shape)
    jpeg_bytes = encode_jpeg(result)

    result_key = f"results/{req.image_id}.jpg"
    s3.put_object(Bucket=S3_BUCKET, Key=result_key, Body=jpeg_bytes, ContentType="image/jpeg")

    download_url = s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": S3_BUCKET, "Key": result_key},
        ExpiresIn=600,
    )

    return {"download_url": download_url}


class BlurAllImage(BaseModel):
    image_id: str
    s3_key: str
    filename: str = "image.jpg"
    faces: list[dict]


class BlurAllRequest(BaseModel):
    images: list[BlurAllImage]
    blur_padding: float = 0.3
    blur_intensity: int = 5
    blur_shape: str = "rect"


@app.post("/api/blur-all")
def blur_all(req: BlurAllRequest):
    """Blur all images, create ZIP, upload to S3, return download URL."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for item in req.images:
            obj = s3.get_object(Bucket=S3_BUCKET, Key=item.s3_key)
            image_bytes = obj["Body"].read()

            arr = np.frombuffer(image_bytes, dtype=np.uint8)
            image = cv2.imdecode(arr, cv2.IMREAD_COLOR)

            result = blur_faces(image, item.faces, req.blur_padding, req.blur_intensity, req.blur_shape)
            jpeg_bytes = encode_jpeg(result)
            zf.writestr(item.filename, jpeg_bytes)

    zip_key = f"results/{uuid.uuid4()}.zip"
    s3.put_object(Bucket=S3_BUCKET, Key=zip_key, Body=buf.getvalue(), ContentType="application/zip")

    download_url = s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": S3_BUCKET, "Key": zip_key},
        ExpiresIn=600,
    )

    return {"download_url": download_url}


# Lambda handler
handler = Mangum(app)
