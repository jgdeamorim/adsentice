#!/usr/bin/env python3
"""
adsentice_backfill_city.py — Backfill city/district nos listings sem city
═══════════════════════════════════════════════════════════════
Usa Nominatim (OpenStreetMap) reverse geocode gratuito.
Rate limit: 1 req/s (respeitado com sleep 1.2s).

Uso:
  python3 tools/adsentice_backfill_city.py           # backfill todos
  python3 tools/adsentice_backfill_city.py --dry-run # só lista sem atualizar

medido=verdade · 2026-07-16 · adsentice
"""

import json, sys, time, argparse
from pathlib import Path
from urllib.request import Request, urlopen

PROJECT_ROOT = Path(__file__).parent.parent
ENV_FILE = PROJECT_ROOT / "apps" / "web" / ".env"

def _load_env():
    env = {}
    if ENV_FILE.exists():
        for line in ENV_FILE.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip().strip('"').strip("'")
    return env

ENV = _load_env()
SUPABASE_URL = ENV.get("NEXT_PUBLIC_SUPABASE_URL", "https://tdigauruusdhnpvppixb.supabase.co")
SUPABASE_KEY = ENV.get("SUPABASE_SERVICE_ROLE_KEY", "")
HEADERS = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}", "Content-Type": "application/json"}

def supabase_get(path: str) -> dict | list:
    req = Request(f"{SUPABASE_URL}/rest/v1/{path}", headers=HEADERS)
    return json.loads(urlopen(req, timeout=30).read())

def supabase_patch(table: str, row_id: str, data: dict) -> bool:
    body = json.dumps(data).encode()
    req = Request(
        f"{SUPABASE_URL}/rest/v1/{table}?id=eq.{row_id}",
        data=body, headers={**HEADERS, "Prefer": "return=minimal"}, method="PATCH"
    )
    resp = urlopen(req, timeout=10)
    return resp.status == 204

def reverse_geocode(lat: float, lng: float) -> dict:
    """Nominatim reverse geocode. Retorna {city, district, state, country}."""
    try:
        url = f"https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lng}&format=json&accept-language=pt-BR"
        req = Request(url, headers={"User-Agent": "adsentice/1.0"})
        resp = urlopen(req, timeout=8)
        data = json.loads(resp.read())
        addr = data.get("address", {})
        return {
            "city": addr.get("city") or addr.get("town") or addr.get("municipality") or addr.get("county"),
            "district": addr.get("suburb") or addr.get("neighbourhood") or addr.get("city_district"),
            "state": addr.get("state"),
            "country": addr.get("country_code", "").upper(),
            "display_name": data.get("display_name", ""),
        }
    except Exception as e:
        return {"error": str(e), "city": None, "district": None}

# ── Main ──
def main(dry_run=False):
    print("🧠 adsentice · Backfill City\n")

    # 1. Buscar listings sem city
    print("1. Buscando listings sem city...")
    listings = supabase_get("discovery_listings?select=id,place_id,latitude,longitude,title,city,district&city=is.null&limit=500")
    if isinstance(listings, dict) and "message" in listings:
        print(f"   ❌ {listings['message']}")
        return

    print(f"   {len(listings)} listings sem city")

    # 2. Agrupar por coordenada única (evita chamadas duplicadas)
    coord_map = {}
    for l in listings:
        lat = l.get("latitude")
        lng = l.get("longitude")
        if lat is None or lng is None: continue
        key = f"{lat:.5f},{lng:.5f}"
        if key not in coord_map:
            coord_map[key] = {"lat": lat, "lng": lng, "ids": []}
        coord_map[key]["ids"].append(l["id"])

    print(f"   {len(coord_map)} coordenadas únicas para geocodificar")
    print(f"   Estimativa: ~{len(coord_map) * 1.2:.0f}s (1.2s/req)\n")

    if dry_run:
        print("🔍 DRY RUN — mostrando primeiras 10 coordenadas:")
        for i, (key, info) in enumerate(list(coord_map.items())[:10]):
            print(f"   ({info['lat']:.4f}, {info['lng']:.4f}) → {len(info['ids'])} listings")
        print(f"\n   ... mais {max(0, len(coord_map) - 10)} coordenadas")
        return

    # 3. Geocodificar cada coordenada única
    results = {}
    total = len(coord_map)
    for i, (key, info) in enumerate(coord_map.items()):
        if i > 0: time.sleep(1.2)  # rate limit Nominatim

        geo = reverse_geocode(info["lat"], info["lng"])
        results[key] = geo

        city_str = geo.get("city") or "—"
        district_str = geo.get("district") or ""
        region = f"{city_str}{', ' + district_str if district_str else ''}"
        print(f"   [{i+1:3d}/{total}] ({info['lat']:.4f}, {info['lng']:.4f}) → {region}")

    # 4. Atualizar Supabase
    print(f"\n4. Atualizando Supabase...")
    updated = 0
    errors = 0
    skipped = 0

    for key, geo in results.items():
        city = geo.get("city")
        district = geo.get("district")
        state = geo.get("state")
        country = geo.get("country")

        if not city and not district:
            # Sem dados do Nominatim — pular
            for row_id in coord_map[key]["ids"]:
                skipped += 1
            continue

        patch_data = {}
        if city: patch_data["city"] = city
        if district: patch_data["district"] = district

        for row_id in coord_map[key]["ids"]:
            try:
                ok = supabase_patch("discovery_listings", row_id, patch_data)
                if ok: updated += 1
                else: errors += 1
            except Exception as e:
                errors += 1
                print(f"   ⚠️ PATCH failed for {row_id}: {e}")

    print(f"\n✅ BACKFILL COMPLETO")
    print(f"   Updated: {updated}")
    print(f"   Errors: {errors}")
    print(f"   Skipped (no geo data): {skipped}")
    print(f"   Total: {updated + errors + skipped}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="adsentice — Backfill city via Nominatim")
    ap.add_argument("--dry-run", action="store_true", help="Apenas lista, não atualiza")
    args = ap.parse_args()
    main(dry_run=args.dry_run)
