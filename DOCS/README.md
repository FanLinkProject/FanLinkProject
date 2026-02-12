# 🦁 FanLink Project

**FanLink**는 아티스트와 팬을 연결하는 올인원 팬덤 플랫폼입니다.  
굿즈 구매부터 실시간 소통까지, 팬덤 활동에 필요한 모든 기능을 제공합니다.

---

## 📌 주요 기능 (Key Features)

### 🛒 **굿즈 커머스 (Goods Commerce)**
- 아티스트 공식 굿즈 판매 및 관리
- Toss Payments를 통한 안전한 결제 시스템
- 현금 및 Candy(플랫폼 포인트) 결제 지원
- 장바구니 및 주문 관리
- AfterShip/SweetTracker API를 활용한 실시간 배송 추적
- 주문 내역 및 배송 정보 조회

### 💬 **커뮤니티 & 채팅 (Community & Chat)**
- 아티스트 채널 기반 그룹 채팅 (WebSocket/STOMP)
- 아티스트와 팬 간 1:1 DM (Direct Message)
- 실시간 라이브 세션 채팅 (Kafka 기반)
- 아티스트 포스트 및 팬 포스트 작성
- 댓글 및 좋아요 기능
- 팔로우/언팔로우 시스템

### 🎤 **아티스트 페이지 (Artist Page)**
- 아티스트별 전용 페이지 및 프로필 관리
- 아티스트 콘솔 (대시보드, 상품 관리, 주문 관리)
- 음악/뮤직비디오 업로드 및 관리
- 멤버십 구독 관리
- 정산 내역 조회
- 라이브 세션 생성 및 관리

### 👥 **사용자 관리 (User Management)**
- 이메일/전화번호 인증 기반 회원가입
- OAuth2 소셜 로그인 (카카오, 네이버, 구글, 인스타그램)
- JWT 기반 인증 및 권한 관리
- 사용자 프로필 및 마이페이지
- 팬 등급 시스템 (Milestone 기반 자동 업그레이드)
- 계좌 정보 관리 (정산용)

### 💎 **멤버십 & 구독 (Membership & Subscription)**
- 아티스트 멤버십 구독 (유료/무료)
- 멤버십 전용 상품 및 콘텐츠 접근
- 자동 갱신 및 만료 관리
- 구독 내역 조회

### 💰 **결제 & 정산 (Payment & Settlement)**
- Toss Payments 통합 결제
- Candy 충전 및 사용 내역
- 아티스트 정산 시스템 (Spring Batch 기반 월별 자동 정산)
- 정산 복구 배치 (에러 복구용)
- 정산 내역 조회 및 관리

### 📦 **배송 관리 (Delivery Management)**
- 주문별 배송 정보 저장 및 추적
- AfterShip/SweetTracker API 연동
- 배송 상태 실시간 업데이트
- 배송 추적 번호 관리

### 🎬 **미디어 관리 (Media Management)**
- AWS S3 기반 이미지/비디오 업로드
- Presigned URL을 통한 안전한 업로드
- 미디어 메타데이터 관리
- 고아 파일 자동 정리 스케줄러
- CloudFront CDN 연동

### 🔔 **알림 시스템 (Notification System)**
- 실시간 알림 (Kafka 기반)
- 이메일/SMS 알림 (CoolSMS, Spring Mail)
- 알림 타입별 필터링
- 읽음/안 읽음 상태 관리

### 👮 **관리자 기능 (Admin Features)**
- 전체 사용자 관리 및 조회
- 아티스트 승인 및 관리
- 신고 처리 및 제재 시스템
- 공지사항 관리
- 정산 내역 조회 및 승인

---

## 🛠 기술 스택 (Tech Stack)

### **Backend**
- **Core Framework**: Java 21, Spring Boot 3.5.10
- **Build Tool**: Gradle
- **Database**: 
  - MySQL 8.0 (메인 데이터베이스)
  - Redis (캐싱 및 세션 관리)
- **ORM**: Spring Data JPA, Hibernate
- **Security**: 
  - Spring Security
  - JWT (jjwt 0.12.3)
  - OAuth2 Client (카카오, 네이버, 구글, 인스타그램)
- **Async & Messaging**: 
  - Spring Kafka (이벤트 기반 아키텍처)
  - Spring WebSocket/STOMP (실시간 채팅)
- **Batch Processing**: Spring Batch (정산 자동화)
- **File Storage**: AWS S3, CloudFront CDN
- **External APIs**: 
  - Toss Payments (결제)
  - CoolSMS (SMS 발송)
  - Spring Mail (이메일 발송)
  - AfterShip/SweetTracker (배송 추적)
- **Utilities**: 
  - Lombok
  - Gson (JSON 처리)
  - OkHttp (HTTP 클라이언트)

### **Frontend**
- **Core**: Next.js 16.1.4 (App Router), React 19.2.3
- **Styling**: Tailwind CSS 4.1.18
- **WebSocket**: 
  - StompJS 7.0.0
  - SockJS Client 1.6.1
- **Payment**: Toss Payments SDK (@tosspayments/payment-sdk, @tosspayments/payment-widget-sdk)
- **Build Tool**: npm
- **Linting**: ESLint

### **Infrastructure**
- **Containerization**: Docker, Docker Compose
- **Message Broker**: Apache Kafka, Zookeeper
- **Database**: MySQL 8.0, Redis Alpine

---

## 📂 프로젝트 구조 (Project Structure)

```
FanLinkProject/
├── backend/                          # Spring Boot Backend
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/org/example/backend/
│   │   │   │   ├── BackendApplication.java
│   │   │   │   ├── chat/             # 채팅 기능 (그룹 채팅, DM)
│   │   │   │   ├── delivery/         # 배송 추적
│   │   │   │   ├── global/           # 전역 설정 (Security, Exception, Util)
│   │   │   │   ├── live_session/     # 라이브 세션
│   │   │   │   ├── media_asset/      # 미디어 파일 관리 (S3)
│   │   │   │   ├── milestone/        # 팬 등급 시스템
│   │   │   │   ├── music_video/      # 뮤직비디오 관리
│   │   │   │   ├── notification/     # 알림 시스템
│   │   │   │   ├── order/            # 주문 관리
│   │   │   │   ├── payment/          # 결제 (Toss Payments)
│   │   │   │   ├── post/             # 포스트 (아티스트/팬)
│   │   │   │   ├── product/          # 상품 관리
│   │   │   │   ├── settlement/       # 정산 시스템 (Batch)
│   │   │   │   ├── subscription/     # 멤버십 구독
│   │   │   │   └── user/              # 사용자 관리 (인증, 프로필, 관리자)
│   │   │   └── resources/
│   │   │       ├── application.yml   # 설정 파일
│   │   │       └── static/            # 정적 리소스
│   │   └── test/                      # 테스트 코드
│   ├── build.gradle                  # Gradle 의존성
│   └── gradlew                        # Gradle Wrapper
│
├── frontend/                         # Next.js Frontend
│   ├── app/                          # App Router 페이지
│   │   ├── admin/                    # 관리자 페이지
│   │   ├── artist-console/           # 아티스트 콘솔
│   │   ├── artists/                  # 아티스트 목록/상세
│   │   ├── candy/                    # Candy 충전/결제
│   │   ├── cart/                     # 장바구니
│   │   ├── checkout/                 # 결제 페이지
│   │   ├── dm/                       # DM 페이지
│   │   ├── home/                     # 홈 페이지
│   │   ├── live/                     # 라이브 세션
│   │   ├── login/                    # 로그인
│   │   ├── market/                   # 마켓플레이스
│   │   ├── mypage/                   # 마이페이지
│   │   ├── notifications/            # 알림
│   │   ├── posts/                    # 포스트 상세
│   │   └── signup/                   # 회원가입
│   ├── components/                   # React 컴포넌트
│   │   ├── layout/                   # 레이아웃 컴포넌트
│   │   ├── navbar/                   # 네비게이션 바
│   │   ├── sidebar/                  # 사이드바
│   │   └── ui/                       # UI 컴포넌트
│   ├── lib/                          # 유틸리티 함수
│   │   ├── api.js                    # API 클라이언트
│   │   └── mockData.js               # Mock 데이터
│   ├── public/                       # 정적 파일
│   ├── package.json                  # npm 의존성
│   └── next.config.mjs               # Next.js 설정
│
├── DOCS/                             # 문서
│   ├── README.md                     # 프로젝트 소개 (이 파일)
│   ├── API_명세서.md                 # API 명세서
│   ├── delivery.md                   # 배송 시스템 문서
│   └── mentoring.md                  # 멘토링 문서
│
├── docker-compose.yml                # Docker Compose 설정
└── mysql-data/                       # MySQL 데이터 볼륨
```

---

## 🚀 시작하기 (Getting Started)

### 사전 요구사항 (Prerequisites)

- **Java**: 21 이상
- **Node.js**: 18 이상
- **Docker & Docker Compose**: 인프라 실행용
- **Gradle**: 7.x 이상 (또는 Gradle Wrapper 사용)

### 환경 변수 설정

#### Backend 환경 변수

`backend/src/main/resources/application.yml` 또는 환경 변수로 설정:

```yaml
# Database
MYSQL_DATABASE=fanlinkdb
MYSQL_USER=fanlink
MYSQL_PASSWORD=your_password
MYSQL_ROOT_PASSWORD=root_password

# Redis
# (기본값: localhost:6379)

# JWT
JWT_SECRET=your_jwt_secret_key_min_32_chars

# OAuth2
KAKAO_CLIENT_ID=your_kakao_client_id
KAKAO_CLIENT_SECRET=your_kakao_client_secret
NAVER_CLIENT_ID=your_naver_client_id
NAVER_CLIENT_SECRET=your_naver_client_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
INSTAGRAM_CLIENT_ID=your_instagram_client_id
INSTAGRAM_CLIENT_SECRET=your_instagram_client_secret

# AWS S3
AWS_REGION=ap-northeast-2
AWS_S3_BUCKET_NAME=your_bucket_name
AWS_CLOUDFRONT_DOMAIN=your_cloudfront_domain

# Toss Payments
PAYMENTS_CLIENT_KEY=your_toss_client_key
PAYMENTS_SECRET_KEY=your_toss_secret_key

# SMS (CoolSMS)
SMS_API_ENABLED=false  # 개발 모드: false
SMS_API_KEY=your_coolsms_key
SMS_API_SECRET=your_coolsms_secret
SMS_FROM=your_phone_number

# Email
MAIL_USERNAME=your_email@gmail.com
MAIL_PASSWORD=your_app_password
MAIL_DEV_MODE=false  # 개발 모드: false

# Encryption
ENCRYPTION_KEY=your_32_char_encryption_key

# Kafka
KAFKA_BOOTSTRAP_SERVERS=localhost:29092
KAFKA_GROUP_ID=fanlink-group
KAFKA_LIVE_GROUP_ID=fanlink-live-group

# 배송 추적 API
# (선택사항, 실제 서비스 연동 시 설정)
```

#### Frontend 환경 변수

`.env.local` 파일 생성 (선택사항):

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```

### 1. 인프라 실행 (Docker Compose)

프로젝트 루트에서 실행:

```bash
docker-compose up -d
```

이 명령어는 다음 서비스를 시작합니다:
- **MySQL** (포트: 3306)
- **Redis** (포트: 6379)
- **Kafka** (포트: 29092)
- **Zookeeper** (포트: 2181)

서비스 상태 확인:
```bash
docker-compose ps
```

### 2. Backend 실행

```bash
cd backend

# Windows
gradlew.bat bootRun

# Linux/Mac
./gradlew bootRun
```

Backend는 `http://localhost:8080`에서 실행됩니다.

### 3. Frontend 실행

새 터미널에서:

```bash
cd frontend

# 의존성 설치 (최초 1회)
npm install

# 개발 서버 실행
npm run dev
```

Frontend는 `http://localhost:3000`에서 실행됩니다.

### 4. 빌드 (Production)

#### Backend 빌드
```bash
cd backend
./gradlew build
```

#### Frontend 빌드
```bash
cd frontend
npm run build
npm start
```

---

## 📋 주요 도메인 모델 (Domain Models)

### 사용자 (User)
- 일반 사용자, 아티스트, 그룹, 관리자 역할 구분
- 이메일, 닉네임, 전화번호(암호화), 프로필 이미지
- Candy 잔액 관리

### 상품 (Product)
- 아티스트별 상품 또는 플랫폼 상품
- 현금/Candy 결제 방식 지원
- 멤버십 전용 상품 옵션
- 재고 관리

### 주문 (Order)
- 다중 상품 주문 지원
- 현금 + Candy 혼합 결제
- 주문 상태 관리

### 배송 (Delivery)
- 주문별 배송 정보
- 배송 추적 번호 및 상태

### 결제 (Payment)
- Toss Payments 연동
- 결제 상태 및 이력 관리

### 구독 (Subscription)
- 아티스트 멤버십 구독
- 유료/무료 구독 지원
- 자동 갱신 관리

### 정산 (Settlement)
- 월별 자동 정산 (Spring Batch)
- 정산 상태 및 내역 관리

### 채팅 (Chat)
- 채팅방 (ChatRoom): 아티스트별 채널
- 채팅 메시지 (ChatMessage): ARTIST/FAN 타입 구분
- DM (Direct Message): 1:1 메시지

### 포스트 (Post)
- 아티스트 포스트
- 팬 포스트
- 미디어 첨부 지원

### 라이브 세션 (LiveSession)
- 실시간 라이브 스트리밍
- 라이브 채팅 (Kafka 기반)

### 마일스톤 (Milestone)
- 팬 등급 시스템
- 자동 등급 업그레이드

---

## 🔐 인증 및 권한 (Authentication & Authorization)

### 인증 방식
1. **일반 로그인**: 이메일 + 비밀번호
2. **소셜 로그인**: OAuth2 (카카오, 네이버, 구글, 인스타그램)
3. **JWT 토큰**: Access Token (1시간) + Refresh Token

### 권한 (UserRole)
- **USER**: 일반 팬
- **ARTIST**: 아티스트
- **GROUP**: 그룹 아티스트
- **ADMIN**: 관리자

### API 인증
모든 보호된 API는 다음 헤더 필요:
```
Authorization: Bearer {accessToken}
```

---

## 📡 API 엔드포인트 (Main API Endpoints)

### 인증 (Auth)
- `POST /api/auth/signup` - 회원가입
- `POST /api/auth/login` - 로그인
- `POST /api/auth/refresh` - 토큰 갱신
- `GET /api/auth/oauth2/{provider}` - OAuth2 로그인

### 사용자 (User)
- `GET /api/home` - 홈 화면 (역할별 차별화)
- `GET /api/users/me` - 내 정보 조회
- `PUT /api/users/me` - 내 정보 수정
- `GET /api/users/{id}` - 사용자 정보 조회

### 상품 (Product)
- `GET /api/products` - 상품 목록
- `GET /api/products/{id}` - 상품 상세
- `POST /api/products` - 상품 생성 (아티스트)

### 주문 (Order)
- `POST /api/orders` - 주문 생성
- `GET /api/orders` - 주문 목록
- `GET /api/orders/{id}` - 주문 상세

### 결제 (Payment)
- `POST /api/payments/confirm` - 결제 확인 (Toss Payments)

### 채팅 (Chat)
- `GET /api/chat/rooms` - 채팅방 목록
- `GET /api/chat/rooms/{roomId}/messages` - 메시지 조회
- WebSocket: `/ws/chat/{roomId}` - 실시간 채팅

### 포스트 (Post)
- `GET /api/posts` - 포스트 목록
- `POST /api/posts` - 포스트 작성
- `GET /api/posts/{id}` - 포스트 상세

> 자세한 API 명세는 `DOCS/API_명세서.md`를 참고하세요.

---

## 🗄️ 데이터베이스 (Database)

### MySQL
- **포트**: 3306
- **문자셋**: utf8mb4
- **DDL 모드**: `update` (자동 스키마 생성)

### Redis
- **포트**: 6379
- **용도**: 캐싱, 세션 저장, 인증 코드 저장

---

## 🔄 배치 작업 (Batch Jobs)

### 정산 배치
- **스케줄**: 매월 15일 오전 4시
- **기능**: 아티스트별 월별 정산 자동 실행

### 정산 복구 배치
- **스케줄**: 매일 새벽 2시
- **기능**: 실패한 정산 작업 복구

### 미디어 정리 스케줄러
- **기능**: 고아 미디어 파일 자동 정리

---

## 🧪 테스트 (Testing)

### Backend 테스트
```bash
cd backend
./gradlew test
```

### HTTP 테스트 파일
`backend/src/test/java` 디렉토리에 `.http` 파일로 API 테스트 가능

---

## 📝 개발 가이드 (Development Guide)

### 코드 스타일
- **Backend**: Java 컨벤션 준수, Lombok 활용
- **Frontend**: ESLint 규칙 준수

### 브랜치 전략
- `main`: 프로덕션 브랜치
- `develop`: 개발 브랜치
- 기능별 브랜치: `feature/기능명`

### 커밋 메시지
- `feat`: 새로운 기능
- `fix`: 버그 수정
- `docs`: 문서 수정
- `refactor`: 리팩토링
- `test`: 테스트 추가/수정

---

## 🐛 문제 해결 (Troubleshooting)

### Backend가 시작되지 않을 때
1. MySQL이 실행 중인지 확인: `docker-compose ps`
2. 환경 변수가 올바르게 설정되었는지 확인
3. 포트 8080이 사용 중이 아닌지 확인

### Frontend가 시작되지 않을 때
1. `npm install` 실행
2. Node.js 버전 확인 (18 이상)
3. 포트 3000이 사용 중이 아닌지 확인

### Kafka 연결 오류
1. Zookeeper가 먼저 실행되었는지 확인
2. `docker-compose logs kafka`로 로그 확인

---

## 📚 추가 문서 (Additional Documentation)

- [API 명세서](./API_명세서.md) - 상세한 API 엔드포인트 문서
- [배송 시스템 문서](./delivery.md) - 배송 추적 시스템 설명
- [멘토링 문서](./mentoring.md) - 프로젝트 멘토링 자료

---

## 👥 Contributors

- **Likelion Team**

---

## 📄 라이선스 (License)

이 프로젝트는 교육 목적으로 제작되었습니다.

---

## 🔗 관련 링크 (Links)

- [Toss Payments 문서](https://docs.tosspayments.com/)
- [Next.js 문서](https://nextjs.org/docs)
- [Spring Boot 문서](https://spring.io/projects/spring-boot)
