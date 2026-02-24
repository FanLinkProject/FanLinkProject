# 프론트엔드 미디어·첨부·프로필·뮤비·다시보기 정밀 검사 보고서

첨부파일, 커버이미지, 프로필이미지, 뮤직비디오, 다시보기 및 게시물 연관 코드를 검사한 결과와 개선 제안.

---

## 1. 요약

| 영역 | 상태 | 이슈 |
|------|------|------|
| 게시물 첨부 | 중복 다수 | 3곳에서 거의 동일한 presignItem + uploadFile + state 로직 반복 |
| 프로필/커버 이미지 | 산재 | mypage 한 파일 내 상태·핸들러 과다, useMediaUpload 2개 혼용 |
| 뮤직비디오 | 일부 정리됨 | YouTube watch URL 유틸 공통화 완료, 링크는 일관 적용 권장 |
| 다시보기 | 양호 | replayApi + useMediaUpload 사용, live 페이지만 복잡 |
| 공통 | 하드코딩 | 5개, 600초, "tmp_new" 등 상수 분산 |

---

## 2. 게시물 첨부 (Post Attachments)

### 2.1 연관 파일

- `app/posts/new/page.js` — 새 글 작성
- `app/posts/[id]/edit/page.js` — 글 수정 (팬/아티스트 공통)
- `app/artist-console/posts/[id]/edit/page.js` — 아티스트 콘솔 글 수정
- `lib/mediaAssetApi.js` — presign, complete, uploadFile
- `lib/usePostAttachments.js` — **신규** 공통 훅 (도입 시 중복 제거용)

### 2.2 발견 이슈

1. **동일 로직 3중 복제**
   - 세 페이지 모두 `mediaAssetIds`, `attachmentPreviews` state
   - `presignItem` 구성이 거의 동일: `category`(POST_IMAGE/POST_VIDEO), `scope`, `artistId`, `postIdOrTemp`, `attachmentCountInPost`, (영상 시) `durationSecondsRequested: 600`
   - `uploadFile` 호출 후 `setMediaAssetIds` / `setAttachmentPreviews` 처리 반복
   - `removeAttachment` 로직 동일

2. **하드코딩**
   - 최대 개수 `5` → `lib/mediaAssetApi.js`에 `MAX_POST_ATTACHMENTS = 5` 추가됨
   - 영상 길이 `600` → `POST_VIDEO_DURATION_SECONDS = 600` 추가됨
   - `postIdOrTemp`: `"tmp_new"`, `"tmp_edit"` 문자열 각 페이지에 직접 기입

3. **일관성**
   - new: `artistId: postGroupIdNum` (숫자 강제)
   - edit 두 곳: `artistId: postGroupId` (숫자 미변환 가능성)
   - 수정 페이지는 기존 첨부 로드 시 `attachments` → `mediaAssetIds`/`attachmentPreviews` 초기화 방식만 약간 상이

### 2.3 개선 제안

- **즉시 적용 가능**: `posts/new`, 두 edit 페이지에서 `MAX_POST_ATTACHMENTS`, `POST_VIDEO_DURATION_SECONDS`를 `@/lib/mediaAssetApi`에서 import 해 사용.
- **점진 적용**: `usePostAttachments` 훅을 한 페이지씩 적용해 state + add/remove + presignItem 구성 통합.

---

## 3. 프로필 이미지 · 커버(배너) 이미지

### 3.1 연관 파일

- `app/mypage/page.js` — 팬 프로필 이미지, 아티스트 프로필/배너
- `lib/useMediaUpload.js` — uploadFile 래퍼
- `lib/mediaAssetApi.js` — PROFILE_IMAGE, ARTIST_COVER_IMAGE

### 3.2 발견 이슈

1. **mypage 단일 파일 과다 책임**
   - 팬: 프로필 이미지 변경 (파일만, URL 입력 제거됨)
   - 아티스트: 프로필 수정 모달(소개, 프로필 이미지, 배너) — 파일 업로드 + URL 입력 혼합
   - 상태: `profileImageMediaAssetId`, `profileImagePreviewUrl`, `artistProfileEdit`(bio, profileImageUrl, bannerImageUrl, 각 MediaAssetId/PreviewUrl) 등 한 페이지에 집중

2. **useMediaUpload 2회 사용**
   - `profilePresignItem` (PROFILE_IMAGE, PUBLIC) → `uploadProfileImage`
   - `coverPresignItem` (ARTIST_COVER_IMAGE, PUBLIC, artistId) → `uploadCoverImage`
   - presignItem 객체가 매 렌더마다 새로 생성되나, 훅 내부에서 uploadFile만 쓰므로 실사용에는 문제 없음.

3. **UI 패턴 반복**
   - "파일 업로드" 버튼 + hidden input + 미리보기 + 제거 버튼
   - 아티스트 모달: 프로필 이미지 블록과 배너 블록이 거의 동일한 구조

### 3.3 개선 제안

- **공통 컴포넌트**: `FileUploadWithPreview({ accept, onUpload, previewUrl, onRemove, disabled, label })` 형태로 한 번만 구현 후, 프로필/배너/게시물 첨부 등에서 재사용 검토.
- **mypage 분리**: "프로필 이미지 변경" 모달을 `components/mypage/ProfileImageEditModal.jsx` 등으로 분리하면 가독성·테스트에 유리.

---

## 4. 뮤직비디오 (MV)

### 4.1 연관 파일

- `app/artists/[id]/page.js` — 아티스트 페이지 MV 탭 (목록, 링크)
- `app/artist-console/music-videos/page.js` — MV 관리(등록/삭제), "보기" 링크
- `lib/musicVideoApi.js` — list, create, remove
- `lib/youtubeUtils.js` — **신규** `toYouTubeWatchUrl` (embed/short → watch URL)

### 4.2 발견 이슈

1. **YouTube 링크**
   - 아티스트 페이지: `toYouTubeWatchUrl(mv.embedUrl) || mv.embedUrl` 사용 (watch URL로 통일)
   - 아티스트 콘솔 MV 관리: "보기" 링크를 `toYouTubeWatchUrl(v.embedUrl) || v.embedUrl`로 통일해 두면 153 등 오류 방지에 일관됨.

2. **API 사용**
   - `musicVideoApi`는 단순 CRUD, 다른 미디어(업로드)와 달리 presign 없음. 구조는 명확함.

### 4.3 개선 제안

- `toYouTubeWatchUrl`을 `lib/youtubeUtils.js`에서 export하고, MV 링크가 열리는 모든 곳에서 사용 (적용 완료).

---

## 5. 다시보기 (Replay)

### 5.1 연관 파일

- `app/artist-console/live/page.js` — 다시보기 발행, 수동 업로드(REPLAY_VIDEO presign)
- `app/replay/[replayId]/page.js` — 다시보기 시청
- `app/artists/[id]/page.js` — 아티스트 페이지 VOD 탭
- `lib/replayApi.js` — 목록, publish, createManualReplay, publishManualReplay, getReplay, access

### 5.2 발견 이슈

1. **live 페이지 복잡도**
   - 라이브 세션 로드, 다시보기 후보 목록, 발행 폼, 수동 업로드(슬롯 생성 → presign → upload → complete → publish)가 한 페이지에 있음.
   - `manualVideoPresignItem`이 `manualReplay?.replayId` 유무에 따라 바뀌고, fallback으로 `replayIdOrTemp: "tmp_manual"` 사용.

2. **일관성**
   - 다시보기 썸네일 업로드는 `useMediaUpload(thumbnailPresignItem)` 사용. REPLAY_VIDEO는 `uploadFile` 호출을 훅으로 감싼 패턴으로, 게시물 첨부와 비슷한 “업로드 한 번에 처리” 구조.

### 5.3 개선 제안

- live 페이지는 "다시보기 발행" / "수동 업로드"를 별도 컴포넌트나 섹션 파일로 나누면 가독성 향상.
- `replayIdOrTemp: "tmp_manual"` 등 문자열 상수를 `lib/mediaAssetApi.js` 또는 `lib/replayApi.js` 주석/상수로 정리 권장.

---

## 6. 기타 연관 코드

### 6.1 getAuthHeaders / BASE_URL

- `getAuthHeaders()`가 여러 페이지에 동일하게 정의됨 (posts/new, posts/[id]/edit, mypage, artists/[id] 등).
- **제안**: `lib/api.js`에 `getAuthHeaders()`를 두고, 필요한 페이지에서 import 해 사용.

### 6.2 아바타/프로필 이미지 fallback

- `getDefaultAvatarUrl(nickname)` 사용처 다수.
- 일부: `profile?.profileImageUrl || \`https://picsum.photos/seed/...\`` 등 URL 하드코딩.
- **제안**: 아바타 노출은 가능한 한 `getDefaultAvatarUrl`로 통일하고, picsum 등은 공통 상수나 유틸 하나로 모음.

### 6.3 게시물 목록/상세의 첨부 표시

- `attachments?.[0]?.url`로 대표 이미지 사용하는 패턴이 여러 곳에 반복 (home, posts, artist-console, artists/[id] 등).
- **제안**: `getPostRepresentativeImage(post)` 같은 작은 유틸로 한 곳에 모아 두고 재사용.

---

## 7. 적용된 변경 사항 (이번 정밀 검사 반영)

- `lib/mediaAssetApi.js`: `MAX_POST_ATTACHMENTS`, `POST_VIDEO_DURATION_SECONDS` 상수 추가.
- `lib/youtubeUtils.js`: `toYouTubeWatchUrl` 생성, 아티스트 페이지·아티스트 콘솔 MV에서 import 해 사용.
- `lib/usePostAttachments.js`: 게시물 첨부 state + add/remove + presignItem 구성 공통 훅 추가 (선택 도입용).
- `app/artist-console/music-videos/page.js`: "보기" 링크에 `toYouTubeWatchUrl` 적용.

---

## 8. 권장 작업 순서

1. **단기**: 게시물 3페이지에서 `MAX_POST_ATTACHMENTS`, `POST_VIDEO_DURATION_SECONDS` import 후 하드코딩 제거.
2. **단기**: `getAuthHeaders`를 `lib/api.js`로 올려서 중복 제거.
3. **중기**: 한 페이지씩 `usePostAttachments` 도입해 게시물 첨부 로직 통합.
4. **중기**: 프로필/배너용 `FileUploadWithPreview` 공통 컴포넌트 추출 및 mypage 리팩터.
5. **장기**: artist-console/live 페이지를 "발행" / "수동 업로드" 등 역할별로 분리.

이 문서는 첨부파일·커버·프로필·뮤비·다시보기 및 게시물 연관 코드에 대한 정밀 검사 결과와, 스파게티/하드코딩 완화를 위한 제안을 담고 있음.
