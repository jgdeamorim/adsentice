#!/usr/bin/env python3
"""
adsentice_skills_ingest.py — INGEST DOS 5 NOVOS MARKETING SKILLS (adsentice-original)
═══════════════════════════════════════════════════════════════════════════════════
Skills criados para a Matriz Warp (22 superfícies × 5 soluções × 7 segmentos):

1. local-seo — Google Meu Negócio, Local Pack, NAP consistency (segmentos: todos)
2. whatsapp-business — WhatsApp Cloud API, automação, templates (segmentos: todos)
3. google-ads-telemetry — Google Ads API, OAuth, variance reports (segmentos: ads-heavy)
4. ifood-integration — iFood Partner API, pedidos, cardápio (segmento: alimentação)
5. booking-ota-integration — Booking.com, Decolar, Airbnb, channel manager (segmento: hospitalidade)

Ingerindo como vec() no Qdrant :6352 (adsentice-self) para o compositor de tokens (ADR-0020)
e pipelines de discovery usarem conhecimento de domínio específico.

Formato: cada skill gera múltiplos chunks (1 framework por seção principal).
Fonte: skills/{name}/SKILL.md
"""

import json, os, time, uuid, re
from pathlib import Path
from urllib.request import Request, urlopen

EMBED_URL = "http://127.0.0.1:8081/embed"
QDRANT_URL = "http://127.0.0.1:6352"
COLLECTION = "adsentice-self"
TAG = "adsentice"

SKILLS_DIR = Path(__file__).parent.parent / "skills"

def embed(texts: list[str]) -> list[list[float]]:
    """Embed texts via :8081 (mpnet 768d)."""
    texts = [t[:800] for t in texts]
    req = Request(EMBED_URL, data=json.dumps({"texts": texts}).encode(),
                  headers={"Content-Type": "application/json"})
    return json.loads(urlopen(req, timeout=30).read())["vectors"]

def upsert(points: list[dict]) -> str:
    """Batch upsert to Qdrant :6352."""
    body = json.dumps({"points": points}).encode()
    req = Request(f"{QDRANT_URL}/collections/{COLLECTION}/points?wait=true",
                  data=body, headers={"Content-Type": "application/json"}, method="PUT")
    return json.loads(urlopen(req, timeout=30).read()).get("status", "error")

def chunk_markdown_sections(text: str) -> list[dict]:
    """
    Extrai seções de um SKILL.md como chunks independentes.
    Cada ## seção vira 1 chunk (framework).
    """
    sections = []
    current_title = ""
    current_text = ""

    for line in text.split("\n"):
        if line.startswith("## ") and current_title:
            if len(current_text.strip()) > 100:
                sections.append({"title": current_title, "text": current_text.strip()})
            current_title = line.strip("# ").strip()
            current_text = line + "\n"
        elif line.startswith("## "):
            current_title = line.strip("# ").strip()
            current_text = line + "\n"
        else:
            current_text += line + "\n"

    # Last section
    if current_title and len(current_text.strip()) > 100:
        sections.append({"title": current_title, "text": current_text.strip()})

    return sections

# ═══════════════════════════════════════════════════════════════
# 5 SKILLS — METADATA + FRAMEWORKS
# ═══════════════════════════════════════════════════════════════

SKILLS_META = {
    "local-seo": {
        "category": "local-presence",
        "segmentos": ["saude", "beleza", "servicos", "alimentacao", "comercio", "educacao", "hospitalidade"],
        "surfaces": ["S10", "S11", "S2", "S12"],
        "solutions": ["SOL1"],
        "related_skills": ["seo-audit", "schema", "programmatic-seo", "whatsapp-business", "competitor-profiling"],
    },
    "whatsapp-business": {
        "category": "messaging",
        "segmentos": ["saude", "beleza", "servicos", "alimentacao", "comercio", "educacao", "hospitalidade"],
        "surfaces": ["S12", "S9", "S10", "S14", "S6"],
        "solutions": ["SOL1", "SOL2", "SOL3"],
        "related_skills": ["sms", "sales-enablement", "local-seo", "emails"],
    },
    "google-ads-telemetry": {
        "category": "advertising-analytics",
        "segmentos": ["saude", "beleza", "alimentacao", "servicos"],
        "surfaces": ["S3", "S9", "S15", "S17", "S4"],
        "solutions": ["SOL2", "SOL4"],
        "related_skills": ["ads", "ad-creative", "analytics", "competitor-intel", "revops"],
    },
    "ifood-integration": {
        "category": "food-delivery",
        "segmentos": ["alimentacao"],
        "surfaces": ["S9", "S12", "S3", "S15", "S17"],
        "solutions": ["SOL2", "SOL3"],
        "related_skills": ["local-seo", "whatsapp-business", "social", "reputation"],
    },
    "booking-ota-integration": {
        "category": "hospitality",
        "segmentos": ["hospitalidade"],
        "surfaces": ["S9", "S12", "S3", "S15", "S17"],
        "solutions": ["SOL2", "SOL3"],
        "related_skills": ["local-seo", "whatsapp-business", "social", "reputation", "competitor-intel"],
    },
}

def main():
    print("🧠 ADSENTICE · SKILLS INGEST (5 novos skills)")
    print(f"   Source: {SKILLS_DIR}")
    print(f"   Target: {COLLECTION} @ Qdrant :6352")
    print()

    total_chunks = 0
    all_frameworks = []

    for skill_name, meta in SKILLS_META.items():
        skill_file = SKILLS_DIR / skill_name / "SKILL.md"
        if not skill_file.exists():
            print(f"  ⚠ {skill_name}: SKILL.md NÃO ENCONTRADO em {skill_file}")
            continue

        content = skill_file.read_text()
        sections = chunk_markdown_sections(content)

        print(f"  📄 {skill_name}: {len(sections)} seções → {len(sections)} frameworks")
        if not sections:
            print(f"     ⚠ Sem seções extraídas, usando fallback (full text)")
            sections = [{"title": skill_name, "text": content[:2000]}]

        for sec in sections:
            fw = {
                "source": "adsentice-original",
                "kind": "execution",
                "framework": f"adsentice_{skill_name.replace('-', '_')}",
                "title": f"[{skill_name}] {sec['title'][:120]}",
                "text": sec["text"][:800],
                "skill_name": skill_name,
                "skill_category": meta["category"],
                "skill_segmentos": meta["segmentos"],
                "skill_surfaces": meta["surfaces"],
                "skill_solutions": meta["solutions"],
                "skill_related": meta["related_skills"],
            }
            all_frameworks.append(fw)

    # ── Batch embed + upsert (6 por batch) ──
    BATCH = 6
    for i in range(0, len(all_frameworks), BATCH):
        batch = all_frameworks[i:i + BATCH]
        texts = [f["text"][:800] for f in batch]
        try:
            vecs = embed(texts)
        except Exception as e:
            print(f"  ❌ Embed error: {e}")
            continue

        points = []
        for fw, vec in zip(batch, vecs):
            points.append({
                "id": str(uuid.uuid4()),
                "vector": vec,
                "payload": {**fw, "tag": TAG, "ts": int(time.time())}
            })

        try:
            status = upsert(points)
            total_chunks += len(points)
            print(f"  ✅ {len(points)} chunks → {status}")
        except Exception as e:
            print(f"  ❌ Upsert error: {e}")

    # ── Save JSON registry ──
    out = SKILLS_DIR.parent / "docs" / "spec" / "adsentice-skills-frameworks.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    with open(out, "w") as f:
        json.dump(all_frameworks, f, indent=2, ensure_ascii=False)

    print(f"\n🏁 {total_chunks} frameworks ingeridos de 5 skills")
    print(f"   Query: adsentice_search('Google Meu Negócio local SEO NAP')")
    print(f"   Query: adsentice_search('WhatsApp Business Cloud API template')")
    print(f"   Query: adsentice_search('Google Ads API telemetry variance report')")
    print(f"   Query: adsentice_search('iFood pedidos cardápio integração')")
    print(f"   Query: adsentice_search('Booking Decolar channel manager pousada')")
    print(f"\n📄 Registry: {out}")

if __name__ == "__main__":
    main()
