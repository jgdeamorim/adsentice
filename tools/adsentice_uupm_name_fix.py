#!/usr/bin/env python3
"""
adsentice_uupm_name_fix.py — EXTRAIR NOMES SIGNIFICATIVOS DOS PAYLOADS UUPM
═══════════════════════════════════════════════════════════════
Problema: 6,103 pontos UUPM com nomes genéricos
  - 1,601 "design-principles"  → todos mesmo nome
  - 1,602 "design-drafts"      → todos mesmo nome
  - 161 "ui-reasoning"         → todos mesmo nome
  - 161 "color-palettes"       → nomes OK (ex: "SaaS (General)")
  - 84 "ui-styles"             → nomes OK (ex: "Minimalism & Swiss Style")

Solução:
  1. Extrair nome significativo da description de CADA payload
  2. design-principles: extrair a primeira seção real (Bauhaus, Glassmorphism...)
  3. design-drafts: extrair o título do componente
  4. ui-reasoning: extrair "UI Category" (Mood Tracker, Study Together...)
  5. Re-embed com nomes corretos

medido=verdade · 2026-07-15 · adsentice
"""

import json, os, re, time, uuid
from urllib.request import Request, urlopen

EMBED_URL = "http://127.0.0.1:8081/embed"
QDRANT_URL = "http://127.0.0.1:6352"
COLLECTION = "adsentice-self"
TAG = "adsentice-warp"

def embed(texts):
    texts = [t[:800] for t in texts]
    req = Request(EMBED_URL, data=json.dumps({"texts": texts}).encode(),
                  headers={"Content-Type": "application/json"})
    return json.loads(urlopen(req, timeout=30).read())["vectors"]

def upsert(points):
    body = json.dumps({"points": points}).encode()
    req = Request(f"{QDRANT_URL}/collections/{COLLECTION}/points?wait=true",
                  data=body, headers={"Content-Type": "application/json"}, method="PUT")
    return json.loads(urlopen(req, timeout=30).read()).get("status", "error")

def fetch_bad_payloads():
    """Busca payloads com nomes genéricos."""
    bad_categories = ["design-principles", "design-drafts", "ui-reasoning"]
    all_points = []

    for cat in bad_categories:
        offset = None
        while True:
            body = {
                "filter": {"must": [
                    {"key": "kind", "match": {"value": "design-knowledge"}},
                    {"key": "category", "match": {"value": cat}},
                ]},
                "limit": 500, "with_payload": True, "with_vector": False,
            }
            if offset: body["offset"] = offset
            req = Request(f"{QDRANT_URL}/collections/{COLLECTION}/points/scroll",
                          data=json.dumps(body).encode(),
                          headers={"Content-Type": "application/json"}, method="POST")
            data = json.loads(urlopen(req, timeout=60).read())
            result = data.get("result", {})
            points = result.get("points", [])
            all_points.extend(points)
            offset = result.get("next_page_offset")
            if not offset or len(points) == 0:
                break
        print(f"  {cat}: {len([p for p in all_points if p['payload'].get('category') == cat])} payloads")

    return all_points

def extract_name(payload: dict) -> str:
    """
    Extrai nome significativo da description UUPM.
    Cada categoria tem seu próprio padrão.
    """
    category = payload.get("category", "")
    desc = str(payload.get("description", ""))

    if category == "design-principles":
        # Pattern: "Design Principle: Bauhaus（包豪斯）: ● Secondary Accent..."
        m = re.search(r'Design Principle:\s*([^:]+?)(?:（[^)]*）)?\s*:', desc)
        if m:
            style = m.group(1).strip()
            # Extrai também o que o princípio descreve
            concept = ""
            concept_m = re.search(r'●\s*([^:]+):\s*([^.]+)', desc)
            if concept_m:
                concept = f" — {concept_m.group(1).strip()}: {concept_m.group(2).strip()[:60]}"
            return f"{style}{concept}"[:120]
        # Fallback: first meaningful section after "Design Principle:"
        m2 = re.search(r'Design Principle:\s*(.+?)(?:\s*[●:]|$)', desc)
        if m2:
            return m2.group(1).strip()[:120]

    elif category == "design-drafts":
        # Pattern: "Design Draft: # NOTE:... Component Styling Specs"
        # Skip the NOTE and get to the actual content
        m = re.search(r'Design Draft:.*?:\s*(.+?)(?:\s*[●:]|$)', desc)
        if m:
            draft_name = m.group(1).strip()
            if draft_name and draft_name != desc[:30]:
                return draft_name[:120]
        # Try to find the component name
        m2 = re.search(r'(?:Component|Style|Pattern):\s*([^●\n]+)', desc)
        if m2:
            return m2.group(1).strip()[:120]
        # Last resort: first actual content word after NOTE
        clean = re.sub(r'# NOTE:.*?:\s*', '', desc)
        words = clean.strip()[:120]
        if words:
            return words

    elif category == "ui-reasoning":
        # Pattern: "UI Category: Study Together / Virtual Coworking. Recommended Pattern: ..."
        m = re.search(r'UI Category:\s*([^.]+)', desc)
        if m:
            ui_cat = m.group(1).strip()
            m2 = re.search(r'Recommended Pattern:\s*([^.]+)', desc)
            pattern = f" → {m2.group(1).strip()}" if m2 else ""
            return f"{ui_cat}{pattern}"[:120]

    return str(payload.get("name", "unknown"))[:120]

def build_embed_text(payload: dict) -> str:
    """Constrói texto otimizado para embedding."""
    name = str(payload.get("name", ""))
    desc = str(payload.get("description", ""))
    cat = str(payload.get("category", ""))

    # Enriquecer com palavras-chave extraídas da categoria
    category_keywords = {
        "design-principles": "design principle style guide visual system",
        "design-drafts": "design draft component template specification",
        "ui-reasoning": "UI reasoning pattern recommendation decision rule",
    }
    extra = category_keywords.get(cat, "")

    return f"{name}. {desc}. {extra}"[:800]

def main():
    print("🧠 ADSENTICE · UUPM NAME FIX — Extrair nomes significativos")
    print()

    # 1. Fetch bad payloads
    print("🔍 Buscando payloads com nomes genéricos...")
    points = fetch_bad_payloads()
    print(f"   Total: {len(points)} payloads para corrigir")

    if not points:
        print("⚠️ Nenhum payload encontrado.")
        return

    # 2. Delete old embeddings
    old_ids = [p["id"] for p in points]
    print(f"\n🗑️  Removendo {len(old_ids)} embeddings antigos...")
    for i in range(0, len(old_ids), 100):
        batch = old_ids[i:i+100]
        body = json.dumps({"filter": {"must": [{"key": "id", "match": {"any": batch}}]}}).encode()
        req = Request(f"{QDRANT_URL}/collections/{COLLECTION}/points/delete",
                      data=body, headers={"Content-Type": "application/json"}, method="POST")
        urlopen(req, timeout=30)
    print(f"   ✅ {len(old_ids)} removidos")

    # 3. Extract names + re-embed
    print(f"\n🧠 Extraindo nomes + re-embedding...")
    BATCH = 6
    total = 0
    name_examples = []

    for i in range(0, len(points), BATCH):
        batch = points[i:i + BATCH]

        # Extract names
        for p in batch:
            new_name = extract_name(p["payload"])
            p["payload"]["name"] = new_name
            if len(name_examples) < 20:
                name_examples.append((p["payload"]["category"], p["payload"].get("name", "?")[:30], new_name[:60]))

        # Build embed texts
        texts = [build_embed_text(p["payload"]) for p in batch]
        vecs = embed(texts)

        new_points = []
        for p, vec in zip(batch, vecs):
            new_points.append({
                "id": str(uuid.uuid4()),
                "vector": [float(v) for v in vec],
                "payload": {**p["payload"], "ts": int(time.time())},
            })

        status = upsert(new_points)
        total += len(new_points)
        if (i // BATCH) % 50 == 0:
            cats = set(p["payload"]["category"] for p in batch)
            print(f"  ✅ {len(new_points)} ({','.join(cats)}) → {status} [{i+1}-{min(i+BATCH, len(points))}/{len(points)}]")

    # 4. Show examples
    print(f"\n📋 EXEMPLOS DE NOMES EXTRAÍDOS:")
    seen = set()
    for cat, old, new in name_examples:
        if old == "design-principles" or old == "design-drafts" or old == "ui-reasoning":
            key = f"{cat}:{old}"
            if key not in seen:
                seen.add(key)
                print(f"  [{cat}]")
                print(f"    ANTES:  {old}")
                print(f"    DEPOIS: {new}")

    print(f"\n🏁 {total} payloads UUPM com nomes corrigidos")

    # 5. Quick test
    print(f"\n🔍 TESTE RÁPIDO (design-knowledge):")
    tests = [
        ("paleta cores clínica estética spa beleza luxo premium", "beauty"),
        ("tipografia elegante sofisticada serif heading font", "serif"),
        ("landing page padrão hero features CTA conversão", "hero"),
        ("estilo dashboard glassmorphism data monitoring", "glass"),
    ]
    for query, expected in tests:
        vec = embed([query])[0]
        body = json.dumps({
            "vector": vec,
            "filter": {"must": [
                {"key": "kind", "match": {"value": "design-knowledge"}},
                {"key": "tag", "match": {"value": TAG}},
            ]},
            "limit": 2, "with_payload": True,
        }).encode()
        req = Request(f"{QDRANT_URL}/collections/{COLLECTION}/points/search",
                      data=body, headers={"Content-Type": "application/json"}, method="POST")
        results = json.loads(urlopen(req, timeout=10).read()).get("result", [])
        top = results[0]["payload"] if results else {}
        match = "✅" if expected.lower() in str(top.get("name", "")).lower() else "⚠️"
        print(f"  {match} '{query[:50]}' → {str(top.get('name','?'))[:70]}")

if __name__ == "__main__":
    main()
