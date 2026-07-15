#!/usr/bin/env python3
"""
adsentice_uupm_ingest.py — UI UX PRO MAX: Conhecimento de design estruturado
═══════════════════════════════════════════════════════════════════
Fonte: EVO-API/self-essentials/ui-ux-pro-max-skill (nextlevelbuilder)
       161 reasoning rules · 85 UI styles · 161 color palettes
       35 landing patterns · 74 typography pairings · 26 chart types
       99 UX guidelines · 1924 font combinations · 30 app interfaces
       162 product patterns · 45 React perf tips · 105 icon libraries
       1775 design principles · 1778 draft designs

Total: ~6,500 linhas de conhecimento de design em CSV.

Cada linha vira 1 ponto no Qdrant com kind="design-knowledge".
Isso alimenta o M9 tokens-composer.ts (ADR-0020).

medido=verdade · 2026-07-14 · adsentice
"""

import csv, json, os, sys, time, uuid
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

def read_csv(filename):
    """Le CSV com encoding UTF-8, ignora BOM, retorna lista de dicts."""
    filepath = UUPM_DIR / filename
    if not filepath.exists():
        print(f"  ⚠ {filename} não encontrado")
        return []
    with open(filepath, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        return list(reader)

def build_points(rows, category, build_text_fn):
    """Converte linhas CSV em pontos Qdrant."""
    points = []
    seen = set()
    for row in rows:
        text = build_text_fn(row)[:800]
        if not text.strip():
            continue
        # Dedup por hash do texto
        h = hash(text)
        if h in seen:
            continue
        seen.add(h)

        name = row.get("Style Category") or row.get("Product Type") or row.get("Category") or row.get("Pattern Name") or row.get("Font Pairing Name") or row.get("Data Type") or category
        name = str(name)[:120]

        points.append({
            "id": str(uuid.uuid4()),
            "payload": {
                "id": name[:100],
                "kind": "design-knowledge",
                "tag": TAG,
                "category": category,
                "name": name,
                "description": text[:600],
                "source": "ui-ux-pro-max (nextlevelbuilder)",
                "source_type": category,
                "source_quality": "P0",
                "raw": {k: str(v)[:200] for k, v in row.items() if v},
                "ts": int(time.time()),
            },
            "text": text,
        })
    return points

# ═══════════════════════════════════════════════════════════════
# BUILDERS — cada categoria tem sua função de formatação
# ═══════════════════════════════════════════════════════════════

def build_styles_text(row):
    """85 UI Styles com design tokens completos."""
    return (
        f"UI Style: {row.get('Style Category', '')}. Type: {row.get('Type', '')}. "
        f"Keywords: {row.get('Keywords', '')}. "
        f"Primary Colors: {row.get('Primary Colors', '')}. "
        f"Secondary Colors: {row.get('Secondary Colors', '')}. "
        f"Effects: {row.get('Effects & Animation', '')}. "
        f"Best For: {row.get('Best For', '')}. "
        f"Do Not Use For: {row.get('Do Not Use For', '')}. "
        f"Light Mode: {row.get('Light Mode ✓', '')}. Dark Mode: {row.get('Dark Mode ✓', '')}. "
        f"Performance: {row.get('Performance', '')}. Accessibility: {row.get('Accessibility', '')}. "
        f"Mobile: {row.get('Mobile-Friendly', '')}. Conversion: {row.get('Conversion-Focused', '')}. "
        f"Era: {row.get('Era/Origin', '')}. Complexity: {row.get('Complexity', '')}. "
        f"AI Prompt: {row.get('AI Prompt Keywords', '')}. "
        f"CSS: {row.get('CSS/Technical Keywords', '')}. "
        f"Implementation: {row.get('Implementation Checklist', '')}. "
        f"Tokens: {row.get('Design System Variables', '')}"
    )

def build_colors_text(row):
    """161 Color palettes for product types."""
    return (
        f"Product Type: {row.get('Product Type', '')}. "
        f"Primary: {row.get('Primary', '')}, On Primary: {row.get('On Primary', '')}. "
        f"Secondary: {row.get('Secondary', '')}, On Secondary: {row.get('On Secondary', '')}. "
        f"Accent: {row.get('Accent', '')}, On Accent: {row.get('On Accent', '')}. "
        f"Background: {row.get('Background', '')}, Foreground: {row.get('Foreground', '')}. "
        f"Card: {row.get('Card', '')}, Card Foreground: {row.get('Card Foreground', '')}. "
        f"Muted: {row.get('Muted', '')}, Muted Foreground: {row.get('Muted Foreground', '')}. "
        f"Border: {row.get('Border', '')}. Destructive: {row.get('Destructive', '')}. "
        f"Ring: {row.get('Ring', '')}. Notes: {row.get('Notes', '')}"
    )

def build_reasoning_text(row):
    """161 UI reasoning rules."""
    return (
        f"UI Category: {row.get('UI_Category', '')}. "
        f"Recommended Pattern: {row.get('Recommended_Pattern', '')}. "
        f"Style Priority: {row.get('Style_Priority', '')}. "
        f"Color Mood: {row.get('Color_Mood', '')}. "
        f"Typography Mood: {row.get('Typography_Mood', '')}. "
        f"Key Effects: {row.get('Key_Effects', '')}. "
        f"Decision Rules: {row.get('Decision_Rules', '')}. "
        f"Anti Patterns: {row.get('Anti_Patterns', '')}. "
        f"Severity: {row.get('Severity', '')}"
    )

def build_ux_text(row):
    """99 UX guidelines."""
    return (
        f"UX Guideline: {row.get('Category', '')} - {row.get('Issue', '')}. "
        f"Platform: {row.get('Platform', '')}. "
        f"Description: {row.get('Description', '')}. "
        f"Do: {row.get('Do', '')}. Don't: {row.get('Don\'t', '')}. "
        f"Good Code: {row.get('Code Example Good', '')[:200]}. "
        f"Bad Code: {row.get('Code Example Bad', '')[:200]}. "
        f"Severity: {row.get('Severity', '')}"
    )

def build_landing_text(row):
    """35 Landing page patterns."""
    return (
        f"Landing Pattern: {row.get('Pattern Name', '')}. "
        f"Keywords: {row.get('Keywords', '')}. "
        f"Section Order: {row.get('Section Order', '')}. "
        f"CTA Placement: {row.get('Primary CTA Placement', '')}. "
        f"Color Strategy: {row.get('Color Strategy', '')}. "
        f"Effects: {row.get('Recommended Effects', '')}. "
        f"Conversion: {row.get('Conversion Optimization', '')}"
    )

def build_typography_text(row):
    """74 Typography pairings."""
    return (
        f"Font Pairing: {row.get('Font Pairing Name', '')}. "
        f"Category: {row.get('Category', '')}. "
        f"Heading: {row.get('Heading Font', '')}. Body: {row.get('Body Font', '')}. "
        f"Mood: {row.get('Mood/Style Keywords', '')}. "
        f"Best For: {row.get('Best For', '')}. "
        f"Google Fonts: {row.get('Google Fonts URL', '')}. "
        f"CSS: {row.get('CSS Import', '')[:200]}. "
        f"Tailwind: {row.get('Tailwind Config', '')[:200]}. "
        f"Notes: {row.get('Notes', '')}"
    )

def build_charts_text(row):
    """26 Chart types."""
    return (
        f"Chart Type: {row.get('Data Type', '')}. Keywords: {row.get('Keywords', '')}. "
        f"Best Chart: {row.get('Best Chart Type', '')}. "
        f"Secondary: {row.get('Secondary Options', '')}. "
        f"When: {row.get('When to Use', '')}. "
        f"When NOT: {row.get('When NOT to Use', '')}. "
        f"Data Volume: {row.get('Data Volume Threshold', '')}. "
        f"Color: {row.get('Color Guidance', '')}. "
        f"Accessibility: {row.get('Accessibility Grade', '')} - {row.get('Accessibility Notes', '')}. "
        f"Library: {row.get('Library Recommendation', '')}"
    )

def build_products_text(row):
    """162 Product design patterns."""
    return (
        f"Product: {row.get('Product Type', '')}. Keywords: {row.get('Keywords', '')}. "
        f"Primary Style: {row.get('Primary Style Recommendation', '')}. "
        f"Secondary: {row.get('Secondary Styles', '')}. "
        f"Landing: {row.get('Landing Page Pattern', '')}. "
        f"Dashboard: {row.get('Dashboard Style (if applicable)', '')}. "
        f"Colors: {row.get('Color Palette Focus', '')}. "
        f"Key Considerations: {row.get('Key Considerations', '')}"
    )

def build_app_text(row):
    """30 App interface patterns."""
    return (
        f"App Interface: {row.get('Category', '')} - {row.get('Issue', '')}. "
        f"Platform: {row.get('Platform', '')}. "
        f"Keywords: {row.get('Keywords', '')}. "
        f"Description: {row.get('Description', '')}. "
        f"Do: {row.get('Do', '')}. Don't: {row.get('Don\'t', '')}. "
        f"Good: {row.get('Code Example Good', '')[:200]}. "
        f"Bad: {row.get('Code Example Bad', '')[:200]}. "
        f"Severity: {row.get('Severity', '')}"
    )

def build_react_perf_text(row):
    """45 React performance tips."""
    return (
        f"React Perf: {row.get('Category', '')} - {row.get('Issue', '')}. "
        f"Keywords: {row.get('Keywords', '')}. Platform: {row.get('Platform', '')}. "
        f"Description: {row.get('Description', '')}. "
        f"Do: {row.get('Do', '')}. Don't: {row.get('Don\'t', '')}. "
        f"Good: {row.get('Code Example Good', '')[:200]}. "
        f"Bad: {row.get('Code Example Bad', '')[:200]}. "
        f"Severity: {row.get('Severity', '')}"
    )

def build_icons_text(row):
    """105 Icon libraries."""
    cols = list(row.keys())
    vals = list(row.values())
    return "Icon Library: " + " | ".join(f"{c}: {v}" for c, v in zip(cols, vals) if v)[:800]

def build_google_fonts_text(row):
    """1924 Google Fonts combinations."""
    cols = list(row.keys())
    vals = list(row.values())
    return "Google Fonts: " + " | ".join(f"{c}: {v}" for c, v in zip(cols, vals) if v)[:800]

def build_design_text(row):
    """1775 Design principles."""
    cols = list(row.keys())
    vals = list(row.values())
    return "Design Principle: " + " | ".join(f"{c}: {v}" for c, v in zip(cols, vals) if v)[:800]

def build_draft_text(row):
    """1778 Draft designs."""
    cols = list(row.keys())
    vals = list(row.values())
    return "Design Draft: " + " | ".join(f"{c}: {v}" for c, v in zip(cols, vals) if v)[:800]

# ═══════════════════════════════════════════════════════════════
# EXECUÇÃO
# ═══════════════════════════════════════════════════════════════

CATEGORIES = [
    # (arquivo, categoria, builder, descrição)
    ("styles.csv", "ui-styles", build_styles_text, "85 UI Styles com design tokens"),
    ("colors.csv", "color-palettes", build_colors_text, "161 Color palettes"),
    ("ui-reasoning.csv", "ui-reasoning", build_reasoning_text, "161 UI reasoning rules"),
    ("ux-guidelines.csv", "ux-guidelines", build_ux_text, "99 UX guidelines"),
    ("landing.csv", "landing-patterns", build_landing_text, "35 Landing patterns"),
    ("typography.csv", "typography", build_typography_text, "74 Typography pairings"),
    ("charts.csv", "chart-types", build_charts_text, "26 Chart types"),
    ("products.csv", "product-patterns", build_products_text, "162 Product patterns"),
    ("app-interface.csv", "app-interfaces", build_app_text, "30 App interfaces"),
    ("react-performance.csv", "react-performance", build_react_perf_text, "45 React perf tips"),
    ("icons.csv", "icon-libraries", build_icons_text, "105 Icon libraries"),
    ("google-fonts.csv", "google-fonts", build_google_fonts_text, "1924 Font combinations"),
    ("design.csv", "design-principles", build_design_text, "1775 Design principles"),
    ("draft.csv", "design-drafts", build_draft_text, "1778 Draft designs"),
]

def main():
    print("🧠 ADSENTICE · UI UX PRO MAX INGEST — Design Knowledge")
    print(f"   Source: {UUPM_DIR}")
    print(f"   Target: {COLLECTION} @ Qdrant :6352")
    print()

    total_points = 0
    BATCH = 8

    for filename, category, builder, desc in CATEGORIES:
        rows = read_csv(filename)
        if not rows:
            continue

        points = []
        for row in rows:
            text = builder(row)[:800]
            if not text.strip() or len(text) < 30:
                continue

            points.append({
                "row": row,
                "text": text,
            })

        print(f"  📄 {filename}: {len(rows)} rows → {len(points)} pontos ({desc})")

        # Embed + upsert in batches
        for i in range(0, len(points), BATCH):
            batch = points[i:i + BATCH]
            texts = [p["text"] for p in batch]
            vecs = embed(texts)
            qpoints = []
            for p, vec in zip(batch, vecs):
                row = p["row"]
                name_val = row.get("Style Category") or row.get("Product Type") or row.get("Category") or row.get("Pattern Name") or row.get("Font Pairing Name") or row.get("Data Type") or category
                name = str(name_val)[:120]

                qpoints.append({
                    "id": str(uuid.uuid4()),
                    "vector": vec,
                    "payload": {
                        "id": name[:100],
                        "kind": "design-knowledge",
                        "tag": TAG,
                        "category": category,
                        "name": name,
                        "description": p["text"][:600],
                        "source": "ui-ux-pro-max (nextlevelbuilder)",
                        "source_type": category,
                        "source_quality": "P0",
                        "ts": int(time.time()),
                    },
                })
            upsert(qpoints)
            total_points += len(qpoints)

    # Verify
    print(f"\n🔍 VERIFY queries:")
    tests = [
        ("paleta de cores para clinica de estetica spa beleza wellness luxo", "styles"),
        ("landing page pattern para SaaS com hero features CTA conversion", "landing"),
        ("tipografia elegante luxo sofisticado serif heading", "typography"),
        ("dashboard estilo glassmorphism data-dense KPI monitoring", "ui-reasoning"),
    ]
    for query, expected_cat in tests:
        vec = embed([query])[0]
        body = json.dumps({
            "vector": vec,
            "filter": {"must": [{"key": "kind", "match": {"value": "design-knowledge"}},
                               {"key": "tag", "match": {"value": TAG}}]},
            "limit": 2,
            "with_payload": True,
        }).encode()
        req = Request(f"{QDRANT_URL}/collections/{COLLECTION}/points/search", data=body,
                      headers={"Content-Type": "application/json"}, method="POST")
        data = json.loads(urlopen(req, timeout=10).read())
        results = data.get("result", [])
        top_cat = results[0]["payload"]["category"] if results else "N/A"
        top_name = results[0]["payload"]["name"][:80] if results else "N/A"
        match = "✅" if expected_cat in top_cat else "⚠️"
        print(f"   {match} '{query[:80]}' → [{top_cat}] {top_name}")

    print(f"\n🏁 {total_points} design knowledge points ingeridos")
    print(f"   kind=design-knowledge · tag={TAG}")
    print(f"   M9 tokens-composer.ts alimentado com design intelligence")

if __name__ == "__main__":
    main()
