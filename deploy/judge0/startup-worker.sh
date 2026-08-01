#!/usr/bin/env bash
# ==========================================================================
# Worker MIG startup script (runs on every autoscaled node).
# The image is pre-baked with Docker + /opt/judge0 (judge0.conf pointing at
# the control VM's internal IP + docker-compose.worker.yml), so boot is fast.
#
# WORKERS_PER_NODE is read from instance metadata so you can tune scale
# without rebaking the image:  gcloud ... --metadata=workers-per-node=24
# ==========================================================================
set -euo pipefail

WORKERS_PER_NODE="$(curl -s -H 'Metadata-Flavor: Google' \
  'http://metadata.google.internal/computeMetadata/v1/instance/attributes/workers-per-node' \
  2>/dev/null || echo 24)"

cd /opt/judge0
docker compose -f docker-compose.worker.yml up -d --scale workers="${WORKERS_PER_NODE}"

echo "Judge0 workers up: ${WORKERS_PER_NODE} on this node."
