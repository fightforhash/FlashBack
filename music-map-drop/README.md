# FlashBack - 음악 기반 위치 추억 공유 앱

음악과 위치를 연결하여 추억을 공유하는 모바일 웹앱 (PWA)

## 🎯 프로젝트 개요

FlashBack은 특정 위치에서 들었던 음악과 그 순간의 추억을 남기고 공유할 수 있는 앱입니다. 지도 위에서 음악 드롭을 발견하고, AR로 주변의 음악을 탐색하며, 음성으로 AI 추천을 받을 수 있습니다.

## 🛠 기술 스택

- **Frontend**: React 19 + TypeScript + Vite
- **스타일링**: Tailwind CSS 4
- **라우팅**: React Router v7
- **지도**: Google Maps API (@vis.gl/react-google-maps)
- **PWA**: Vite PWA Plugin
- **배포**: Vercel (예정)

## 📁 프로젝트 구조

```
src/
├── api/              # API 호출 함수
│   └── itunes.ts     # iTunes API 연동
├── components/       # 재사용 가능한 컴포넌트
│   ├── Layout.tsx           # 공통 레이아웃 (상단바, 하단 네비)
│   ├── Map.tsx              # Google Maps 컴포넌트
│   ├── MusicSearch.tsx      # 음악 검색 UI
│   ├── DropModal.tsx        # 드롭 작성 모달
│   ├── MicButton.tsx        # 마이크 버튼 (음성 입력)
│   ├── AIAnswerSheet.tsx    # AI 추천 바텀시트
│   └── MyDropsList.tsx      # 내 드롭 리스트
├── pages/           # 페이지 컴포넌트
│   ├── HomePage.tsx         # 메인 (지도 뷰)
│   ├── ARPage.tsx           # AR 뷰
│   ├── DropPage.tsx         # 드롭 작성 페이지
│   └── CardDetailPage.tsx   # 드롭 상세 페이지
└── types/           # TypeScript 타입 정의
    └── music.ts
```

## 🚀 시작하기

### 필수 요구사항

- Node.js >= 20.19.0
- npm >= 10.0.0

### 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 빌드
npm run build

# 빌드 미리보기
npm run preview
```

### 환경 변수 설정

`.env` 파일을 생성하고 다음 변수를 설정하세요:

```env
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

Google Maps API 키는 [Google Cloud Console](https://console.cloud.google.com/)에서 발급받을 수 있습니다.

## 📱 주요 기능

### ✅ 구현 완료 (Week 1)

1. **화면 뼈대**
   - 4개 라우트: `/` (Map), `/ar` (AR), `/drop` (Drop), `/card/:id` (Detail)
   - 공통 상단바 (FlashBack 로고, Map/AR 토글)
   - 하단 네비게이션 바

2. **지도 뷰**
   - Google Maps 연동
   - LP 라벨이 포함된 커스텀 마커
   - Mock 드롭 데이터 표시

3. **음악 검색**
   - iTunes API 연동
   - 검색 결과 리스트
   - 곡 선택 기능

4. **드롭 작성**
   - 선택된 곡 카드 표시
   - 텍스트 입력 (추억/사연)
   - 태그 선택 (chill, sad, night 등)
   - 현재 위치 자동 가져오기
   - 로컬 상태로 드롭 관리

5. **Voice UI 기초**
   - 마이크 버튼 컴포넌트 (녹음 애니메이션)
   - AI 추천 바텀시트 UI (Mock 데이터)

6. **모바일 최적화**
   - 반응형 디자인 (모바일/데스크톱)
   - 터치 최적화
   - Safe area 지원 (iPhone X 이상)
   - PWA 설정

### 🔜 예정 기능

- 실제 음성 녹음 및 ElevenLabs 연동
- AI 음악 추천 (실제 AI 모델 연동)
- 백엔드 API 연동
- 사용자 인증
- 드롭 좋아요/댓글
- AR 뷰 구현

## 🎨 디자인 시스템

### 색상

- **Primary**: Red 계열 (`primary-600`: `#dc2626`)
- **Background**: Dark Gray (`gray-900`, `gray-800`)
- **Text**: White, Gray 계열

### 다크 테마

전체 앱은 다크 테마로 구성되어 있습니다.

## 📡 API 계약서

백엔드와의 API 계약은 [API_CONTRACT.md](./API_CONTRACT.md)를 참고하세요.

주요 엔드포인트:
- `POST /drops` - 드롭 생성
- `GET /drops?lat=&lng=&radius=` - 주변 드롭 조회
- `GET /drops/:id` - 드롭 상세 조회
- `POST /ai/recommend` - AI 음악 추천 (추후 구현)

## 📱 PWA 설정

앱은 PWA로 설정되어 있어 모바일에서 홈 화면에 추가할 수 있습니다.

- **Manifest**: `vite.config.ts`에서 설정
- **Service Worker**: Vite PWA 플러그인이 자동 생성
- **아이콘**: `public/` 폴더에 추가 필요

## 🧪 테스트

모바일 테스트는 Chrome DevTools의 디바이스 모드를 사용하세요:

1. Chrome DevTools 열기 (F12)
2. 디바이스 툴바 토글 (Ctrl+Shift+M)
3. iPhone 프리셋 선택
4. 반응형 레이아웃 확인

## 📝 개발 노트

### Week 1 완료 사항

- ✅ 프로젝트 세팅 (React + TS + Vite + Tailwind)
- ✅ PWA 기본 세팅
- ✅ 라우팅 및 레이아웃
- ✅ Google Maps 연동
- ✅ 음악 검색 UI
- ✅ 드롭 작성 UI
- ✅ Voice UI 기초
- ✅ 모바일 최적화
- ✅ API 계약서 작성

### 다음 단계 (Week 2+)

- 백엔드 API 연동
- 실제 음성 녹음 구현
- AI 추천 연동
- 사용자 인증
- AR 뷰 구현

## 📄 라이선스

이 프로젝트는 개인 프로젝트입니다.

## 👥 팀

- Frontend: [당신의 이름]
- Backend: [백엔드 개발자 이름]

---

**FlashBack** - 음악으로 남기는 위치 기반 추억 🎵📍
