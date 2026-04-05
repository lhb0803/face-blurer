import JSZip from 'jszip';

function applyBlur(canvas, ctx, img, faces, blurPadding, blurIntensity, blurShape) {
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  canvas.width = w;
  canvas.height = h;

  ctx.drawImage(img, 0, 0, w, h);

  const blurPx = Math.max(2, blurIntensity * 3 * (w / 1000));

  for (const face of faces) {
    if (!face.selected) continue;

    const padX = face.w * blurPadding;
    const padY = face.h * blurPadding;
    const x = Math.max(0, face.x - padX);
    const y = Math.max(0, face.y - padY);
    const fw = Math.min(w - x, face.w + padX * 2);
    const fh = Math.min(h - y, face.h + padY * 2);

    ctx.save();
    ctx.beginPath();
    if (blurShape === 'circle') {
      ctx.ellipse(x + fw / 2, y + fh / 2, fw / 2, fh / 2, 0, 0, Math.PI * 2);
    } else {
      ctx.rect(x, y, fw, fh);
    }
    ctx.clip();
    ctx.filter = `blur(${blurPx}px)`;
    ctx.drawImage(img, 0, 0, w, h);
    ctx.restore();
  }
}

function canvasToBlob(canvas, quality = 0.92) {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
}

export async function exportOne(image, blurPadding, blurIntensity, blurShape) {
  const img = new Image();
  img.src = image.localUrl;
  await new Promise((r) => { img.onload = r; });

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  applyBlur(canvas, ctx, img, image.faces, blurPadding, blurIntensity, blurShape);

  const blob = await canvasToBlob(canvas);
  return blob;
}

export async function exportAll(images, blurPadding, blurIntensity, blurShape) {
  const zip = new JSZip();

  for (const image of images) {
    const selectedFaces = image.faces.filter((f) => f.selected);
    if (selectedFaces.length === 0) continue;

    const img = new Image();
    img.src = image.localUrl;
    await new Promise((r) => { img.onload = r; });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    applyBlur(canvas, ctx, img, image.faces, blurPadding, blurIntensity, blurShape);

    const blob = await canvasToBlob(canvas);
    zip.file(`blurred_${image.filename}`, blob);
  }

  return zip.generateAsync({ type: 'blob' });
}
