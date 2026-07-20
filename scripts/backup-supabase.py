#!/usr/bin/env python3
"""
ADSENTICE · Supabase Full Backup
REST API dump com paginação · todas as tabelas · schema + dados
medido=verdade · 2026-07-20
"""
import os, json, sys, time
from datetime import datetime, timezone
from urllib.request import Request, urlopen
from urllib.error import HTTPError

SUPA_URL = "https://tdigauruusdhnpvppixb.supabase.co"
SUPA_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
BACKUP_DIR = os.path.join(os.path.dirname(__file__), "docs/backup/2026-07-20")

if not SUPA_KEY:
    print("❌ SUPABASE_SERVICE_ROLE_KEY not set")
    sys.exit(1)

# ═══ Tables to backup (from migrations 001-020) ═══
TABLES = [
    "discovery_listings",
    "discovery_searches",
    "s10_artifacts",
    "s11_events",
    "market_holds",
    "keyword_history",
    "ibge_panorama",
    "district_registry",
    "ibge_income",
    "ibge_market_size",
    "cnpj_queue",
]

def fetch_table(table: str, select: str = "*") -> list:
    """Fetch all rows from a table using paginated REST API."""
    all_rows = []
    offset = 0
    page_size = 1000
    headers = {
        "apikey": SUPA_KEY,
        "Authorization": f"Bearer {SUPA_KEY}",
        "Accept": "application/json",
    }

    while True:
        url = f"{SUPA_URL}/rest/v1/{table}?select={select}&limit={page_size}&offset={offset}"
        req = Request(url, headers=headers)
        try:
            with urlopen(req, timeout=30) as resp:
                page = json.loads(resp.read().decode())
            if not page:
                break
            all_rows.extend(page)
            offset += page_size
            print(f"  {table}: {len(all_rows)} rows (offset {offset})")
            if len(page) < page_size:
                break
        except HTTPError as e:
            if e.code == 404:
                print(f"  {table}: NOT FOUND (empty or no access)")
                break
            print(f"  {table}: HTTP {e.code} at offset {offset}")
            break
        except Exception as e:
            print(f"  {table}: {e}")
            break

    return all_rows

def fetch_count(table: str) -> int:
    """Get exact row count via count=exact header."""
    headers = {
        "apikey": SUPA_KEY,
        "Authorization": f"Bearer {SUPA_KEY}",
        "Accept": "application/json",
        "Prefer": "count=exact",
    }
    url = f"{SUPA_URL}/rest/v1/{table}?select=id&limit=1"
    req = Request(url, headers=headers)
    try:
        with urlopen(req, timeout=10) as resp:
            content_range = resp.headers.get("content-range", "")
            # Format: "0-0/5745"
            if "/" in content_range:
                return int(content_range.split("/")[-1])
    except:
        pass
    return -1

def main():
    os.makedirs(BACKUP_DIR, exist_ok=True)

    manifest = {
        "backup_date": datetime.now(timezone.utc).isoformat(),
        "supabase_url": SUPA_URL,
        "tables": {},
        "total_rows": 0,
    }

    print(f"📦 ADSENTICE · Full Backup · {BACKUP_DIR}")
    print(f"🕐 {manifest['backup_date']}")
    print()

    for table in TABLES:
        print(f"📋 {table}:")

        # Get count first
        count = fetch_count(table)
        print(f"  Count: {count}")

        # Fetch all rows
        rows = fetch_table(table)

        # Save to JSON file
        filepath = os.path.join(BACKUP_DIR, f"{table}.json")
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(rows, f, ensure_ascii=False, default=str)

        file_size = os.path.getsize(filepath)
        size_mb = file_size / (1024 * 1024)
        print(f"  Saved: {len(rows)} rows · {size_mb:.2f} MB")

        manifest["tables"][table] = {
            "rows": len(rows),
            "count_exact": count,
            "file": f"{table}.json",
            "size_bytes": file_size,
        }
        manifest["total_rows"] += len(rows)
        print()

    # ═══ Save manifest ═══
    manifest_path = os.path.join(BACKUP_DIR, "manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    # ═══ Summary ═══
    total_size = sum(t["size_bytes"] for t in manifest["tables"].values())
    print("═" * 50)
    print(f"✅ Backup completo!")
    print(f"   Tabelas: {len(manifest['tables'])}")
    print(f"   Total rows: {manifest['total_rows']:,}")
    print(f"   Total size: {total_size / (1024*1024):.2f} MB")
    print(f"   Dir: {BACKUP_DIR}")
    print(f"   Manifest: {manifest_path}")

if __name__ == "__main__":
    main()
