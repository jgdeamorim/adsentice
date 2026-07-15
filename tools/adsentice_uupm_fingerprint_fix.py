#!/usr/bin/env python3
"""
REGRA-MATRIZ: cada payload embedado DEVE ter identidade única no espaço vetorial.
Não pode haver vetores semanticamente idênticos com conteúdos diferentes.
═══════════════════════════════════════════════════════════════

1. Extrai nome + conceito específico da description para cada payload
2. Constrói embed único: {style_name} | {specific_concept} | {category} | {first_detail}
3. Se mesmo nome aparece N vezes, cada um recebe sufixo do conceito que descreve
4. Bauhaus×section gaps ≠ Bauhaus×radius 16px ≠ Bauhaus×typography — no embedding
5. Re-embed todos os pontos duplicados

medido=verdade · 2026-07-15 · adsentice
"""

import json, os, re, time, uuid, hashlib
from urllib.request import Request, urlopen
from collections import Counter

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

def fetch_all_design_knowledge():
    """Busca TODOS os payloads design-knowledge para dedup."""
    print("🔍 Buscando todos os payloads design-knowledge...")
    points = []
    offset = None
    while True:
        body = {"filter": {"must": [
            {"key": "kind", "match": {"value": "design-knowledge"}},
            {"key": "tag", "match": {"value": TAG}},
        ]}, "limit": 1000, "with_payload": True, "with_vector": False}
        if offset: body["offset"] = offset
        req = Request(f"{QDRANT_URL}/collections/{COLLECTION}/points/scroll",
                      data=json.dumps(body).encode(),
                      headers={"Content-Type": "application/json"}, method="POST")
        data = json.loads(urlopen(req, timeout=60).read())
        batch = data.get("result", {}).get("points", [])
        points.extend(batch)
        offset = data.get("result", {}).get("next_page_offset")
        if not offset or len(batch) == 0:
            break
    print(f"   {len(points)} payloads carregados")
    return points

def extract_unique_name(payload: dict) -> str:
    """
    REGRA-MATRIZ: extrair nome ÚNICO por payload.
    Se o estilo é "Bauhaus", o nome deve incluir O QUE este payload descreve.
    "Bauhaus | Section gaps: py-16" ≠ "Bauhaus | Radius: 16px Rounded-2xl"
    """
    cat = payload.get("category", "")
    desc = str(payload.get("description", ""))
    name = str(payload.get("name", ""))

    # 1. Extract style/pattern name from description
    style_name = name
    if "Design Principle:" in desc:
        m = re.search(r'Design Principle:\s*([^:：●]+?)(?:（[^)]*）)?\s*[:：●]', desc)
        if m:
            style_name = m.group(1).strip()
            style_name = re.sub(r'（[^）]*）', '', style_name).strip()

    # 2. Extract SPECIFIC concept from the first bullet point
    concept = ""
    # Try bullet with value: ● Radius: 16px
    m = re.search(r'[●○]\s*([^:：]{2,40}?)\s*[:：]\s*([^●○\n]{3,80})', desc)
    if m:
        concept = f"{m.group(1).strip()}: {m.group(2).strip()}"
    else:
        # Try standalone bullet
        m = re.search(r'[●○]\s*([^●○\n]{5,100})', desc)
        if m:
            concept = m.group(1).strip()[:80]

    # 3. If still no concept, take first meaningful sentence after the header
    if not concept:
        clean = re.sub(r'(?:Design (?:Principle|Draft):\s*(?:# NOTE:.*?:\s*)?)', '', desc)
        clean = re.sub(r'（[^）]*）', '', clean).strip()
        first_sentence = re.split(r'[.。●•\n]', clean)[0].strip()
        if first_sentence and len(first_sentence) > 10:
            concept = first_sentence[:80]

    # 4. Build unique fingerprint name
    if concept and concept != style_name:
        unique_name = f"{style_name} | {concept}"[:120]
    else:
        # Fallback: use description hash suffix to ensure uniqueness
        content_hash = hashlib.md5(desc.encode()).hexdigest()[:6]
        unique_name = f"{style_name} #{content_hash}"[:120]

    # 5. UUPM raw metadata enrichment — add raw fields if available
    raw = payload.get("raw", {})
    if raw and isinstance(raw, dict):
        # Add first available distinguishing field
        for key in ["Product Type", "Style Category", "UI Category", "Pattern Name"]:
            if key in raw and str(raw[key]) not in unique_name:
                extra = str(raw[key])[:30]
                unique_name = f"{unique_name} [{extra}]"[:120]
                break

    return unique_name.strip()

def build_fingerprint_embed(payload: dict) -> str:
    """
    REGRA-MATRIZ: embed text deve ser ÚNICO e SEMANTICAMENTE RICO.
    Inclui: nome único + description completa + category + raw metadata.
    """
    name = str(payload.get("name", ""))
    desc = str(payload.get("description", ""))
    cat = str(payload.get("category", ""))
    kind = str(payload.get("kind", ""))

    # Build rich context
    parts = [name, desc[:400]]

    # Add category-specific context
    if cat in ("design-principles", "design-drafts"):
        parts.append("design system specification guideline")
    elif cat == "ui-reasoning":
        parts.append("UI UX reasoning pattern recommendation decision rule")
    elif cat == "color-palettes":
        parts.append("color palette scheme design system")
    elif cat == "ui-styles":
        parts.append("UI design style visual aesthetic")

    # Add raw metadata for disambiguation
    raw = payload.get("raw", {})
    if isinstance(raw, dict):
        for key in ["Product Type", "Style Category", "Pattern Name", "UI Category"]:
            val = raw.get(key)
            if val:
                parts.append(str(val)[:50])

    return " | ".join(parts)[:800]

def main():
    print("🧠 ADSENTICE · REGRA-MATRIZ: FINGERPRINT ÚNICO POR PAYLOAD")
    print("   Objetivo: zero vetores colidindo com conteúdos diferentes")
    print()

    # 1. Fetch all design-knowledge payloads
    points = fetch_all_design_knowledge()
    if not points:
        print("⚠️ Nenhum payload encontrado")
        return

    # 2. Extract unique names
    print("🔑 Extraindo nomes únicos com conceito específico...")
    renamed = 0
    for p in points:
        old_name = str(p["payload"].get("name", ""))
        new_name = extract_unique_name(p["payload"])
        if new_name != old_name:
            p["payload"]["name"] = new_name
            renamed += 1
    print(f"   {renamed}/{len(points)} renomeados com fingerprint único")

    # 3. Check duplicates after fix
    name_counts = Counter(str(p["payload"].get("name", "")) for p in points)
    duplicates_after = [(n, c) for n, c in name_counts.most_common(20) if c > 1]
    dup_count = sum(1 for n, c in name_counts.items() if c > 1)
    print(f"   Duplicatas restantes: {dup_count} nomes (alvo: 0)")
    if duplicates_after:
        print(f"   Top duplicatas pós-fix:")
        for n, c in duplicates_after[:5]:
            print(f"     [{c}x] {n[:80]}")

    # 4. Delete old embeddings
    old_ids = [p["id"] for p in points]
    print(f"\n🗑️  Removendo {len(old_ids)} embeddings antigos...")
    for i in range(0, len(old_ids), 100):
        batch = old_ids[i:i+100]
        body = json.dumps({"filter": {"must": [{"key": "id", "match": {"any": batch}}]}}).encode()
        req = Request(f"{QDRANT_URL}/collections/{COLLECTION}/points/delete",
                      data=body, headers={"Content-Type": "application/json"}, method="POST")
        urlopen(req, timeout=30)
    print(f"   ✅ {len(old_ids)} removidos")

    # 5. Re-embed with fingerprint-rich text
    print(f"\n🧠 Re-embedding com fingerprint único...")
    BATCH = 6
    total = 0
    for i in range(0, len(points), BATCH):
        batch = points[i:i + BATCH]

        # Build fingerprint embed texts
        texts = [build_fingerprint_embed(p["payload"]) for p in batch]
        vecs = embed(texts)

        pts = []
        for p, vec in zip(batch, vecs):
            pts.append({
                "id": str(uuid.uuid4()),
                "vector": [float(v) for v in vec],
                "payload": {**p["payload"], "ts": int(time.time())},
            })

        status = upsert(pts)
        total += len(pts)

        if i % 500 == 0:
            names = [str(p["payload"].get("name", "?"))[:40] for p in batch[:2]]
            print(f"  ✅ {len(pts)}: {', '.join(names)} [{i+1}/{len(points)}]")

    print(f"\n🏁 {total} payloads re-embedados com fingerprint único")

    # 6. Verify uniqueness
    print(f"\n🔍 VERIFICAÇÃO DE UNICIDADE:")
    name_counts2 = Counter()
    offset = None
    while True:
        body = {"filter": {"must": [{"key": "kind", "match": {"value": "design-knowledge"}}]},
                "limit": 2000, "with_payload": True, "with_vector": False}
        if offset: body["offset"] = offset
        req = Request(f"{QDRANT_URL}/collections/{COLLECTION}/points/scroll",
                      data=json.dumps(body).encode(),
                      headers={"Content-Type": "application/json"}, method="POST")
        data = json.loads(urlopen(req, timeout=60).read())
        batch = data.get("result", {}).get("points", [])
        for p in batch:
            name_counts2[str(p["payload"].get("name", "?"))] += 1
        offset = data.get("result", {}).get("next_page_offset")
        if not offset or len(batch) == 0:
            break

    total2 = sum(name_counts2.values())
    unique2 = len(name_counts2)
    dups2 = [(n, c) for n, c in name_counts2.most_common(10) if c > 1]

    print(f"  Total payloads:   {total2}")
    print(f"  Unique names:     {unique2}")
    print(f"  Uniqueness:       {unique2/total2*100:.1f}% (era 9.2%)")
    print(f"  Duplicatas:       {len(dups2)} nomes")

    if dups2:
        print(f"  Top duplicatas:")
        for n, c in dups2[:5]:
            print(f"    [{c}x] {n[:80]}")

    # 7. Quick quality test
    print(f"\n🔍 TESTE DE QUALIDADE PÓS-FINGERPRINT:")
    tests = [
        ("paleta cores clínica estética spa beleza luxo", "Beauty"),
        ("tipografia elegante sofisticada serif heading", "Serif"),
        ("landing page hero features CTA conversão", "Hero"),
        ("dashboard glassmorphism data KPI monitoring", "Glassmorphism"),
        ("cores dentista saúde confiança", "Dental"),
        ("restaurante comida italiana delivery", "Restaurant"),
    ]
    hits = 0
    for query, expected in tests:
        vec = embed([query])[0]
        body = json.dumps({
            "vector": vec, "limit": 2, "with_payload": True,
            "filter": {"must": [
                {"key": "kind", "match": {"value": "design-knowledge"}},
                {"key": "tag", "match": {"value": TAG}},
            ]},
        }).encode()
        req = Request(f"{QDRANT_URL}/collections/{COLLECTION}/points/search",
                      data=body, headers={"Content-Type": "application/json"}, method="POST")
        results = json.loads(urlopen(req, timeout=10).read()).get("result", [])
        top = results[0]["payload"] if results else {}
        name = str(top.get("name", "?"))
        match = expected.lower() in name.lower()
        if match: hits += 1
        m = "✅" if match else "❌"
        print(f"  {m} '{query[:50]}' → {name[:70]} ({results[0]['score']:.3f})" if results else f"  {m} '{query[:50]}' → N/A")

    print(f"\n  📊 PÓS-FINGERPRINT: {hits}/{len(tests)} ({hits/len(tests):.0%})")

if __name__ == "__main__":
    main()
