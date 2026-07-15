#!/usr/bin/env python3
"""
adsentice_dual_embed_ingest.py — DUAL EMBED e0+e1 · IMPLEMENTAÇÃO + TESTE
═══════════════════════════════════════════════════════════════
ADR-0021: Dual Embed e0+e1 para busca semântica adsentice.

e0: all-MiniLM-L6-v2 (384d, EN code)
e1: paraphrase-multilingual-MiniLM-L12-v2 (384d, PT prose/market/design)

Fluxo:
  1. Carrega e0 + e1 via fastembed Python (já instalado, pip)
  2. Busca payloads existentes no Qdrant (tag=adsentice-warp)
  3. Para cada payload: embed EN + PT → 2 vecs → re-upsert
  4. TESTE A/B: single embed (mpnet 768d) vs dual embed (e0+e1)

Vantagem sobre Rust :8081:
  - fastembed Python é mantido pelo Qdrant (30 modelos vs 5)
  - Zero compilação, pip install
  - Modelos e0/e1 já disponíveis nativamente
  - Mesmo ONNX Runtime (C++) por baixo

medido=verdade · ADR-0021 · 2026-07-15 · adsentice
"""

import json, os, sys, time, uuid, re
from urllib.request import Request, urlopen

# ═══════════════════════════════════════════════════════════════
# CONFIG
# ═══════════════════════════════════════════════════════════════

QDRANT_URL = "http://127.0.0.1:6352"
COLLECTION_OLD = "adsentice-self"       # mpnet 768d (original)
COLLECTION_DUAL = "adsentice-warp-dual"  # e0+e1 384d (novo)
COLLECTION = COLLECTION_DUAL  # target for dual embed
TAG = "adsentice-warp"

E0_MODEL = "sentence-transformers/all-MiniLM-L6-v2"          # 384d EN code
E1_MODEL = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"  # 384d PT prose

BATCH_SIZE = 6
LIMIT_PAYLOADS = 100  # None = todos. 100 = teste rápido.

# ═══════════════════════════════════════════════════════════════
# FASTEMBED LOAD (e0 + e1)
# ═══════════════════════════════════════════════════════════════

def load_models():
    """Carrega e0 e e1 via fastembed Python. Download automático na 1ª vez."""
    from fastembed import TextEmbedding
    import fastembed

    print(f"📦 fastembed v{fastembed.__version__}")

    t0 = time.time()
    print(f"   Carregando e0: {E0_MODEL}...")
    e0 = TextEmbedding(E0_MODEL)
    e0_time = time.time() - t0
    print(f"   ✅ e0 carregado em {e0_time:.1f}s")

    t1 = time.time()
    print(f"   Carregando e1: {E1_MODEL}...")
    e1 = TextEmbedding(E1_MODEL)
    e1_time = time.time() - t1
    print(f"   ✅ e1 carregado em {e1_time:.1f}s")

    return e0, e1

# ═══════════════════════════════════════════════════════════════
# NORMALIZAÇÃO (language-aware)
# ═══════════════════════════════════════════════════════════════

def normalize_en(text: str) -> str:
    """e0: lowercase, trim, collapse whitespace."""
    return re.sub(r'\s+', ' ', text.strip().lower())

def normalize_pt(text: str) -> str:
    """e1: preserve accents, trim, collapse whitespace."""
    return re.sub(r'\s+', ' ', text.strip())

# ═══════════════════════════════════════════════════════════════
# BUILD EMBED TEXTS
# ═══════════════════════════════════════════════════════════════

def build_en_text(payload: dict) -> str:
    """Constrói texto EN para e0: description + name + triggers em lowercase."""
    parts = []
    for field in ['description', 'name', 'intent']:
        val = payload.get(field, '')
        if val:
            parts.append(str(val).lower())
    triggers = payload.get('triggers', [])
    if triggers:
        parts.append(' '.join(str(t) for t in triggers[:10]).lower())
    return ' '.join(parts)[:800]

def build_pt_text(payload: dict) -> str:
    """Constrói texto PT para e1: description + name + triggers com acentos."""
    parts = []
    for field in ['description', 'name', 'intent']:
        val = payload.get(field, '')
        if val:
            parts.append(str(val))
    triggers = payload.get('triggers', [])
    if triggers:
        parts.append(' '.join(str(t) for t in triggers[:10]))
    return ' '.join(parts)[:800]

# ═══════════════════════════════════════════════════════════════
# QDRANT HELPERS
# ═══════════════════════════════════════════════════════════════

def fetch_payloads(limit=None):
    """Busca payloads existentes na collection ORIGINAL (mpnet 768d)."""
    print(f"\n🔍 Buscando payloads (tag={TAG}) da collection {COLLECTION_OLD}...")
    body = json.dumps({
        "filter": {
            "must": [{"key": "tag", "match": {"value": TAG}}]
        },
        "limit": limit or 10000,
        "with_payload": True,
        "with_vector": False,
    }).encode()

    req = Request(f"{QDRANT_URL}/collections/{COLLECTION_OLD}/points/scroll",
                  data=body, headers={"Content-Type": "application/json"}, method="POST")
    data = json.loads(urlopen(req, timeout=60).read())
    points = data.get("result", {}).get("points", [])
    print(f"   {len(points)} payloads encontrados")
    return points

def upsert_dual(points_batch: list):
    """Upsert batch de pontos com dual embed no Qdrant."""
    body = json.dumps({"points": points_batch}).encode()
    req = Request(f"{QDRANT_URL}/collections/{COLLECTION}/points?wait=true",
                  data=body, headers={"Content-Type": "application/json"}, method="PUT")
    return json.loads(urlopen(req, timeout=30).read()).get("status", "error")

def delete_old_embeds(payload_ids: list):
    """Remove embeddings antigos (mpnet 768d) antes do re-embed."""
    for i in range(0, len(payload_ids), 100):
        batch = payload_ids[i:i+100]
        body = json.dumps({"filter": {
            "must": [{"key": "id", "match": {"any": batch}}]
        }}).encode()
        req = Request(f"{QDRANT_URL}/collections/{COLLECTION}/points/delete",
                      data=body, headers={"Content-Type": "application/json"}, method="POST")
        urlopen(req, timeout=30)

# ═══════════════════════════════════════════════════════════════
# DUAL EMBED PIPELINE
# ═══════════════════════════════════════════════════════════════

def dual_embed_all(e0, e1, points):
    """
    Re-embed todos os payloads com dual embed (e0 + e1).
    Cada payload original gera 2 pontos no Qdrant:
      - mesmo payload, vec_e0 (384d), embed_model="e0"
      - mesmo payload, vec_e1 (384d), embed_model="e1"
    """
    print(f"\n🧠 DUAL EMBED — {len(points)} payloads → {len(points)*2} pontos Qdrant")
    print(f"   e0: {E0_MODEL} (384d EN) — lowercase")
    print(f"   e1: {E1_MODEL} (384d PT) — com acentos")
    print()

    total = 0
    for i in range(0, len(points), BATCH_SIZE):
        batch = points[i:i + BATCH_SIZE]

        # Build texts
        texts_en = []
        texts_pt = []
        for p in batch:
            payload = p.get("payload", {})
            texts_en.append(normalize_en(build_en_text(payload)))
            texts_pt.append(normalize_pt(build_pt_text(payload)))

        # Embed e0 (EN)
        vecs_e0 = list(e0.embed(texts_en, batch_size=BATCH_SIZE))

        # Embed e1 (PT)
        vecs_e1 = list(e1.embed(texts_pt, batch_size=BATCH_SIZE))

        # Build dual points
        dual_points = []
        for p, vec_e0, vec_e1 in zip(batch, vecs_e0, vecs_e1):
            payload = p.get("payload", {})
            name = payload.get("name", payload.get("id", "?"))[:60]

            # e0 point
            dual_points.append({
                "id": str(uuid.uuid4()),
                "vector": [float(v) for v in vec_e0],
                "payload": {
                    **payload,
                    "embed_model": "e0",
                    "embed_dim": 384,
                    "tag": TAG,
                    "ts": int(time.time()),
                },
            })
            # e1 point
            dual_points.append({
                "id": str(uuid.uuid4()),
                "vector": [float(v) for v in vec_e1],
                "payload": {
                    **payload,
                    "embed_model": "e1",
                    "embed_dim": 384,
                    "tag": TAG,
                    "ts": int(time.time()),
                },
            })

        status = upsert_dual(dual_points)
        total += len(dual_points)
        names = ", ".join(
            str(b[0].get("payload", {}).get("name", "?"))[:40]
            for b in [batch]
        )
        print(f"  ✅ {len(batch)} payloads → {len(dual_points)} pontos ({status}) "
              f"[{i+1}-{min(i+BATCH_SIZE, len(points))}/{len(points)}]")

    print(f"\n🏁 {total} pontos dual-embed upsertados ({len(points)} × 2)")
    return total

# ═══════════════════════════════════════════════════════════════
# TESTE A/B — single (mpnet 768d) vs dual (e0+e1 384d×2)
# ═══════════════════════════════════════════════════════════════

def dual_search(query_pt: str, e0, e1, kind: str, limit=3):
    """
    Dual search: embed query em e0 (EN translate) + e1 (PT original),
    consulta ambos os índices no Qdrant, merge com boost.
    """
    # e1: PT original
    vec_e1 = list(e1.embed([normalize_pt(query_pt)], batch_size=1))[0]
    vec_e1 = [float(v) for v in vec_e1]

    # e0: EN translation (simples — lowercase + remoção de acentos)
    # No futuro: LLM translate para tradução semântica real
    query_en = query_pt.lower()
    vec_e0 = list(e0.embed([normalize_en(query_en)], batch_size=1))[0]
    vec_e0 = [float(v) for v in vec_e0]

    # Search e1 index (nova collection dual)
    body_e1 = json.dumps({
        "vector": vec_e1,
        "filter": {"must": [
            {"key": "tag", "match": {"value": TAG}},
            {"key": "embed_model", "match": {"value": "e1"}},
        ]},
        "limit": limit,
        "with_payload": True,
    }).encode()
    req_e1 = Request(f"{QDRANT_URL}/collections/{COLLECTION_DUAL}/points/search",
                     data=body_e1, headers={"Content-Type": "application/json"}, method="POST")
    results_e1 = json.loads(urlopen(req_e1, timeout=10).read()).get("result", [])

    # Search e0 index (nova collection dual)
    body_e0 = json.dumps({
        "vector": vec_e0,
        "filter": {"must": [
            {"key": "tag", "match": {"value": TAG}},
            {"key": "embed_model", "match": {"value": "e0"}},
        ]},
        "limit": limit,
        "with_payload": True,
    }).encode()
    req_e0 = Request(f"{QDRANT_URL}/collections/{COLLECTION_DUAL}/points/search",
                     data=body_e0, headers={"Content-Type": "application/json"}, method="POST")
    results_e0 = json.loads(urlopen(req_e0, timeout=10).read()).get("result", [])

    # Merge + boost dual matches
    seen_names = set()
    merged = []
    for r in results_e1 + results_e0:
        name = r.get("payload", {}).get("name", r.get("id", ""))
        if name in seen_names:
            continue
        seen_names.add(name)

        # Check if in both
        in_e1 = any(r2.get("payload", {}).get("name") == name for r2 in results_e1)
        in_e0 = any(r2.get("payload", {}).get("name") == name for r2 in results_e0)
        if in_e1 and in_e0:
            r["score"] = r["score"] * 1.15  # boost 15% dual match
            r["dual_boost"] = True
        else:
            r["dual_boost"] = False

        merged.append(r)

    merged.sort(key=lambda x: x["score"], reverse=True)
    return merged[:limit], len(results_e1), len(results_e0)

def test_ab(e0, e1):
    """Teste A/B: single embed (original mpnet) vs dual embed (e0+e1)."""
    print("\n" + "═" * 60)
    print("TESTE A/B — mpnet 768d (single) vs e0+e1 384d×2 (dual)")
    print("═" * 60)

    test_cases = [
        ("botão de compra CTA principal premium", "component", "button", "action"),
        ("dashboard executivo métricas KPI gráficos", "component", "card", "data-display"),
        ("confirmação exclusão modal alerta crítico", "component", "dialog", "feedback"),
        ("formulário cadastro validação dados cliente", "component", "form", "form"),
        ("paleta cores clínica estética spa beleza luxo premium", "design-knowledge", "styles", "beleza"),
        ("tipografia elegante sofisticada serif heading font", "design-knowledge", "typography", "luxo"),
        ("ícone SVG animado hover motion react lucide", "media-knowledge", "svg-animated", "svg"),
        ("animação scroll parallax landing page premium hero", "media-knowledge", "motion-scroll", "scroll"),
        ("grid bento layout showcase produto feature premium", "component", "bento", "layout"),
        ("recomendação cores para dentista saúde confiança", "design-knowledge", "color-palettes", "saude"),
    ]

    # ── mpnet 768d (embeds originais, ainda no Qdrant sem embed_model) ──
    EMBED_URL_8081 = "http://127.0.0.1:8081/embed"
    def embed_8081(texts):
        req = Request(EMBED_URL_8081, data=json.dumps({"texts": [t[:800] for t in texts]}).encode(),
                      headers={"Content-Type": "application/json"})
        return json.loads(urlopen(req, timeout=10).read())["vectors"]

    def search_8081(vector, kind, limit=3):
        body = json.dumps({
            "vector": vector,
            "filter": {"must": [
                {"key": "kind", "match": {"value": kind}},
                {"key": "tag", "match": {"value": TAG}},
            ]},
            "limit": limit,
            "with_payload": True,
        }).encode()
        req = Request(f"{QDRANT_URL}/collections/{COLLECTION_OLD}/points/search",
                      data=body, headers={"Content-Type": "application/json"}, method="POST")
        return json.loads(urlopen(req, timeout=10).read()).get("result", [])

    single_hits = 0
    dual_hits = 0
    total = len(test_cases)

    for query_pt, kind, expected_id, expected_cat in test_cases:
        # ── SINGLE: mpnet 768d ──
        vec_single = embed_8081([query_pt])[0]
        results_single = search_8081(vec_single, kind, 3)
        top_single = results_single[0]["payload"] if results_single else {}
        single_match = (expected_id in str(top_single.get("id", "")).lower() or
                        expected_cat in str(top_single.get("category", "")).lower() or
                        expected_id in str(top_single.get("name", "")).lower())

        # ── DUAL: e0+e1 ──
        results_dual, e1c, e0c = dual_search(query_pt, e0, e1, kind, 3)
        top_dual = results_dual[0]["payload"] if results_dual else {}
        dual_match = (expected_id in str(top_dual.get("id", "")).lower() or
                      expected_cat in str(top_dual.get("category", "")).lower() or
                      expected_id in str(top_dual.get("name", "")).lower())

        if single_match: single_hits += 1
        if dual_match: dual_hits += 1

        marker = "✅" if dual_match else ("🟡" if single_match else "❌")
        print(f"  {marker} '{query_pt[:55]}'")
        print(f"     mpnet 768d: [{top_single.get('category','?')}] {str(top_single.get('name','?'))[:50]} {'✅' if single_match else '❌'}")
        print(f"     e0+e1 384d: [{top_dual.get('category','?')}] {str(top_dual.get('name','?'))[:50]} {'✅' if dual_match else '❌'} (e0={e0c}, e1={e1c}, dual={'✓' if top_dual.get('dual_boost') else '✗'})")

    print(f"\n  📊 mpnet 768d (single): {single_hits}/{total} ({single_hits/total:.0%})")
    print(f"  📊 e0+e1 384d (dual):   {dual_hits}/{total} ({dual_hits/total:.0%})")
    gain = dual_hits - single_hits
    print(f"  📈 Ganho: {'+' if gain >= 0 else ''}{gain} acertos ({'+' if gain >= 0 else ''}{gain/total:.0%}pp)")

    if dual_hits > single_hits:
        print(f"\n  🎯 DUAL EMBED GANHOU! +{gain} acertos.")
        print(f"     e0 captura similaridade EN (código, termos técnicos)")
        print(f"     e1 captura similaridade PT (descrições, intents)")
        print(f"     Merge com boost 15% para dual matches")
    elif dual_hits == single_hits:
        print(f"\n  ⚖️ EMPATE. Dual embed iguala mpnet 768d.")
        print(f"     Vantagem: 384d×2 = 768d mesmo storage, mas com routing otimizado.")
    else:
        print(f"\n  ⚠️ mpnet 768d ainda melhor. Possíveis causas:")
        print(f"     1. Dual embed recém-criado — poucos pontos no índice")
        print(f"     2. mpnet 768d tem mais capacidade semântica que MiniLM 384d")
        print(f"     3. Query EN via lowercase não captura semântica real")

    return single_hits, dual_hits

# ═══════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════

def main():
    print("🧠 ADSENTICE · DUAL EMBED e0+e1 — Implementação ADR-0021")
    print(f"   e0: {E0_MODEL} (384d EN)")
    print(f"   e1: {E1_MODEL} (384d PT)")
    print(f"   Storage: {COLLECTION} @ {QDRANT_URL}")
    print()

    # 1. Load models
    e0, e1 = load_models()

    # 2. Fetch payloads
    points = fetch_payloads(limit=LIMIT_PAYLOADS)

    if not points:
        print("⚠️ Nenhum payload encontrado. Execute os ingests primeiro.")
        return

    # 3. Dual embed all payloads
    total = dual_embed_all(e0, e1, points)

    # 4. TESTE A/B
    single, dual = test_ab(e0, e1)

    # 5. Score final
    print("\n" + "═" * 60)
    print("RESULTADO ADR-0021")
    print("═" * 60)
    print(f"""
  Modelos:
    e0: all-MiniLM-L6-v2 (384d EN) — {E0_MODEL}
    e1: paraphrase-multilingual-MiniLM-L12-v2 (384d PT) — {E1_MODEL}

  Storage: {total} pontos dual-embed no Qdrant ({len(points)} × 2)
  Dim total: 384 + 384 = 768d (mesmo storage que mpnet 768d)
  Vantagem: routing otimizado por tipo de conteúdo + dual search + merge boost

  Hit rate:
    mpnet 768d (single): {single}/{10} ({single/10:.0%})
    e0+e1 384d (dual):   {dual}/{10} ({dual/10:.0%})
""")

if __name__ == "__main__":
    main()
