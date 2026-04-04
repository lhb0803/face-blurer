export default function BlurControls({ blurSize, blurIntensity, onChange }) {
  return (
    <div className="blur-controls">
      <label>
        <span>블러 크기: {blurSize}</span>
        <input
          type="range"
          min={11}
          max={101}
          step={2}
          value={blurSize}
          onChange={(e) => onChange({ blurSize: Number(e.target.value) })}
        />
      </label>
      <label>
        <span>블러 강도: {blurIntensity}</span>
        <input
          type="range"
          min={1}
          max={10}
          step={1}
          value={blurIntensity}
          onChange={(e) => onChange({ blurIntensity: Number(e.target.value) })}
        />
      </label>
    </div>
  );
}
