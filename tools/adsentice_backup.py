#!/usr/bin/env python3
"""
adsentice_backup.py — Full Bulk Backup → Cloudflare R2
═══════════════════════════════════════════════════════════
Dump completo: Qdrant + Redis + Supabase → R2 + local fallback.

Uso:
  python3 tools/adsentice_backup.py               # backup agora
  python3 tools/adsentice_backup.py --dry-run     # simula sem upload
  python3 tools/adsentice_backup.py --local-only  # pula R2

medido=verdade · 2026-07-16 · adsentice
"""

import json, os, sys, time, hashlib, hmac, gzip, io, re, argparse, shutil, subprocess
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import urlparse

PROJECT_ROOT = Path(__file__).parent.parent
LOCAL_BACKUP_DIR = PROJECT_ROOT / "backups"
ENV_FILE = PROJECT_ROOT / "apps" / "web" / ".env"

# ── Load .env ──
def _load_env():
    env = {}
    if ENV_FILE.exists():
        for line in ENV_FILE.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip().strip('"').strip("'")
    return env

_ENV = _load_env()
QDRANT_URL = "http://127.0.0.1:6352"
REDIS_PORT = 6396
SUPABASE_URL = _ENV.get("NEXT_PUBLIC_SUPABASE_URL", "https://tdigauruusdhnpvppixb.supabase.co")
SUPABASE_KEY = _ENV.get("SUPABASE_SERVICE_ROLE_KEY", "")

R2_ACCOUNT = _ENV.get("CLOUDFLARE_R2_ACCOUNT_ID", "")
R2_ACCESS = _ENV.get("CLOUDFLARE_R2_ACCESS_KEY", "")
R2_SECRET = _ENV.get("CLOUDFLARE_R2_SECRET_KEY", "")
R2_BUCKET = _ENV.get("CLOUDFLARE_R2_BUCKET", "adsentice")
R2_ENDPOINT = f"https://{R2_ACCOUNT}.r2.cloudflarestorage.com" if R2_ACCOUNT else ""

COLLECTIONS = ["adsentice-self", "adsentice-conversation", "claude-memory", "adsentice-materio"]
SUPABASE_TABLES = ["discovery_searches", "discovery_listings", "market_holds"]


# ── R2 S3 SigV4 ──
def _sigv4(method, key, secret, region, service, url, payload_hash, headers_in):
    amz_date = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    date_short = amz_date[:8]
    parsed = urlparse(url)
    host = parsed.hostname
    canonical_uri = parsed.path or "/"
    canonical_querystring = parsed.query or ""
    headers = dict(headers_in)
    headers["Host"] = host
    headers["X-Amz-Date"] = amz_date
    headers["X-Amz-Content-SHA256"] = payload_hash
    signed_headers = ";".join(sorted(h.lower() for h in headers))
    canonical_headers = "".join(f"{h.lower()}:{headers[h]}\n" for h in sorted(headers, key=str.lower))
    canonical_request = f"{method}\n{canonical_uri}\n{canonical_querystring}\n{canonical_headers}\n{signed_headers}\n{payload_hash}"
    scope = f"{date_short}/{region}/{service}/aws4_request"
    string_to_sign = f"AWS4-HMAC-SHA256\n{amz_date}\n{scope}\n{hashlib.sha256(canonical_request.encode()).hexdigest()}"
    k_date = hmac.new(f"AWS4{secret}".encode(), date_short.encode(), hashlib.sha256).digest()
    k_region = hmac.new(k_date, region.encode(), hashlib.sha256).digest()
    k_service = hmac.new(k_region, service.encode(), hashlib.sha256).digest()
    k_signing = hmac.new(k_service, b"aws4_request", hashlib.sha256).digest()
    signature = hmac.new(k_signing, string_to_sign.encode(), hashlib.sha256).hexdigest()
    auth = f"AWS4-HMAC-SHA256 Credential={key}/{scope},SignedHeaders={signed_headers},Signature={signature}"
    return auth, amz_date, headers


def r2_put(key, data, content_type="application/json"):
    if not R2_ACCOUNT: return False
    url = f"{R2_ENDPOINT}/{R2_BUCKET}/{key}"
    payload_hash = hashlib.sha256(data).hexdigest()
    auth, amz_date, headers = _sigv4("PUT", R2_ACCESS, R2_SECRET, "auto", "s3", url, payload_hash, {"Content-Type": content_type})
    headers["Authorization"] = auth
    try:
        resp = urlopen(Request(url, data=data, headers=headers, method="PUT"), timeout=30)
        return resp.status == 200
    except Exception as e:
        print(f"  ⚠️ R2 upload failed: {e}")
        return False


# ── Dumpers ──

def dump_qdrant():
    print("📦 Qdrant...")
    results = {}
    for col in COLLECTIONS:
        points, offset = [], None
        while True:
            body = {"limit": 100, "with_payload": True, "with_vector": False}
            if offset: body["offset"] = offset
            try:
                resp = urlopen(Request(
                    f"{QDRANT_URL}/collections/{col}/points/scroll",
                    data=json.dumps(body).encode(),
                    headers={"Content-Type": "application/json"}
                ), timeout=30)
                data = json.loads(resp.read())
                result = data.get("result", {})
                pts = result.get("points", [])
                points.extend(pts)
                next_offset = result.get("next_page_offset")
                if next_offset is None or not pts: break
                offset = next_offset
            except Exception as e:
                print(f"  ⚠️ {col}: {e}"); break
        results[col] = {"count": len(points), "points": points}
        print(f"  {col}: {len(points)} pts")
    return results


def dump_redis():
    print("📦 Redis...")
    results = {}
    try:
        out = subprocess.check_output(
            ["redis-cli", "-p", str(REDIS_PORT), "--no-auth-warning", "KEYS", "adsentice:*"],
            timeout=10, stderr=subprocess.DEVNULL
        ).decode().strip()
        keys = out.split("\n") if out else []
        for key in keys:
            try:
                val = subprocess.check_output(
                    ["redis-cli", "-p", str(REDIS_PORT), "--no-auth-warning", "GET", key],
                    timeout=5, stderr=subprocess.DEVNULL
                ).decode().strip()
                results[key] = val
            except: pass
        print(f"  {len(results)} keys")
    except Exception as e:
        print(f"  ⚠️ Redis: {e}")
        results["_error"] = str(e)
    return results


def dump_supabase():
    print("📦 Supabase...")
    key = SUPABASE_KEY
    headers = {"apikey": key, "Authorization": f"Bearer {key}"}
    results = {}
    for table in SUPABASE_TABLES:
        try:
            resp = urlopen(Request(
                f"{SUPABASE_URL}/rest/v1/{table}?select=*&limit=5000",
                headers=headers
            ), timeout=30)
            data = json.loads(resp.read())
            results[table] = {"count": len(data), "rows": data}
            print(f"  {table}: {len(data)} rows")
        except Exception as e:
            print(f"  ⚠️ {table}: {e}")
            results[table] = {"count": 0, "rows": [], "_error": str(e)}
    return results


# ── Compress helper ──
def gzip_bytes(data_bytes):
    buf = io.BytesIO()
    with gzip.GzipFile(fileobj=buf, mode="wb", compresslevel=6) as gz:
        gz.write(data_bytes)
    return buf.getvalue()


# ── Incremental helpers ──
def checksum_json(obj) -> str:
    """Deterministic hash of a JSON-serializable object."""
    raw = json.dumps(obj, ensure_ascii=False, default=str, sort_keys=True).encode()
    return hashlib.sha256(raw).hexdigest()[:12]

def load_prev_manifest():
    """Load previous backup manifest for incremental comparison."""
    prev_path = LOCAL_BACKUP_DIR / "latest.json"
    if prev_path.exists():
        try:
            return json.loads(prev_path.read_text())
        except: pass
    return None

# ── Main ──
def run_backup(dry_run=False, skip_r2=False):
    now = datetime.now(timezone.utc)
    date_str = now.strftime("%Y-%m-%d")
    timestamp = now.strftime("%Y-%m-%dT%H%M%SZ")
    backup_id = timestamp.lower().replace("t", "-").replace(":", "").replace("z", "")
    r2_enabled = bool(R2_ACCOUNT and not skip_r2 and not dry_run)
    prev = load_prev_manifest()

    mode = "FULL"
    if prev:
        print(f"   Previous: {prev.get('backup_id', '?')[:20]} ({prev.get('timestamp', '?')})")
    print(f"\n🧠 adsentice · {'🟢 INCREMENTAL' if prev else '🔵 FULL (primeiro)'} · {timestamp}")
    print(f"   R2: {'enabled' if r2_enabled else 'DISABLED'}")
    if dry_run: print("   DRY RUN — no uploads")

    # 1+2+3: Dumps
    qdrant = dump_qdrant()
    redis = dump_redis()
    supabase = dump_supabase()

    manifest = {
        "version": "v1.1.0",
        "backup_id": backup_id,
        "date": date_str,
        "timestamp": timestamp,
        "mode": "INCREMENTAL" if prev else "FULL",
        "parent_backup": prev.get("backup_id") if prev else None,
        "collections": {k: v["count"] for k, v in qdrant.items()},
        "redis_keys": len(redis),
        "supabase_rows": sum(v["count"] for v in supabase.values()),
        "checksums": {
            "qdrant": {k: checksum_json(v) for k, v in qdrant.items()},
            "redis": checksum_json(redis),
            "supabase": {k: checksum_json(v) for k, v in supabase.items()},
        },
        "uploaded_to_r2": [],
        "local_fallback": [],
    }

    # ── Diff vs previous (incremental) ──
    changed = {"qdrant": [], "redis": False, "supabase": []}
    if prev and prev.get("checksums"):
        pc = prev["checksums"]
        for col, chk in manifest["checksums"]["qdrant"].items():
            if pc.get("qdrant", {}).get(col) != chk:
                changed["qdrant"].append(col)
        changed["redis"] = pc.get("redis") != manifest["checksums"]["redis"]
        for tbl, chk in manifest["checksums"]["supabase"].items():
            if pc.get("supabase", {}).get(tbl) != chk:
                changed["supabase"].append(tbl)

        total_changed = len(changed["qdrant"]) + (1 if changed["redis"] else 0) + len(changed["supabase"])
        if total_changed == 0:
            print(f"\n📊 NADA mudou desde {prev['backup_id'][:20]}. Pulando R2 (full local ainda será salvo).")
            mode = "NOOP"
            manifest["mode"] = "NOOP"
            manifest["changed"] = changed
        else:
            print(f"\n📊 Mudanças detectadas ({total_changed}):")
            for c in changed["qdrant"]: print(f"   Qdrant: {c}")
            if changed["redis"]: print(f"   Redis: alterado")
            for t in changed["supabase"]: print(f"   Supabase: {t}")
            manifest["changed"] = changed
            mode = "INCREMENTAL"
            manifest["mode"] = "INCREMENTAL"
    else:
        changed = {"qdrant": list(qdrant.keys()), "redis": True, "supabase": list(supabase.keys())}
        manifest["changed"] = changed
        mode = "FULL"
        manifest["mode"] = "FULL"

    bundle = json.dumps({"manifest": manifest, "qdrant": qdrant, "redis": redis, "supabase": supabase}, ensure_ascii=False, default=str).encode()
    gz = gzip_bytes(bundle)
    print(f"\n📦 Bundle: {len(bundle)/1024/1024:.1f} MB → {len(gz)/1024/1024:.1f} MB compressed")

    # ── R2 Upload (incremental: só changed + full bundle sempre) ──
    r2_ok = 0
    if r2_enabled and mode != "NOOP":
        print(f"\n☁️ Uploading to R2 ({mode})...")
        base = f"backup/{date_str}"

        # Full bundle — sempre (referência completa)
        if r2_put(f"{base}/adsentice-backup-{backup_id}.json.gz", gz, "application/gzip"):
            manifest["uploaded_to_r2"].append(f"{base}/adsentice-backup-{backup_id}.json.gz")
            r2_ok += 1

        # Per-collection: só changed
        for col in changed.get("qdrant", []):
            data = qdrant.get(col)
            if not data: continue
            col_gz = gzip_bytes(json.dumps(data, ensure_ascii=False, default=str).encode())
            if r2_put(f"{base}/qdrant/{col}.json.gz", col_gz, "application/gzip"):
                manifest["uploaded_to_r2"].append(f"{base}/qdrant/{col}.json.gz")
                r2_ok += 1

        # Redis: só changed
        if changed.get("redis"):
            redis_gz = gzip_bytes(json.dumps(redis, ensure_ascii=False, default=str).encode())
            if r2_put(f"{base}/redis.json.gz", redis_gz, "application/gzip"):
                manifest["uploaded_to_r2"].append(f"{base}/redis.json.gz")
                r2_ok += 1

        # Supabase: só changed tables
        for tbl in changed.get("supabase", []):
            data = supabase.get(tbl)
            if not data: continue
            tbl_gz = gzip_bytes(json.dumps(data, ensure_ascii=False, default=str).encode())
            if r2_put(f"{base}/supabase/{tbl}.json.gz", tbl_gz, "application/gzip"):
                manifest["uploaded_to_r2"].append(f"{base}/supabase/{tbl}.json.gz")
                r2_ok += 1

        print(f"   R2: {r2_ok} files uploaded ({mode})")
    elif r2_enabled and mode == "NOOP":
        print(f"\n☁️ R2: skipping (nothing changed since {prev.get('backup_id', '?')[:20]})")
    elif not r2_enabled:
        print(f"\n☁️ R2: disabled")

    # ── Local fallback ──
    print("\n💾 Local fallback...")
    LOCAL_BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    date_dir = LOCAL_BACKUP_DIR / date_str
    date_dir.mkdir(exist_ok=True)
    local_path = date_dir / f"adsentice-backup-{backup_id}.json.gz"
    local_path.write_bytes(gz)
    manifest["local_fallback"].append(str(local_path))
    print(f"   ✅ {local_path}")

    # Rotate old (>30d)
    for d in LOCAL_BACKUP_DIR.iterdir():
        if d.is_dir() and d.name != date_str:
            try:
                age = (datetime.now() - datetime.fromisoformat(d.name)).days
                if age > 30: shutil.rmtree(d); print(f"   🗑️ removed {d.name}")
            except: pass

    # Latest manifest
    (LOCAL_BACKUP_DIR / "latest.json").write_text(json.dumps(manifest, ensure_ascii=False, default=str, indent=2))

    print(f"\n✅ BACKUP COMPLETO · {backup_id}")
    print(f"   R2: {r2_ok} files · Local: {len(gz)/1024/1024:.1f} MB")
    print(f"   Qdrant: {manifest['collections']}")
    print(f"   Redis: {manifest['redis_keys']} keys · Supabase: {manifest['supabase_rows']} rows")
    return manifest


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="adsentice — Full Bulk Backup → R2")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--local-only", action="store_true")
    args = ap.parse_args()
    run_backup(dry_run=args.dry_run, skip_r2=args.local_only)
