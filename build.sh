#!/usr/bin/env bash
set -e

# Install Python dependencies
pip install -r backend/requirements.txt

# Download OpenCV YuNet face detection model
curl -L -o backend/face_detection_yunet_2023mar.onnx \
  "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx"

# Build frontend
cd frontend
npm install
npm run build
