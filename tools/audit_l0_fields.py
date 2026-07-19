#!/usr/bin/env python3
"""
ADSENTICE · L0 Field Audit Script
medido=verdade · 2026-07-19

Validação end-to-end:
1. Chama DataForSEO L0 API real (business_listings/search/live)
2. Lista TODOS os campos que a API retorna (recursively flatten)
3. Cruza com o adapter (provider-core-adapter.ts) — campo a campo
4. Cruza com o banco (discovery_listings columns) — via Supabase REST
5. Cruza com a persistência (discovery-persistence.ts) — campo a campo
6. Reporta: mapeados ✓, faltando ✗, não-utilizados ⚠
"""

import json
import sys
import os
import base64
import requests
from collections import OrderedDict

# ─── Config ───
LOGIN = os.environ.get("DATAFORSEO_LOGIN", "contato@progesta.com.br")
PASSWORD = os.environ.get("DATAFORSEO_PASSWORD", "533ab526c791848d")
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://tdigauruusdhnpvppixb.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")

API_BASE = "https://api.dataforseo.com"

# ─── Test params: dentista em Vitória (mercado pequeno, baixo custo) ───
TEST_PARAMS = {
    "categories": ["dentist"],
    "location_coordinate": "-20.3155,-40.3128,5",  # Vitória ES, 5km
    "limit": 3,  # barato: ~$0.0127
}

# ══════════════════════════════════════════════════════════════════
# STEP 1: Call L0 API real
# ══════════════════════════════════════════════════════════════════

def call_l0_api():
    """Faz a chamada real ao DataForSEO L0 e retorna o JSON bruto."""
    auth = base64.b64encode(f"{LOGIN}:{PASSWORD}".encode()).decode()
    url = f"{API_BASE}/v3/business_data/business_listings/search/live"

    body = [TEST_PARAMS]

    print(f"🔍 Chamando DataForSEO L0...")
    print(f"   Endpoint: {url}")
    print(f"   Params: {json.dumps(TEST_PARAMS)}")

    resp = requests.post(
        url,
        json=body,
        headers={
            "Authorization": f"Basic {auth}",
            "Content-Type": "application/json",
        },
        timeout=30,
    )

    if resp.status_code != 200:
        print(f"❌ HTTP {resp.status_code}: {resp.text[:500]}")
        sys.exit(1)

    data = resp.json()

    # Check API-level status
    task = data.get("tasks", [{}])[0]
    status_code = task.get("status_code")
    if status_code and status_code != 20000:
        print(f"❌ API error {status_code}: {task.get('status_message', '?')}")
        sys.exit(1)

    cost = task.get("cost", 0)
    result = task.get("result", [{}])[0]
    items = result.get("items", [])
    total_count = result.get("total_count", 0)

    print(f"✅ API OK · cost=${cost:.4f} · total_count={total_count} · returned={len(items)} items")
    return data, items, cost


# ══════════════════════════════════════════════════════════════════
# STEP 2: Recursively flatten response to find ALL leaf fields
# ══════════════════════════════════════════════════════════════════

def flatten_fields(obj, prefix="", depth=0, max_depth=3):
    """Recursively extrai TODOS os campos leaf do JSON retornado pela API."""
    fields = OrderedDict()

    if depth > max_depth:
        return fields

    if isinstance(obj, dict):
        for key, value in obj.items():
            full_key = f"{prefix}.{key}" if prefix else key
            if isinstance(value, (dict, list)) and value and depth < max_depth:
                fields.update(flatten_fields(value, full_key, depth + 1, max_depth))
            elif not isinstance(value, (dict, list)):
                # Leaf field — record type
                fields[full_key] = type(value).__name__
            elif isinstance(value, list) and len(value) > 0 and isinstance(value[0], dict):
                # Array of objects — flatten first element
                fields[f"{full_key}[0]"] = "<array[object]>"
                fields.update(flatten_fields(value[0], f"{full_key}[0]", depth + 2, max_depth))
            else:
                fields[full_key] = type(value).__name__
    elif isinstance(obj, list) and len(obj) > 0:
        if isinstance(obj[0], dict):
            fields.update(flatten_fields(obj[0], f"{prefix}[0]", depth, max_depth))

    return fields


# ══════════════════════════════════════════════════════════════════
# STEP 3: Adapter mapping (from provider-core-adapter.ts:132-180)
# ══════════════════════════════════════════════════════════════════

ADAPTER_MAP = {
    # Path na API → campo no adapter
    "title": "title",
    "category": "category",
    "address": "address",
    "rating.value": "rating_value",
    "rating.votes_count": "rating_votes",
    "place_id": "place_id",
    "cid": "cid",
    "latitude": "latitude",
    "longitude": "longitude",
    "is_claimed": "is_claimed",
    # v104/v113 fixes
    "address_info.city": "city",
    "address_info.borough": "district",
    "url": "website",
    "phone": "phone",
    "total_photos": "total_photos",
    "description": "description",
    # v114
    "main_image": "main_image",
    "rating_distribution": "rating_distribution",
    "snippet": "snippet",
    "check_url": "check_url",
    "first_seen": "first_seen",
    "last_updated_time": "last_updated_time",
    "domain": "domain",
    "people_also_search": "people_also_search",
    "attributes": "attributes",
    "logo": "logo",
    "work_time": "work_time",
    # v115
    "additional_categories": "additional_categories",
    "category_ids": "category_ids",
    "contact_info": "contact_info",
    "feature_id": "feature_id",
    "hotel_rating": "hotel_rating",
    "local_business_links": "local_business_links",
    "original_title": "original_title",
    "place_topics": "place_topics",
    "popular_times": "popular_times",
    "services": "services",
    "type": "source_type",  # "type" é reservado SQL
}

# Persistence mapping (discovery-persistence.ts:83-148)
PERSISTENCE_MAP = {
    # Campos que o persistence salva (além dos do adapter)
    # L0 core
    "title": "title", "category": "category", "address": "address",
    "rating_value": "rating_value", "rating_votes": "rating_votes",
    "is_claimed": "is_claimed", "latitude": "latitude", "longitude": "longitude",
    "place_id": "place_id",
    # L0 extended
    "website": "website", "phone": "phone", "total_photos": "total_photos",
    "description": "description", "main_image": "main_image",
    "rating_distribution": "rating_distribution", "snippet": "snippet",
    "check_url": "check_url", "first_seen": "first_seen",
    "last_updated_time": "last_updated_time", "domain": "domain",
    "people_also_search": "people_also_search", "attributes": "attributes",
    "logo": "logo", "work_time": "work_time",
    # L0 v115
    "additional_categories": "additional_categories", "category_ids": "category_ids",
    "contact_info": "contact_info", "feature_id": "feature_id",
    "hotel_rating": "hotel_rating", "local_business_links": "local_business_links",
    "original_title": "original_title", "place_topics": "place_topics",
    "popular_times": "popular_times", "services": "services",
    "source_type": "source_type",
    # L1 (migration 001) - shared with L0
    "business_status": "business_status",
    # "city" and "district" come from address_info
    "city": "city", "district": "district",
    "postal_code": "postal_code", "country_code": "country_code",
    "categories_arr": "categories_arr",  # from (l as any).categories
    "price_level": "price_level", "contact_methods": "contact_methods",
}


# ══════════════════════════════════════════════════════════════════
# STEP 4: Get DB columns from Supabase
# ══════════════════════════════════════════════════════════════════

def get_db_columns():
    """Tenta obter a lista de colunas da tabela discovery_listings."""
    try:
        if not SUPABASE_KEY:
            return None
        # Get one row and inspect keys
        resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/discovery_listings?select=*&limit=1",
            headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"},
            timeout=10,
        )
        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data, list) and data:
                return list(data[0].keys())
    except Exception as e:
        print(f"⚠️  Não foi possível conectar ao Supabase: {e}")
    return None


# ══════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════

def main():
    print("=" * 75)
    print("ADSENTICE · L0 Field Audit — medido=verdade")
    print("=" * 75)
    print()

    # Step 1: Call API
    raw_data, items, cost = call_l0_api()
    print()

    if not items:
        print("❌ Nenhum item retornado — não é possível auditar.")
        print("   Resposta completa:")
        print(json.dumps(raw_data, indent=2, default=str)[:2000])
        sys.exit(1)

    # Step 2: Analyze every field from the first item
    first_item = items[0]
    all_fields = flatten_fields(first_item, max_depth=3)

    print("=" * 75)
    print(f"📋 TODOS OS CAMPOS DA API (item 0, max depth 3)")
    print("=" * 75)
    print(f"Total de campos leaf encontrados: {len(all_fields)}")
    print()

    # Also show ALL top-level keys + nested structures
    print("─── Top-level keys ───")
    for k in sorted(first_item.keys()):
        v = first_item[k]
        vtype = type(v).__name__
        if isinstance(v, dict):
            print(f"  {k}: dict[{len(v)} keys] → {list(v.keys())[:8]}")
        elif isinstance(v, list):
            if len(v) > 0:
                print(f"  {k}: list[{len(v)} items] → first={type(v[0]).__name__}")
            else:
                print(f"  {k}: list[0 items]")
        elif v is None:
            print(f"  {k}: null")
        else:
            s = str(v)[:80].replace('\n', ' ')
            print(f"  {k}: {vtype} = {s}")

    print()
    print("─── All nested fields (flattened) ───")
    for path, ftype in sorted(all_fields.items()):
        # Check mapping status
        mapped = "✅" if path in ADAPTER_MAP else "❌"
        # Also check if parent key is mapped
        parent = path.split(".")[0]
        parent_mapped = " " if mapped != "❌" else ("⚠️" if parent in ADAPTER_MAP else "❌")
        print(f"  {mapped} {path:50s} → {ftype}")

    print()
    print("=" * 75)
    print("🔬 CROSS-REFERENCE: API → Adapter → Persistence → DB")
    print("=" * 75)

    # Build comprehensive field list
    adapter_fields = sorted(set(v for v in ADAPTER_MAP.values())) + ["cid", "business_status", "categories_arr", "postal_code", "country_code", "price_level", "contact_methods", "city", "district"]
    persistence_fields = sorted(set(v for v in PERSISTENCE_MAP.values()))
    db_columns = get_db_columns()

    # Missing from adapter
    api_only = set(all_fields.keys())
    adapter_api = set(ADAPTER_MAP.keys())
    missing_from_adapter = api_only - adapter_api

    if missing_from_adapter:
        print(f"\n⚠️  Campos no JSON da API que NÃO estão no adapter ({len(missing_from_adapter)}):")
        for f in sorted(missing_from_adapter):
            parent = f.split(".")[0]
            print(f"   → {f} ({all_fields[f]})")

    # Missing from persistence
    persistence_adapter = set(PERSISTENCE_MAP.keys())
    missing_from_persistence = set(ADAPTER_MAP.values()) - set(PERSISTENCE_MAP.values())
    if missing_from_persistence:
        print(f"\n⚠️  Campos do adapter que NÃO estão no persistence ({len(missing_from_persistence)}):")
        for f in sorted(missing_from_persistence):
            print(f"   → {f}")

    # Missing from DB
    if db_columns:
        missing_from_db = set(PERSISTENCE_MAP.values()) - set(db_columns)
        if missing_from_db:
            print(f"\n❌ Campos persistidos mas SEM coluna no banco ({len(missing_from_db)}):")
            for f in sorted(missing_from_db):
                print(f"   → {f}")

        # DB columns without persistence
        db_not_in_persistence = set(db_columns) - set(PERSISTENCE_MAP.values()) - {"id", "search_id", "score_compound", "score_fit", "score_engagement", "score_intent", "schwartz_level", "schwartz_label", "signals_detected", "enrichment_level", "created_at"}
        if db_not_in_persistence:
            print(f"\n🔵 Colunas no DB sem mapeamento de persistência ({len(db_not_in_persistence)}):")
            for f in sorted(db_not_in_persistence):
                if f.startswith("l2_") or f.startswith("l3_") or f.startswith("l4_") or f.startswith("cnpj"):
                    pass  # outras camadas
                else:
                    print(f"   → {f}")
    else:
        print("\n⚠️  Não foi possível ler colunas do Supabase")

    # Also show raw first item for complete audit
    print()
    print("=" * 75)
    print("📦 RAW JSON — primeiro item completo (para auditoria manual)")
    print("=" * 75)
    # Compact but complete
    print(json.dumps(first_item, indent=2, ensure_ascii=False, default=str))

    print()
    print("=" * 75)
    print("📊 SUMMARY")
    print("=" * 75)
    print(f"  API leaf fields:        {len(all_fields)}")
    print(f"  Adapter mapped:         {len(ADAPTER_MAP)}")
    print(f"  Persistence saved:      {len(PERSISTENCE_MAP)}")
    print(f"  DB columns (total):     {len(db_columns) if db_columns else '?'}")
    print(f"  API fields NOT mapped:  {len(missing_from_adapter)}")

    if not missing_from_adapter:
        print("  ✅ TODOS os campos da API estão mapeados no adapter")

    print(f"\n  Custo total da auditoria: ${cost:.4f}")


if __name__ == "__main__":
    main()
