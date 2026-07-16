#!/usr/bin/env python3
"""
adsentice_ibge_sync.py — IBGE Regiões Metropolitanas → Supabase district_registry
═══════════════════════════════════════════════════════════════════════════
Extrai MUNICÍPIOS DAS REGIÕES METROPOLITANAS do IBGE (85 RMs oficiais)
e popula a tabela district_registry no Supabase.

Substitui o script anterior que pegava TODOS os municípios do estado
(1.279) por apenas os da RM (~200 nas 8 maiores), que é onde estão
80% dos SMBs.

Fontes:
  - IBGE Localidades API: /regioes-metropolitanas (85 RMs, grátis)
  - IBGE Localidades API: /municipios/{id} (detalhes do município)

Uso:
  python3 tools/adsentice_ibge_sync.py           # sync completo
  python3 tools/adsentice_ibge_sync.py --dry-run # só lista

medido=verdade · 2026-07-16 · adsentice
"""

import json, sys, time, argparse, gzip
from pathlib import Path
from urllib.request import Request, urlopen

PROJECT_ROOT = Path(__file__).parent.parent
ENV_FILE = PROJECT_ROOT / "apps" / "web" / ".env"

IBGE_BASE = "https://servicodados.ibge.gov.br/api/v1"

# RM IDs que nos interessam (capitais + principais metrópoles)
PRIORITY_RM_IDS = [
    "04901",  # RM São Paulo (39 mun)
    "04801",  # RM Rio de Janeiro (22 mun)
    "04501",  # RM Belo Horizonte (34 mun)
    "05501",  # RM Curitiba (29 mun)
    "07401",  # RM Porto Alegre (34 mun)
    "04201",  # RM Salvador (13 mun)
    "03001",  # RM Recife (14 mun)
    "01401",  # RM Fortaleza (19 mun)
    "05101",  # RM Campinas (20 mun)
    "00201",  # RM Manaus (13 mun)
    "07701",  # RM Goiânia (22 mun)
    "04701",  # RM Vitória (7 mun)
    "06301",  # RM Florianópolis (22 mun)
    "00901",  # RM Palmas (16 mun)
    "01101",  # RM São Luís (13 mun)
    "01701",  # RM Natal (15 mun)
    "01801",  # RM João Pessoa (12 mun)
    "03201",  # RM Maceió (11 mun)
    "04101",  # RM Aracaju (4 mun)
    "00601",  # RM Belém (7 mun)
    "07601",  # RM Cuiabá (6 mun)
    "03601",  # RM Palmeira dos Índios (AL)
]

def _load_env():
    env = {}
    if ENV_FILE.exists():
        for line in ENV_FILE.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip().strip('"').strip("'")
    return env

def fetch_json(url: str) -> list | dict | None:
    try:
        req = Request(url, headers={"User-Agent": "adsentice/1.0", "Accept-Encoding": "gzip"})
        resp = urlopen(req, timeout=30)
        raw = resp.read()
        if raw[:2] == b'\x1f\x8b':
            raw = gzip.decompress(raw)
        return json.loads(raw)
    except Exception as e:
        print(f"  ⚠️ {e}")
        return None

def supabase_upsert(table: str, rows: list[dict]) -> int:
    env = _load_env()
    key = env.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not key: return 0
    url_base = env.get("NEXT_PUBLIC_SUPABASE_URL", "https://tdigauruusdhnpvppixb.supabase.co")
    headers = {"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json",
               "Prefer": "resolution=merge-duplicates"}
    ok, batch = 0, []
    for row in rows:
        batch.append(row)
        if len(batch) >= 50:
            try:
                urlopen(Request(f"{url_base}/rest/v1/{table}", data=json.dumps(batch).encode(), headers=headers, method="POST"), timeout=15)
                ok += len(batch)
            except:
                for r in batch:
                    try:
                        urlopen(Request(f"{url_base}/rest/v1/{table}", data=json.dumps([r]).encode(), headers=headers, method="POST"), timeout=10)
                        ok += 1
                    except: pass
            batch = []
    if batch:
        try:
            urlopen(Request(f"{url_base}/rest/v1/{table}", data=json.dumps(batch).encode(), headers=headers, method="POST"), timeout=15)
            ok += len(batch)
        except: pass
    return ok

def main(dry_run=False):
    print("🧠 adsentice · IBGE Regiões Metropolitanas Sync\n")
    print(f"   API: {IBGE_BASE}/localidades/regioes-metropolitanas")
    print(f"   IDs: {len(PRIORITY_RM_IDS)} RMs prioritárias\n")

    # 1 — Fetch all RMs
    rms = fetch_json(f"{IBGE_BASE}/localidades/regioes-metropolitanas")
    if not rms:
        print("❌ IBGE API offline")
        return

    rm_by_id = {rm["id"]: rm for rm in rms}

    # 2 — Para cada RM prioritária, extrair municípios
    all_rows = []
    total_municipios = 0

    for rm_id in PRIORITY_RM_IDS:
        # Fetch RM detail (returns [{id, nome, UF, municipios}])
        rm_data_list = fetch_json(f"{IBGE_BASE}/localidades/regioes-metropolitanas/{rm_id}")
        if not rm_data_list or not isinstance(rm_data_list, list) or len(rm_data_list) == 0:
            print(f"  {rm_id}: RM não encontrada")
            continue

        rm_data = rm_data_list[0]
        rm_name = rm_data.get("nome", f"RM-{rm_id}")
        uf_sigla = rm_data.get("UF", {}).get("sigla", "?")
        municipios = rm_data.get("municipios", [])

        if not municipios:
            print(f"  {rm_name}: sem municípios")
            continue

        # Capital name = first word after "Região Metropolitana de/da/do"
        capital_name = rm_name.replace("Região Metropolitana de ", "").replace("Região Metropolitana da ", "").replace("Região Metropolitana do ", "").replace("Região Metropolitana ", "").replace("Grande ", "").replace("Área de Expansão Metropolitana de ", "").replace("Colar Metropolitano de ", "").replace("Colar Metropolitano ", "")

        print(f"  {uf_sigla} {rm_name}: {len(municipios)} municípios (capital: {capital_name})")

        for m in municipios:
            all_rows.append({
                "city": capital_name,
                "uf": uf_sigla,
                "district": m["nome"],
                "source": f"IBGE RM {rm_id}",
            })
            total_municipios += 1

        time.sleep(0.3)

    print(f"\n   Total: {total_municipios} municípios em {len(PRIORITY_RM_IDS)} RMs")

    if dry_run:
        print("\n🔍 DRY RUN — amostra por RM:")
        from collections import Counter
        by_city = Counter(r["city"] for r in all_rows)
        for city, count in by_city.most_common(22):
            print(f"  {city}: {count} municípios")
        return

    # 3 — Upsert
    print(f"\n2. Upsert {len(all_rows)} rows → Supabase district_registry...")
    ok = supabase_upsert("district_registry", all_rows)
    print(f"  ✅ {ok}/{len(all_rows)} saved")
    print("\n🏁 IBGE RM Sync completo")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="adsentice — IBGE RMs → Supabase")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    main(dry_run=args.dry_run)
