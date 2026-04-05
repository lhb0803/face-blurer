# CLAUDE.md

## Project Overview

사진 속 인물 얼굴을 자동 감지하여 블러 처리하는 웹 앱. 100% 클라이언트 사이드. 모바일(iPhone Safari/Chrome) 사용이 주 목적.

## Architecture

```
frontend (React + Vite) → GitHub Pages 정적 배포
  ├─ 얼굴 감지: @mediapipe/tasks-vision (WASM, 브라우저 실행)
  ├─ 블러 처리: Canvas API (ctx.filter + ctx.clip)
  └─ ZIP 생성: jszip
```

서버 없음. 이미지가 사용자 기기를 떠나지 않음.

### Backend (`backend/`) — 레거시

초기에는 FastAPI + OpenCV 서버 사이드 처리였으나, Render 무료 티어 메모리 제한(512MB)으로 클라이언트 전환. 코드는 참고용으로 유지.

### Frontend (`frontend/`)

- **Framework**: React 18 + Vite (plain JS, no TypeScript)
- **상태 관리**: `useState` only
- **스타일**: 단일 `App.css` (plain CSS)
- **의존성**: react, react-dom, @mediapipe/tasks-vision, jszip

#### 핵심 모듈

```
src/
├── App.jsx           — 전체 상태 관리, 3-phase flow (upload → loading → edit)
├── faceDetection.js  — MediaPipe WASM 얼굴 감지 (CDN에서 모델+wasm 로드)
├── blurExport.js     — 풀해상도 Canvas 블러 + JPEG/ZIP export
├── components/
│   ├── UploadZone    — 파일 선택 / 드래그앤드롭
│   ├── ImageGallery  — 복수 이미지 썸네일 (수평 스크롤)
│   ├── ImageEditor   — canvas 기반 블러 미리보기 + 얼굴 탭 토글
│   └── BlurControls  — 박스 크기 / 블러 강도 슬라이더 + 모양 토글
```

#### 얼굴 감지 방식

`@mediapipe/tasks-vision`의 `FaceDetector`:
- WASM 런타임: jsdelivr CDN에서 로드
- 모델: Google Storage에서 `blaze_face_short_range` float16 로드
- `runningMode: 'IMAGE'`, CPU delegate

#### 블러 미리보기 & 다운로드

- 미리보기: 축소된 canvas에서 `ctx.filter = 'blur(Npx)'` + `ctx.clip()` (rect 또는 ellipse)
- 다운로드: 원본 해상도 canvas에서 동일 로직 → `canvas.toBlob('image/jpeg')`
- 복수 이미지: jszip으로 ZIP 생성

### Key Design Decisions

- `blur_padding` (0.0~1.0): 감지된 얼굴 박스 대비 확장 비율
- `blur_intensity` (1~10): `intensity * 3 * (width / 1000)` px CSS blur (해상도 비례)
- `blur_shape`: "rect" | "circle" (ellipse clip)
- `base: '/face-blurer/'` in vite.config.js (GitHub Pages 경로)

## Commands

```bash
# 개발
cd frontend && npm run dev

# 빌드
cd frontend && npm run build

# 배포: main에 push → GitHub Actions 자동 배포
```

## Deployment

GitHub Pages via `.github/workflows/deploy.yml`. `main` push 시 자동 빌드 + 배포.
