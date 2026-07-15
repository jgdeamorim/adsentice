#!/usr/bin/env python3
"""
adsentice_uupm_prose_fix.py — RE-INGEST CORRETO: design.csv + draft.csv como DOCUMENTOS
═══════════════════════════════════════════════════════════════
Problema: design.csv (1,776 linhas) e draft.csv (1,602 linhas) são
documentos de PROSA de design system — NÃO tabelas CSV.
O ingest original quebrou cada linha em payload atômico sem rota.

Solução:
  1. Ler cada arquivo como documento completo
  2. Extrair seções lógicas (marcadas por ##, <design-system>, números)
  3. Cada SEÇÃO vira 1 payload com: estilo | seção | conteúdo rico
  4. Embed com keywords de negócio (segmentos, melhores usos)
  5. Resultado: ~20-30 payloads por estilo, semanticamente ricos

Rota de composição:
  Bauhaus → Design Philosophy → Design Token System → Colors → Typography
  → Spacing → Components → Iconography → Mobile Strategy → Accessibility
  → Implementation Guidance → Anti-patterns

medido=verdade · 2026-07-15 · adsentice
"""

import json, os, re, time, uuid
from pathlib import Path
from urllib.request import Request, urlopen

EMBED_URL = "http://127.0.0.1:8081/embed"
QDRANT_URL = "http://127.0.0.1:6352"
COLLECTION = "adsentice-self"
TAG = "adsentice-warp"

UUPM_DIR = Path("/media/jeffer/5aab5a95-8290-d3f7-2e4f-8c27cc2d09a93/EVO-API/self-essentials/ui-ux-pro-max-skill/src/ui-ux-pro-max/data")

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

def read_design_doc(filepath: Path) -> str:
    """Lê o CSV de 1 coluna como documento de prosa completo."""
    with open(filepath) as f:
        content = f.read()

    # Extrai o texto de cada linha (ignora a estrutura CSV)
    lines = []
    for line in content.strip().split('\n'):
        # CSV de 1 coluna: pega o texto entre a primeira vírgula e o fim
        # ou a linha inteira se for header
        if ',' in line:
            text = line.split(',', 1)[1].strip().strip('"')
        else:
            text = line.strip()
        if text:
            lines.append(text)

    return '\n'.join(lines)

def extract_sections(doc_text: str) -> list[dict]:
    """
    Extrai seções lógicas do documento de design system.

    Seções identificadas por:
    - ## Section Name (markdown headers)
    - <design-system> (XML tag blocks)
    - Numbered sections: "1. Design Philosophy", "2. Design Token System"
    - Blocos de código/tokens
    """
    sections = []

    # Strategy: split by markdown headers (## ) and numbered sections
    # Then group adjacent lines into coherent chunks

    # First, extract the OVERVIEW (first ~20 lines before any section marker)
    lines = doc_text.split('\n')

    # Find the overview: everything from start to first major section
    overview_lines = []
    section_start = 0
    for i, line in enumerate(lines):
        stripped = line.strip()
        if re.match(r'^(##\s+|<\w+>|\d+\.\s+Design\s+(Philosophy|Token|Style|Color|Typo|Spac|Comp|Icon|Mob|Acc|Impl|Key))', stripped):
            section_start = i
            break
        if stripped:
            overview_lines.append(stripped)

    if overview_lines:
        sections.append({
            "title": "Overview",
            "content": ' '.join(overview_lines)[:2000]
        })

    # Extract sections from remaining content
    current_title = "Design Details"
    current_lines = []

    for i in range(section_start, len(lines)):
        line = lines[i].strip()
        if not line:
            continue

        # Detect section boundary
        is_boundary = False
        new_title = None

        # Markdown header
        m = re.match(r'^##\s+(.+)$', line)
        if m:
            is_boundary = True
            new_title = m.group(1).strip()

        # Numbered major section
        m = re.match(r'^(\d+)\.\s+(Design\s+\w.+|Colors?|Typography|Spacing|Components?|Iconography|Mobile|Accessibility|Implementation|Key\s+Charact\w+)', line, re.IGNORECASE)
        if m:
            is_boundary = True
            new_title = m.group(0).strip()

        # XML tag
        m = re.match(r'^<(\w+)>', line)
        if m:
            is_boundary = True
            new_title = m.group(1).strip()

        if is_boundary and current_lines:
            content = ' '.join(current_lines)[:2000]
            if len(content) > 50:
                sections.append({
                    "title": current_title,
                    "content": content
                })
            current_title = new_title or "Design Details"
            current_lines = []
        else:
            current_lines.append(line)

    # Don't forget the last section
    if current_lines:
        content = ' '.join(current_lines)[:2000]
        if len(content) > 50:
            sections.append({
                "title": current_title,
                "content": content
            })

    return sections

def extract_style_metadata(doc_text: str) -> dict:
    """Extrai metadados do estilo: nome, segmentos, keywords."""
    meta = {
        "style_name": "Unknown",
        "best_for": [],
        "keywords": [],
        "primary_colors": [],
        "era": "",
        "complexity": "",
    }

    # Style name from first meaningful line
    lines = [l.strip() for l in doc_text.split('\n') if l.strip()]
    if lines:
        # First line is usually the style description
        first = lines[0]
        # Try to find style name in patterns like "Bauhaus", "Minimalism", etc.
        for pattern in ["Bauhaus", "Minimalism", "Swiss", "Glassmorphism", "Neumorphism",
                        "Brutalism", "Flat Design", "Material Design", "Neon", "Retro",
                        "Skeuomorphism", "Y2K", "Vaporwave", "Cyberpunk", "Organic"]:
            if pattern.lower() in doc_text.lower()[:500]:
                meta["style_name"] = pattern
                break

    # Extract best-for categories
    best_for_match = re.findall(r'(?:Best For|best for|完美应用)[:\s]+(.+?)(?:\n|$)', doc_text[:500])
    if best_for_match:
        meta["best_for"] = [x.strip() for x in best_for_match[0].split(',')[:5]]

    # Extract colors
    colors = re.findall(r'#([0-9A-Fa-f]{6})', doc_text[:2000])
    if colors:
        meta["primary_colors"] = list(dict.fromkeys(colors[:6]))  # unique, preserve order

    # Extract era
    era_match = re.search(r'(?:Era|Origin)[:\s]+(.+?)(?:\n|$)', doc_text[:1000])
    if era_match:
        meta["era"] = era_match.group(1).strip()[:60]

    # Keywords from the opening description (first 3 sentences)
    desc_words = ' '.join(lines[:3])
    meta["keywords"] = [w.strip('.,;:') for w in desc_words.split()
                       if len(w) > 4 and w[0].isupper()][:10]

    return meta

def build_rich_embed_text(style_name: str, section: dict, meta: dict, doc_type: str) -> str:
    """Constrói texto de embed rico: estilo + seção + metadados + keywords."""
    parts = [
        f"Design System: {style_name}",
        f"Section: {section['title']}",
        f"Content: {section['content'][:500]}",
    ]

    # Add business context
    if meta.get("best_for"):
        parts.append(f"Best for: {', '.join(meta['best_for'])}")
    if meta.get("primary_colors"):
        parts.append(f"Colors: {' '.join('#' + c for c in meta['primary_colors'][:4])}")
    if meta.get("era"):
        parts.append(f"Origin: {meta['era']}")
    if meta.get("keywords"):
        parts.append(f"Keywords: {', '.join(meta['keywords'][:8])}")

    # Business segment enrichment
    business_keywords = {
        "Bauhaus": "brand websites ecommerce tools apps digital media editorial geometric bold modern functional",
        "Minimalism": "enterprise apps dashboards SaaS documentation professional clean swiss corporate",
        "Glassmorphism": "tech SaaS modern apps dashboard blur transparency futuristic",
        "Neumorphism": "wellness health fitness meditation soft UI subtle organic",
        "Brutalism": "bold creative portfolio artistic unconventional raw striking",
        "Flat Design": "micro SaaS indie startup simple colorful modern mobile-first",
        "Dark Mode": "OLED night mode developer tools gaming crypto tech",
        "Y2K": "fashion beauty retro nostalgia gen-z bold metallic",
        "Cyberpunk": "gaming crypto futuristic tech neon vibrant dystopian",
    }
    for style_kw, biz_kw in business_keywords.items():
        if style_kw.lower() in style_name.lower():
            parts.append(f"Best for businesses: {biz_kw}")
            break

    parts.append(f"Source: UUPM {doc_type} document")
    return " | ".join(parts)[:800]

def main():
    print("🧠 ADSENTICE · UUPM PROSE FIX — Re-embed design.csv + draft.csv como DOCUMENTOS")
    print()

    # ═══════════════════════════════════════════════════════════
    # STEP 1: DELETE old design-principles + design-drafts payloads
    # ═══════════════════════════════════════════════════════════
    print("🗑️  Removendo payloads antigos de design-principles + design-drafts...")
    for cat in ["design-principles", "design-drafts"]:
        # Count first
        body = json.dumps({
            "filter": {"must": [
                {"key": "kind", "match": {"value": "design-knowledge"}},
                {"key": "category", "match": {"value": cat}},
            ]},
            "limit": 1, "with_payload": False, "with_vector": False,
        }).encode()
        req = Request(f"{QDRANT_URL}/collections/{COLLECTION}/points/scroll",
                      data=body, headers={"Content-Type": "application/json"}, method="POST")
        data = json.loads(urlopen(req, timeout=10).read())

        # Delete all matching
        offset = None
        deleted = 0
        while True:
            del_body = {"filter": {"must": [
                {"key": "kind", "match": {"value": "design-knowledge"}},
                {"key": "category", "match": {"value": cat}},
            ]}}
            del_req = Request(f"{QDRANT_URL}/collections/{COLLECTION}/points/delete",
                            data=json.dumps(del_body).encode(),
                            headers={"Content-Type": "application/json"}, method="POST")
            json.loads(urlopen(del_req, timeout=30).read())
            deleted += 1
            # Qdrant delete is one-shot per filter, so we're done after 1 call
            break
        print(f"   {cat}: removidos")

    print(f"   ✅ Limpo")

    # ═══════════════════════════════════════════════════════════
    # STEP 2: READ design.csv + draft.csv as PROSE documents
    # ═══════════════════════════════════════════════════════════

    design_docs = [
        ("design.csv", "design-principles"),
        ("draft.csv", "design-drafts"),
    ]

    total_payloads = 0

    for filename, category in design_docs:
        filepath = UUPM_DIR / filename
        if not filepath.exists():
            print(f"  ⚠️ {filename} não encontrado")
            continue

        print(f"\n📄 {filename} → lendo como documento de prosa...")
        doc_text = read_design_doc(filepath)
        print(f"   {len(doc_text)} caracteres, {len(doc_text.split(chr(10)))} linhas")

        # Extract metadata
        meta = extract_style_metadata(doc_text)
        print(f"   Estilo: {meta['style_name']}")
        print(f"   Best for: {', '.join(meta['best_for'][:3])}")
        print(f"   Colors: {' '.join('#' + c for c in meta['primary_colors'][:4])}")

        # Extract sections
        sections = extract_sections(doc_text)
        print(f"   {len(sections)} seções lógicas extraídas")
        for s in sections[:5]:
            print(f"     [{s['title'][:50]}] ({len(s['content'])} chars)")

        # Embed each section as a rich payload
        print(f"   🧠 Embedding {len(sections)} seções...")
        BATCH = 6
        embedded = 0
        for i in range(0, len(sections), BATCH):
            batch = sections[i:i + BATCH]
            texts = [build_rich_embed_text(meta["style_name"], s, meta, category) for s in batch]
            vecs = embed(texts)

            pts = []
            for s, vec in zip(batch, vecs):
                pts.append({
                    "id": str(uuid.uuid4()),
                    "vector": [float(v) for v in vec],
                    "payload": {
                        "id": f"{meta['style_name']} | {s['title']}"[:100],
                        "kind": "design-knowledge",
                        "tag": TAG,
                        "category": category,
                        "name": f"{meta['style_name']} | {s['title']}"[:120],
                        "description": s["content"][:600],
                        "intent": f"design system specification for {meta['style_name']} style — {s['title']}",
                        "triggers": [
                            meta["style_name"].lower(),
                            s["title"].lower(),
                            category,
                        ] + [kw.lower() for kw in meta.get("keywords", [])[:5]],
                        "style_name": meta["style_name"],
                        "section": s["title"],
                        "source": "ui-ux-pro-max (nextlevelbuilder)",
                        "source_type": category,
                        "source_quality": "P0",
                        "best_for": meta.get("best_for", []),
                        "primary_colors": meta.get("primary_colors", []),
                        "era": meta.get("era", ""),
                        "ts": int(time.time()),
                    },
                })

            upsert(pts)
            embedded += len(pts)

        total_payloads += embedded
        print(f"   ✅ {embedded} payloads embedados")

    print(f"\n🏁 {total_payloads} payloads re-embedados como documentos de prosa")

    # ═══════════════════════════════════════════════════════════
    # STEP 3: TEST
    # ═══════════════════════════════════════════════════════════
    print(f"\n🔍 TESTE DE QUALIDADE PÓS-PROSE FIX:")

    tests = [
        ("estilo visual bauhaus design geométrico cores primárias bold moderno", "Bauhaus"),
        ("design minimalista limpo clean suíço swiss whitespace funcional", "Minimalism"),
        ("paleta de cores para clínica estética spa beleza luxo premium", "beauty"),
        ("estilo visual corporativo profissional enterprise SaaS dashboard", "professional"),
        ("tipografia elegante serif luxo sofisticada heading editorial", "elegant"),
        ("design system glassmorphism vidro blur tech moderno", "glass"),
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

        if results:
            top = results[0]["payload"]
            name = str(top.get("name", "?"))
            desc = str(top.get("description", ""))[:80]
            match = expected.lower() in name.lower() or expected.lower() in desc.lower()
            if match: hits += 1
            m = "✅" if match else "❌"
            print(f"  {m} '{query[:55]}' → {name[:70]} ({results[0]['score']:.3f})")
        else:
            print(f"  ❌ '{query[:55]}' → N/A")

    print(f"\n  📊 PÓS-PROSE FIX: {hits}/{len(tests)} ({hits/len(tests):.0%})")

    return total_payloads

if __name__ == "__main__":
    main()
