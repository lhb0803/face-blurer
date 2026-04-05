const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export async function uploadAndDetect(files) {
  const results = [];

  for (const file of files) {
    // 1. Get presigned upload URL
    const urlRes = await fetch(`${API_BASE}/upload-url`, { method: 'POST' });
    if (!urlRes.ok) throw new Error('Failed to get upload URL');
    const { upload_url, image_id, s3_key } = await urlRes.json();

    // 2. Upload directly to S3
    await fetch(upload_url, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/jpeg' },
      body: file,
    });

    // 3. Detect faces
    const detectRes = await fetch(`${API_BASE}/detect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_id, s3_key, filename: file.name }),
    });
    if (!detectRes.ok) throw new Error('Detection failed');

    results.push(await detectRes.json());
  }

  return { results };
}

export async function blurImage(imageId, s3Key, faces, blurPadding, blurIntensity) {
  const res = await fetch(`${API_BASE}/blur`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image_id: imageId,
      s3_key: s3Key,
      blur_padding: blurPadding,
      blur_intensity: blurIntensity,
      faces,
    }),
  });
  if (!res.ok) throw new Error('Blur failed');
  return res.json();
}

export async function blurAll(images, blurPadding, blurIntensity) {
  const res = await fetch(`${API_BASE}/blur-all`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      images,
      blur_padding: blurPadding,
      blur_intensity: blurIntensity,
    }),
  });
  if (!res.ok) throw new Error('Blur all failed');
  return res.json();
}
