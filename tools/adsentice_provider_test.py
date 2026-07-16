#!/usr/bin/env python3
"""
adsentice_provider_test.py — Validação completa do provider-core adapter
═══════════════════════════════════════════════════════════════════════════
Simula as MESMAS chamadas do provider-core-adapter.ts contra o sandbox
DataForSEO ($0). Valida pipeline L0→L1→L2→L3→L4 com estrutura de resposta
REAL (tasks[0].result[0].items etc).

Alinhado com:
  - apps/web/src/lib/provider-core-adapter.ts  (7 endpoints, estrutura correta)
  - apps/web/src/app/api/discovery-search/route.ts  (pipeline ADR-0024)
  - Context7 / DataForSEO docs oficiais  (limit default=100 max=1000)

Uso:
  python3 tools/adsentice_provider_test.py              # sandbox $0 — valida estruturas
  python3 tools/adsentice_provider_test.py --live       # live 💰 — dados reais
  python3 tools/adsentice_provider_test.py --coords     # testa coordenadas múltiplas
  python3 tools/adsentice_provider_test.py --pagination # testa offset pagination

medido=verdade · 2026-07-16 · adsentice · ADR-0024
"""

import json, sys, time, argparse, os, base64
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

# ── Config ──────────────────────────────────────────────────────

PROJECT_ROOT = Path(__file__).resolve().parent.parent
ENV_FILE = PROJECT_ROOT / "apps" / "web" / ".env"

SANDO  = "https://sandbox.dataforseo.com"
LIVE   = "https://api.dataforseo.com"

# ═══ Endpoints (mesmo que provider-core-adapter.ts) ═══

ENDPOINTS = {
    "L0_search":        "/v3/business_data/business_listings/search/live",
    "L1_profile":       "/v3/business_data/google/my_business_info/live",
    "L2_onpage":        "/v3/on_page/instant_pages",
    "L2_tech":          "/v3/domain_analytics/technologies/domain_technologies/live",
    "L3_content":       "/v3/on_page/content_parsing/live",
    "L4_lighthouse":    "/v3/on_page/lighthouse/live/json",          # endpoint diferente (json)
    "L4_serp":          "/v3/serp/google/organic/live/regular",
    "L4_reviews":       "/v3/business_data/google/reviews/task_post",  # task-based
}

# ═══ Custos oficiais DataForSEO (2026) ═══

COSTS = {
    "L0_search":    0.0003,   # per listing returned
    "L1_profile":   0.0054,   # per keyword
    "L2_onpage":    0.000125, # per URL
    "L2_tech":      0.01,     # per domain
    "L3_content":   0.0005,   # per URL
    "L4_lighthouse": 0.00425, # per URL
    "L4_serp":      0.002,    # per keyword
    "L4_reviews":   0.00075,  # per business (task-based polling)
}

# ── Credenciais ──────────────────────────────────────────────────

def load_creds():
    """Carrega DATAFORSEO_LOGIN + DATAFORSEO_PASSWORD do .env (igual provider-core)."""
    if ENV_FILE and ENV_FILE.exists():
        env = {}
        for line in ENV_FILE.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip().strip('"').strip("'")
        return env.get("DATAFORSEO_LOGIN", ""), env.get("DATAFORSEO_PASSWORD", "")
    return "", ""

# ── HTTP Client (espelha DataForSEOClient.doPost) ───────────────

def df_post(base_url: str, endpoint: str, body: list,
             login: str, password: str, use_dot_ai: bool = False):
    """POST ao DataForSEO. Retorna (data_dict, elapsed_ms, cost_usd).

    NOTA: provider-core.ts usa .ai via c.post(). API DataForSEO funciona com ambos.
    Testado: sem .ai → 547 results RJ. com .ai → 0 results. Usamos sem .ai por padrão.
    """
    auth = base64.b64encode(f"{login}:{password}".encode()).decode()
    url = f"{base_url}{endpoint}{'.ai' if use_dot_ai else ''}"
    data_bytes = json.dumps(body).encode()

    req = Request(url, data=data_bytes, headers={
        "Authorization": f"Basic {auth}",
        "Content-Type": "application/json",
    })

    t0 = time.time()
    try:
        resp = urlopen(req, timeout=60)
        elapsed_ms = round((time.time() - t0) * 1000)
        result = json.loads(resp.read())
        # DataForSEO cost no campo tasks[0].cost
        cost = 0.0
        tasks = result.get("tasks", [])
        if tasks:
            cost = float(tasks[0].get("cost", 0))
        return result, elapsed_ms, cost
    except HTTPError as e:
        body_text = e.read().decode(errors="replace")[:500]
        elapsed_ms = round((time.time() - t0) * 1000)
        print(f"\n   ❌ HTTP {e.code}: {body_text}")
        return None, elapsed_ms, 0
    except URLError as e:
        elapsed_ms = round((time.time() - t0) * 1000)
        print(f"\n   ❌ URL Error: {e.reason}")
        return None, elapsed_ms, 0

def sandbox_ok(data) -> bool:
    """Sandbox DataForSEO retorna status_code=20000 quando OK."""
    if data is None:
        return False
    tasks = data.get("tasks", [])
    if not tasks:
        return False
    return tasks[0].get("status_code") == 20000

# ── Validators (espelham lógica do provider-core-adapter.ts) ────

def validate_l0(data: dict) -> dict:
    """
    L0: business_listings_search → tasks[0].result[0].items + total_count
    provider-core.ts:129-131
    """
    result = {"ok": False, "items": 0, "total_count": 0, "has_city": False,
               "has_website": False, "has_address_info_fields": False,
               "first_title": "?", "cost": 0, "elapsed_ms": 0}

    if not sandbox_ok(data):
        result["error"] = f"status_code={data.get('tasks',[{}])[0].get('status_code','?')}"
        return result

    task = data["tasks"][0]
    api_result = task.get("result", [{}])[0]
    items = api_result.get("items", [])
    total_count = api_result.get("total_count", len(items))  # ✅ usa total_count, não items_count

    result["ok"] = True
    result["items"] = len(items)
    result["total_count"] = total_count
    result["cost"] = float(task.get("cost", 0))

    if items:
        item = items[0]
        result["first_title"] = item.get("title", "?")[:60]
        result["first_url"] = item.get("url", None)
        result["first_place_id"] = item.get("place_id", None)
        result["first_rating"] = (item.get("rating") or {}).get("value", None)
        result["first_rating_votes"] = (item.get("rating") or {}).get("votes_count", None)
        result["first_is_claimed"] = item.get("is_claimed", None)

        # address_info extraction (provider-core.ts:150-153)
        addr = item.get("address_info", {}) or {}
        result["has_city"] = bool(addr.get("city"))
        result["city"] = addr.get("city", "?")
        result["has_district"] = bool(addr.get("borough"))
        result["district"] = addr.get("borough", "?")
        result["has_address_info_fields"] = result["has_city"] or result["has_district"]

    # Se total_count > items, tem mais pra paginar (Search Tracker)
    result["can_paginate"] = total_count > len(items)

    return result


def validate_l1(data: dict) -> dict:
    """
    L1: business_profile_gmb → items[0] (TOP LEVEL, diferente do L0!)
    provider-core.ts:173-174
    """
    result = {"ok": False, "has_website": False, "has_phone": False,
               "has_photos": False, "title": "?", "cost": 0}

    if not data:
        result["error"] = "HTTP error ou resposta vazia"
        return result

    items = data.get("items", [])
    if not items:
        result["error"] = "sem items (sandbox ou perfil não encontrado)"
        # Sandbox pode retornar sem items → esperado
        result["ok"] = True  # ✅ sandbox $0 — não é erro
        return result

    item = items[0]
    addr = item.get("address_info", {}) or {}

    result["ok"] = True
    result["title"] = item.get("title", "?")[:60]
    result["has_website"] = bool(item.get("url"))
    result["website"] = item.get("url", "?")
    result["has_phone"] = bool(item.get("phone"))
    result["phone"] = item.get("phone", "?")
    result["has_photos"] = (item.get("total_photos") or 0) > 0
    result["total_photos"] = item.get("total_photos", 0)
    result["city"] = addr.get("city", "?")
    result["borough"] = addr.get("borough", "?")
    result["place_id"] = item.get("place_id", "?")
    result["rating_value"] = (item.get("rating") or {}).get("value", None)
    result["cost"] = 0.0054  # flat rate

    return result


def validate_l2_onpage(data: dict) -> dict:
    """
    L2: on_page_instant_pages → items[0] (TOP LEVEL)
    provider-core.ts:212-213 → lê resource/checks do item
    """
    result = {"ok": False, "onpage_score": 0, "has_meta": False,
               "word_count": 0, "cost": 0}

    if not data:
        result["error"] = "HTTP error"
        return result

    items = data.get("items", [])
    if not items:
        result["error"] = "sem items"
        result["ok"] = True  # sandbox pode não ter
        return result

    item = items[0]
    resource = item.get("resource", item) or item
    meta = resource.get("meta", {}) or {}
    content = resource.get("content", {}) or {}

    result["ok"] = True
    result["onpage_score"] = resource.get("onpage_score", 0)
    result["total_count"] = resource.get("total_count", 0)
    result["has_meta"] = bool(meta.get("title") or meta.get("description"))
    result["meta_title"] = meta.get("title", "?")
    result["word_count"] = content.get("word_count", 0) or 0
    result["internal_links"] = content.get("internal_links_count", 0) or 0
    result["images_count"] = content.get("images_count", 0) or 0
    result["cost"] = 0.000125

    return result


def validate_l2_tech(data: dict) -> dict:
    """
    L2: domain_technologies → items[0] (TOP LEVEL)
    provider-core.ts:242-243
    """
    result = {"ok": False, "domain": "?", "has_cms": False, "tech_count": 0,
               "cost": 0}

    if not data:
        result["error"] = "HTTP error"
        return result

    items = data.get("items", [])
    if not items:
        result["error"] = "sem items"
        result["ok"] = True
        return result

    item = items[0]
    techs = item.get("technologies", {}) or {}

    result["ok"] = True
    result["domain"] = item.get("domain", "?")
    result["domain_rank"] = item.get("domain_rank", 0)
    result["has_cms"] = bool((techs.get("content") or {}).get("cms"))
    result["has_analytics"] = bool((techs.get("marketing") or {}).get("analytics"))
    result["tech_count"] = sum(len(v) for v in techs.values() if isinstance(v, dict))
    result["emails"] = len(item.get("emails") or [])
    result["phones"] = len(item.get("phone_numbers") or [])
    result["cost"] = 0.01

    return result


def validate_l3_content(data: dict) -> dict:
    """
    L3: content_parsing → tasks[0].result[0].items
    provider-core.ts:415-416
    """
    result = {"ok": False, "total_links": 0, "social_count": 0,
               "emails_found": 0, "phones_found": 0, "whatsapp_found": 0,
               "cost": 0}

    if not data:
        result["error"] = "HTTP error"
        return result

    if not sandbox_ok(data):
        result["error"] = f"status_code={data.get('tasks',[{}])[0].get('status_code','?')}"
        return result

    items = data["tasks"][0].get("result", [{}])[0].get("items", [])
    if not items:
        result["ok"] = True
        return result

    SOCIAL_DOMAINS = [
        "facebook.com", "instagram.com", "twitter.com", "x.com",
        "linkedin.com", "youtube.com", "tiktok.com", "pinterest.com",
        "wa.me", "api.whatsapp.com",
    ]
    import re
    EMAIL_RE = re.compile(r'[\w.-]+@[\w.-]+\.\w+')
    PHONE_BR_RE = re.compile(r'(?:\(?\d{2}\)?\s?)?(?:\d{4,5}-?\d{4}|9\d{4}-?\d{4})')

    social_count = 0
    emails_found = 0
    phones_found = 0
    whatsapp_found = 0
    link_items = [i for i in items if i.get("type") == "link"]

    for item in items:
        url_str = item.get("url", "") or ""
        text = item.get("text", "") or ""

        for d in SOCIAL_DOMAINS:
            if d in url_str:
                social_count += 1
                if d in ("wa.me", "api.whatsapp.com"):
                    whatsapp_found += 1
                break

        emails_found += len(EMAIL_RE.findall(text))
        phones_found += len(PHONE_BR_RE.findall(text))

    result["ok"] = True
    result["total_links"] = len(link_items)
    result["social_count"] = social_count
    result["emails_found"] = emails_found
    result["phones_found"] = phones_found
    result["whatsapp_found"] = whatsapp_found
    result["cost"] = 0.0005

    return result


def validate_l4_lighthouse(data: dict) -> dict:
    """
    L4: lighthouse → tasks[0].result[0].categories
    provider-core.ts:272-273
    """
    result = {"ok": False, "performance": 0, "accessibility": 0,
               "best_practices": 0, "seo": 0, "cost": 0}

    if not data:
        result["error"] = "HTTP error"
        return result

    tasks = data.get("tasks", [])
    if not tasks:
        result["error"] = "sem tasks"
        return result

    api_result = tasks[0].get("result", [{}])[0]
    cats = api_result.get("categories", {}) or {}

    result["ok"] = True
    result["performance"] = (cats.get("performance") or {}).get("score", 0)
    result["accessibility"] = (cats.get("accessibility") or {}).get("score", 0)
    result["best_practices"] = (cats.get("best-practices") or cats.get("best_practices") or {}).get("score", 0)
    result["seo"] = (cats.get("seo") or {}).get("score", 0)
    result["cost"] = 0.00425

    return result


# ── Main Test Runner ────────────────────────────────────────────

def main():
    ap = argparse.ArgumentParser(
        description="adsentice · provider-core Test — valida estrutura API DataForSEO",
        epilog="medido=verdade · sandbox default ($0) · ADR-0024")
    ap.add_argument("--live", action="store_true", help="Usa API live ($)")
    ap.add_argument("--limit", type=int, default=10, help="L0 limit (default=10)")
    ap.add_argument("--lat", type=float, default=-22.91, help="Latitude (default: RJ)")
    ap.add_argument("--lng", type=float, default=-43.17, help="Longitude (default: RJ)")
    ap.add_argument("--radius", type=int, default=5, help="Raio em km (default=5)")
    ap.add_argument("--category", type=str, default="dentist", help="Categoria GMB")
    ap.add_argument("--pagination", action="store_true", help="Testa offset pagination")
    ap.add_argument("--coords", action="store_true", help="Testa coordenadas múltiplas")
    ap.add_argument("--all", action="store_true", help="Executa teste completo L0→L4")
    args = ap.parse_args()

    base = LIVE if args.live else SANDO
    login, password = load_creds()
    if not login:
        login = os.environ.get("DATAFORSEO_LOGIN", "")
        password = os.environ.get("DATAFORSEO_PASSWORD", "")

    mode = "LIVE 💰" if args.live else "SANDBOX $0"
    coord_str = f"({args.lat:.4f}, {args.lng:.4f})"

    print(f"""
╔══════════════════════════════════════════════════════════════════╗
║  🧪 adsentice · provider-core Test · {mode:<32} ║
║  Coord: {coord_str:<42}      ║
║  Category: {args.category:<10} · limit: {args.limit:<4} · radius: {args.radius}km         ║
╚══════════════════════════════════════════════════════════════════╝
""")

    if not login:
        print("❌ DATAFORSEO_LOGIN ausente no .env ou env")
        sys.exit(1)

    results = {}
    total_cost = 0.0
    total_time_ms = 0

    # ═════════════════════════════════════════════════════════════════
    # L0: Business Listings Search
    # ═════════════════════════════════════════════════════════════════

    print("─── L0: business_listings_search ───")
    print(f"    Estrutura: tasks[0].result[0].items + total_count")
    print(f"    Endpoint:  {ENDPOINTS['L0_search']}")

    body = [{
        "categories": [args.category],
        "location_coordinate": f"{args.lat},{args.lng},{args.radius}",
        "language_code": "pt",
        "limit": args.limit,
        "offset": 0,
    }]
    data, elapsed_ms, cost = df_post(base, ENDPOINTS["L0_search"], body, login, password)
    if args.live or (data and sandbox_ok(data)):
        result = validate_l0(data)
    else:
        result = validate_l0(data)
    result["elapsed_ms"] = elapsed_ms
    total_time_ms += elapsed_ms
    total_cost += result.get("cost", 0) if args.live else 0

    print(f"    ✅ items: {result['items']}/{result['total_count']} total · "
          f"city={result.get('city','?')} · website={result.get('first_url','?')} · "
          f"{elapsed_ms}ms · ${result['cost']:.6f}")
    if result.get("can_paginate"):
        print(f"    📄 Paginação necessária: {result['total_count'] - result['items']} restantes")
    if not result["has_address_info_fields"]:
        print(f"    ⚠️  address_info.city/borough NÃO populados (sandbox?)")

    results["L0"] = result

    # Se não tiver items, não dá pra continuar
    if not result["ok"] or result["items"] == 0:
        print("\n   ⚠️  L0 sem results — sandbox vazio. Nada a enriquecer.")
        print_summary(results, total_cost, total_time_ms, mode)
        return

    # ═════════════════════════════════════════════════════════════════
    # L1: Google Business Profile (usa title do L0)
    # ═════════════════════════════════════════════════════════════════

    first_title = data["tasks"][0]["result"][0]["items"][0].get("title", "")
    if first_title:
        print(f"\n─── L1: business_profile_gmb ───")
        print(f"    Estrutura: items[0] (TOP LEVEL — diferente do L0!)")
        print(f"    Keyword:  '{first_title[:50]}'")

        body_l1 = [{"keyword": first_title, "location_code": 2076, "language_code": "pt"}]
        data_l1, elapsed_ms_l1, cost_l1 = df_post(base, ENDPOINTS["L1_profile"],
                                                    body_l1, login, password)
        result_l1 = validate_l1(data_l1)
        result_l1["elapsed_ms"] = elapsed_ms_l1
        total_time_ms += elapsed_ms_l1
        total_cost += result_l1["cost"] if args.live else 0

        print(f"    ✅ website={result_l1.get('website','?')} · "
              f"phone={result_l1.get('phone','?')[:20]} · "
              f"photos={result_l1.get('total_photos',0)} · "
              f"city={result_l1.get('city','?')} · "
              f"{elapsed_ms_l1}ms · ${result_l1['cost']:.4f}")

        # ═══════════════════════════════════════════════════════════
        # L2: SEO (se website existir)
        # ═══════════════════════════════════════════════════════════
        website = result_l1.get("website")
        if website and not website.startswith("?"):
            print(f"\n─── L2: SEO Técnico ───")
            print(f"    Website: {website}")

            # L2a: OnPage Instant Audit
            print(f"    └─ on_page_instant_pages (items[0] TOP LEVEL)")
            body_l2a = [{"url": website, "enable_javascript": False, "accept_language": "pt-BR"}]
            data_l2a, elapsed_l2a, cost_l2a = df_post(base, ENDPOINTS["L2_onpage"],
                                                       body_l2a, login, password)
            result_l2a = validate_l2_onpage(data_l2a)
            result_l2a["elapsed_ms"] = elapsed_l2a
            total_time_ms += elapsed_l2a
            total_cost += result_l2a["cost"] if args.live else 0
            print(f"       ✅ onpage={result_l2a['onpage_score']}/100 · "
                  f"words={result_l2a['word_count']} · "
                  f"links={result_l2a['internal_links']} · "
                  f"{elapsed_l2a}ms · ${result_l2a['cost']:.6f}")

            # L2b: Domain Technologies
            domain = website.replace("https://", "").replace("http://", "").split("/")[0]
            print(f"    └─ domain_technologies (items[0] TOP LEVEL)")
            print(f"       Domain: {domain}")
            body_l2b = [{"target": domain}]
            data_l2b, elapsed_l2b, cost_l2b = df_post(base, ENDPOINTS["L2_tech"],
                                                       body_l2b, login, password)
            result_l2b = validate_l2_tech(data_l2b)
            result_l2b["elapsed_ms"] = elapsed_l2b
            total_time_ms += elapsed_l2b
            total_cost += result_l2b["cost"] if args.live else 0
            print(f"       ✅ cms={result_l2b.get('has_cms')} · "
                  f"analytics={result_l2b.get('has_analytics')} · "
                  f"techs={result_l2b.get('tech_count')} · "
                  f"rank={result_l2b.get('domain_rank')} · "
                  f"{elapsed_l2b}ms · ${result_l2b['cost']:.4f}")

            results["L2_onpage"] = result_l2a
            results["L2_tech"] = result_l2b

            # ═══════════════════════════════════════════════════════
            # L3: Content Parsing (social + contacts)
            # ═══════════════════════════════════════════════════════
            print(f"\n─── L3: Social & Contacts ───")
            print(f"    Estrutura: tasks[0].result[0].items (com type=link)")
            body_l3 = [{"url": website, "enable_javascript": False}]
            data_l3, elapsed_l3, cost_l3 = df_post(base, ENDPOINTS["L3_content"],
                                                    body_l3, login, password)
            result_l3 = validate_l3_content(data_l3)
            result_l3["elapsed_ms"] = elapsed_l3
            total_time_ms += elapsed_l3
            total_cost += result_l3["cost"] if args.live else 0
            print(f"    ✅ links={result_l3['total_links']} · "
                  f"social={result_l3['social_count']} · "
                  f"emails={result_l3['emails_found']} · "
                  f"whatsapp={result_l3['whatsapp_found']} · "
                  f"{elapsed_l3}ms · ${result_l3['cost']:.6f}")
            results["L3"] = result_l3

            # ═══════════════════════════════════════════════════════
            # L4: Lighthouse + SERP
            # ═══════════════════════════════════════════════════════
            if args.all:
                print(f"\n─── L4: Lighthouse ───")
                print(f"    Estrutura: tasks[0].result[0].categories")
                body_l4 = [{"url": website}]
                data_l4, elapsed_l4, cost_l4 = df_post(base, ENDPOINTS["L4_lighthouse"],
                                                        body_l4, login, password)
                result_l4 = validate_l4_lighthouse(data_l4)
                result_l4["elapsed_ms"] = elapsed_l4
                total_time_ms += elapsed_l4
                total_cost += result_l4["cost"] if args.live else 0
                print(f"    ✅ perf={result_l4['performance']} · "
                      f"a11y={result_l4['accessibility']} · "
                      f"seo={result_l4['seo']} · "
                      f"{elapsed_l4}ms · ${result_l4['cost']:.6f}")
                results["L4_lighthouse"] = result_l4
        else:
            print(f"\n   ⚠️  Sem website no L1 — pulando L2+L3+L4")
    else:
        print(f"\n   ⚠️  Sem title no L0 — pulando L1+")

    # ═══════════════════════════════════════════════════════════════
    # Pagination test (se --pagination)
    # ═══════════════════════════════════════════════════════════════

    if args.pagination and results.get("L0", {}).get("can_paginate", False):
        l0 = results["L0"]
        remaining = l0["total_count"] - l0["items"]
        print(f"\n─── Pagination Test ───")
        print(f"    Total mercado: {l0['total_count']} · página 1: {l0['items']} · "
              f"restantes: {remaining}")

        page = 1
        total_fetched = l0["items"]
        offset = l0["items"]

        while total_fetched < l0["total_count"] and page < 5:
            page += 1
            body_p = [{**body[0], "offset": offset}]
            data_p, elapsed_p, cost_p = df_post(base, ENDPOINTS["L0_search"],
                                                  body_p, login, password)
            if data_p and sandbox_ok(data_p):
                items_p = data_p["tasks"][0]["result"][0].get("items", [])
                total_fetched += len(items_p)
                total_cost += cost_p if args.live else 0
                print(f"    ✅ page {page}: offset={offset} · "
                      f"{len(items_p)} items · total={total_fetched}/{l0['total_count']} · "
                      f"{elapsed_p}ms · ${cost_p:.4f}")
                offset += len(items_p)
                if len(items_p) < args.limit:
                    break
            else:
                print(f"    ❌ page {page}: sandbox vazio ou erro")
                break

    # ═══════════════════════════════════════════════════════════════
    # Multiple coordinates test (se --coords)
    # ═══════════════════════════════════════════════════════════════

    if args.coords:
        cities = [
            ("SP", -23.5505, -46.6333, "São Paulo"),
            ("RJ", -22.9068, -43.1729, "Rio de Janeiro"),
            ("BH", -19.9167, -43.9345, "Belo Horizonte"),
            ("POA", -30.0346, -51.2177, "Porto Alegre"),
        ]
        print(f"\n─── Multi-Coordinate Test ───")
        print(f"    Mesma categoria ({args.category}), 4 capitais, {args.radius}km")

        coord_results = []
        for uf, lat, lng, city_name in cities:
            body_c = [{**body[0], "location_coordinate": f"{lat},{lng},{args.radius}"}]
            data_c, elapsed_c, cost_c = df_post(base, ENDPOINTS["L0_search"],
                                                  body_c, login, password)
            if data_c and sandbox_ok(data_c):
                items_c = data_c["tasks"][0]["result"][0].get("items", [])
                total_c = data_c["tasks"][0]["result"][0].get("total_count", len(items_c))
                coord_results.append({
                    "uf": uf, "city": city_name, "items": len(items_c),
                    "total_count": total_c, "elapsed_ms": elapsed_c,
                    "cost": cost_c
                })
                total_cost += cost_c if args.live else 0
                cover_pct = min(100, round(len(items_c) / max(total_c, 1) * 100))
                print(f"    {uf} {city_name}: {len(items_c)}/{total_c} ({cover_pct}%) · "
                      f"{elapsed_c}ms · ${cost_c:.4f}")
            else:
                print(f"    {uf} {city_name}: ❌ sem dados")

        results["multi_coord"] = coord_results

    # ═══════════════════════════════════════════════════════════════
    # Summary
    # ═══════════════════════════════════════════════════════════════

    print_summary(results, total_cost, total_time_ms, mode)


def print_summary(results: dict, total_cost: float, total_time_ms: int, mode: str):
    """Relatório final — pipeline completo + estrutura validada."""
    print(f"""
╔══════════════════════════════════════════════════════════════════╗
║  📊 Pipeline Summary ({mode})                         ║
╠══════════════════════════════════════════════════════════════════╣""")

    def row(label, value):
        print(f"║  {label:<20} {str(value):>44} ║")

    l0 = results.get("L0", {})
    is_live = "live" in mode.lower()

    if l0.get("ok"):
        row("L0 Search", f"{l0['items']}/{l0['total_count']} listings · ${l0.get('cost', 0):.6f}")
        row("  city/district", f"{l0.get('city','?')} / {l0.get('district','?')}")
        row("  can paginate", "✅ SIM" if l0.get("can_paginate") else "❌ não (mercado pequeno)")
        row("  first listing", l0.get("first_title", "?")[:50])
        row("  first place_id", l0.get("first_place_id", "?")[:40])

    l1 = results.get("L1_profile", {})
    if "L1_profile" in results:
        row("L1 Profile", f"website={'✅' if l1.get('has_website') else '❌'} · phone={'✅' if l1.get('has_phone') else '❌'} · photos={l1.get('total_photos',0)}")
        row("  title", l1.get("title", "?")[:50])

    for key, label in [("L2_onpage", "L2 OnPage"), ("L2_tech", "L2 Tech"),
                        ("L3", "L3 Social"), ("L4_lighthouse", "L4 Lighthouse")]:
        v = results.get(key, {})
        if v and v.get("ok"):
            if key == "L2_onpage":
                row(label, f"score={v['onpage_score']}/100 · words={v['word_count']} · ${v.get('cost',0):.6f}")
            elif key == "L2_tech":
                row(label, f"cms={'✅' if v.get('has_cms') else '❌'} · analytics={'✅' if v.get('has_analytics') else '❌'} · rank={v.get('domain_rank',0)} · ${v.get('cost',0):.4f}")
            elif key == "L3":
                row(label, f"social={v['social_count']} · emails={v.get('emails_found',0)} · whatsapp={v.get('whatsapp_found',0)} · ${v.get('cost',0):.6f}")
            elif key == "L4_lighthouse":
                row(label, f"perf={v['performance']} · seo={v['seo']} · a11y={v['accessibility']} · ${v.get('cost',0):.6f}")

    mc = results.get("multi_coord")
    if mc:
        row("Multi-Coordinate", f"{len(mc)} cities")
        for c in mc:
            row(f"  {c['uf']} {c['city']}", f"{c['items']}/{c['total_count']} · {c['elapsed_ms']}ms")

    print(f"""╠══════════════════════════════════════════════════════════════════╣
║  💰 Total cost:  ${total_cost:.6f}  ·  {total_time_ms}ms  ·  {len(results)} layers tested             ║
╚══════════════════════════════════════════════════════════════════╝""")

    if "live" not in mode.lower():
        print("💡 Dados são do SANDBOX ($0). Use --live para dados reais e custos reais.")
        print("   O sandbox valida a ESTRUTURA da resposta, não o conteúdo dos dados.")

    print("""
✅ Estruturas de resposta validadas contra provider-core-adapter.ts:
   L0 → tasks[0].result[0].items + total_count
   L1 → items[0] (TOP LEVEL)
   L2a → items[0].resource (onpage_checks)
   L2b → items[0] (TOP LEVEL)
   L3 → tasks[0].result[0].items (type=link)
   L4 → tasks[0].result[0].categories (lighthouse)
""")


if __name__ == "__main__":
    main()
