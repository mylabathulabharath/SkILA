# Judge0 on GCP — Compute Engine MIG (exam backend)

Backend for a **600-student** coding exam (3 questions × 10 test cases). Judge0's
`isolate` sandbox needs a **privileged** container, which Cloud Run / GKE Autopilot
disallow — so we run it on Compute Engine.

## Architecture

```
             HTTPS LB (managed cert + AUTHN_TOKEN)
                        │
                ┌───────────────┐
   Edge fn ────▶│ Control VM     │  Postgres + Redis + Judge0 API server
  (run-code)    │ c2-standard-8  │◀──── internal VPC ────┐
                └───────────────┘                        │
                                          ┌──────────────┴───────────────┐
                                          │ Worker MIG (autoscaled 2→8)   │
                                          │ c2-standard-16, ~24 workers ea│
                                          │ judge0 workers only, shared Q │
                                          └───────────────────────────────┘
```

**Why split:** Judge0 uses one shared Redis queue + Postgres. Workers must all
point at the **same** control VM, or a `POST /submissions` on node A can't be
polled from node B. Control VM = data tier + API; MIG = stateless workers.

## Files

| File | Role |
|------|------|
| `judge0.conf` | Shared config. Fill every `<PLACEHOLDER>`; keep tokens secret. |
| `docker-compose.control.yml` | Control VM: `db` + `redis` + `server`. |
| `docker-compose.worker.yml` | Worker nodes: `workers` only (`privileged`). |
| `startup-control.sh` | Control VM boot script. |
| `startup-worker.sh` | Worker MIG boot script (scale from metadata). |
| `provision.sh` | `gcloud` runbook: VM → image → template → MIG → LB → firewall. |

## Order of operations

1. Generate secrets: `AUTHN_TOKEN`, `AUTHZ_TOKEN`, Postgres + Redis passwords
   (`openssl rand -hex 32`).
2. **Control VM:** copy `judge0.conf` (hosts = `127.0.0.1`) + `docker-compose.control.yml`
   to `/opt/judge0`, boot with `startup-control.sh`.
3. **Worker image:** on a builder VM, `judge0.conf` hosts = control VM **internal IP**;
   install Docker + `/opt/judge0`; bake image (`provision.sh` §2).
4. **MIG + autoscaler:** `provision.sh` §3 (min 2, max 8, CPU target 65%).
5. **HTTPS LB + cert + firewall:** `provision.sh` §4–5. Point DNS at the LB IP.
6. **Verify:** `curl -H 'X-Auth-Token: <AUTHN_TOKEN>' https://judge.yourdomain.com/languages`

## Wire the app (already done in code)

`supabase/functions/run-code/index.ts` reads these secrets — never hardcode:

```bash
supabase secrets set JUDGE0_URL=https://judge.yourdomain.com
supabase secrets set JUDGE0_AUTHN_TOKEN=<AUTHN_TOKEN>
# optional second LB for HA:
# supabase secrets set JUDGE0_FALLBACK_URL=https://judge2.yourdomain.com
supabase functions deploy run-code
```

The browser no longer calls Judge0 at all — all run/submit grading is
server-authoritative through `run-code`.

## Exam-day checklist

- **Load test first** (`k6`): simulate 600 users submitting near the deadline;
  watch worker CPU + Redis queue depth. Adjust MIG `max` / `workers-per-node`.
- **Pre-warm** ~30 min before: raise MIG min to 4–6.
- **After the exam:** drop MIG min to 1 so you're not paying for idle vCPUs.
- Snapshot the control VM's Postgres disk before and after.

## Capacity notes

- ~0.33 exec/s per worker (2s CPU + compile). Target ~40 exec/s ⇒ ~120 workers ⇒
  ~4–6 × c2-standard-16 at peak.
- `c2`/`c2d` dedicated vCPU is deliberate: consistent CPU = **fair time limits**.
  Do not use shared-core (`e2-*`) or Cloud Run for the executor.
- Deadline burst (~6k executions) is absorbed by the Redis queue and drained in
  a couple of minutes — students aren't blocked.
