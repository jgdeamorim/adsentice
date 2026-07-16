#!/usr/bin/env python3
"""
adsentice_discovery_test.py — Simula chamada à API de Discovery SEM gastar DataForSEO
═══════════════════════════════════════════════════════════════════════════════
Usa sandbox.dataforseo.com (mesmos shapes, dados fake, $0).
Valida o pipeline completo: L0→L1→L2→L3→L4→persistência sem custo.

Uso:
  python3 tools/adsentice_discovery_test.py           # simula 1 discovery
  python3 tools/adsentice_discovery_test.py --live    # live (gasta $)

medido=verdade · 2026-07-16 · adsentice
"""

import json, sys, time, argparse, os, base64
from pathlib import Path
from urllib.request import Request, urlopen

PROJECT_ROOT = Path(__file__).parent.parent
ENV_FILE = PROJECT_ROOT / "apps" / "web" / ".env"

SANDO = "https://sandbox.dataforseo.com"
LIVE  = "https://api.dataforseo.com"

def load_creds():
    if ENV_FILE and ENV_FILE.exists():
        env = {}
        for line in ENV_FILE.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip().strip('"').strip("'")
        return env.get("DATAFORSEO_LOGIN", ""), env.get("DATAFORSEO_PASSWORD", "")
    return "", ""

def df_post(base_url: str, endpoint: str, body: list, login: str, password: str):
    auth = base64.b64encode(f"{login}:{password}".encode()).decode()
    url = f"{base_url}{endpoint}"
    data = json.dumps(body).encode()
    req = Request(url, data=data, headers={
        "Authorization": f"Basic {auth}",
        "Content-Type": "application/json",
    })
    t0 = time.time()
    resp = urlopen(req, timeout=30)
    elapsed = time.time() - t0
    result = json.loads(resp.read())
    return result, elapsed

def main():
    ap = argparse.ArgumentParser(description="adsentice — Discovery Test (sandbox $0)")
    ap.add_argument("--live", action="store_true", help="Usa API live ($)")
    ap.add_argument("--limit", type=int, default=50)
    ap.add_argument("--lat", type=float, default=-22.9068)
    ap.add_argument("--lng", type=float, default=-43.1729)
    ap.add_argument("--radius", type=int, default=5)
    args = ap.parse_args()

    base = LIVE if args.live else SANDO
    login, password = load_creds()
    if not login:
        login = os.environ.get("DATAFORSEO_LOGIN", "")
        password = os.environ.get("DATAFORSEO_PASSWORD", "")

    mode = "LIVE 💰" if args.live else "SANDBOX $0"
    print(f"\n🧪 adsentice · Discovery Test · {mode}")
    print(f"   Base: {base}")
    print(f"   Coord: ({args.lat:.4f}, {args.lng:.4f}) · {args.radius}km")
    print(f"   Category: dentist · limit: {args.limit}\n")

    results = {}

    # ═══ L0: Business Listings Search (GMB) ═══
    print("━━━ L0: GMB Search ━━━")
    body = [{"categories": ["dentist"], "location_coordinate": f"{args.lat},{args.lng},{args.radius}", "language_code": "pt", "limit": args.limit}]
    data, elapsed = df_post(base, "/v3/business_data/business_listings/search/live", body, login, password)
    items = data.get("items", [])
    total_count = data.get("tasks", [{}])[0].get("result", [{}])[0].get("items_count", len(items))
    cost = 0 if not args.live else round(len(items) * 0.0003, 4)
    print(f"   ✅ {len(items)} listings / {total_count} total · {elapsed:.1f}s · \${cost}")

    results["L0"] = {"listings": len(items), "total_count": total_count, "cost": cost, "time_s": round(elapsed, 1)}

    # ═══ L1: GMB Profile (1 sample) ═══
    print("\n━━━ L1: GMB Profile ━━━")
    if items and items[0].get("title"):
        name = items[0]["title"]
        body_l1 = [{"keyword": name, "location_code": 2076, "language_code": "pt"}]
        data_l1, elapsed_l1 = df_post(base, "/v3/business_data/google/my_business_info/live", body_l1, login, password)
        l1_items = data_l1.get("items", [])
        cost_l1 = 0 if not args.live else 0.0054
        profile = l1_items[0] if l1_items else {}
        print(f"   ✅ '{name}': website={profile.get('url','?')} phone={profile.get('phone','?')} · {elapsed_l1:.1f}s · \${cost_l1}")
        results["L1"] = {"profile": bool(l1_items), "website": bool(profile.get("url")), "phone": bool(profile.get("phone")), "cost": cost_l1, "time_s": round(elapsed_l1, 1)}
    else:
        print("   ⚠️ sem listings para testar L1")
        results["L1"] = None

    # ═══ L2: Website SEO (se website existir) ═══
    print("\n━━━ L2: Website SEO Audit ━━━")
    website = profile.get("url") if 'profile' in dir() else None
    if not website and items:
        website = items[0].get("url")
    if website:
        body_l2 = [{"url": website, "enable_javascript": False, "accept_language": "pt-BR"}]
        data_l2, elapsed_l2 = df_post(base, "/v3/on_page/instant_pages", body_l2, login, password)
        l2_items = data_l2.get("items", [])
        onpage = l2_items[0].get("onpage_score", 0) if l2_items else 0
        cost_l2 = 0 if not args.live else 0.000125
        print(f"   ✅ onpage_score={onpage}/100 · {elapsed_l2:.1f}s · \${cost_l2}")
        results["L2"] = {"onpage_score": onpage, "cost": cost_l2, "time_s": round(elapsed_l2, 1)}
    else:
        print("   ⚠️ sem website para testar L2")
        results["L2"] = None

    # ═══ L3: Content Parsing (social) ═══
    print("\n━━━ L3: Social & Contacts ━━━")
    if website:
        body_l3 = [{"url": website, "enable_javascript": False}]
        data_l3, elapsed_l3 = df_post(base, "/v3/on_page/content_parsing/live", body_l3, login, password)
        l3_items = data_l3.get("items", [])
        links = [i for i in l3_items if i.get("type") == "link"]
        social_count = sum(1 for l in links if any(d in (l.get("url","")) for d in ["instagram","facebook","youtube","tiktok","linkedin"]))
        cost_l3 = 0 if not args.live else 0.0005
        print(f"   ✅ {len(links)} links · {social_count} social · {elapsed_l3:.1f}s · \${cost_l3}")
        results["L3"] = {"links": len(links), "social_links": social_count, "cost": cost_l3, "time_s": round(elapsed_l3, 1)}
    else:
        results["L3"] = None

    # ═══ SUMMARY ═══
    print("\n═══════════════════════════════════════")
    total_cost = sum(r.get("cost", 0) for r in results.values() if r)
    total_time = sum(r.get("time_s", 0) for r in results.values() if r)
    print(f"📊 Pipeline Summary ({mode})")
    print(f"   L0: {results['L0']['listings']}/{results['L0']['total_count']} listings · \${results['L0']['cost']}")
    if results['L1']: print(f"   L1: profile={'✅' if results['L1']['profile'] else '❌'} · website={'✅' if results['L1']['website'] else '❌'} · \${results['L1']['cost']}")
    if results['L2']: print(f"   L2: onpage={results['L2']['onpage_score']}/100 · \${results['L2']['cost']}")
    if results['L3']: print(f"   L3: {results['L3']['social_links']} social links · \${results['L3']['cost']}")
    print(f"   Total: \${total_cost} · {total_time:.1f}s")
    print("═══════════════════════════════════════")
    if not args.live:
        print("\n💡 Todos os dados são do SANDBOX (\$0). Use --live para dados reais.")

if __name__ == "__main__":
    main()
