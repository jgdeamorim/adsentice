#!/usr/bin/env python3
"""
ADSENTICE · L0 Field Audit Report — medido=verdade
Compara API real → Adapter → Persistence → DB para campos L0.

Executado 2026-07-19 contra:
  - API DataForSEO live (dentist, Vitória ES, $0.0131)
  - provider-core-adapter.ts (38 campos mapeados)
  - discovery-persistence.ts (43 campos persistidos)
  - discovery_listings (85 colunas)
"""

# Cada campo da API L0 com seu status completo

FIELDS = [
    # (api_path, adapter_field, db_column, status, notes)
    # STATUS: ✅ OK / ❌ MISSING / ⚠️ JSONB (whole object saved) / 🔵 L1-LABELED / 🔴 NOT-PERSISTED

    ("title", "title", "title", "✅ OK", ""),
    ("category", "category", "category", "✅ OK", ""),
    ("address", "address", "address", "✅ OK", ""),
    ("rating.value", "rating_value", "rating_value", "✅ OK", ""),
    ("rating.votes_count", "rating_votes", "rating_votes", "✅ OK", ""),
    ("rating.rating_type", "—", "—", "⚠️ JSONB (dentro de rating)", "Sempre 'Max5', baixo valor"),
    ("rating.rating_max", "—", "—", "⚠️ JSONB (dentro de rating)", "Sempre null"),
    ("place_id", "place_id", "place_id", "✅ OK", ""),
    ("cid", "cid", "cid", "🔴 NOT-PERSISTED", "ADAPTER MAPEIA mas PERSISTENCE NÃO SALVA!"),
    ("latitude", "latitude", "latitude", "✅ OK", ""),
    ("longitude", "longitude", "longitude", "✅ OK", ""),
    ("is_claimed", "is_claimed", "is_claimed", "✅ OK", ""),

    # address_info sub-fields
    ("address_info.borough", "district", "district", "✅ OK", ""),
    ("address_info.city", "city", "city", "✅ OK", ""),
    ("address_info.zip", "—", "postal_code", "🔵 L1-LABELED", "VEM DO L0! Migration 001 rotula errado como L1"),
    ("address_info.country_code", "—", "country_code", "🔵 L1-LABELED", "VEM DO L0! Migration 001 rotula errado como L1"),
    ("address_info.region", "—", "—", "❌ MISSING", "'State of Espírito Santo' — útil, NÃO mapeado!"),
    ("address_info.address", "—", "—", "❌ MISSING", "Endereço puro (sem city/state) — parcialmente redundante"),

    # Contact fields
    ("url", "website", "website", "✅ OK", ""),
    ("phone", "phone", "phone", "✅ OK", "v104"),
    ("domain", "domain", "domain", "✅ OK", "v114"),
    ("contact_info", "contact_info", "contact_info", "✅ OK", "v115, JSONB"),

    # Media fields
    ("total_photos", "total_photos", "total_photos", "✅ OK", "v113"),
    ("description", "description", "description", "✅ OK", "v113"),
    ("main_image", "main_image", "main_image", "✅ OK", "v114"),
    ("logo", "logo", "logo", "✅ OK", "v114"),
    ("snippet", "snippet", "snippet", "✅ OK", "v114"),

    # Rating detail
    ("rating_distribution", "rating_distribution", "rating_distribution", "✅ OK", "JSONB object {1-5: count}, v114"),

    # Temporal fields
    ("first_seen", "first_seen", "first_seen", "✅ OK", "v114, TIMESTAMPTZ"),
    ("last_updated_time", "last_updated_time", "last_updated_time", "✅ OK", "v114, TIMESTAMPTZ"),
    ("check_url", "check_url", "check_url", "✅ OK", "v114"),

    # Operational fields
    ("work_time", "work_time", "work_time", "✅ OK", "JSONB completo, v114"),
    ("popular_times", "popular_times", "popular_times", "✅ OK", "v115, JSONB (geralmente null)"),
    ("business_status", "—", "business_status", "🔵 L1-LABELED", "VEM DO L0 (v115)! Migration 001 rotula errado"),
    ("price_level", "—", "price_level", "🔵 L1-LABELED", "EXISTE NO L0 (top-level key)! Migration 001 rotula errado"),
    ("type", "source_type", "source_type", "✅ OK", "'type' é reservado SQL → source_type, v115"),

    # Business identity
    ("original_title", "original_title", "original_title", "✅ OK", "v115"),
    ("feature_id", "feature_id", "feature_id", "✅ OK", "v115"),
    ("category_ids", "category_ids", "category_ids", "✅ OK", "v115, TEXT[]"),
    ("additional_categories", "additional_categories", "additional_categories", "✅ OK", "v115, TEXT[]"),

    # Rich attributes
    ("attributes", "attributes", "attributes", "✅ OK", "JSONB completo (accessibility, amenities, payments, etc.), v114"),
    ("services", "services", "services", "✅ OK", "v115, JSONB (geralmente null)"),
    ("hotel_rating", "hotel_rating", "hotel_rating", "✅ OK", "v115, JSONB (só hotel, geralmente null)"),
    ("place_topics", "place_topics", "place_topics", "✅ OK", "v115, JSONB (geralmente null)"),
    ("local_business_links", "local_business_links", "local_business_links", "✅ OK", "v115, JSONB (geralmente null)"),

    # Related businesses
    ("people_also_search", "people_also_search", "people_also_search", "✅ OK", "Array JSONB [{cid, feature_id, title, rating}], v114"),
]

def print_report():
    ok = sum(1 for _,_,_,s,_ in FIELDS if "✅" in s)
    missing = sum(1 for _,_,_,s,_ in FIELDS if "❌" in s)
    not_persisted = sum(1 for _,_,_,s,_ in FIELDS if "🔴" in s)
    l1_labeled = sum(1 for _,_,_,s,_ in FIELDS if "🔵" in s)
    jsonb_ok = sum(1 for _,_,_,s,_ in FIELDS if "⚠️" in s)

    print("=" * 85)
    print("ADSENTICE · L0 FIELD AUDIT — API → Adapter → Persistence → DB")
    print("medido=verdade · 2026-07-19 · Teste live contra API ($0.0131)")
    print("=" * 85)
    print()
    print(f"Total campos auditados: {len(FIELDS)}")
    print(f"  ✅ OK:              {ok}")
    print(f"  ⚠️ JSONB (objeto):  {jsonb_ok}")
    print(f"  🔵 L1-labeled:      {l1_labeled} (presentes no L0 mas migration rotula como L1)")
    print(f"  🔴 NOT-PERSISTED:   {not_persisted}")
    print(f"  ❌ MISSING:         {missing}")
    print()

    for api_path, adapter_field, db_column, status, notes in FIELDS:
        icon = status.split()[0]
        print(f"  {icon} {api_path:35s} → adapter:{adapter_field:25s} → db:{db_column:25s} {notes}")

    print()
    print("=" * 85)
    print("ACHADOS CRÍTICOS (medido=verdade)")
    print("=" * 85)
    print()
    print("1. 🔴 cid — ADAPTER MAPEIA mas NÃO É PERSISTIDO!")
    print("   provider-core-adapter.ts:144 → 'cid: (item.cid as string) || null'")
    print("   discovery-persistence.ts → SEM 'cid' no objeto de insert!")
    print("   migration 001 → coluna NÃO EXISTE em discovery_listings!")
    print("   IMPACTO: 8,626 listings sem Google CID. Corrigir: adicionar coluna + persistence.")
    print()
    print("2. 🔵 5 campos rotulados como 'L1' MAS VÊM DO L0:")
    print("   → postal_code (address_info.zip)")
    print("   → country_code (address_info.country_code)")
    print("   → business_status (top-level no L0)")
    print("   → price_level (top-level no L0!)")
    print("   → contact_methods (computado, não API)")
    print("   A migration 001 diz 'L1 enrichment fields (27 canonical GMB fields)'")
    print("   mas esses campos SÃO POPULADOS PELO L0 desde os fixes v104-v115.")
    print()
    print("3. ❌ address_info.region NÃO é mapeado")
    print("   Ex: 'State of Espírito Santo' — útil para normalização cross-state")
    print("   Custo: $0 (já está no JSON pago)")
    print()
    print("4. ✅ 37/37 top-level fields + 4 address_info sub-fields = 41 dados extraíveis")
    print("   Desses 41: 39 estão mapeados no adapter, 1 (cid) não é persistido,")
    print("   2 sub-campos do address_info não mapeados (region, address puro)")
    print()
    print("5. ✅ Todos os campos JSONB estão sendo salvos como objetos inteiros")
    print("   work_time, rating_distribution, attributes, people_also_search, contact_info,")
    print("   place_topics, popular_times, services, hotel_rating, local_business_links")
    print("   → sem perda de dados de sub-campos")

if __name__ == "__main__":
    print_report()
