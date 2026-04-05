FROM public.ecr.aws/lambda/python:3.12

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY blur_engine.py main.py face_detection_yunet_2023mar.onnx ./

CMD ["main.handler"]
