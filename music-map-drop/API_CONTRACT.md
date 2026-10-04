# FlashBack API 계약서

이 문서는 FlashBack 프론트엔드와 백엔드 간의 API 계약을 정의합니다.

## 기본 정보

- **Base URL**: `https://api.flashback.app` (개발: `http://localhost:3000`)
- **Content-Type**: `application/json`
- **인증**: 추후 JWT 토큰 기반 인증 추가 예정 (현재는 미구현)

---

## 1. 드롭 생성 (POST /drops)

새로운 음악 드롭을 생성합니다.

### Request

**Endpoint**: `POST /drops`

**Headers**:
```
Content-Type: application/json
Authorization: Bearer {token} (추후 구현)
```

**Body**:
```json
{
  "song": {
    "trackId": 123456789,
    "trackName": "Midnight City",
    "artistName": "M83",
    "collectionName": "Hurry Up, We're Dreaming",
    "artworkUrl100": "https://is1-ssl.mzstatic.com/image/thumb/Music/v4/...",
    "previewUrl": "https://audio-ssl.itunes.apple.com/...",
    "releaseDate": "2011-10-17T07:00:00Z"
  },
  "text": "첫 데이트 때 들었던 노래",
  "tags": ["romantic", "night"],
  "location": {
    "lat": 47.6205,
    "lng": -122.3493
  }
}
```

### Response

**Success (201 Created)**:
```json
{
  "id": "drop_abc123",
  "song": {
    "trackId": 123456789,
    "trackName": "Midnight City",
    "artistName": "M83",
    "collectionName": "Hurry Up, We're Dreaming",
    "artworkUrl100": "https://is1-ssl.mzstatic.com/image/thumb/Music/v4/...",
    "previewUrl": "https://audio-ssl.itunes.apple.com/...",
    "releaseDate": "2011-10-17T07:00:00Z"
  },
  "text": "첫 데이트 때 들었던 노래",
  "tags": ["romantic", "night"],
  "location": {
    "lat": 47.6205,
    "lng": -122.3493
  },
  "createdAt": "2024-01-15T10:30:00Z",
  "userId": "user_xyz789"
}
```

**Error (400 Bad Request)**:
```json
{
  "error": "Validation failed",
  "message": "필수 필드가 누락되었습니다.",
  "details": {
    "location": "위치 정보가 필요합니다."
  }
}
```

**Error (401 Unauthorized)**:
```json
{
  "error": "Unauthorized",
  "message": "인증이 필요합니다."
}
```

---

## 2. 드롭 조회 (GET /drops)

지정된 위치 주변의 드롭들을 조회합니다.

### Request

**Endpoint**: `GET /drops`

**Query Parameters**:
- `lat` (required): 위도 (number)
- `lng` (required): 경도 (number)
- `radius` (optional): 반경 (미터, 기본값: 1000)
- `limit` (optional): 최대 결과 수 (기본값: 50)
- `offset` (optional): 페이지네이션 오프셋 (기본값: 0)
- `tags` (optional): 태그 필터 (쉼표로 구분, 예: `romantic,night`)

**Example**:
```
GET /drops?lat=47.6205&lng=-122.3493&radius=2000&limit=20
```

### Response

**Success (200 OK)**:
```json
{
  "drops": [
    {
      "id": "drop_abc123",
      "song": {
        "trackId": 123456789,
        "trackName": "Midnight City",
        "artistName": "M83",
        "collectionName": "Hurry Up, We're Dreaming",
        "artworkUrl100": "https://is1-ssl.mzstatic.com/image/thumb/Music/v4/...",
        "previewUrl": "https://audio-ssl.itunes.apple.com/...",
        "releaseDate": "2011-10-17T07:00:00Z"
      },
      "text": "첫 데이트 때 들었던 노래",
      "tags": ["romantic", "night"],
      "location": {
        "lat": 47.6205,
        "lng": -122.3493
      },
      "createdAt": "2024-01-15T10:30:00Z",
      "userId": "user_xyz789",
      "distance": 150.5
    },
    {
      "id": "drop_def456",
      "song": {
        "trackId": 987654321,
        "trackName": "Blinding Lights",
        "artistName": "The Weeknd",
        "collectionName": "After Hours",
        "artworkUrl100": "https://is1-ssl.mzstatic.com/image/thumb/Music/v4/...",
        "previewUrl": "https://audio-ssl.itunes.apple.com/...",
        "releaseDate": "2019-11-29T08:00:00Z"
      },
      "text": "운전할 때 항상 듣는 곡",
      "tags": ["energetic", "night"],
      "location": {
        "lat": 47.6062,
        "lng": -122.3321
      },
      "createdAt": "2024-01-14T15:20:00Z",
      "userId": "user_abc123",
      "distance": 850.3
    }
  ],
  "total": 2,
  "limit": 20,
  "offset": 0
}
```

**Error (400 Bad Request)**:
```json
{
  "error": "Invalid parameters",
  "message": "lat와 lng는 필수입니다."
}
```

---

## 3. 드롭 상세 조회 (GET /drops/:id)

특정 드롭의 상세 정보를 조회합니다.

### Request

**Endpoint**: `GET /drops/:id`

**Example**:
```
GET /drops/drop_abc123
```

### Response

**Success (200 OK)**:
```json
{
  "id": "drop_abc123",
  "song": {
    "trackId": 123456789,
    "trackName": "Midnight City",
    "artistName": "M83",
    "collectionName": "Hurry Up, We're Dreaming",
    "artworkUrl100": "https://is1-ssl.mzstatic.com/image/thumb/Music/v4/...",
    "previewUrl": "https://audio-ssl.itunes.apple.com/...",
    "releaseDate": "2011-10-17T07:00:00Z"
  },
  "text": "첫 데이트 때 들었던 노래",
  "tags": ["romantic", "night"],
  "location": {
    "lat": 47.6205,
    "lng": -122.3493
  },
  "createdAt": "2024-01-15T10:30:00Z",
  "userId": "user_xyz789",
  "user": {
    "id": "user_xyz789",
    "username": "musiclover123"
  }
}
```

**Error (404 Not Found)**:
```json
{
  "error": "Not Found",
  "message": "드롭을 찾을 수 없습니다."
}
```

---

## 4. AI 음성 추천 (POST /ai/recommend) - 추후 구현

음성 입력을 기반으로 AI가 음악을 추천합니다.

### Request

**Endpoint**: `POST /ai/recommend`

**Body**:
```json
{
  "audioUrl": "https://storage.flashback.app/audio/user_xyz789/recording_123.wav",
  "transcript": "밤에 운전하면서 듣기 좋은 노래 추천해줘",
  "location": {
    "lat": 47.6205,
    "lng": -122.3493
  },
  "context": {
    "timeOfDay": "night",
    "mood": "chill"
  }
}
```

### Response

**Success (200 OK)**:
```json
{
  "recommendations": [
    {
      "song": {
        "trackId": 123456789,
        "trackName": "Midnight City",
        "artistName": "M83",
        "collectionName": "Hurry Up, We're Dreaming",
        "artworkUrl100": "https://is1-ssl.mzstatic.com/image/thumb/Music/v4/...",
        "previewUrl": "https://audio-ssl.itunes.apple.com/...",
        "releaseDate": "2011-10-17T07:00:00Z"
      },
      "reason": "밤 운전에 딱 맞는 신스팝 분위기",
      "confidence": 0.92
    }
  ],
  "transcript": "밤에 운전하면서 듣기 좋은 노래 추천해줘"
}
```

---

## 데이터 타입 정의

### MusicDrop
```typescript
interface MusicDrop {
  id: string;
  song: ItunesSong;
  text: string;
  tags: string[];
  location: {
    lat: number;
    lng: number;
  };
  createdAt: string;
  userId: string;
  distance?: number; // GET /drops 응답에만 포함
}
```

### ItunesSong
```typescript
interface ItunesSong {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName: string;
  artworkUrl100: string;
  previewUrl?: string;
  releaseDate: string;
}
```

---

## 에러 응답 형식

모든 에러 응답은 다음 형식을 따릅니다:

```json
{
  "error": "ErrorType",
  "message": "사용자 친화적인 에러 메시지",
  "details": {
    // 선택적: 추가 에러 정보
  }
}
```

### 에러 코드

- `400 Bad Request`: 잘못된 요청 (필수 필드 누락, 유효하지 않은 값 등)
- `401 Unauthorized`: 인증 필요
- `403 Forbidden`: 권한 없음
- `404 Not Found`: 리소스를 찾을 수 없음
- `500 Internal Server Error`: 서버 내부 오류

---

## 참고사항

1. **위치 정보**: 모든 좌표는 WGS84 (GPS) 좌표계를 사용합니다.
2. **날짜/시간**: ISO 8601 형식 (UTC)을 사용합니다.
3. **태그**: 소문자로 정규화되어 저장됩니다.
4. **페이지네이션**: `limit`과 `offset`을 사용한 커서 기반 페이지네이션을 권장합니다.
5. **CORS**: 프론트엔드 도메인에서의 요청을 허용해야 합니다.

---

## 프론트엔드 구현 예시

### 드롭 생성
```typescript
const createDrop = async (dropData: Omit<MusicDrop, 'id' | 'createdAt' | 'userId'>) => {
  const response = await fetch('https://api.flashback.app/drops', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // 'Authorization': `Bearer ${token}` // 추후 추가
    },
    body: JSON.stringify(dropData),
  });
  
  if (!response.ok) {
    throw new Error('드롭 생성 실패');
  }
  
  return await response.json();
};
```

### 드롭 조회
```typescript
const getDrops = async (lat: number, lng: number, radius = 1000) => {
  const response = await fetch(
    `https://api.flashback.app/drops?lat=${lat}&lng=${lng}&radius=${radius}`
  );
  
  if (!response.ok) {
    throw new Error('드롭 조회 실패');
  }
  
  const data = await response.json();
  return data.drops;
};
```

