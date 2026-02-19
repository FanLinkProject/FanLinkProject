#!/usr/bin/env bash
set -euo pipefail

# FanLink EC2 배포 엔트리포인트(고정): /opt/fanlink/deploy.sh
# 원본: 레포 ops/deploy/deploy.sh
# 운영 설계:
# - 이 스크립트는 .env/PEM 생성·갱신을 하지 않음. (Runbook/SSM RunCommand로 별도 수행)
# - git pull/clone 하지 않음.
# - /opt/fanlink/docker-compose.yml + 이미지 레지스트리 pull 기준으로 배포.

FANLINK_HOME="/opt/fanlink"
COMPOSE_FILE="${FANLINK_HOME}/docker-compose.yml"
ENV_FILE="${FANLINK_HOME}/.env"

if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
  echo "[deploy][ERROR] must run as root. try: sudo ${FANLINK_HOME}/deploy.sh"
  exit 1
fi

trap 'echo "[deploy][ERROR] failed."; echo "[deploy][HINT] try:"; echo "  cd '"$FANLINK_HOME"' && docker compose -f '"$COMPOSE_FILE"' ps"; echo "  cd '"$FANLINK_HOME"' && docker compose -f '"$COMPOSE_FILE"' logs --tail=200";' ERR

echo "[deploy] starting..."
echo "[deploy] FANLINK_HOME=${FANLINK_HOME}"
echo "[deploy] COMPOSE_FILE=${COMPOSE_FILE}"
echo "[deploy] ENV_FILE=${ENV_FILE}"
echo "[deploy] time=$(date -Is)"

if [[ ! -d "$FANLINK_HOME" ]]; then
  echo "[deploy][ERROR] directory not found: ${FANLINK_HOME}"
  exit 1
fi

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "[deploy][ERROR] compose file not found: ${COMPOSE_FILE}"
  echo "[deploy][HINT] Place docker-compose.yml at ${COMPOSE_FILE} (via SSM RunCommand sync)"
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "[deploy][ERROR] .env not found: ${ENV_FILE}"
  echo "[deploy][HINT] Pull /fanlink/prod/backend/envfile from SSM Parameter Store into ${ENV_FILE}"
  exit 1
fi

cd "$FANLINK_HOME"

echo "[deploy] docker version:"
docker --version || true
echo "[deploy] docker compose version:"
docker compose version || true

echo "[deploy] pull images..."
docker compose -f "$COMPOSE_FILE" pull

echo "[deploy] up -d ..."
docker compose -f "$COMPOSE_FILE" up -d --remove-orphans

echo "[deploy] ps"
docker compose -f "$COMPOSE_FILE" ps

# (선택) 헬스체크: 호출 전에 HEALTHCHECK_URL 환경변수로 주입하면 동작
# 예: HEALTHCHECK_URL="http://127.0.0.1:8080/actuator/health"
HEALTHCHECK_URL="${HEALTHCHECK_URL:-}"
if [[ -n "$HEALTHCHECK_URL" ]]; then
  echo "[deploy] healthcheck: ${HEALTHCHECK_URL}"
  for i in $(seq 1 12); do
    if curl -fsS "$HEALTHCHECK_URL" >/dev/null 2>&1; then
      echo "[deploy] healthcheck OK"
      echo "[deploy] done."
      exit 0
    fi
    echo "[deploy] waiting... (${i}/12)"
    sleep 5
  done
  echo "[deploy][ERROR] healthcheck failed after 60s."
  exit 1
fi

echo "[deploy] done (no healthcheck configured)."
