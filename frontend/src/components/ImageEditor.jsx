import { useRef, useEffect, useCallback } from 'react';

export default function ImageEditor({ image, blurSize, blurIntensity, onToggleFace }) {
  const canvasRef = useRef();
  const imgRef = useRef();

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !img.complete) return;

    const maxW = Math.min(window.innerWidth - 32, 1200);
    const scale = Math.min(1, maxW / image.width);
    canvas.width = image.width * scale;
    canvas.height = image.height * scale;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Draw blur on selected faces
    const blurPx = Math.round((blurSize / 101) * 30 * scale);
    for (const face of image.faces) {
      if (!face.selected) continue;
      const x = face.x * scale;
      const y = face.y * scale;
      const w = face.w * scale;
      const h = face.h * scale;

      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();
      ctx.filter = `blur(${blurPx}px)`;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      ctx.restore();
    }

    // Draw face rectangles
    for (let i = 0; i < image.faces.length; i++) {
      const face = image.faces[i];
      const x = face.x * scale;
      const y = face.y * scale;
      const w = face.w * scale;
      const h = face.h * scale;

      ctx.strokeStyle = face.selected ? '#00ff88' : '#ff4444';
      ctx.lineWidth = 2;
      ctx.setLineDash(face.selected ? [] : [6, 4]);
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);

      // Label
      const label = face.selected ? 'ON' : 'OFF';
      ctx.font = `${Math.max(12, 14 * scale)}px sans-serif`;
      ctx.fillStyle = face.selected ? '#00ff88' : '#ff4444';
      ctx.fillText(label, x + 4, y - 6);
    }
  }, [image, blurSize, blurIntensity]);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      draw();
    };
    img.src = image.localUrl;
  }, [image.localUrl, draw]);

  useEffect(() => {
    draw();
  }, [draw]);

  function handleClick(e) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const cx = (e.clientX - rect.left) * scaleX;
    const cy = (e.clientY - rect.top) * scaleY;

    const scale = canvas.width / image.width;

    for (let i = 0; i < image.faces.length; i++) {
      const face = image.faces[i];
      const fx = face.x * scale;
      const fy = face.y * scale;
      const fw = face.w * scale;
      const fh = face.h * scale;
      if (cx >= fx && cx <= fx + fw && cy >= fy && cy <= fy + fh) {
        onToggleFace(i);
        return;
      }
    }
  }

  return (
    <div className="editor">
      <canvas
        ref={canvasRef}
        className="editor-canvas"
        onClick={handleClick}
      />
      {image.faces.length === 0 && (
        <p className="no-faces">감지된 얼굴이 없습니다</p>
      )}
      {image.faces.length > 0 && (
        <p className="face-hint">얼굴 영역을 탭하면 블러 ON/OFF</p>
      )}
    </div>
  );
}
