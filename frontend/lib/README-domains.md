# Replay, Music Video, Media Asset, IVS 도메인 프론트 연동 요약

백엔드 replay / music_video / media_asset / ivs 도메인에 대응하는 프론트 API·화면 정리.

---

## 1. Replay (`lib/replayApi.js`)

- **getCandidates(artistId)** — 다시보기 발행 후보 목록 (ARTIST 본인, 이미 발행된 세션 제외)
- **publish({ artistId, liveSessionId, accessType, title? })** — 다시보기 발행 (FREE/PAID)
- **getReplay(replayId)** — 단건 조회 (playbackUrl 계산값 포함)
- **access(replayId)** — Access Gate: 로그인/구독 검증 후 Set-Cookie 발급, `credentials: 'include'` 필요

**화면**

- `app/artist-console/live/page.js` — 다시보기 발행 섹션 (후보 선택 → 발행)
- `app/replay/[replayId]/page.js` — 다시보기 시청 (getReplay → access → video 재생)

---

## 2. Music Video (`lib/musicVideoApi.js`)

- **list(artistId)** — 목록 (공개)
- **getDetail(artistId, id)** — 상세 (공개)
- **create(artistId, { url, title, description })** — 등록 (ARTIST 본인 또는 ADMIN), YouTube URL에서 videoId 파싱
- **remove(artistId, id)** — 삭제 (ARTIST 본인 또는 ADMIN)

**화면**

- `app/artist-console/music-videos/page.js` — 뮤직비디오 관리 (목록·등록·삭제)
- `app/artists/[id]/page.js` — "뮤직비디오" 탭에서 목록 표시 (artistId는 숫자일 때만 API 호출, 아니면 1 사용)

---

## 3. Media Asset (`lib/mediaAssetApi.js`, `lib/useMediaUpload.js`)

- **presign(items)** — Presigned PUT URL 발급 (category, scope, artistId, postIdOrTemp 등)
- **complete(items)** — 업로드 완료 통보 (objectKey만 전달)
- **uploadFile(file, presignItem)** — presign → S3 PUT → complete 한 번에 처리
- **useMediaUpload(presignItem)** — 훅: `upload(file)` + loading/error

**카테고리**  
PROFILE_IMAGE, ARTIST_COVER_IMAGE, POST_IMAGE, POST_VIDEO, REPLAY_VIDEO, REPLAY_THUMBNAIL, PRODUCT_IMAGE, PRODUCT_DESCRIBE_IMAGE

**스코프**  
PUBLIC, RESTRICTED (RESTRICTED는 ARTIST만)

게시물/커버/상품 이미지·다시보기 업로드 시 `uploadFile` 또는 `useMediaUpload` 사용.  
presign 시 `requiredHeaders`(Content-Type)를 그대로 PUT 요청 헤더에 넣어야 함.

---

## 4. IVS (`lib/ivsApi.js`)

- **createPlaybackToken(liveSessionId, ttlSeconds?)** — IVS 재생 토큰 발급 (60~600초, 기본 300)

**화면**

- `app/live/[id]/page.js` — URL에 `?liveSessionId=12345` 있고 LIVE일 때 토큰 요청 후 상단에 결과 표시.  
  실제 IVS 플레이어 연동 시 발급받은 `token`을 플레이어에 전달.

---

## 공통

- **인증**: `lib/api.js`의 `request()`가 `localStorage.accessToken`을 Bearer로 붙여 요청.
- **BASE_URL**: 환경 변수 `NEXT_PUBLIC_API_BASE_URL` 사용, 미설정 시 기본값 사용.
