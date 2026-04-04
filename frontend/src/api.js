const API_BASE = '/api';

export async function detectFaces(files) {
  const formData = new FormData();
  for (const file of files) {
    formData.append('files', file);
  }
  const res = await fetch(`${API_BASE}/detect`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Detection failed');
  return res.json();
}

export async function blurImage(imageId, faces, blurSize, blurIntensity) {
  const res = await fetch(`${API_BASE}/blur`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image_id: imageId,
      blur_size: blurSize,
      blur_intensity: blurIntensity,
      faces,
    }),
  });
  if (!res.ok) throw new Error('Blur failed');
  return res.blob();
}

export async function blurAll(images, blurSize, blurIntensity) {
  const res = await fetch(`${API_BASE}/blur-all`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      images,
      blur_size: blurSize,
      blur_intensity: blurIntensity,
    }),
  });
  if (!res.ok) throw new Error('Blur all failed');
  return res.blob();
}

export async function cleanup() {
  await fetch(`${API_BASE}/cleanup`, { method: 'DELETE' });
}
