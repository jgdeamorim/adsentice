#!/usr/bin/env python3
"""
adsentice_preflight_debug.py — Debug direto DataForSEO
═══════════════════════════════════════════════════════════
Testa EXATAMENTE o que o pre-flight envia: limit=1, force=true.
Compara: 1 cat vs 3 cats vs 29 cats vs limit=1 vs limit=100.
medido=verdade · 2026-07-17
"""

import json, sys, time, os, base64
from pathlib import Path
from urllib.request import Request, urlopen

PROJECT_ROOT = Path(__file__).resolve().parent.parent
ENV_FILE = PROJECT_ROOT / "apps" / "web" / ".env"
LIVE = "https://api.dataforseo.com"
ENDPOINT = "/v3/business_data/business_listings/search/live"

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
    auth = base64.b64encode(f"{login}:{password}".encode()).decode()
    req = Request(f"{LIVE}{ENDPOINT}", data=json.dumps(body).encode(), headers={
        "Authorization": f"Basic {auth}", "Content-Type": "application/json",
    })
    t0 = time.time()
    resp = urlopen(req, timeout=60)
    elapsed_ms = round((time.time() - t0) * 1000)
    return json.loads(resp.read()), elapsed_ms

# ── Config ──
LAT, LNG, RADIUS = -20.3155, -40.3128, 5

CAT_1  = ["dentist"]
CAT_3  = ["dentist", "barber_shop", "beauty_salon"]
CAT_ALL = [
    "dentist", "orthodontist", "medical_aesthetic_clinic", "medical_clinic",
    "veterinarian", "psychologist", "physical_therapist", "ophthalmologist",
    "cardiologist", "restaurant", "gym", "lawyer", "beauty_salon",
    "pharmacy", "pet_store", "accountant", "car_repair", "electrician",
    "plumber", "cleaning_service", "school", "driving_school", "hotel",
    "barber_shop", "architect", "interior_designer", "real_estate_agency",
    "pizza_restaurant", "bakery",
]

login, password = load_creds()
if not login:
    print("❌ Credenciais nao encontradas")
    sys.exit(1)

print("═" * 70)
print("🧪 PRE-FLIGHT DEBUG — DataForSEO LIVE")
print(f"   Vitória/ES ({LAT}, {LNG}) · {RADIUS}km")
print(f"   Objetivo: descobrir por que limit=1 custa $0.048 e retorna 0 leads")
print("═" * 70)

tests = [
    # (label, categories, limit, desc)
    ("1 cat · limit=1",   CAT_1,   1,  "Nosso baseline — deve funcionar ($0.012)"),
    ("1 cat · limit=100", CAT_1,   100,"Controle — deve funcionar ($0.048)"),
    ("3 cats · limit=1",  CAT_3,   1,  "3 cats deve funcionar ($0.012)"),
    ("3 cats · limit=100",CAT_3,   100,"Controle 3 cats ($0.048)"),
    ("29 cats · limit=1", CAT_ALL, 1,  "⚠️ HIPOTESE: 29 cats quebra API?"),
    ("29 cats · limit=100",CAT_ALL,100,"⚠️ Confirma: 29 cats retorna 0?"),
]

total_spent = 0.0

for label, cats, limit, desc in tests:
    body = [{
        "categories": cats,
        "location_coordinate": f"{LAT},{LNG},{RADIUS}",
        "language_code": "pt",
        "limit": limit,
        "order_by": ["rating.value,desc"],
    }]

    data, elapsed = df_post(body, login, password)
    task = data.get("tasks", [{}])[0]
    status = task.get("status_code")
    cost = float(task.get("cost", 0))
    result = (task.get("result") or [{}])[0]
    items = result.get("items", [])
    total_count = result.get("total_count", 0)
    items_count = len(items)
    total_spent += cost

    print(f"\n{'─'*60}")
    print(f"  {label:25s} | status={status} | cost=${cost:.6f} | "
          f"items={items_count:>4d} | total_count={total_count:>6d} | {elapsed}ms")
    print(f"  Esperado: {desc}")

    if status != 20000:
        msg = task.get("status_message", "?")
        print(f"  ❌ ERRO API: {msg}")

    if items:
        print(f"  1º listing: {items[0].get('title', '?')[:60]}")
    elif total_count == 0:
        print(f"  ⚠️ ZERO resultados — API aceitou mas retornou vazio")

    time.sleep(0.3)

print(f"\n{'═'*70}")
print(f"📊 RESUMO")
print(f"{'═'*70}")
print(f"  Gasto total: ${total_spent:.6f}")
print(f"  Hipótese 29 cats: se total_count=0 → DataForSEO tem limite de categorias")
print(f"  Se só 1 e 3 cats funcionam → bug é 29 cats, não limit")
print(f"{'═'*70}")
