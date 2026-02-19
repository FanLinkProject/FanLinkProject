#!/usr/bin/env bash
set -euo pipefail

# SSM Parameter Store에서 .env / IVS PEM을 가져와 /opt/fanlink 에 쓴다.
# EC2에서 최초 1회 또는 시크릿 갱신 시 실행. (deploy.sh 실행 전에 디렉터리·파일이 있어야 함)
#
# 필요: EC2 IAM Instance Profile 에 SSM GetParameter 권한
#   - ssm:GetParameter on /fanlink/prod/backend/envfile, /fanlink/prod/ivs/playback/private_key_pem

REGION="${AWS_REGION:-ap-northeast-2}"
PARAM_ENV="/fanlink/prod/backend/envfile"
PARAM_IVS_PEM="/fanlink/prod/ivs/playback/private_key_pem"
FANLINK_HOME="/opt/fanlink"
ENV_OUT="${FANLINK_HOME}/.env"
KEYS_DIR="${FANLINK_HOME}/keys"
PEM_OUT="${KEYS_DIR}/ivs_playback_private_key.pem"

echo "[setup-ssm] REGION=$REGION"
echo "[setup-ssm] creating directories..."

sudo mkdir -p "$FANLINK_HOME" "$KEYS_DIR"
sudo chown -R root:root "$FANLINK_HOME"
sudo chmod 755 "$FANLINK_HOME"
sudo chmod 700 "$KEYS_DIR"

echo "[setup-ssm] fetching .env from SSM..."
sudo aws ssm get-parameter \
  --region "$REGION" \
  --name "$PARAM_ENV" \
  --with-decryption \
  --query "Parameter.Value" \
  --output text \
  > /tmp/fanlink.env

sudo mv /tmp/fanlink.env "$ENV_OUT"
sudo chown root:root "$ENV_OUT"
sudo chmod 600 "$ENV_OUT"
test -s "$ENV_OUT" || { echo "[setup-ssm][ERROR] $ENV_OUT is empty"; exit 1; }
echo "[setup-ssm][OK] $ENV_OUT"
sudo ls -la "$ENV_OUT"

echo "[setup-ssm] fetching IVS playback private key from SSM..."
sudo aws ssm get-parameter \
  --region "$REGION" \
  --name "$PARAM_IVS_PEM" \
  --with-decryption \
  --query "Parameter.Value" \
  --output text \
  > /tmp/fanlink_ivs_playback.pem

sudo mv /tmp/fanlink_ivs_playback.pem "$PEM_OUT"
sudo chown root:root "$PEM_OUT"
sudo chmod 600 "$PEM_OUT"
test -s "$PEM_OUT" || { echo "[setup-ssm][ERROR] $PEM_OUT is empty"; exit 1; }
echo "[setup-ssm][OK] $PEM_OUT"
sudo ls -la "$PEM_OUT"
sudo head -n 1 "$PEM_OUT"

echo "[setup-ssm] done. ls -la $FANLINK_HOME:"
sudo ls -la "$FANLINK_HOME"
