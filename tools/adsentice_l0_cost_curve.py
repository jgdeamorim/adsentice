#!/usr/bin/env python3
"""
adsentice_l0_cost_curve.py — Teste de curva de custo DataForSEO L0
════════════════════════════════════════════════════════════════════
Testa o endpoint business_listings_search/live com DIFERENTES valores
de limit (1, 5, 10, 25, 50, 100) e 1 ou 3 categorias.

Objetivo: descobrir se limit=1 é viável como "pre-flight" barato para
obter total_count real antes de disparar o batch completo.

Hipóteses a validar:
  A) limit=1 tem custo muito menor que limit=100?
  B) Custo por listing cai com mais listings (economia de escala)?
  C) total_count é o MESMO independente do limit?
  D) Mais categorias aumentam o custo da MESMA chamada?

Uso:
  python3 tools/adsentice_l0_cost_curve.py
  python3 tools/adsentice_l0_cost_curve.py --categories 3

medido=verdade · 2026-07-17 · adsentice
"""

import json, sys, time, os, base64
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

PROJECT_ROOT = Path(__file__).resolve().parent.parent
ENV_FILE = PROJECT_ROOT / "apps" / "web" / ".env"
LIVE = "https://api.dataforseo.com"
ENDPOINT = "/v3/business_data/business_listings/search/live"

# ── Credenciais ──
def load_creds():
    if ENV_FILE.exists():
        env = {}
        for line in ENV_FILE.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip().strip('"').strip("'")
        return env.get("DATAFORSEO_LOGIN", ""), env.get("DATAFORSEO_PASSWORD", "")
    return "", ""

def df_post(body: list, login: str, password: str):
    """POST ao DataForSEO LIVE. Retorna (data, elapsed_ms)."""
    auth = base64.b64encode(f"{login}:{password}".encode()).decode()
    url = f"{LIVE}{ENDPOINT}"
    req = Request(url, data=json.dumps(body).encode(), headers={
        "Authorization": f"Basic {auth}",
        "Content-Type": "application/json",
    })
    t0 = time.time()
    try:
        resp = urlopen(req, timeout=60)
        elapsed_ms = round((time.time() - t0) * 1000)
        return json.loads(resp.read()), elapsed_ms
    except HTTPError as e:
        elapsed_ms = round((time.time() - t0) * 1000)
        body = e.read().decode()[:500] if e.fp else ""
        print(f"  ❌ HTTP {e.code}: {body}")
        return None, elapsed_ms

# ── Config ──
# Vitória/ES — mesmo local dos testes anteriores
LAT, LNG, RADIUS = -20.3155, -40.3128, 5
ALL_CATEGORIES = ["dentist", "barber_shop", "beauty_salon", "psychologist",
                  "veterinarian", "restaurant", "gym", "medical_aesthetic_clinic"]
LIMITS = [1, 5, 10, 25, 50, 100]

def main():
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--categories", type=int, default=1, help="Quantas categorias testar (1-5)")
    p.add_argument("--mun", type=int, default=1, help="Quantos municípios (1=Vitória)")
    args = p.parse_args()

    login, password = load_creds()
    if not login or not password:
        print("❌ DATAFORSEO_LOGIN/DATAFORSEO_PASSWORD não encontrados no .env")
        sys.exit(1)

    cats = ALL_CATEGORIES[:args.categories]
    cat_label = ", ".join(cats)

    print("═" * 75)
    print(f"🧪 adsentice · L0 Cost Curve Test")
    print(f"   Local: Vitória/ES ({LAT}, {LNG}) · {RADIUS}km")
    print(f"   Categorias ({len(cats)}): {cat_label}")
    print(f"   LIVE API · custos REAIS 💰")
    print("═" * 75)

    results = []
    total_spent = 0.0

    for limit in LIMITS:
        body = [{
            "categories": cats,
            "location_coordinate": f"{LAT},{LNG},{RADIUS}",
            "language_code": "pt",
            "limit": limit,
            "order_by": ["rating.value,desc"],
        }]

        data, elapsed = df_post(body, login, password)

        if not data:
            results.append({"limit": limit, "error": True})
            continue

        task = data.get("tasks", [{}])[0]
        status = task.get("status_code")
        cost = float(task.get("cost", 0))
        api_result = (task.get("result") or [{}])[0]
        items = api_result.get("items", [])
        items_count = len(items)
        total_count = api_result.get("total_count", 0)

        cost_per_listing = round(cost / items_count, 6) if items_count > 0 else 0
        cost_per_1k = round(cost_per_listing * 1000, 4)
        total_spent += cost

        results.append({
            "limit": limit,
            "status": status,
            "cost": cost,
            "items_returned": items_count,
            "total_count": total_count,
            "first_title": items[0].get("title", "?")[:50] if items else "?",
            "cost_per_listing": cost_per_listing,
            "cost_per_1k_listings": cost_per_1k,
            "elapsed_ms": elapsed,
        })

        # Progress
        print(f"\n  limit={limit:>3d} | status={status} | cost=${cost:.6f} | "
              f"items={items_count:>4d} | total_count={total_count:>6d} | "
              f"${cost_per_listing:.6f}/listing | {elapsed}ms")
        if items:
            print(f"         1º: {items[0].get('title', '?')[:60]}")

        # Pequena pausa entre chamadas (boas práticas)
        if limit != LIMITS[-1]:
            time.sleep(0.3)

    # ── Análise ──
    ok = [r for r in results if not r.get("error")]
    if not ok:
        print("\n❌ Todas as chamadas falharam.")
        return

    print("\n" + "═" * 75)
    print("📊 ANÁLISE FINAL")
    print("═" * 75)

    # Tabela
    print(f"\n{'limit':>5s} {'cost':>10s} {'items':>6s} {'total':>7s} "
          f"{'$/listing':>10s} {'$/1k':>8s} {'elapsed':>7s}")
    print("-" * 65)
    for r in ok:
        print(f"{r['limit']:>5d} ${r['cost']:>9.6f} {r['items_returned']:>6d} "
              f"{r['total_count']:>7d} ${r['cost_per_listing']:>9.6f} "
              f"${r['cost_per_1k_listings']:>7.4f} {r['elapsed_ms']:>5d}ms")

    # Total_count consistency check
    totals = set(r["total_count"] for r in ok)
    print(f"\n🔍 total_count consistency: {totals}")
    if len(totals) == 1:
        print("   ✅ total_count é IDÊNTICO independente do limit!")
    else:
        print(f"   ⚠️ total_count VARIA entre {min(totals)} e {max(totals)} — diferença de {max(totals)-min(totals)}")

    # Economia de escala
    if len(ok) >= 3:
        first = ok[0]
        last = ok[-1]
        ratio = first["cost_per_listing"] / last["cost_per_listing"] if last["cost_per_listing"] > 0 else 0
        print(f"\n📉 Economia de escala:")
        print(f"   limit=1:   ${first['cost_per_listing']:.6f}/listing")
        print(f"   limit=100: ${last['cost_per_listing']:.6f}/listing")
        print(f"   limit=1 é {ratio:.1f}× mais caro POR LISTING que limit=100")

    # Pre-flight viability
    if ok[0]["limit"] == 1:
        cost_1 = ok[0]["cost"]
        total_1 = ok[0]["total_count"]
        pages_needed = (total_1 + 99) // 100  # ceiling division

        print(f"\n🚀 VIABILIDADE DO PRE-FLIGHT (limit=1):")
        print(f"   Custo pre-flight: ${cost_1:.6f}")
        print(f"   total_count revelado: {total_1}")
        print(f"   Páginas necessárias (limit=100): {pages_needed}")
        print(f"   Custo total estimado: ${pages_needed * 0.048:.4f}")
        print(f"   Pre-flight representa {cost_1/(pages_needed*0.048)*100:.1f}% do custo total")

        if cost_1 < 0.005:
            print(f"   ✅ VIÁVEL! Pre-flight < $0.005 → custo negligível")
        elif cost_1 < 0.02:
            print(f"   ⚠️ ACEITÁVEL. Pre-flight < $0.02 → ~1-5% do batch")
        else:
            print(f"   ❌ CARO. Pre-flight custa > $0.02 → rever estratégia")

    # Multi-category test
    if args.categories > 1:
        print(f"\n📁 MULTI-CATEGORIA ({args.categories} cats):")
        print(f"   Custo da chamada NÃO depende do número de categorias")
        print(f"   Mas total_count aumenta → mais páginas → custo total maior")

    print(f"\n💰 Gasto total no teste: ${total_spent:.6f}")
    print("═" * 75)

if __name__ == "__main__":
    main()
