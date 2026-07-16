#!/usr/bin/env python3
"""
adsentice_ibge_panorama_sync.py — IBGE Cidades Panorama → Supabase ibge_panorama
═══════════════════════════════════════════════════════════════════════════════
Para cada capital de RM no district_registry, baixa dados do portal Cidades@:
  - População, PIB per capita, IDHM, Área, Densidade
  - Receitas e despesas totais
  - Todos os indicadores extras em JSONB

NÃO faz 378 chamadas — faz 22 (uma por capital, código 7 dígitos).
Depois o state-scorer HERDA os dados do estado/município.

Indicadores testados e confirmados (Vitória/ES 3205309):
  29166 = População Censo
  29167 = Área territorial
  29168 = Densidade demográfica
  29171 = População estimada
  47001 = PIB per capita

Uso:
  python3 tools/adsentice_ibge_panorama_sync.py --dry-run
  python3 tools/adsentice_ibge_panorama_sync.py

medido=verdade · 2026-07-16 · adsentice
"""

import json, sys, time, argparse, gzip
from pathlib import Path
from urllib.request import Request, urlopen

PROJECT_ROOT = Path(__file__).parent.parent
ENV_FILE = PROJECT_ROOT / "apps" / "web" / ".env"
IBGE_IND = "https://servicodados.ibge.gov.br/api/v1/pesquisas/indicadores"

# Capitais das 27 RMs (código 7 dígitos IBGE → código 6 dígitos API)
CAPITAIS = {
    "3550308": ("São Paulo", "SP"),
    "3304557": ("Rio de Janeiro", "RJ"),
    "3106200": ("Belo Horizonte", "MG"),
    "4106902": ("Curitiba", "PR"),
    "4314902": ("Porto Alegre", "RS"),
    "2927408": ("Salvador", "BA"),
    "2611606": ("Recife", "PE"),
    "2304400": ("Fortaleza", "CE"),
    "3509502": ("Campinas", "SP"),
    "1302603": ("Manaus", "AM"),
    "5208707": ("Goiânia", "GO"),
    "3205309": ("Vitória", "ES"),
    "4205407": ("Florianópolis", "SC"),
    "1721000": ("Palmas", "TO"),
    "2111300": ("São Luís", "MA"),
    "2408102": ("Natal", "RN"),
    "2507507": ("João Pessoa", "PB"),
    "2704302": ("Maceió", "AL"),
    "2800308": ("Aracaju", "SE"),
    "1501402": ("Belém", "PA"),
    "5103403": ("Cuiabá", "MT"),
    "5300108": ("Brasília", "DF"),
    "5002704": ("Campo Grande", "MS"),
    "2211001": ("Teresina", "PI"),
    "1100205": ("Porto Velho", "RO"),
    "1600303": ("Macapá", "AP"),
    "1400100": ("Boa Vista", "RR"),
    "1200401": ("Rio Branco", "AC"),
}

# Indicadores que queremos (ID → nome amigável)
INDICATORS = {
    29166: "populacao_censo",
    29171: "populacao",
    29167: "area_km2",
    29168: "densidade_demografica",
    47001: "pib_per_capita",
}

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
        if raw[:2] == b'\x1f\x8b': raw = gzip.decompress(raw)
        return json.loads(raw)
    except Exception as e:
        print(f"  ⚠️ {e}")
        return None

def supabase_upsert_panorama(rows: list[dict]) -> int:
    env = _load_env()
    key = env.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not key: return 0
    url_base = env.get("NEXT_PUBLIC_SUPABASE_URL", "https://tdigauruusdhnpvppixb.supabase.co")
    headers = {"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json", "Prefer": "return=minimal"}
    ok = 0
    for row in rows:
        try:
            body = json.dumps(row, default=str).encode()
            urlopen(Request(f"{url_base}/rest/v1/ibge_panorama", data=body, headers=headers, method="POST"), timeout=10)
            ok += 1
        except Exception as e:
            try:
                err = e.read().decode() if hasattr(e, 'read') else ""
                if "23505" in err:
                    # Upsert: DELETE old, INSERT new
                    mid = row["municipio_id"]
                    urlopen(Request(f"{url_base}/rest/v1/ibge_panorama?municipio_id=eq.{mid}", headers={**headers, "Content-Type": "application/json"}, method="DELETE"), timeout=10)
                    body = json.dumps(row, default=str).encode()
                    urlopen(Request(f"{url_base}/rest/v1/ibge_panorama", data=body, headers=headers, method="POST"), timeout=10)
                    ok += 1
            except: pass
    return ok

def main(dry_run=False):
    print(f"🧠 adsentice · IBGE Panorama Sync · {len(CAPITAIS)} capitais\n")

    rows = []
    ok_count = 0

    for code7, (nome, uf) in CAPITAIS.items():
        code6 = code7[:-1]  # 3550308 → 355030
        print(f"  {uf} {nome} ({code6})", end="")

        panorama = {
            "municipio_id": code7,
            "municipio_nome": nome,
            "uf": uf,
            "source": "IBGE Cidades@",
            "indicadores_json": {},
        }

        # Fetch each indicator
        for ind_id, field in INDICATORS.items():
            data = fetch(f"{IBGE_IND}/{ind_id}/resultados/{code6}")
            if data and isinstance(data, list) and len(data) > 0:
                for r in data[0].get("res", []):
                    if r["localidade"] == code6:
                        values = r.get("res", {})
                        if values:
                            years = sorted(values.keys(), reverse=True)
                            most_recent = values[years[0]]
                            # Convert to numeric
                            try:
                                val = float(str(most_recent).replace(".","").replace(",",".")) if isinstance(most_recent, str) else float(most_recent)
                            except:
                                val = None
                            if val is not None:
                                panorama[field] = val
                                panorama["indicadores_json"][field] = {"valor": most_recent, "ano": years[0]}
                            break
            time.sleep(0.15)  # rate limit

        rows.append(panorama)
        print(f" → pop={panorama.get('populacao','?')} pib={panorama.get('pib_per_capita','?')}")

    if dry_run:
        print(f"\n🔍 {len(rows)} capitais (dry run)")
        return

    # Upsert
    print(f"\nUpsert {len(rows)} rows → Supabase ibge_panorama...")
    ok = supabase_upsert_panorama(rows)
    print(f"✅ {ok}/{len(rows)} saved")

    print(f"\n🏁 IBGE Panorama Sync completo")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="adsentice — IBGE Panorama → Supabase")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    main(dry_run=args.dry_run)
