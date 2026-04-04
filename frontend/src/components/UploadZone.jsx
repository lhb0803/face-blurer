import { useRef, useState } from 'react';

export default function UploadZone({ onUpload }) {
  const inputRef = useRef();
  const [dragging, setDragging] = useState(false);

  function handleFiles(files) {
    if (files.length > 0) onUpload(Array.from(files));
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }

  function onDragOver(e) {
    e.preventDefault();
    setDragging(true);
  }

  return (
    <div
      className={`upload-zone ${dragging ? 'dragging' : ''}`}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={() => setDragging(false)}
      onClick={() => inputRef.current.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />
      <div className="upload-icon">📷</div>
      <p className="upload-text">사진을 선택하거나 여기에 드래그하세요</p>
      <p className="upload-hint">여러 장 선택 가능</p>
    </div>
  );
}
