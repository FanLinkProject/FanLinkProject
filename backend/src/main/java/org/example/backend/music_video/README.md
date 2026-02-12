# music_video 도메인 설명서

이 문서는 `org.example.backend.music_video` 도메인의 동작/정책/코드 역할을 설명합니다.

---

## 1) 목적

- 아티스트가 팬페이지에 유튜브 MV 링크를 등록/조회/삭제할 수 있다.
- `videoId`는 서버가 URL에서 추출하고, 응답에서 embed/thumbnail을 계산한다.
- 외부 API 호출 없이 URL 파싱만으로 처리한다.
- 제목/설명은 아티스트가 직접 입력한다.
- 댓글 도메인은 targetType/targetId로 연동할 수 있게 응답에 식별자를 제공한다.

---

## 2) 주요 개념

- MV는 **유튜브 URL을 저장**하는 엔티티다.
- `videoId`는 서버가 URL에서 추출한다.
- `embedUrl`/`thumbnailUrl`은 **DB 저장 금지**, 응답에서만 계산한다.
  -- 등록 시 URL 형식만 검증한다.

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
5. 제목/설명 포함하여 DB 저장 후 응답 반환

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

## 6) API 요약

### 등록

`POST /api/artists/{artistId}/music-videos`

### 목록 조회

`GET /api/artists/{artistId}/music-videos`

### 상세 조회

`GET /api/artists/{artistId}/music-videos/{id}`

### 삭제

`DELETE /api/artists/{artistId}/music-videos/{id}`

---

## 7) 엔티티

### ArtistMusicVideo

- artistId
- provider(YOUTUBE)
- videoId
- title
- description
- canonicalUrl
- createdAt, updatedAt

유니크 제약:

- (artistId, videoId)

---

## 8) 응답 필드

- embedUrl = `https://www.youtube.com/embed/{videoId}`
- thumbnailUrl = `https://img.youtube.com/vi/{videoId}/hqdefault.jpg`
- commentTargetType = `"MEDIA"`
- commentTargetId = `id`
- description = 아티스트가 입력한 설명

---

## 9) 에러 코드

- INVALID_YOUTUBE_URL (400): URL 파싱 실패
- DUPLICATE_MUSIC_VIDEO (409): 중복 등록
- ARTIST_NOT_FOUND (404): artistId 유효하지 않음
- FORBIDDEN_OPERATION (403): 권한 없음

---

## 10) 패키지 맵

- `controller`: API 엔드포인트
- `service`: 등록/삭제/검증 로직
- `util`: URL 파싱
- `entity`: DB 엔티티/enum
- `exception`: 도메인 에러

---

## 11) 테스트

- `YoutubeUrlParserTest`: 허용/비허용 URL 파싱 검증
- `ArtistMusicVideoServiceTest`: 권한/artistId/외부검증 흐름 테스트 (권장)
