# Exam-day runbook — Judge0 coding backend

Everything is provisioned and PARKED (VMs stopped = zero compute cost). This is
the exact sequence to bring it up before an exam and take it down after.

## Current parked state (project `project-cc4991d2-a53c-4f48-a11`, zone `asia-south1-a`)

| Resource | What | State |
|----------|------|-------|
| `judge0-control` (n2-standard-4) | Postgres + Redis + Judge0 API | TERMINATED |
| `judge0-worker-2` (n2-standard-4, **Debian 11**) | Judge0 workers (isolate) | TERMINATED |
| `judge0-control-ext` | static ext IP **34.100.231.112** | reserved (stable URL) |
| `judge0-control-ip` | static internal IP 10.160.0.3 | reserved |

Secrets (AUTHN token etc.) are in the session scratchpad `judge0/secrets.env`.
Judge0 endpoint: **http://34.100.231.112:2358** (HTTP + `X-Auth-Token`).

## T-minus 1 day — quota (do this EARLY, only needed for real scale)

The project caps at **12 vCPUs globally**. That fits the 2-VM pilot but NOT 600
students. Request more in Console → IAM & Admin → Quotas → "CPUs (all regions)"
and regional CPUS/N2_CPUS in asia-south1 → **128**. Approval can take a day.

## T-minus ~45 min — bring it up

1. **Start the VMs:**
   ```bash
   gcloud compute instances start judge0-control judge0-worker-2 --zone asia-south1-a
   ```
   The startup scripts auto-run: control comes up healthy (fixed config is in
   its metadata); the worker connects to the control's Redis. Give it ~4–5 min.

2. **Verify Judge0 executes** (replace <TOKEN> from secrets.env AUTHN_TOKEN):
   ```bash
   curl -s -H "X-Auth-Token: <TOKEN>" http://34.100.231.112:2358/languages -o /dev/null -w "%{http_code}\n"
   ```
   Then a real run (async — the path the app uses):
   ```bash
   T=$(curl -s -H "X-Auth-Token: <TOKEN>" -H "Content-Type: application/json" \
     "http://34.100.231.112:2358/submissions?base64_encoded=false" \
     -d '{"language_id":71,"source_code":"print(6*7)","cpu_time_limit":2,"wall_time_limit":5,"memory_limit":128000}' | jq -r .token)
   sleep 6; curl -s -H "X-Auth-Token: <TOKEN>" "http://34.100.231.112:2358/submissions/$T?base64_encoded=false&fields=status,stdout"
   ```
   Expect `"Accepted"` / `stdout":"42\n"`. ⚠️ NEVER use `?wait=true` (runs isolate
   on the server, which fails — only the Debian-11 worker can run isolate).

3. **Wire `run-code` (ONE manual step — blocked from the assistant):**
   Set the secrets and deploy the full function from the repo:
   ```bash
   supabase secrets set JUDGE0_URL=http://34.100.231.112:2358 JUDGE0_AUTHN_TOKEN=<TOKEN>
   supabase functions deploy run-code
   ```
   (The repo `supabase/functions/run-code/index.ts` is env-based and includes the
   sectioned coding path + the legacy path. Deploy with `--no-verify-jwt` is NOT
   needed if set in config; the sectioned taker functions already run verify_jwt=false.)

4. **End-to-end check:** create a sectioned exam with a **coding** section via the
   trainer "Create Professional Exam" builder, open the public link, and submit a
   coding solution — confirm it grades. (MCQ is already verified.)

## Scaling for 600 students

- The single worker VM (8 worker processes) is fine for a pilot, NOT for 600.
- After the quota bump, follow `provision.sh`: bake a **Debian 11** worker image
  and run an autoscaling MIG (min 4–6, max 8) of `c2/n2-standard-16`. Control VM
  can stay as-is (it only queues + serves results).
- Load-test with k6 before the exam; watch Redis queue depth + worker CPU.

## After the exam — park again

```bash
gcloud compute instances stop judge0-control judge0-worker-2 --zone asia-south1-a
```
(Keeps disks + static IP so the next start is identical. To fully delete, remove
the instances, disks, addresses, and firewall rules.)

## Gotchas already solved (see TROUBLESHOOTING.md)

- Boot disk must be ≥40 GB (image is large). ✅ set.
- Control config uses `db`/`redis` service names + publishes 5432/6379. ✅ in metadata.
- Worker OS MUST be Debian 11 (Ubuntu 22.04 breaks isolate cgroups). ✅.
- Memory limit per submission ≤ 128000 (server rejects higher with HTTP 422).
