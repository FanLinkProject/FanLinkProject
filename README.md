# FanLink 미디어 Prefix/MediaConvert 통합 운영 가이드

이 문서는 **prefix 구조 통합(raw/derived/public)**, **CloudFront behavior**, **MediaConvert**, **EventBridge/SQS**, **코드 변경 포인트**를 한 번에 정리합니다.  
대상은 `docker-compose.yml`과 같은 경로(프로젝트 루트)입니다.

---

## 0) 핵심 목표

- **원본(raw) / 파생(derived) / 공개(public)** 구조로 통일
- 재생은 **수동 업로드는 derived, IVS 자동녹화는 ivs/v1 원본 사용**
- 원본은 **직접 접근 금지**
- CloudFront behavior는 **Signed Cookie 필요/불필요를 prefix로 분리**
- MediaConvert를 통해 **HLS only** 출력

---

## 1) Prefix 개념 정의

- **raw/**
  - 업로드된 **원본 저장소**
  - 직접 재생/접근 금지
  - MediaConvert 입력 전용
  - S3 Lifecycle로 자동 만료 가능

- **derived/**
  - MediaConvert가 생성한 **재생용 결과물**
  - 실제 재생은 여기만 사용
  - 기본적으로 **Signed Cookie Required**

- **public/**
  - **누구나 접근 가능한 정적 자산**
  - 로그인/쿠키 없이 접근

---

## 2) Prefix 구조 (현재 → 추천)

아래는 **Signed Cookie 기준으로 완전 분리**된 추천 구조입니다.

### 2-1) Signed Cookie 필요 (잠금)

| 콘텐츠                          | 현재 prefix (코드 기준)                                 | 추천 prefix (재생/접근)                      |
| ------------------------------- | ------------------------------------------------------- | -------------------------------------------- |
| 유료 게시물 이미지              | `restricted/posts/images/{postIdOrTemp}/{uuid}.{ext}`   | 유지                                         |
| 유료 게시물 영상                | `restricted/posts/videos/{postIdOrTemp}/{uuid}.mp4`     | 유지                                         |
| 다시보기 재생(HLS, 수동 업로드) | 없음(현재 원본 직접)                                    | `derived/replays/{replayId}/hls/master.m3u8` |
| 유료 다시보기 원본(수동 업로드) | `restricted/live/replays/{replayIdOrTemp}/source.{ext}` | `raw/replays/{replayId}/source.{ext}`        |

### 2-2) Signed Cookie 불필요 (공개)

| 콘텐츠             | 현재 prefix (코드 기준)                                 | 추천 prefix                                         |
| ------------------ | ------------------------------------------------------- | --------------------------------------------------- |
| 프로필 이미지      | `profiles/{userId}/{uuid}.{ext}`                        | `public/profiles/{userId}/{uuid}.{ext}`             |
| 팬페이지 커버      | `covers/{artistId}/{uuid}.{ext}`                        | `public/covers/{artistId}/{uuid}.{ext}`             |
| 무료 게시물 이미지 | `posts/images/{postIdOrTemp}/{uuid}.{ext}`              | `public/posts/images/{postId}/{uuid}.{ext}`         |
| 무료 게시물 영상   | `posts/videos/{postIdOrTemp}/{uuid}.mp4`                | `public/posts/videos/{postId}/{uuid}.mp4`           |
| 상품 이미지        | `product/images/{productIdOrTemp}/{uuid}.{ext}`         | `public/products/images/{productId}/{uuid}.{ext}`   |
| 상품 상세 이미지   | `product/describe_image/{productIdOrTemp}/{uuid}.{ext}` | `public/products/describe/{productId}/{uuid}.{ext}` |
| 다시보기 썸네일    | `live/replays/{replayIdOrTemp}/thumbnail.{ext}`         | `public/replays/{replayId}/thumbnail.{ext}`         |

### 2-3) 원본 저장소(raw)

| 콘텐츠                    | 현재 prefix (코드 기준)                      | 추천 prefix                                        |
| ------------------------- | -------------------------------------------- | -------------------------------------------------- |
| IVS 자동 녹화 원본        | `ivs/v1/{accountId}/{channelId}/...`         | `ivs/v1/{accountId}/{channelId}/{recordingId}/...` |
| 수동 업로드 다시보기 원본 | `live/replays/{replayIdOrTemp}/source.{ext}` | `raw/replays/{replayId}/source.{ext}`              |

---

## 3) CloudFront Behavior (필수 설정)

### 3-1) Signed Cookie Required

- `/restricted/*`
  - 유료 게시물 첨부 유지
- `/derived/replays/*`
  - 다시보기 HLS 재생 전용
- `/ivs/*`
  - IVS 자동 녹화 재생 전용

### 3-2) Public

- `/public/*`

### 3-3) 원본(raw)

- `/raw/*` 는 **behavior 없이 차단**
- S3 버킷 정책으로 **CloudFront 외 직접 접근 금지**

---

## 4) MediaConvert 설정 (HLS only, 수동 업로드만)

### 4-1) 기본 준비 (콘솔 1회)

- Region: `ap-northeast-2`
- Service role 생성: MediaConvert 콘솔에서 `Create service role`
- 역할에 **S3 입력/출력 권한** 포함되어야 함

### 4-2) Job Template (HLS only)

- Output group: HLS
- Destination: `s3://{bucket}/derived/replays/{replayId}/cmaf/`
- Manifest name:
  - 고정 가능하면 고정값 사용 (예: `index`)
  - 고정이 어렵다면 이벤트에서 실제 생성된 m3u8 경로를 사용

### 4-3) MediaConvert 완료 이벤트

권장: **EventBridge → SQS 폴링 방식**  
(IVS 자동녹화 이벤트 방식과 동일)

---

## 5) S3 Lifecycle (원본 자동 만료)

원본(raw) prefix에 만료 규칙 적용:

- `raw/replays/`

추천 만료 기간:

- 7~30일 (운영 여유에 따라)

---

## 6) AWS 설정 (운영에서 반드시 필요한 것)

### 6-1) S3

- 원본/파생/공개 prefix 유지
- 원본(raw) 직접 접근 차단

### 6-2) CloudFront

- Signed Cookie Key Pair 생성
- `aws.cloudfront.key-pair-id`, `aws.cloudfront.private-key-path` 설정
- Behavior: `/restricted/*`, `/derived/replays/*` → Signed Cookie Required
- Behavior: `/public/*` → Public

### 6-3) MediaConvert

- Service Role
- Job Template
- (선택) Queue 사용 시 Queue ARN 관리

### 6-4) EventBridge/SQS

- MediaConvert Job Complete / Error → EventBridge Rule 생성
- Target: SQS
- 백엔드에서 SQS 폴링

---

## 7) 코드에서 바꿔야 할 포인트 (핵심)

### 7-1) replay 재생 경로 계산

- 수동 업로드는 **derived HLS** 사용  
  예: `derived/replays/{replayId}/cmaf/{manifest}.m3u8`
- IVS 자동녹화는 **recordingS3Prefix(ivs/v1)** 사용
- DB에 `hlsMasterManifestKey` 저장 시 우선 사용

### 7-2) MediaConvert Job 생성

- Replay 생성/업로드 완료 시 **MediaConvert Job 요청**
- 입력은 raw prefix, 출력은 derived prefix

### 7-3) MediaConvert 완료 이벤트 처리

- SQS에서 Job Complete 수신
- Replay 상태 전이 및 `hlsMasterManifestKey` 저장

### 7-4) media_asset objectKey 생성 규칙

- `ObjectKeyGenerator` 및 `media_asset/README.md` 갱신 필요
- 원본(raw)/공개(public) prefix로 전환

### 7-5) CloudFront Signed Cookie 적용 위치

- Replay access gate는 `derived/replays/*` 또는 `ivs/v1/*` 기준으로 쿠키 발급

---

## 8) 환경변수 (중요)

이미 사용 중인 설정 포함:

- `AWS_CLOUDFRONT_ENABLED`
- `AWS_CLOUDFRONT_DOMAIN`
- `AWS_CLOUDFRONT_KEY_PAIR_ID`
- `AWS_CLOUDFRONT_PRIVATE_KEY_PATH`
- `REPLAY_ACCESS_GATE_ENABLED`
- `IVS_RECORDING_EVENTS_ENABLED`
- `IVS_RECORDING_EVENTS_QUEUE_URL`

MediaConvert 연동 시 추가될 가능성:

- `MEDIACONVERT_ENDPOINT`
- `MEDIACONVERT_ROLE_ARN`
- `MEDIACONVERT_JOB_TEMPLATE_ARN`
- `MEDIACONVERT_QUEUE_ARN`

---

## 9) 운영 주의사항

- 원본(raw)은 접근 차단 + Lifecycle 만료 전제
- 재생은 derived만 사용
- CloudFront behavior가 prefix 기준으로 정확히 나뉘어야 함
- 쿠키는 `/derived/replays/*` 기준으로 발급

---

## 10) 요약

- **원본(raw) / 재생(derived) / 공개(public)** 구조로 통일
- Signed Cookie 필요한 영역만 behavior 적용
- MediaConvert는 **HLS only**
- EventBridge → SQS로 안정적인 완료 처리
