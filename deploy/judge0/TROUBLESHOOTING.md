# Judge0 pilot — troubleshooting log

## ✅ Resolved

1. **Boot disk full (`no space left on device`)** — the Judge0 image extracts to
   several GB onto the boot disk. Default 10 GB filled mid-pull. **Fix:** boot
   disk ≥ 40 GB (`--boot-disk-size 40GB`, now in `provision.sh`).
2. **Server ↔ DB connection refused** — control `judge0.conf` had
   `POSTGRES_HOST=127.0.0.1` / `REDIS_HOST=127.0.0.1`. Inside the server
   container, 127.0.0.1 is itself. **Fix:** use the compose **service names**
   (`POSTGRES_HOST=db`, `REDIS_HOST=redis`) for the server; publish `5432`+`6379`
   on the control host so the worker VM can reach them over the VPC.

After these, the control API serves `/languages` (HTTP 200) and validates
submissions. **MCQ exams are fully unaffected and working.**

## ✅ RESOLVED — coding execution works (the isolate/cgroup blocker)

**Root cause:** Ubuntu 22.04's newer kernel + Docker cgroup-namespace behavior
prevents the privileged worker container from creating isolate's per-run cgroup,
even on forced cgroup v1. **Fix: run the WORKERS on Debian 11** (kernel 5.10) —
isolate then creates its cgroups fine and code executes. Verified end-to-end:
C, C++, Python all return correct output (status "Accepted"), queue drains, 0 failures.

Key architectural takeaways:
- **Worker image MUST be Debian 11** (`--image-family debian-11`). Ubuntu 22.04 fails.
- The **control/server VM can be anything** — it only queues jobs + reads results;
  it does NOT run isolate for the normal (async) path.
- **Never use `?wait=true`** — that makes Judge0 run isolate *synchronously on the
  server*, which fails on a non-Debian-11 server. Our `run-code` uses async
  submit + poll (correct), so this doesn't affect the app.
- After heavy manual `isolate` testing, recreate the worker container to clear
  stale box artifacts (they cause a transient `rb_sysopen /box/script.py`).

## (historical) the blocker that led here — "Internal Error"

`isolate` cannot create its per-run memory cgroup inside the Docker worker:

```
Cannot write /sys/fs/cgroup/memory/box-0/tasks: No such file or directory
```

Diagnosis (worker VM):
- Host is cgroup **v1** (`stat -fc %T /sys/fs/cgroup` = `tmpfs`) ✅
- memory/cpuacct/cpuset controllers enabled ✅
- `isolate --init` works ✅
- Host can `mkdir /sys/fs/cgroup/memory/<x>` ✅
- **Inside the worker container, `mkdir` there is `Permission denied`** ❌ — even
  privileged, even with `cgroup: host` + `/sys/fs/cgroup` bind-mounted rw. The
  container lives in cgroup `/docker/<id>` and is refused creating cgroups at the
  memory-controller root, which is where isolate's `cg_root=/sys/fs/cgroup` writes.

### Options to resolve (not yet applied)

1. **Run isolate on the bare host** (recommended for reliability): install
   `isolate` + Judge0 workers directly on the VM (systemd services, no Docker
   for the worker layer), so isolate writes root cgroups as host-root. Keep
   server/db/redis in Docker.
2. **cgroup delegation tuning**: place the worker container at the cgroup root
   (empty `cgroup_parent` + `cgroupns: host`) and mount the controller subtree
   rw so `box-N` lands under a writable path; or point isolate's `cg_root` at the
   container's own delegated cgroup.
3. **Newer Judge0 / cgroup v2 path**: evaluate a Judge0 build with cgroup v2
   support to drop the v1 requirement entirely.

Until one of these lands, **coding sections will return "Internal Error"**.
MCQ sections are production-ready.
