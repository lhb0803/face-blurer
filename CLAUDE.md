# CLAUDE.md

## Project Overview

사진 속 인물 얼굴을 자동 감지하여 블러 처리하는 웹 앱. 모바일(iPhone Safari/Chrome) 사용이 주 목적.

## Architecture

```
frontend (React + Vite, port 5173)
  └─ /api/* ──proxy──> backend (FastAPI, port 8000)
```

### Backend (`backend/`)

- **Framework**: FastAPI (Python 3.12)
- **얼굴 감지**: MediaPipe Face Detection (`model_selection=1`)
- **블러 처리**: OpenCV `GaussianBlur` (rect) + ellipse mask (circle)
- **진입점**: `main.py` — 4개 엔드포인트
- **핵심 로직**: `blur_engine.py` — `detect_faces()`, `blur_faces()`, `encode_jpeg()`
- **임시 저장**: `uploads/` 디렉토리에 UUID.jpg로 저장, 1시간 후 자동 삭제

### API Endpoints

| Method | Path | 역할 |
|--------|------|------|
| POST | `/api/detect` | 이미지 업로드 → 얼굴 좌표 반환 |
| POST | `/api/blur` | 단일 이미지 블러 처리 → JPEG 반환 |
| POST | `/api/blur-all` | 복수 이미지 블러 → ZIP 반환 |
| DELETE | `/api/cleanup` | 업로드 파일 정리 |

### Frontend (`frontend/`)

- **Framework**: React 18 + Vite (plain JS, no TypeScript)
- **상태 관리**: `useState` only (라이브러리 없음)
- **스타일**: 단일 `App.css` (plain CSS, no framework)
- **의존성**: react, react-dom만 사용 (axios 등 없음)

#### Component 구조

```
App.jsx          — 전체 상태 관리, 3-phase flow (upload → loading → edit)
├── UploadZone   — 파일 선택 / 드래그앤드롭
├── ImageGallery — 복수 이미지 썸네일 (수평 스크롤)
├── ImageEditor  — canvas 기반 이미지 렌더링 + 블러 미리보기 + 얼굴 탭 토글
└── BlurControls — 박스 크기 / 블러 강도 슬라이더 + 모양(원/네모) 토글
```

#### 미리보기 방식

서버 호출 없이 클라이언트 canvas에서 실시간 처리:
- `ctx.filter = 'blur(Npx)'` + `ctx.clip()` (rect 또는 ellipse)
- 다운로드 시에만 서버에서 OpenCV로 정밀 블러 처리

### Key Design Decisions

- `blur_padding` (0.0~1.0): 감지된 얼굴 박스 대비 확장 비율. 프론트/백엔드 동일 로직.
- `blur_intensity` (1~10): 프론트 → `intensity * 3` px CSS blur, 백엔드 → kernel `intensity * 20 + 1`, sigma `intensity * 4`
- `blur_shape`: "rect" | "circle". 백엔드에서 circle은 ellipse mask + alpha blending.

## Commands

```bash
# Backend
cd backend && source venv/bin/activate && uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Frontend
cd frontend && npm run dev

# Frontend build
cd frontend && npx vite build
```

## Python Environment

- Python 3.12.6 via pyenv (`backend/venv/`)
- 시스템 기본 Python 3.9.1은 SSL 깨져서 사용 불가
