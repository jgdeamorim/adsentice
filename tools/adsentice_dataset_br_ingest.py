#!/usr/bin/env python3
"""
adsentice_dataset_br_ingest.py — Dataset BR 1000 keywords → Qdrant
═══════════════════════════════════════════════════════════════
Lê EVO-API/self-essentials/dataforseo/dataset/.../BR_pt.json
(1000 keywords brasileiras com search_volume + intent + history)
e ingere no Qdrant adsentice-self como playground $0.

Fonte: EVO-API self-essentials (probe DataForSEO databases)
medido=verdade · 2026-07-15 · adsentice
"""

import json, os, sys, time, uuid
from pathlib import Path
from urllib.request import Request, urlopen

EMBED_URL = "http://127.0.0.1:8081/embed"
QDRANT_URL = "http://127.0.0.1:6352"
COLLECTION = "adsentice-self"
TAG = "dataset-br"

PROJECT_ROOT = Path(__file__).parent.parent
DATASET_PATH = PROJECT_ROOT.parent / "EVO-API" / "self-essentials" / "dataforseo" / "dataset" / "digital-marketing-comprehensive-onpremises" / "BR_pt.json"

def embed(text: str) -> list[float]:
    """Embeds text via local mpnet server :8081."""
    body = json.dumps({"texts": [text[:800]]}).encode()
    req = Request(EMBED_URL, data=body, headers={"Content-Type": "application/json"})
    return json.loads(urlopen(req, timeout=10).read())["vectors"][0]

def upsert_points(points: list[dict]):
    """Bulk upsert to Qdrant."""
    body = json.dumps({"points": points}).encode()
    req = Request(
        f"{QDRANT_URL}/collections/{COLLECTION}/points?wait=true",
        data=body, headers={"Content-Type": "application/json"}, method="PUT",
    )
    json.loads(urlopen(req, timeout=30).read())

def main():
    if not DATASET_PATH.exists():
        print(f"❌ Dataset não encontrado: {DATASET_PATH}")
        return

    print(f"🧠 Dataset BR Ingest · {DATASET_PATH}")
    print(f"   Embed: {EMBED_URL} · Qdrant: {QDRANT_URL}")

    total = 0
    batch = []
    BATCH_SIZE = 50

    t0 = time.time()
    with open(DATASET_PATH) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue

            try:
                item = json.loads(line)
            except json.JSONDecodeError:
                continue

            keyword = item.get("keyword", "?")
            ki = item.get("keyword_info", {})
            si = item.get("search_intent_info", {})

            volume = ki.get("search_volume", 0) or 0
            intent = si.get("main_intent", "unknown")
            competition = ki.get("competition_level", "?")
            cpc = ki.get("cpc", 0) or 0
            history = ki.get("history", {})

            # Texto rico para embedding semântico
            text = f"keyword: {keyword} | volume: {volume} | intent: {intent} | competition: {competition} | cpc: {cpc} | categories: {ki.get('categories',[])}"

            vec = embed(text)
            point_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"dataset-br:{keyword}"))

            batch.append({
                "id": point_id,
                "vector": [float(v) for v in vec],
                "payload": {
                    "keyword": keyword,
                    "kind": "keyword-data",
                    "tag": TAG,
                    "search_volume": volume,
                    "cpc": cpc,
                    "competition_level": competition,
                    "main_intent": intent,
                    "competition_index": ki.get("competition", 0),
                    "categories": ki.get("categories", []),
                    "history_snapshot": json.dumps(history),
                    "keyword_difficulty": item.get("extra", {}).get("keyword_difficulty", 0),
                },
            })

            total += 1
            if len(batch) >= BATCH_SIZE:
                upsert_points(batch)
                print(f"   {total} keywords...", end="\r")
                batch = []

    # Final batch
    if batch:
        upsert_points(batch)

    elapsed = time.time() - t0
    print(f"\n✅ {total} keywords ingeridos em {elapsed:.1f}s")
    print(f"   Tag: {TAG} · Collection: {COLLECTION}")
    print(f"   Query: 'keywords de dentista com volume alto e baixa competição' → Qdrant")

if __name__ == "__main__":
    main()
