#!/usr/bin/env python3
"""
Business keyword enrichment — adiciona contexto de negócio aos payloads UUPM.
15 min. Rápido e direto.
"""

import json, re, time, uuid
from urllib.request import Request, urlopen

EMBED_URL = "http://127.0.0.1:8081/embed"
QDRANT_URL = "http://127.0.0.1:6352"
COLLECTION = "adsentice-self"
TAG = "adsentice-warp"

def e(t):
    req = Request(EMBED_URL, data=json.dumps({"texts": [t[:800]]}).encode(), headers={"Content-Type": "application/json"})
    return json.loads(urlopen(req, timeout=10).read())["vectors"][0]

def upsert(pts):
    req = Request(f"{QDRANT_URL}/collections/{COLLECTION}/points?wait=true",
                  data=json.dumps({"points": pts}).encode(), headers={"Content-Type": "application/json"}, method="PUT")
    return json.loads(urlopen(req, timeout=30).read()).get("status", "error")

def fetch_bauhaus_sections():
    """Apenas as 54 seções Bauhaus (design-principles + design-drafts)."""
    pts = []
    for cat in ["design-principles", "design-drafts"]:
        offset = None
        while True:
            body = {"filter": {"must": [
                {"key": "kind", "match": {"value": "design-knowledge"}},
                {"key": "category", "match": {"value": cat}},
            ]}, "limit": 100, "with_payload": True, "with_vector": False}
            if offset: body["offset"] = offset
            req = Request(f"{QDRANT_URL}/collections/{COLLECTION}/points/scroll",
                          data=json.dumps(body).encode(), headers={"Content-Type": "application/json"}, method="POST")
            data = json.loads(urlopen(req, timeout=60).read())
            batch = data.get("result", {}).get("points", [])
            pts.extend(batch)
            offset = data.get("result", {}).get("next_page_offset")
            if not offset or len(batch) == 0: break
    return pts

# SEGMENT KEYWORDS (Matriz Warp + 29 categorias GMB)
SEGMENT_KW = {
    "saude": "saúde médico dentista clínica odontológica hospital fisioterapia psicólogo veterinário confiança higiene profissional azul limpo",
    "beleza": "beleza salão barbearia estética spa cosmético cuidados pessoais luxo feminino rose gold elegante sofisticado",
    "servicos": "serviços advocacia contabilidade arquitetura consultoria engenharia corporativo profissional navy autoridade tradição formal confiança",
    "alimentacao": "alimentação restaurante pizzaria padaria lanchonete comida delivery bebida gastronomia terracota apetite calor acolhedor",
    "comercio": "comércio loja varejo pet shop farmácia drogaria supermercado material construção azul industrial prático confiança",
    "educacao": "educação escola colégio faculdade universidade curso treinamento infantil fundamental médio verde crescimento navy confiança",
    "hospitalidade": "hospitalidade hotel pousada resort hostel turismo viagem hospedagem terracota gold acolhimento experiência premium",
}

# Bauhaus sections → which business segments each section is relevant for
SECTION_SEGMENT_MAP = {
    "Overview": ["saude", "beleza", "comercio", "educacao"],
    "Design Philosophy": ["comercio", "beleza"],
    "Design Token System": ["saude", "beleza", "servicos", "alimentacao", "comercio", "educacao", "hospitalidade"],
    "Colors": ["saude", "beleza", "servicos", "alimentacao", "comercio", "educacao", "hospitalidade"],
    "Typography": ["saude", "beleza", "servicos", "alimentacao", "comercio", "educacao", "hospitalidade"],
    "Component": ["saude", "beleza", "servicos", "alimentacao", "comercio", "educacao", "hospitalidade"],
    "Spacing": ["saude", "beleza", "servicos", "alimentacao", "comercio", "educacao", "hospitalidade"],
    "Iconography": ["saude", "beleza", "comercio"],
    "Mobile Strategy": ["saude", "beleza", "alimentacao", "comercio", "hospitalidade"],
    "Accessibility": ["saude", "servicos", "educacao"],
    "Implementation Guidance": ["servicos", "comercio"],
}

def get_segments(section_title: str) -> list[str]:
    for key, segs in SECTION_SEGMENT_MAP.items():
        if key.lower() in section_title.lower():
            return segs
    return ["comercio"]  # default

def main():
    print("🧠 BUSINESS KEYWORD ENRICHMENT — Bauhaus sections\n")

    pts = fetch_bauhaus_sections()
    print(f"🔍 {len(pts)} seções Bauhaus\n")

    # Delete old
    old_ids = [p["id"] for p in pts]
    for i in range(0, len(old_ids), 100):
        batch = old_ids[i:i+100]
        req = Request(f"{QDRANT_URL}/collections/{COLLECTION}/points/delete",
                      data=json.dumps({"filter": {"must": [{"key": "id", "match": {"any": batch}}]}}).encode(),
                      headers={"Content-Type": "application/json"}, method="POST")
        urlopen(req, timeout=30)
    print(f"🗑️  {len(old_ids)} removidos\n")

    # Re-embed enriched
    BATCH = 6
    total = 0
    for i in range(0, len(pts), BATCH):
        batch = pts[i:i + BATCH]
        new_pts = []

        for p in batch:
            pl = p["payload"]
            section = pl.get("section", "")
            name = str(pl.get("name", ""))
            desc = str(pl.get("description", ""))
            cat = str(pl.get("category", ""))

            segments = get_segments(section)
            seg_kw = " ".join(SEGMENT_KW.get(s, "") for s in segments[:3])

            # Update payload
            pl["segments"] = segments

            # Build ENRICHED embed text
            text = (
                f"Design System: {name}. "
                f"Section: {section}. "
                f"Content: {desc[:350]}. "
                f"Business context: {seg_kw}. "
                f"Applicable segments: {', '.join(segments)}. "
                f"Use for: Brazilian SMB local business marketing digital design."
            )[:800]

            vec = e(text)
            new_pts.append({"id": str(uuid.uuid4()), "vector": [float(v) for v in vec], "payload": {**pl, "ts": int(time.time())}})

        upsert(new_pts)
        total += len(new_pts)
        if i % 24 == 0:
            n = str(batch[0]["payload"].get("name","?"))[:40]
            print(f"  ✅ {len(new_pts)}: {n} [{i+1}/{len(pts)}]")

    print(f"\n🏁 {total} enriquecidos\n")

    # TEST
    print("🔍 TESTE PÓS-ENRICHMENT:")
    tests = [
        ("paleta cores clínica estética spa beleza luxo premium", "beauty", "beleza"),
        ("tipografia elegante sofisticada serif heading editorial luxo", "elegant", "beleza"),
        ("design dentista clínica odontológica saúde confiança profissional", "dental", "saude"),
        ("paleta restaurante italiano comida delivery alimentação", "restaurant", "alimentacao"),
        ("estilo pet shop loja animais farmácia veterinária comércio", "pet", "comercio"),
        ("design escola colégio educação infantil fundamental", "education", "educacao"),
        ("estilo pousada hotel resort hospitalidade praia turismo", "hotel", "hospitalidade"),
        ("layout SaaS enterprise corporativo professional advogado contador", "enterprise", "servicos"),
        ("design academia fitness gym crossfit saúde esporte", "fitness", "saude"),
        ("estilo brutalista bold criativo portfólio arte agência design", "brutalist", "comercio"),
    ]
    hits = 0
    for query, expected, seg in tests:
        vec = e(query)
        body = json.dumps({"vector": vec, "limit": 2, "with_payload": True,
            "filter": {"must": [{"key": "kind", "match": {"value": "design-knowledge"}}]}}).encode()
        req = Request(f"{QDRANT_URL}/collections/{COLLECTION}/points/search",
                      data=body, headers={"Content-Type": "application/json"}, method="POST")
        r = json.loads(urlopen(req, timeout=10).read()).get("result", [])
        top = r[0]["payload"] if r else {}
        name = str(top.get("name","?")); sc = r[0]["score"] if r else 0
        segs = top.get("segments", [])
        match = expected.lower() in name.lower() or seg in segs
        if match: hits += 1
        m = "✅" if match else "❌"
        print(f"  {m} [{','.join(segs[:2])}] '{query[:50]}' → {name[:55]} ({sc:.3f})")

    print(f"\n  📊 ENRICHMENT: {hits}/{len(tests)} ({hits/len(tests):.0%})")
    print(f"  📊 ANTES: 55% (11/20 em queries de negócio)")

if __name__ == "__main__":
    main()
