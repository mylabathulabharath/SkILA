#!/usr/bin/env bash
# ==========================================================================
# One-shot GCP provisioning for the Judge0 exam backend.
#   Control VM (db+redis+api)  ->  Worker image  ->  MIG + autoscaler  ->  HTTPS LB
#
# This is a RUNBOOK you drive step by step, not a fire-and-forget script.
# Fill the vars, then run sections in order. Requires: gcloud, an owned domain.
# ==========================================================================
set -euo pipefail

# ---- Fill these -----------------------------------------------------------
PROJECT="<GCP_PROJECT_ID>"
REGION="asia-south1"           # match your students' location for low latency
ZONE="asia-south1-a"
NETWORK="default"
SUBNET="default"
DOMAIN="judge.yourdomain.com"  # will get a Google-managed TLS cert
WORKER_TAG="judge0-worker"
CONTROL_TAG="judge0-control"

gcloud config set project "$PROJECT"

# ==========================================================================
# 1. CONTROL VM — Postgres + Redis + Judge0 API (single node, static internal IP)
# ==========================================================================
gcloud compute addresses create judge0-control-ip \
  --region "$REGION" --subnet "$SUBNET"            # reserve internal IP
CONTROL_IP="$(gcloud compute addresses describe judge0-control-ip \
  --region "$REGION" --format='value(address)')"
echo ">>> Put this internal IP into judge0.conf (REDIS_HOST/POSTGRES_HOST) for the WORKER image: $CONTROL_IP"

# NOTE: --boot-disk-size 40GB is REQUIRED. The Judge0 image (JDK+GCC+Python+
# Node…) extracts to several GB and Docker stores it on the BOOT disk; the
# default 10GB boot disk fills up mid-pull ("no space left on device").
gcloud compute instances create judge0-control \
  --zone "$ZONE" --machine-type c2-standard-8 \
  --image-family debian-12 --image-project debian-cloud \
  --boot-disk-size 40GB \
  --network-interface "subnet=$SUBNET,private-network-ip=$CONTROL_IP,no-address" \
  --tags "$CONTROL_TAG" \
  --create-disk=name=judge0-pgdata,size=50GB,type=pd-ssd,auto-delete=no \
  --metadata-from-file startup-script=startup-control.sh
# Then: scp judge0.conf + docker-compose.control.yml to /opt/judge0, and mount
# judge0-pgdata for Postgres (or set Docker data-root to it) so DB + images do
# not compete for the boot disk under real load.
# Then: scp judge0.conf (with 127.0.0.1 hosts) + docker-compose.control.yml to /opt/judge0 and re-run startup.

# ==========================================================================
# 2. WORKER IMAGE — boot a builder, bake Docker + /opt/judge0, snapshot it
# ==========================================================================
# ⚠️ CRITICAL: the worker builder MUST be Debian 11 (kernel 5.10). On Ubuntu
# 22.04 / Debian 12 the privileged container cannot create isolate's cgroup and
# every run returns "Internal Error" (see TROUBLESHOOTING.md). Debian 11 works.
#   gcloud compute instances create judge0-worker-builder --zone "$ZONE" \
#     --machine-type c2-standard-16 --boot-disk-size 40GB \
#     --image-family debian-11 --image-project debian-cloud --tags "$WORKER_TAG"
# On the builder VM: install docker, copy judge0.conf (hosts = $CONTROL_IP)
# + docker-compose.worker.yml + startup-worker.sh into /opt/judge0, then:
gcloud compute instances stop judge0-worker-builder --zone "$ZONE"
gcloud compute images create judge0-worker-v1 \
  --source-disk judge0-worker-builder --source-disk-zone "$ZONE" \
  --family judge0-worker

# ==========================================================================
# 3. INSTANCE TEMPLATE + MANAGED INSTANCE GROUP + AUTOSCALER
# ==========================================================================
gcloud compute instance-templates create judge0-worker-tmpl \
  --machine-type c2-standard-16 \
  --image-family judge0-worker --image-project "$PROJECT" \
  --boot-disk-size 40GB \
  --network "$NETWORK" --subnet "$SUBNET" --no-address \
  --tags "$WORKER_TAG" \
  --metadata=workers-per-node=24 \
  --metadata-from-file startup-script=startup-worker.sh

gcloud compute instance-groups managed create judge0-workers \
  --region "$REGION" --template judge0-worker-tmpl --size 2

# Dedicated vCPU -> CPU target is a fair scaling signal. min=2, max=8.
gcloud compute instance-groups managed set-autoscaling judge0-workers \
  --region "$REGION" \
  --min-num-replicas 2 --max-num-replicas 8 \
  --target-cpu-utilization 0.65 --cool-down-period 90
# EXAM DAY: bump min to 4-6 ~30 min before start; drop back to 1 after.
#   gcloud compute instance-groups managed set-autoscaling judge0-workers --region $REGION --min-num-replicas 6 ...

# ==========================================================================
# 4. HTTPS LOAD BALANCER in front of the CONTROL VM's API (:2358)
# ==========================================================================
gcloud compute instance-groups unmanaged create judge0-control-ig --zone "$ZONE"
gcloud compute instance-groups unmanaged add-instances judge0-control-ig \
  --zone "$ZONE" --instances judge0-control
gcloud compute instance-groups unmanaged set-named-ports judge0-control-ig \
  --zone "$ZONE" --named-ports http:2358

gcloud compute health-checks create http judge0-hc \
  --port 2358 --request-path /languages --check-interval 10s

gcloud compute backend-services create judge0-backend \
  --protocol HTTP --port-name http --health-checks judge0-hc --global
gcloud compute backend-services add-backend judge0-backend --global \
  --instance-group judge0-control-ig --instance-group-zone "$ZONE"

gcloud compute url-maps create judge0-urlmap --default-service judge0-backend
gcloud compute ssl-certificates create judge0-cert --domains "$DOMAIN" --global
gcloud compute target-https-proxies create judge0-proxy \
  --url-map judge0-urlmap --ssl-certificates judge0-cert
gcloud compute addresses create judge0-lb-ip --global
gcloud compute forwarding-rules create judge0-fr --global \
  --target-https-proxy judge0-proxy --ports 443 --address judge0-lb-ip
echo ">>> Point $DOMAIN A-record at: $(gcloud compute addresses describe judge0-lb-ip --global --format='value(address)')"

# ==========================================================================
# 5. FIREWALL — least privilege
# ==========================================================================
# LB + Google health checks -> control VM :2358 only
gcloud compute firewall-rules create judge0-allow-lb \
  --network "$NETWORK" --direction INGRESS --action ALLOW --rules tcp:2358 \
  --source-ranges 130.211.0.0/22,35.191.0.0/16 --target-tags "$CONTROL_TAG"
# Workers -> control VM Postgres/Redis over the internal subnet only
gcloud compute firewall-rules create judge0-allow-internal-data \
  --network "$NETWORK" --direction INGRESS --action ALLOW --rules tcp:5432,tcp:6379 \
  --source-tags "$WORKER_TAG" --target-tags "$CONTROL_TAG"
# NOTE: remove any old rule that exposed :2358 to 0.0.0.0/0 on the legacy VMs.

echo "Done. Verify: curl -H 'X-Auth-Token: <AUTHN_TOKEN>' https://$DOMAIN/languages"
