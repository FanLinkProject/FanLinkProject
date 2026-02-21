# syntax=docker/dockerfile:1

# -------------------------
# Build stage
# -------------------------
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /app

# gradlew CRLF/권한 이슈 방지
RUN apk add --no-cache bash dos2unix

# Gradle wrapper & build scripts 먼저 복사 (캐시 효율)
COPY gradlew ./
COPY gradle ./gradle
COPY build.gradle ./
COPY settings.gradle ./
RUN dos2unix ./gradlew && chmod +x ./gradlew
RUN ./gradlew dependencies --no-daemon || true

# 소스 복사 후 빌드
COPY . .
# COPY . . 로 gradlew가 덮여 권한이 사라질 수 있으니 다시 적용
RUN dos2unix ./gradlew && chmod +x ./gradlew

RUN ./gradlew bootJar --no-daemon -x test

# -------------------------
# Runtime stage
# -------------------------
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Tomcat tempDir(/tmp) + non-root 실행 대비
RUN addgroup -g 1000 app && adduser -u 1000 -G app -D app
RUN mkdir -p /tmp && chmod 1777 /tmp

# ffprobe 필요(환경변수 MEDIA_FFPROBE_PATH=/usr/bin/ffprobe 대응)
RUN apk add --no-cache ffmpeg

# jar staging은 /tmp/jars로 분리(/tmp 자체 삭제 사고 방지)
RUN mkdir -p /tmp/jars
COPY --from=builder /app/build/libs/*.jar /tmp/jars/
RUN set -e; \
    JAR="$(ls -1 /tmp/jars/*.jar | grep -v -- '-plain\.jar$' | head -n 1)"; \
    test -n "$JAR"; \
    mv "$JAR" /app/app.jar; \
    rm -rf /tmp/jars

USER app
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]