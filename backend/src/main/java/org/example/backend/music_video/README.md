# music_video 도메인 설명서

이 문서는 `org.example.backend.music_video` 도메인의 동작/정책/코드 역할을 설명합니다.

---

## 1) 목적

- 아티스트가 팬페이지에 유튜브 MV 링크를 등록/조회/삭제할 수 있다.
- 외부 API 호출 없이 URL 파싱만으로 embed/thumbnail을 계산한다.
- 댓글 도메인은 targetType/targetId로 연동할 수 있게 응답에 식별자를 제공한다.

---

## 2) 주요 개념

- MV는 **유튜브 URL을 저장**하는 엔티티다.
- `videoId`는 서버가 URL에서 추출한다.
- `embedUrl`/`thumbnailUrl`은 **DB 저장 금지**, 응답에서만 계산한다.

---

## 3) 유튜브 URL 규칙

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

## 4) 권한 정책

- 등록/삭제: ARTIST 본인 또는 ADMIN만 가능
- 조회: 공개

---

## 5) API 요약

### 등록

`POST /api/artists/{artistId}/music-videos`

### 목록 조회

`GET /api/artists/{artistId}/music-videos`

### 삭제

`DELETE /api/artists/{artistId}/music-videos/{id}`

---

## 6) 엔티티

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

## 7) 응답 필드

- embedUrl = `https://www.youtube.com/embed/{videoId}`
- thumbnailUrl = `https://img.youtube.com/vi/{videoId}/hqdefault.jpg`
- commentTargetType = `"MUSIC_VIDEO"`
- commentTargetId = `id`

---

## 8) 테스트

- `YoutubeUrlParserTest`: 허용/비허용 URL 파싱 검증
