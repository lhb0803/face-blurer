export default function BlurControls({ blurPadding, blurIntensity, blurShape, onChange }) {
  return (
    <div className="blur-controls">
      <label>
        <span>박스 크기: {Math.round(blurPadding * 100)}%</span>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={Math.round(blurPadding * 100)}
          onChange={(e) => onChange({ blurPadding: Number(e.target.value) / 100 })}
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
      <div className="shape-toggle">
        <span>블러 모양</span>
        <div className="shape-buttons">
          <button
            className={blurShape === 'rect' ? 'active' : ''}
            onClick={() => onChange({ blurShape: 'rect' })}
          >
            <span className="shape-icon shape-rect" /> 네모
          </button>
          <button
            className={blurShape === 'circle' ? 'active' : ''}
            onClick={() => onChange({ blurShape: 'circle' })}
          >
            <span className="shape-icon shape-circle" /> 원
          </button>
        </div>
      </div>
    </div>
  );
}
