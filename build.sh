#!/usr/bin/env bash
set -e

# Install Python dependencies
pip install -r backend/requirements.txt

# Download MediaPipe face detection model
curl -L -o backend/blaze_face_short_range.tflite \
  "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/latest/blaze_face_short_range.tflite"

# Build frontend
cd frontend
npm install
npm run build
