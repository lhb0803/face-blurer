import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision';

let detector = null;

async function getDetector() {
  if (!detector) {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
    );
    detector = await FaceDetector.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/latest/blaze_face_short_range.tflite',
        delegate: 'CPU',
      },
      runningMode: 'IMAGE',
      minDetectionConfidence: 0.5,
    });
  }
  return detector;
}

export async function detectFaces(imageElement) {
  const det = await getDetector();
  const result = det.detect(imageElement);

  return result.detections.map((d) => {
    const bb = d.boundingBox;
    return {
      x: bb.originX,
      y: bb.originY,
      w: bb.width,
      h: bb.height,
      confidence: Math.round(d.categories[0].score * 1000) / 1000,
      selected: true,
    };
  });
}
