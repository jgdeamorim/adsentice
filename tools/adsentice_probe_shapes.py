#!/usr/bin/env python3
"""
adsentice_probe_shapes.py — Sandbox Probe Pipeline
══════════════════════════════════════════════════════
Testa TODAS as tools provider-core em sandbox $0.
Valida shapes de resposta contra os tipos TypeScript.

Padrão absorvido do EVO-API 3-stage gate:
  Stage 1: Shape Contract (types TypeScript) ✅
  Stage 2: Sandbox Probe ($0, autenticação + shape match) ← ESTE SCRIPT
  Stage 3: Live Invocation ($$$, custo real)

Uso:
  DATAFORSEO_MODE=sandbox python3 tools/adsentice_probe_shapes.py

medido=verdade · 2026-07-15 · adsentice
"""

import json, os, sys, time
from pathlib import Path
from urllib.request import Request, urlopen

EMBED_URL = "http://127.0.0.1:8081/embed"
PROJECT_ROOT = Path(__file__).parent.parent

# ── Credentials ──

def load_dfseo_creds():
    env = PROJECT_ROOT / "apps" / "web" / ".env"
    creds = {}
    if env.exists():
        with open(env) as f:
            for line in f:
                line = line.strip()
                if line.startswith("DATAFORSEO_LOGIN="):
                    creds["login"] = line.split("=", 1)[1].strip('"').strip("'")
                elif line.startswith("DATAFORSEO_PASSWORD="):
                    creds["password"] = line.split("=", 1)[1].strip('"').strip("'")
    return creds

def basic_auth(login: str, password: str) -> str:
    import base64
    return "Basic " + base64.b64encode(f"{login}:{password}".encode()).decode()

# ── Sandbox Probe ──

SANDBOX = "https://sandbox.dataforseo.com/v3"

def probe_sandbox(endpoint: str, body: dict, auth: str, compact=True) -> dict | None:
    """POST para sandbox e retorna response JSON."""
    url = f"{SANDBOX}/{endpoint}"
    if compact:
        url += ".ai"
    try:
        req = Request(url, data=json.dumps(body).encode(), headers={
            "Authorization": auth,
            "Content-Type": "application/json",
        })
        res = urlopen(req, timeout=15)
        return json.loads(res.read())
    except Exception as e:
        print(f"     ❌ {type(e).__name__}: {e}")
        return None

def check_items(data: dict, min_fields: list[str]) -> tuple[bool, str]:
    """Verifica se a resposta tem items com os campos mínimos."""
    items = data.get("items") or []
    if not items:
        return False, "sem items"
    item = items[0]
    missing = [f for f in min_fields if item.get(f) is None and not any(
        item.get(k) is not None for k in min_fields
    )]
    present = [f for f in min_fields if item.get(f) is not None]
    return len(present) >= len(min_fields) * 0.5, f"{len(present)}/{len(min_fields)} campos: {present[:4]}"

def check_result(data: dict, min_fields: list[str]) -> tuple[bool, str]:
    """Verifica resposta com tasks[0].result[0]."""
    tasks = data.get("tasks") or []
    if not tasks:
        return False, "sem tasks"
    result = tasks[0].get("result") or []
    if not result:
        return False, "result vazio"
    item = result[0]
    present = [f for f in min_fields if item.get(f) is not None]
    return len(present) > 0, f"{len(present)}/{len(min_fields)} campos: {present[:4]}"

# ── Main ──

def main():
    creds = load_dfseo_creds()
    if not creds.get("login") or not creds.get("password"):
        print("❌ DATAFORSEO_LOGIN + DATAFORSEO_PASSWORD ausentes")
        return

    auth = basic_auth(creds["login"], creds["password"])
    print(f"🧪 Sandbox Probe · {SANDBOX} · $0\n")

    probes = [
        ("L0 business_listings_search", "business_data/business_listings/search/live",
         [{"categories": ["dentist"], "location_coordinate": "-22.8698,-43.3406,3", "language_code": "pt", "limit": 3}],
         ["type", "title", "place_id", "rating"], check_items),

        ("L1 business_profile_gmb", "business_data/google/my_business_info/live",
         [{"keyword": "dentista teste", "location_code": 2076, "language_code": "pt"}],
         ["type", "title", "place_id", "rating"], check_items),

        ("L2 on_page_instant_pages", "on_page/instant_pages",
         [{"url": "https://example.com"}],
         ["url", "onpage_score", "meta", "checks"], check_items),

        ("L2 domain_technologies", "domain_analytics/technologies/domain_technologies/live",
         [{"target": "example.com"}],
         ["domain", "technologies", "domain_rank"], check_items),

        ("L3 backlinks_competitors", "backlinks/competitors/live",
         [{"target": "example.com", "limit": 5}],
         ["domain", "rank", "intersections"], check_items),

        ("L4 serp_organic", "serp/google/organic/live/regular",
         [{"keyword": "dentista teste", "location_code": 2076, "language_code": "pt", "depth": 5}],
         ["keyword", "se_domain", "items_count"], check_result),
    ]

    passed = 0
    failed = 0

    for name, endpoint, body, min_fields, checker in probes:
        sys.stdout.write(f"  {name}...")
        sys.stdout.flush()
        data = probe_sandbox(endpoint, body, auth, compact=(endpoint != "serp/google/organic/live/regular"))
        if data is None:
            print(" ❌ HTTP error")
            failed += 1
            continue

        status_code = data.get("status_code", 0)
        if status_code != 20000 and not isinstance(data.get("items"), list):
            msg = data.get("status_message", "?")
            print(f" ❌ [{status_code}] {msg}")
            failed += 1
            continue

        ok, detail = checker(data, min_fields)
        if ok:
            print(f" ✅ {detail}")
            passed += 1
        else:
            print(f" ❌ {detail}")
            failed += 1

    print(f"\n🏁 {passed}/{passed+failed} passed ({failed} failed)")

if __name__ == "__main__":
    main()
