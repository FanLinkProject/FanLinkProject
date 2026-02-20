# syntax=docker/dockerfile:1

# -------------------------
# Build stage
# -------------------------
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /app

# gradlew CRLF/권한 이슈 방지용
RUN apk add --no-cache bash dos2unix

# Gradle wrapper & build scripts 먼저 복사 (캐시 효율)
COPY gradlew ./
COPY gradle ./gradle
COPY build.gradle ./
COPY settings.gradle ./

# gradlew 실행권한 + CRLF 정리
RUN dos2unix ./gradlew && chmod +x ./gradlew

# 의존성 캐시 워밍업 (실패해도 전체 빌드 막지 않음)
RUN ./gradlew dependencies --no-daemon || true

# 소스 복사 후 빌드
COPY . .

# ✅ COPY . . 로 gradlew가 덮여서 권한이 사라질 수 있으니 다시 적용
RUN dos2unix ./gradlew && chmod +x ./gradlew

RUN ./gradlew bootJar --no-daemon -x test

# -------------------------
# Runtime stage
# -------------------------
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# non-root 유저
RUN addgroup -g 1000 app && adduser -u 1000 -G app -D app

# bootJar 산출물만 안정적으로 복사(plain.jar 등 다중 jar 방지)
COPY --from=builder /app/build/libs/*.jar /tmp/
RUN set -e; \
    JAR="$(ls -1 /tmp/*.jar | grep -v -- '-plain\.jar$' | head -n 1)"; \
    test -n "$JAR"; \
    mv "$JAR" /app/app.jar; \
    rm -rf /tmp

USER app

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
