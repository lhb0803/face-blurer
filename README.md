# Face Blurer

사진 속 인물 얼굴을 자동으로 감지하고 블러 처리하는 웹 앱.

## 실행 방법

### Backend

```bash
cd backend
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

> 최초 실행 시 venv 세팅:
> ```bash
> python3 -m venv venv
> source venv/bin/activate
> pip install -r requirements.txt
> ```

### Frontend

```bash
cd frontend
npm install    # 최초 1회
npm run dev
```

브라우저에서 `http://localhost:5173` 접속.

### 모바일에서 접근

iPhone과 Mac이 같은 Wi-Fi에 연결된 상태에서:

1. Mac의 로컬 IP 확인: `ifconfig | grep "inet " | grep -v 127.0.0.1`
2. `vite.config.js`에 `server.host: true` 추가 (외부 접근 허용)
3. iPhone 브라우저에서 `http://<Mac IP>:5173` 접속

## 사용법

### 1. 사진 업로드

- 화면을 탭하거나 드래그앤드롭으로 사진 업로드
- 여러 장 한 번에 선택 가능
- 업로드 후 자동으로 얼굴 감지

### 2. 블러 조정

화면 오른쪽 (모바일에서는 아래쪽) 사이드바에서 조절:

- **박스 크기**: 블러 영역의 크기 (0~100%, 감지된 얼굴 기준 패딩)
- **블러 강도**: 블러의 세기 (1~10)
- **블러 모양**: 네모 / 원 선택

### 3. 얼굴 선택

- 캔버스 위의 얼굴 영역을 탭하면 블러 ON/OFF 토글
- 초록 테두리 = 블러 적용 (ON)
- 빨간 점선 = 블러 해제 (OFF)

### 4. 다운로드

- **이 사진 다운로드**: 현재 보고 있는 사진 1장 (JPEG)
- **전체 다운로드**: 모든 사진 (ZIP)
- **다시 시작**: 초기 화면으로 돌아가기
