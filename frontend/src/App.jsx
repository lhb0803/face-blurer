import { useState } from 'react';
import UploadZone from './components/UploadZone';
import ImageGallery from './components/ImageGallery';
import ImageEditor from './components/ImageEditor';
import BlurControls from './components/BlurControls';
import { uploadAndDetect, blurImage, blurAll } from './api';
import './App.css';

export default function App() {
  const [phase, setPhase] = useState('upload'); // upload | loading | edit
  const [images, setImages] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [blurPadding, setBlurPadding] = useState(0.3);
  const [blurIntensity, setBlurIntensity] = useState(5);
  const [blurShape, setBlurShape] = useState('rect');
  const [downloading, setDownloading] = useState(false);

  async function handleUpload(files) {
    setPhase('loading');
    try {
      const data = await uploadAndDetect(files);
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

  function handleBlurChange({ blurPadding: bp, blurIntensity: bi, blurShape: bs }) {
    if (bp !== undefined) setBlurPadding(bp);
    if (bi !== undefined) setBlurIntensity(bi);
    if (bs !== undefined) setBlurShape(bs);
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
      const { download_url } = await blurImage(
        img.image_id, img.s3_key, selectedFaces, blurPadding, blurIntensity, blurShape
      );
      triggerDownload(download_url, `blurred_${img.filename}`);
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
        s3_key: img.s3_key,
        filename: img.filename,
        faces: img.faces.filter((f) => f.selected),
      }));
    if (payload.length === 0) {
      alert('블러할 얼굴이 있는 사진이 없습니다.');
      return;
    }
    setDownloading(true);
    try {
      const { download_url } = await blurAll(payload, blurPadding, blurIntensity, blurShape);
      triggerDownload(download_url, 'blurred_images.zip');
    } catch {
      alert('다운로드 실패');
    }
    setDownloading(false);
  }

  function triggerDownload(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  }

  function reset() {
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
          <div className="edit-layout">
            <ImageEditor
              image={current}
              blurPadding={blurPadding}
              blurIntensity={blurIntensity}
              blurShape={blurShape}
              onToggleFace={toggleFace}
            />
            <div className="sidebar">
              <BlurControls
                blurPadding={blurPadding}
                blurIntensity={blurIntensity}
                blurShape={blurShape}
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
            </div>
          </div>
        </>
      )}
    </div>
  );
}
