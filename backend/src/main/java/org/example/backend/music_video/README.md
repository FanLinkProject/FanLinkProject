# music_video 도메인 설명서

이 문서는 `org.example.backend.music_video` 도메인의 동작/정책/코드 역할을 설명합니다.

---

## 1) 목적

- 아티스트가 팬페이지에 유튜브 MV 링크를 등록/조회/삭제할 수 있다.
- `videoId`는 서버가 URL에서 추출하고, 응답에서 embed/thumbnail을 계산한다.
- 실제 유효한 영상인지 **YouTube Data API로 검증**한다.
- 댓글 도메인은 targetType/targetId로 연동할 수 있게 응답에 식별자를 제공한다.

---

## 2) 주요 개념

- MV는 **유튜브 URL을 저장**하는 엔티티다.
- `videoId`는 서버가 URL에서 추출한다.
- `embedUrl`/`thumbnailUrl`은 **DB 저장 금지**, 응답에서만 계산한다.
- 등록 시 **YouTube API로 존재/공개 여부를 확인**한다.

---

## 3) 권한 정책

- 등록/삭제: ARTIST 본인 또는 ADMIN만 가능
- 댓글/좋아요는 comment/like 도메인에서 처리 (music_video는 target 정보만 제공)
- 조회: 공개 (비로그인 허용)
- `artistId`는 실제 ARTIST/GROUP만 허용 (없으면 404)

---

## 4) 처리 흐름

### 4-1) 등록(Create)

1. 로그인 사용자(ARTIST/ADMIN) 확인
2. artistId 유효성 검사(ARTIST/GROUP)
3. URL에서 videoId 추출
4. 중복 등록 여부 검사
5. YouTube Data API로 실제 존재/공개 여부 검증
6. DB 저장 후 응답 반환

### 4-2) 목록(List)

1. artistId 유효성 검사(ARTIST/GROUP)
2. 최신순 조회 후 응답 반환

### 4-3) 상세(Detail)

1. artistId 유효성 검사
2. MV 단건 조회 후 응답 반환

### 4-4) 삭제(Delete)

1. 로그인 사용자(ARTIST/ADMIN) 확인
2. artistId 유효성 검사
3. 대상 MV 존재 확인 후 삭제

---

## 5) 유튜브 URL 규칙

허용 형태:

- `https://www.youtube.com/watch?v=VIDEO_ID`
- `https://youtu.be/VIDEO_ID`
- `https://www.youtube.com/shorts/VIDEO_ID`

허용 도메인:

- `youtube.com`
- `www.youtube.com`
- `youtu.be`

videoId 정규식:

- `^[A-Za-z0-9_-]{11}$`

---

## 6) YouTube Data API 검증

- 사용 API: `GET https://www.googleapis.com/youtube/v3/videos`
- 파라미터: `part=status&id={videoId}&key={API_KEY}`
- 조건:
  - items 존재 여부 확인
  - privacyStatus가 `public` 또는 `unlisted`만 허용

### 설정

```yml
youtube:
  api-key: ${YOUTUBE_API_KEY:}
  validation:
    enabled: ${YOUTUBE_VALIDATION_ENABLED:true}
    cache:
      enabled: ${YOUTUBE_VALIDATION_CACHE_ENABLED:true}
      ttl-seconds: ${YOUTUBE_VALIDATION_CACHE_TTL_SECONDS:600}
```

테스트 환경에서는 `YOUTUBE_VALIDATION_ENABLED=false`로 비활성화 가능.

### 캐시 정책

- 동일 videoId 검증을 반복 호출하지 않기 위해 **메모리 캐시**를 사용한다.
- 성공/실패 결과를 모두 저장하며 TTL 만료 시 재검증한다.

---

## 7) API 요약

### 등록

`POST /api/artists/{artistId}/music-videos`

### 목록 조회

`GET /api/artists/{artistId}/music-videos`

### 상세 조회

`GET /api/artists/{artistId}/music-videos/{id}`

### 삭제

`DELETE /api/artists/{artistId}/music-videos/{id}`

---

## 8) 엔티티

### ArtistMusicVideo

- artistId
- provider(YOUTUBE)
- videoId
- title
- canonicalUrl
- createdAt, updatedAt

유니크 제약:

- (artistId, videoId)

---

## 9) 응답 필드

- embedUrl = `https://www.youtube.com/embed/{videoId}`
- thumbnailUrl = `https://img.youtube.com/vi/{videoId}/hqdefault.jpg`
- commentTargetType = `"MEDIA"`
- commentTargetId = `id`

---

## 10) 에러 코드

- INVALID_YOUTUBE_URL (400): URL 파싱 실패
- DUPLICATE_MUSIC_VIDEO (409): 중복 등록
- YOUTUBE_VIDEO_NOT_FOUND (404): 존재하지 않는 영상
- YOUTUBE_API_KEY_MISSING (500): API 키 미설정
- YOUTUBE_API_FAILED (502): 외부 API 실패
- ARTIST_NOT_FOUND (404): artistId 유효하지 않음
- FORBIDDEN_OPERATION (403): 권한 없음

---

## 11) 패키지 맵

- `controller`: API 엔드포인트
- `service`: 등록/삭제/검증 로직
- `util`: URL 파싱
- `entity`: DB 엔티티/enum
- `exception`: 도메인 에러

---

## 12) 테스트

- `YoutubeUrlParserTest`: 허용/비허용 URL 파싱 검증
- `ArtistMusicVideoServiceTest`: 권한/artistId/외부검증 흐름 테스트 (권장)
