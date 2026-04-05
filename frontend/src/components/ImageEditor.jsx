import { useRef, useEffect, useCallback, useState } from 'react';

export default function ImageEditor({ image, blurPadding, blurIntensity, onToggleFace, onMoveFace }) {
  const canvasRef = useRef();
  const imgRef = useRef();
  const [dragging, setDragging] = useState(null); // { faceIndex, offsetX, offsetY }

  const getScale = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return 1;
    return canvas.width / image.width;
  }, [image.width]);

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

    // Scale blur proportionally to canvas size
    const blurPx = Math.max(2, blurIntensity * 3 * (canvas.width / 500));

    for (const face of image.faces) {
      if (!face.selected) continue;

      const fx = face.x * scale;
      const fy = face.y * scale;
      const fw = face.w * scale;
      const fh = face.h * scale;

      const padX = fw * blurPadding;
      const padY = fh * blurPadding;
      const x = Math.max(0, fx - padX);
      const y = Math.max(0, fy - padY);
      const w = Math.min(canvas.width - x, fw + padX * 2);
      const h = Math.min(canvas.height - y, fh + padY * 2);

      // Always use circle (equal radius = max of w/2, h/2)
      const r = Math.max(w, h) / 2;
      const cx = x + w / 2;
      const cy = y + h / 2;

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();
      ctx.filter = `blur(${blurPx}px)`;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      ctx.restore();
    }

    // Draw face outlines
    for (let i = 0; i < image.faces.length; i++) {
      const face = image.faces[i];
      const fx = face.x * scale;
      const fy = face.y * scale;
      const fw = face.w * scale;
      const fh = face.h * scale;

      const padX = fw * blurPadding;
      const padY = fh * blurPadding;
      const x = Math.max(0, fx - padX);
      const y = Math.max(0, fy - padY);
      const w = Math.min(canvas.width - x, fw + padX * 2);
      const h = Math.min(canvas.height - y, fh + padY * 2);

      const r = Math.max(w, h) / 2;
      const cx = x + w / 2;
      const cy = y + h / 2;

      ctx.strokeStyle = face.selected ? '#00ff88' : '#ff4444';
      ctx.lineWidth = 2;
      ctx.setLineDash(face.selected ? [] : [6, 4]);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Label
      const label = face.selected ? 'ON' : 'OFF';
      ctx.font = `${Math.max(12, 14 * scale)}px sans-serif`;
      ctx.fillStyle = face.selected ? '#00ff88' : '#ff4444';
      ctx.fillText(label, cx - 12, cy - r - 6);
    }
  }, [image, blurPadding, blurIntensity]);

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

  function canvasCoords(e) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      cx: (clientX - rect.left) * scaleX,
      cy: (clientY - rect.top) * scaleY,
    };
  }

  function hitTest(cx, cy) {
    const scale = getScale();
    for (let i = 0; i < image.faces.length; i++) {
      const face = image.faces[i];
      const fx = face.x * scale;
      const fy = face.y * scale;
      const fw = face.w * scale;
      const fh = face.h * scale;
      const padX = fw * blurPadding;
      const padY = fh * blurPadding;
      const w = fw + padX * 2;
      const h = fh + padY * 2;
      const r = Math.max(w, h) / 2;
      const fcx = fx + fw / 2;
      const fcy = fy + fh / 2;
      const dist = Math.sqrt((cx - fcx) ** 2 + (cy - fcy) ** 2);
      if (dist <= r) {
        return { index: i, offsetX: cx - fx, offsetY: cy - fy };
      }
    }
    return null;
  }

  function handlePointerDown(e) {
    const { cx, cy } = canvasCoords(e);
    const hit = hitTest(cx, cy);
    if (hit) {
      setDragging({ faceIndex: hit.index, offsetX: hit.offsetX, offsetY: hit.offsetY, moved: false });
    }
  }

  function handlePointerMove(e) {
    if (!dragging) return;
    e.preventDefault();
    const { cx, cy } = canvasCoords(e);
    const scale = getScale();
    const newX = (cx - dragging.offsetX) / scale;
    const newY = (cy - dragging.offsetY) / scale;
    onMoveFace(dragging.faceIndex, Math.round(newX), Math.round(newY));
    setDragging({ ...dragging, moved: true });
  }

  function handlePointerUp(e) {
    if (dragging && !dragging.moved) {
      // It was a tap, not a drag — toggle face
      onToggleFace(dragging.faceIndex);
    }
    setDragging(null);
  }

  return (
    <div className="editor">
      <canvas
        ref={canvasRef}
        className="editor-canvas"
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
      />
      {image.faces.length === 0 && (
        <p className="no-faces">감지된 얼굴이 없습니다</p>
      )}
      {image.faces.length > 0 && (
        <p className="face-hint">탭: 블러 ON/OFF | 드래그: 위치 조정</p>
      )}
    </div>
  );
}
