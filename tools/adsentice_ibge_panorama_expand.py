#!/usr/bin/env python3
"""
adsentice_ibge_panorama_expand.py — IBGE Panorama para TODOS municípios do district_registry
═══════════════════════════════════════════════════════════════════════════════════════════
Expande ibge_panorama de 28 capitais para 422 municípios das 28 RMs brasileiras.

Pipeline:
  1. Lê district_registry do Supabase (422 municípios)
  2. Cruza com dataset municipios-brasileiros → código IBGE 7 dígitos
  3. Para cada município, busca indicadores IBGE (pop, área, dens, PIB)
  4. Upsert no Supabase ibge_panorama

Uso:
  python3 tools/adsentice_ibge_panorama_expand.py --dry-run   # preview
  python3 tools/adsentice_ibge_panorama_expand.py             # executar

Tempo estimado: ~422 × 0.15s = ~65s
Custo: $0 (API IBGE gratuita)
medido=verdade · 2026-07-16 · adsentice
"""

import json, sys, time, argparse, gzip, os, unicodedata
from pathlib import Path
from urllib.request import Request, urlopen

PROJECT_ROOT = Path(__file__).parent.parent
ENV_FILE = PROJECT_ROOT / "apps" / "web" / ".env"
IBGE_IND = "https://servicodados.ibge.gov.br/api/v1/pesquisas/indicadores"
MUNICIPIOS_DATASET = "https://raw.githubusercontent.com/kelvins/municipios-brasileiros/main/json/municipios.json"
SUPABASE_URL = "https://tdigauruusdhnpvppixb.supabase.co"

# Indicadores (mesmo que ibge_panorama_sync.py)
INDICATORS = {
    29166: "populacao_censo",
    29171: "populacao",
    29167: "area_km2",
    29168: "densidade_demografica",
    47001: "pib_per_capita",
}

def norm(s: str) -> str:
    """Normaliza nome de município para matching."""
    return unicodedata.normalize("NFD", s.strip().lower()).encode("ascii", "ignore").decode()

def _load_env():
    env = {}
    if ENV_FILE.exists():
        for line in ENV_FILE.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip().strip('"').strip("'")
    return env

def fetch(url: str):
    try:
        req = Request(url, headers={"User-Agent": "adsentice/1.0"})
        resp = urlopen(req, timeout=15)
        raw = resp.read()
        if raw[:2] == b'\x1f\x8b':
            raw = gzip.decompress(raw)
        return json.loads(raw)
    except Exception as e:
        return None

def supabase_fetch(endpoint: str) -> list:
    env = _load_env()
    key = env.get("SUPABASE_SERVICE_ROLE_KEY", "")
    url = f"{SUPABASE_URL}/rest/v1/{endpoint}"
    headers = {"apikey": key, "Authorization": f"Bearer {key}"}
    try:
        req = Request(url, headers=headers)
        resp = urlopen(req, timeout=15)
        return json.loads(resp.read())
    except Exception as e:
        print(f"  ⚠️ Supabase fetch error: {e}")
        return []

def supabase_upsert(row: dict):
    env = _load_env()
    key = env.get("SUPABASE_SERVICE_ROLE_KEY", "")
    headers = {"apikey": key, "Authorization": f"Bearer {key}",
               "Content-Type": "application/json", "Prefer": "return=minimal"}
    try:
        body = json.dumps(row, default=str).encode('utf-8')
        urlopen(Request(f"{SUPABASE_URL}/rest/v1/ibge_panorama", data=body,
                         headers=headers, method="POST"), timeout=10)
        return True
    except Exception as e:
        try:
            err = e.read().decode() if hasattr(e, 'read') else ""
            if "23505" in err:  # duplicate key
                mid = row["municipio_id"]
                # Delete old + re-insert
                urlopen(Request(f"{SUPABASE_URL}/rest/v1/ibge_panorama?municipio_id=eq.{mid}",
                         headers={**headers, "Content-Type": "application/json"},
                         method="DELETE"), timeout=10)
                body = json.dumps(row, default=str).encode('utf-8')
                urlopen(Request(f"{SUPABASE_URL}/rest/v1/ibge_panorama", data=body,
                         headers=headers, method="POST"), timeout=10)
                return True
        except:
            pass
        return False

def main(dry_run=False):
    print(f"🧠 adsentice · IBGE Panorama Expand · 422 municípios\n")

    # ── Step 1: Load IBGE codes from dataset ──
    print("📥 Carregando dataset municipios-brasileiros...")
    coords_data = fetch(MUNICIPIOS_DATASET)
    if not coords_data:
        print("❌ Dataset offline")
        return

    ibge_map = {}
    for c in coords_data:
        ibge_map[norm(c['nome'])] = str(c['codigo_ibge'])
    print(f"   {len(ibge_map)} municípios com código IBGE")

    # ── Step 2: Load district_registry ──
    print("📥 Carregando district_registry do Supabase...")
    districts = supabase_fetch("district_registry?select=district,city,uf&limit=500")
    if not districts:
        print("❌ Supabase offline")
        return
    print(f"   {len(districts)} municípios")

    # ── Step 3: Match + build list ──
    print("🔍 Cruzando nomes com códigos IBGE...")
    to_sync = []
    no_match = []
    for r in districts:
        name = r['district']
        key = norm(name)
        code = ibge_map.get(key)
        if code:
            to_sync.append({
                "municipio_id": code,
                "municipio_nome": name,
                "uf": r.get('uf', '?'),
                "city": r['city'],
            })
        else:
            no_match.append(f"{name} ({r.get('city','?')})")
            # Try fuzzy: check if name with different accents matches
            for k, v in ibge_map.items():
                if norm(name.replace("'", " ")) == k or key.replace("d'", "d ") == k:
                    to_sync.append({"municipio_id": v, "municipio_nome": name,
                                   "uf": r.get('uf','?'), "city": r['city']})
                    no_match.pop()
                    break

    print(f"   ✅ {len(to_sync)} matched · ❌ {len(no_match)} no match")
    if no_match:
        print(f"   No match: {no_match[:10]}")

    if dry_run:
        print(f"\n🔍 {len(to_sync)} municípios para sincronizar (dry run)")
        for m in to_sync[:5]:
            print(f"   {m['uf']} {m['municipio_nome']} (id={m['municipio_id']})")
        return

    # ── Step 4: Fetch IBGE indicators for each ──
    print(f"\n📊 Buscando indicadores IBGE para {len(to_sync)} municípios...")
    print(f"   Tempo estimado: ~{len(to_sync) * 0.15:.0f}s")

    rows = []
    ok_fetch = 0
    for i, m in enumerate(to_sync):
        code6 = m['municipio_id'][:-1]  # 7-digit → 6-digit
        panorama = {
            "municipio_id": m['municipio_id'],
            "municipio_nome": m['municipio_nome'],
            "uf": m['uf'],
            "source": "IBGE Cidades@",
            "indicadores_json": {},
        }

        has_data = False
        for ind_id, field in INDICATORS.items():
            data = fetch(f"{IBGE_IND}/{ind_id}/resultados/{code6}")
            if data and isinstance(data, list) and len(data) > 0:
                for r in data[0].get("res", []):
                    if r["localidade"] == code6:
                        values = r.get("res", {})
                        if values:
                            years = sorted(values.keys(), reverse=True)
                            most_recent = values[years[0]]
                            try:
                                val = float(str(most_recent).replace(".","").replace(",","."))
                            except:
                                val = None
                            if val is not None:
                                # Normalize values (IBGE returns raw numbers)
                                if field == "area_km2": val = val / 10000  # hectares → km²
                                elif field == "densidade_demografica": val = val / 100
                                elif field == "pib_per_capita": val = val / 100
                                panorama[field] = round(val, 2)
                                panorama["indicadores_json"][field] = {"valor": most_recent, "ano": years[0]}
                                has_data = True
                            break
            time.sleep(0.12)  # rate limit

        if has_data:
            rows.append(panorama)
            ok_fetch += 1

        if (i + 1) % 20 == 0:
            print(f"   {i+1}/{len(to_sync)}... ({ok_fetch} com dados)")

    print(f"   ✅ {ok_fetch}/{len(to_sync)} municípios com dados IBGE")

    # ── Step 5: Upsert into Supabase ──
    print(f"\n💾 Upsert {len(rows)} rows → Supabase ibge_panorama...")
    ok = 0
    fail = 0
    for i, row in enumerate(rows):
        if supabase_upsert(row):
            ok += 1
        else:
            fail += 1
        if (i + 1) % 50 == 0:
            print(f"   {i+1}/{len(rows)}... ({ok} ok, {fail} fail)")

    print(f"\n🏁 {ok}/{len(rows)} saved · {fail} failed")
    print(f"💾 ibge_panorama agora cobre {ok} municípios das 28 RMs")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="adsentice — IBGE Panorama Expand (422 municípios)")
    ap.add_argument("--dry-run", action="store_true", help="Preview apenas")
    args = ap.parse_args()
    main(dry_run=args.dry_run)
