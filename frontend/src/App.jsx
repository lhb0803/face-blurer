import { useState } from 'react';
import UploadZone from './components/UploadZone';
import ImageGallery from './components/ImageGallery';
import ImageEditor from './components/ImageEditor';
import BlurControls from './components/BlurControls';
import { detectFaces, blurImage, blurAll, cleanup } from './api';
import './App.css';

export default function App() {
  const [phase, setPhase] = useState('upload'); // upload | loading | edit
  const [images, setImages] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [blurSize, setBlurSize] = useState(51);
  const [blurIntensity, setBlurIntensity] = useState(5);
  const [downloading, setDownloading] = useState(false);

  async function handleUpload(files) {
    setPhase('loading');
    try {
      const data = await detectFaces(files);
      const enriched = data.results.map((r, i) => ({
        ...r,
        localUrl: URL.createObjectURL(files[i]),
        faces: r.faces.map((f) => ({ ...f, selected: true })),
      }));
      setImages(enriched);
      setCurrentIndex(0);
      setPhase('edit');
    } catch {
      alert('얼굴 감지에 실패했습니다. 다시 시도해주세요.');
      setPhase('upload');
    }
  }

  function toggleFace(faceIndex) {
    setImages((prev) =>
      prev.map((img, i) =>
        i === currentIndex
          ? {
              ...img,
              faces: img.faces.map((f, fi) =>
                fi === faceIndex ? { ...f, selected: !f.selected } : f
              ),
            }
          : img
      )
    );
  }

  function handleBlurChange({ blurSize: bs, blurIntensity: bi }) {
    if (bs !== undefined) setBlurSize(bs);
    if (bi !== undefined) setBlurIntensity(bi);
  }

  async function downloadOne() {
    const img = images[currentIndex];
    const selectedFaces = img.faces.filter((f) => f.selected);
    if (selectedFaces.length === 0) {
      alert('블러할 얼굴을 선택해주세요.');
      return;
    }
    setDownloading(true);
    try {
      const blob = await blurImage(img.image_id, selectedFaces, blurSize, blurIntensity);
      triggerDownload(blob, `blurred_${img.filename}`);
    } catch {
      alert('다운로드 실패');
    }
    setDownloading(false);
  }

  async function downloadAll() {
    const payload = images
      .filter((img) => img.faces.some((f) => f.selected))
      .map((img) => ({
        image_id: img.image_id,
        filename: img.filename,
        faces: img.faces.filter((f) => f.selected),
      }));
    if (payload.length === 0) {
      alert('블러할 얼굴이 있는 사진이 없습니다.');
      return;
    }
    setDownloading(true);
    try {
      const blob = await blurAll(payload, blurSize, blurIntensity);
      triggerDownload(blob, 'blurred_images.zip');
    } catch {
      alert('다운로드 실패');
    }
    setDownloading(false);
  }

  function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function reset() {
    cleanup();
    images.forEach((img) => URL.revokeObjectURL(img.localUrl));
    setImages([]);
    setPhase('upload');
    setCurrentIndex(0);
  }

  const current = images[currentIndex];

  return (
    <div className="app">
      <header>
        <h1>Face Blurer</h1>
      </header>

      {phase === 'upload' && <UploadZone onUpload={handleUpload} />}

      {phase === 'loading' && (
        <div className="loading">
          <div className="spinner" />
          <p>얼굴을 감지하고 있습니다...</p>
        </div>
      )}

      {phase === 'edit' && current && (
        <>
          <ImageGallery
            images={images}
            currentIndex={currentIndex}
            onSelect={setCurrentIndex}
          />
          <ImageEditor
            image={current}
            blurSize={blurSize}
            blurIntensity={blurIntensity}
            onToggleFace={toggleFace}
          />
          <BlurControls
            blurSize={blurSize}
            blurIntensity={blurIntensity}
            onChange={handleBlurChange}
          />
          <div className="actions">
            <button onClick={downloadOne} disabled={downloading}>
              {downloading ? '처리 중...' : '이 사진 다운로드'}
            </button>
            {images.length > 1 && (
              <button onClick={downloadAll} disabled={downloading}>
                {downloading ? '처리 중...' : '전체 다운로드 (ZIP)'}
              </button>
            )}
            <button className="btn-secondary" onClick={reset}>
              다시 시작
            </button>
          </div>
        </>
      )}
    </div>
  );
}
