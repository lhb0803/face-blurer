export default function ImageGallery({ images, currentIndex, onSelect }) {
  if (images.length <= 1) return null;

  return (
    <div className="gallery">
      {images.map((img, i) => (
        <div
          key={img.image_id}
          className={`gallery-thumb ${i === currentIndex ? 'active' : ''}`}
          onClick={() => onSelect(i)}
        >
          <img src={img.localUrl} alt={img.filename} />
          <span className="gallery-face-count">{img.faces.length} faces</span>
        </div>
      ))}
    </div>
  );
}
