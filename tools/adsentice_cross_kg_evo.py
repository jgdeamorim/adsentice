#!/usr/bin/env -S uv run --quiet --script
# /// script
# requires-python = ">=3.10"
# dependencies = ["httpx", "redis"]
# ///
"""
adsentice_cross_kg_evo.py — Cross-KG connector (adsentice ↔ EVO-API/rsxt)

Conecta aos 4 containers:
- adsentice Qdrant :6352  (adsentice-self, adsentice-materio, claude-memory, adsentice-conversation)
- adsentice Redis  :6396  (adsentice:ooda:*, adsentice:boa:*)
- evo-api  Qdrant :6350  (rsxt_codebase, claude-memory, evoapi_provider_docs, founder_conversations)
- evo-api  Redis  :6395  (rsxt:*, evoapi:*, mycoder:*)
- embed    :8081         (shared — mpnet 768d)

Output: cross-kg edges, rsxt→adsentice concept mapping, shared vocab analysis.

medido=verdade · 2026-07-18 · adsentice
"""

import json, httpx, redis, sys
from typing import Any
from datetime import datetime

# ═══════════════════════════════════════════════════════════════
# CONFIG
# ═══════════════════════════════════════════════════════════════

SELF = {
    "qdrant": "http://127.0.0.1:6352",
    "redis_port": 6396,
    "collections": ["adsentice-self", "adsentice-materio", "claude-memory", "adsentice-conversation"],
    "label": "adsentice"
}

EVO = {
    "qdrant": "http://127.0.0.1:6350",
    "redis_port": 6395,
    "collections": ["rsxt_codebase", "claude-memory", "evoapi_provider_docs", "founder_conversations", "evoapi_conversation"],
    "label": "evo-api"
}

EMBED = "http://127.0.0.1:8081/embed"

# ═══════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════

def qdrant_get(url: str, path: str) -> dict:
    try:
        r = httpx.get(f"{url}{path}", timeout=10.0)
        return r.json() if r.status_code == 200 else {}
    except: return {}

def qdrant_post(url: str, path: str, body: dict) -> dict:
    try:
        r = httpx.post(f"{url}{path}", json=body, timeout=15.0)
        return r.json() if r.status_code == 200 else {}
    except: return {}

def redis_client(port: int) -> redis.Redis | None:
    try:
        r = redis.Redis(host="127.0.0.1", port=port, decode_responses=True, socket_connect_timeout=3)
        r.ping()
        return r
    except: return None

def scroll_all(url: str, collection: str, payload_keys: list[str] = None, limit: int = 100) -> list[dict]:
    """Scroll ALL points from a Qdrant collection."""
    points = []
    offset = None
    while True:
        body: dict[str, Any] = {"limit": limit}
        if payload_keys:
            body["with_payload"] = payload_keys
        else:
            body["with_payload"] = True
        if offset:
            body["offset"] = offset
        data = qdrant_post(url, f"/collections/{collection}/points/scroll", body)
        batch = data.get("result", {}).get("points", [])
        points.extend(batch)
        offset = data.get("result", {}).get("next_page_offset")
        if not offset or not batch:
            break
        print(f"  {collection}: {len(points)} pts scrolling...", end="\r")
    print(f"  {collection}: {len(points)} pts total{' ' * 20}")
    return points

def collection_info(url: str, collection: str) -> dict:
    data = qdrant_get(url, f"/collections/{collection}")
    return data.get("result", {})

# ═══════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════

def main():
    print("═" * 60)
    print("🧭 adsentice_cross_kg_evo — Cross-KG Connector")
    print(f"   {datetime.now().isoformat()}")
    print("═" * 60)

    # ── 1. STATUS CHECK ──
    print("\n📡 1. STATUS CHECK")

    # Adsentice
    ads_qd = qdrant_get(SELF["qdrant"], "/collections")
    ads_colls = [c["name"] for c in ads_qd.get("result", {}).get("collections", [])]
    ads_redis = redis_client(SELF["redis_port"])
    print(f"  adsentice Qdrant :6352 → {len(ads_colls)} collections: {ads_colls}")
    print(f"  adsentice Redis  :{SELF['redis_port']} → {'✅ ONLINE' if ads_redis else '❌ OFFLINE'}")

    # EVO-API
    evo_qd = qdrant_get(EVO["qdrant"], "/collections")
    evo_colls = [c["name"] for c in evo_qd.get("result", {}).get("collections", [])]
    evo_redis = redis_client(EVO["redis_port"])
    print(f"  evo-api Qdrant   :6350 → {len(evo_colls)} collections: {evo_colls}")
    print(f"  evo-api Redis    :{EVO['redis_port']} → {'✅ ONLINE' if evo_redis else '❌ OFFLINE'}")

    # Embed
    try:
        r = httpx.post(EMBED, json={"texts": ["test"]}, timeout=5.0)
        emb_ok = r.status_code == 200
    except: emb_ok = False
    print(f"  embed            :8081 → {'✅ ONLINE' if emb_ok else '❌ OFFLINE'} (shared mpnet 768d)")

    # ── 2. COLLECTION ANALYSIS ──
    print("\n📊 2. COLLECTION ANALYSIS")
    all_analysis = {}

    for cfg, tag in [(SELF, "adsentice"), (EVO, "evo-api")]:
        for coll in cfg["collections"]:
            info = collection_info(cfg["qdrant"], coll)
            pts = info.get("points_count", 0)
            dims = info.get("config", {}).get("params", {}).get("vectors", {})
            if isinstance(dims, dict) and dims:
                first = list(dims.values())[0]
                dim_size = first.get("size", "?") if isinstance(first, dict) else str(first)
                dist = first.get("distance", "?") if isinstance(first, dict) else "?"
            else:
                dim_size, dist = "?", "?"
            all_analysis[f"{tag}/{coll}"] = {"points": pts, "dim": dim_size, "distance": dist}
            print(f"  {tag}/{coll:35s} {pts:>6d} pts  {dim_size}d {dist}")

    # ── 3. CROSS-KG ENTITIES — RSXT / EVO-API → Adsentice ──
    print("\n🔗 3. CROSS-KG MAPPINGS")
    cross_edges = []

    # 3a. Scaffold cross-concept edges from ADSENTICE_KG + EVO-API patterns
    # These are curated mappings based on known architecture
    CROSS_CONCEPTS = [
        # rsxt ←→ adsentice
        {"source": "rsxt.L0", "target": "adsentice.L0", "relation": "mirrors", "doc": "rsxt structural layer ←→ adsentice Supabase fetch L0"},
        {"source": "rsxt.L1", "target": "adsentice.L1", "relation": "mirrors", "doc": "rsxt enrichment ←→ adsentice classify+competitors"},
        {"source": "rsxt.L2", "target": "adsentice.L2", "relation": "mirrors", "doc": "rsxt scoring ←→ adsentice computeGaps F1-F9"},
        {"source": "rsxt.L3", "target": "adsentice.L3", "relation": "mirrors", "doc": "rsxt vec sensor ←→ adsentice Qdrant queries (M9+OD+Materio+icons+CSS patterns)"},
        {"source": "rsxt.L4", "target": "adsentice.L4", "relation": "mirrors", "doc": "rsxt graph ←→ adsentice Graph BFS edges depth≤2"},
        {"source": "rsxt.L5", "target": "adsentice.L5", "relation": "mirrors", "doc": "rsxt consensus ←→ adsentice critique 6D + Devloop + plugins"},
        {"source": "rsxt.L6", "target": "adsentice.L6", "relation": "mirrors", "doc": "rsxt LLM arbiter ←→ adsentice DeepSeek V4 Flash refine copy"},
        # rsxt capabilities → adsentice
        {"source": "rsxt.k0", "target": "adsentice.kg", "relation": "feeds_into", "doc": "rsxt knowledge graph → adsentice KG (64→174 edges)"},
        {"source": "rsxt.f0", "target": "adsentice.boa", "relation": "mirrors", "doc": "rsxt BOA formula (founder_signal 0.35) → adsentice BOA Redis :6396"},
        {"source": "rsxt.s0", "target": "adsentice.vault", "relation": "mirrors", "doc": "rsxt audit trail WORM → adsentice Vault (R2 blob→Supabase)"},
        {"source": "rsxt.t0", "target": "adsentice.telemetry", "relation": "mirrors", "doc": "rsxt time-series → adsentice telemetry (cost, calls, scores)"},
        {"source": "rsxt.v0", "target": "adsentice.embed", "relation": "depends_on", "doc": "rsxt vector sensor e0+e1 2×384d → adsentice mpnet shared 768d"},
        # evo-api capabilities → adsentice
        {"source": "evoapi.compose", "target": "adsentice.composeS10", "relation": "inspired", "doc": "EVO-API compose.rs intent→DctNode→render → adsentice composeS10 BLUE→GREEN"},
        {"source": "evoapi.render_media", "target": "adsentice.renderS10_GREEN", "relation": "mirrors", "doc": "EVO-API render_media (query_vocab facet) → adsentice slot-driven GREEN render"},
        {"source": "evoapi.materio_leaves", "target": "adsentice.tokens_unifier", "relation": "mirrors", "doc": "EVO-API materio_leaves.rs assemble → adsentice unifyTokens()"},
        {"source": "evoapi.query_vocab", "target": "adsentice.resolve_intent_vocab", "relation": "inspired", "doc": "EVO-API query_vocab(facet=X) → resolveIntentVocab(segment, ontology)"},
        {"source": "evoapi.dag", "target": "adsentice.dag_skill", "relation": "mirrors", "doc": "EVO-API dag.rs KG-first recall → adsentice /dag skill"},
        {"source": "evoapi.surface_router", "target": "adsentice.surface_specialist", "relation": "mirrors", "doc": "EVO-API surface routing → adsentice S10_SPECIALIST 22 surfaces"},
    ]
    cross_edges.extend(CROSS_CONCEPTS)

    # 3b. Analyze rsxt_codebase sample payloads for concept extraction
    print("\n  📖 Sampling rsxt_codebase (EVO-API Qdrant :6350)...")
    try:
        sample = qdrant_post(EVO["qdrant"], "/collections/rsxt_codebase/points/scroll", {"limit": 10, "with_payload": ["id", "kind", "source", "name", "tag"]})
        pts = sample.get("result", {}).get("points", [])
        print(f"  rsxt_codebase sample: {len(pts)} points")
        for p in pts[:5]:
            pl = p.get("payload", {})
            pid = pl.get("id", "?")
            kind = pl.get("kind", "?")
            src = pl.get("source", "?")[:60]
            print(f"    id={pid:30s} kind={kind:20s} src={src}")
    except Exception as e:
        print(f"  ❌ rsxt_codebase query failed: {e}")

    # 3c. Analyze shared claude-memory across both KGs
    print("\n  📖 Sampling claude-memory (both instances)...")
    for cfg, tag in [(SELF, "adsentice"), (EVO, "evo-api")]:
        try:
            sample = qdrant_post(cfg["qdrant"], "/collections/claude-memory/points/scroll", {"limit": 5, "with_payload": ["tag", "text", "kind"]})
            pts = sample.get("result", {}).get("points", [])
            tags = {}
            for p in pts:
                t = p.get("payload", {}).get("tag", "?")
                tags[t] = tags.get(t, 0) + 1
            print(f"  {tag}/claude-memory: {len(pts)} sample pts, tags: {tags}")
        except Exception as e:
            print(f"  {tag}/claude-memory: ❌ {e}")

    # ── 4. REDIS CROSS-REFERENCE ──
    print("\n🗄️  4. REDIS CROSS-REFERENCE")
    if evo_redis:
        try:
            rsxt_keys = evo_redis.keys("rsxt:*")
            evo_keys = evo_redis.keys("evoapi:*")
            mycoder_keys = evo_redis.keys("mycoder:*")
            print(f"  evo-api Redis :6395 — rsxt:{len(rsxt_keys)} evoapi:{len(evo_keys)} mycoder:{len(mycoder_keys)} keys")

            # Show key samples
            for k in rsxt_keys[:5]:
                val = evo_redis.get(k)
                print(f"    {k}: {str(val)[:100]}")
            # BOA scores
            boa_keys = evo_redis.keys("*boa*")
            for k in boa_keys[:5]:
                val = evo_redis.get(k)
                print(f"    {k}: {str(val)[:80]}")
        except Exception as e:
            print(f"  ❌ Redis query failed: {e}")

    if ads_redis:
        try:
            ads_keys = ads_redis.keys("adsentice:*")
            print(f"\n  adsentice Redis :6396 — {len(ads_keys)} keys")
            boa = ads_redis.get("adsentice:boa:score")
            act = ads_redis.get("adsentice:ooda:stage:act")
            print(f"    BOA: {boa} | ACT: {act}")
        except Exception as e:
            print(f"  ❌ Redis query failed: {e}")

    # ── 5. CROSS-KG EDGES OUTPUT ──
    print(f"\n🔗 5. CROSS-KG EDGES: {len(cross_edges)} total")
    relations = {}
    for e in cross_edges:
        rel = e["relation"]
        relations[rel] = relations.get(rel, 0) + 1
    for rel, count in sorted(relations.items(), key=lambda x: -x[1]):
        print(f"  {rel}: {count} edges")

    # ── 6. VOCABULARY GAP ANALYSIS ──
    print("\n📋 6. VOCABULARY GAP ANALYSIS")

    # What EVO-API has that adsentice could use
    print("  EVO-API → adsentice transfer candidates:")
    gaps = [
        ("rsxt L0-L6 pipeline", "adsentice já tem L0-L6 no BLUE, mas sem dual-embed e0+e1"),
        ("evoapi compose.rs render_media()", "adsentice renderS10_GREEN não usa query_vocab(facet=X)"),
        ("evoapi materio_leaves.rs assemble()", "adsentice unifyTokens() já implementa padrão similar"),
        ("rsxt audit trail WORM s0", "adsentice Vault existe (R2→Supabase) mas sem checksums"),
        ("evoapi surface_router 22 surfaces", "adsentice S10_SPECIALIST implementa 1/22 surfaces"),
        ("rsxt dual embed e0+e1 2×384d", "adsentice usa mpnet single 768d — benefício: bilingual"),
        ("evoapi dag.rs recall", "adsentice /dag skill implementa padrão mas sem KG→git→filesystem auto"),
    ]
    for g in gaps:
        print(f"    ⚡ {g[0]}")
        print(f"       → {g[1]}")

    # Save to Redis for OODA sync
    if ads_redis:
        try:
            output = {
                "generated_at": datetime.now().isoformat(),
                "cross_edges_count": len(cross_edges),
                "evo_collections": evo_colls,
                "ads_collections": ads_colls,
                "relations": relations,
            }
            ads_redis.set("adsentice:cross-kg:evo-api:latest", json.dumps(output))
            print(f"\n✅ Cross-KG saved to adsentice:cross-kg:evo-api:latest")
        except Exception as e:
            print(f"\n⚠️  Could not save to Redis: {e}")

    print("\n" + "═" * 60)
    print("🧭 Cross-KG analysis complete")
    print(f"   {len(cross_edges)} cross-edges mapped")
    print(f"   {len(gaps)} vocabulary gaps identified")
    print("═" * 60)

if __name__ == "__main__":
    main()
