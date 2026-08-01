#!/usr/bin/env bash
# ==========================================================================
# Control-plane VM startup script.
# Installs Docker, then brings up Postgres + Redis + Judge0 server.
# Assumes /opt/judge0 already contains judge0.conf + docker-compose.control.yml
# (copied via `gcloud compute scp` or a metadata-from-file — see provision.sh).
# ==========================================================================
set -euo pipefail

if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi

cd /opt/judge0

# First boot: start db+redis, wait, then the server (it runs migrations).
docker compose -f docker-compose.control.yml up -d db redis
sleep 15
docker compose -f docker-compose.control.yml up -d server

echo "Judge0 control plane up. API on :2358 (restrict via firewall)."
