#!/usr/bin/env python3
"""
adsentice_embed_quality_gate.py — EMBED QUALITY GATE · 5ª DIMENSÃO DO BOA
═══════════════════════════════════════════════════════════════
Integra qualidade de embedding ao ciclo OODA + BOA score.

Funcionamento:
  1. GOLDEN SET: 12 queries canônicas com expected match + peso
  2. COMMIT FINGERPRINT: hash do conteúdo dos payloads (detecta mudanças)
  3. QUALITY GATE: pré-ingest e pós-ingest medem hit rate
     - Se novo ingest DEGRADA >5pp → ALERTA → rollback
     - Se melhora → aprova → novo baseline
  4. BOA DIMENSION: embed_quality (peso 0.10) entra na fórmula
  5. OODA LOOP: score cai → observe flag → orient investiga → decide corrige → act re-embed

REDIS KEYS (adsentice:embed:quality:*):
  - score           float   (89.1 — atual)
  - baseline        float   (89.1 — referência)
  - last_commit     string  (3d5c3d9)
  - content_hash    string  (752e353fe330)
  - golden_hits     int     (10/12)
  - trend           string  (stable|improving|degrading)
  - checked_at      string  (ISO timestamp)

BOA FORMULA (nova 5ª dimensão):
  0.25·stability + 0.20·performance + 0.15·error_free + 0.30·founder_signal + 0.10·embed_quality

Uso:
  python3 tools/adsentice_embed_quality_gate.py           # check quality
  python3 tools/adsentice_embed_quality_gate.py --save    # salva baseline no Redis
  python3 tools/adsentice_embed_quality_gate.py --gate    # quality gate (pré/pós ingest)

medido=verdade · 2026-07-15 · adsentice
"""

import json, os, sys, time, hashlib
from datetime import datetime, timezone
from urllib.request import Request, urlopen

EMBED_URL = "http://127.0.0.1:8081/embed"
QDRANT_URL = "http://127.0.0.1:6352"
REDIS_HOST = "127.0.0.1"
REDIS_PORT = 6396
COLLECTION = "adsentice-self"
TAG = "adsentice-warp"

# ═══════════════════════════════════════════════════════════════
# GOLDEN SET — queries canônicas que SEMPRE devem acertar
# ═══════════════════════════════════════════════════════════════

GOLDEN_SET = [
    # (query, kind, expected_id, expected_category, peso)
    ("botão de compra CTA principal ação", "component", "button", "action", 2),
    ("dashboard executivo métricas KPI gráficos", "component", "card", "data-display", 2),
    ("confirmação exclusão modal alerta diálogo", "component", "dialog", "feedback", 2),
    ("formulário cadastro validação dados cliente", "component", "form", "form", 2),
    ("tabela dados listagem leads métricas ranking", "component", "table", "data-display", 2),
    ("menu dropdown navegação opções ações suspenso", "component", "dropdown-menu", "navigation", 2),
    ("painel lateral sheet drawer filtro mobile", "component", "sheet", "navigation", 1.5),
    ("abas navegação seções alternar conteúdo tabs", "component", "tabs", "navigation", 1.5),
    ("ícone SVG animado hover motion react lucide", "media-knowledge", "svg", "icon", 1.5),
    ("animação scroll parallax landing page premium", "media-knowledge", "scroll", "animation", 1.5),
    ("código fonte button component cva variants typescript", "snippet", "Button", "shadcn", 1),
    ("documentação API acessibilidade WAI-ARIA radix", "reference", "Radix", "a11y", 1),
]

# ═══════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════

def embed(texts):
    texts = [t[:800] for t in texts]
    req = Request(EMBED_URL, data=json.dumps({"texts": texts}).encode(),
                  headers={"Content-Type": "application/json"})
    return json.loads(urlopen(req, timeout=10).read())["vectors"]

def search(vector, kind, limit=3):
    body = json.dumps({
        "vector": vector,
        "filter": {"must": [
            {"key": "kind", "match": {"value": kind}},
            {"key": "tag", "match": {"value": TAG}},
        ]},
        "limit": limit, "with_payload": True,
    }).encode()
    req = Request(f"{QDRANT_URL}/collections/{COLLECTION}/points/search",
                  data=body, headers={"Content-Type": "application/json"}, method="POST")
    return json.loads(urlopen(req, timeout=10).read()).get("result", [])

def content_fingerprint():
    """Hash do conteúdo dos payloads — detecta mudanças estruturais."""
    body = json.dumps({
        "filter": {"must": [{"key": "tag", "match": {"value": TAG}}]},
        "limit": 99999, "with_payload": True, "with_vector": False,
    }).encode()
    req = Request(f"{QDRANT_URL}/collections/{COLLECTION}/points/scroll",
                  data=body, headers={"Content-Type": "application/json"}, method="POST")
    data = json.loads(urlopen(req, timeout=60).read())
    points = data.get("result", {}).get("points", [])
    names = sorted(str(p.get("payload", {}).get("name", "")) for p in points)
    combined = "|".join(names[:5000])  # first 5000 for stability
    return hashlib.sha256(combined.encode()).hexdigest()[:12], len(points)

def redis_get(key):
    try:
        import redis; r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, socket_timeout=2)
        val = r.get(f"adsentice:embed:quality:{key}")
        return val.decode() if val else None
    except:
        return None

def redis_set(key, value):
    try:
        import redis; r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, socket_timeout=2)
        r.set(f"adsentice:embed:quality:{key}", str(value))
        return True
    except:
        return False

# ═══════════════════════════════════════════════════════════════
# QUALITY METRICS
# ═══════════════════════════════════════════════════════════════

def measure_quality(verbose=True):
    """Executa golden set e retorna métricas de qualidade."""
    hits = 0
    total_weight = 0
    weighted_hits = 0
    details = []

    for query, kind, expected_id, expected_cat, weight in GOLDEN_SET:
        vec = embed([query])[0]
        results = search(vec, kind, 3)
        top = results[0]["payload"] if results else {}

        match = (expected_id.lower() in str(top.get("id", "")).lower() or
                 expected_cat.lower() in str(top.get("category", "")).lower() or
                 expected_id.lower() in str(top.get("name", "")).lower() or
                 expected_cat.lower() in str(top.get("name", "")).lower())

        if match:
            hits += 1
            weighted_hits += weight
        total_weight += weight

        details.append({
            "query": query[:60], "kind": kind, "expected": expected_id,
            "got_name": str(top.get("name", "?"))[:60] if top else "N/A",
            "got_score": results[0]["score"] if results else 0,
            "match": match, "weight": weight,
        })

        if verbose:
            m = "✅" if match else "❌"
            print(f"  {m} [{kind}] '{query[:50]}' → {str(top.get('name','?'))[:50]}")

    raw_hit_rate = hits / len(GOLDEN_SET)
    weighted_hit_rate = weighted_hits / total_weight
    low_score_penalty = sum(1 for d in details if d["match"] and d["got_score"] < 0.60) * 0.02
    score = round((raw_hit_rate * 0.4 + weighted_hit_rate * 0.4 + (1.0 - low_score_penalty) * 0.2) * 100, 1)

    return {
        "score": score,
        "raw_hit_rate": raw_hit_rate,
        "weighted_hit_rate": weighted_hit_rate,
        "hits": hits,
        "total": len(GOLDEN_SET),
        "details": details,
    }

def by_category(details):
    cats = {}
    for d in details:
        k = d["kind"]
        if k not in cats: cats[k] = {"hits": 0, "total": 0}
        cats[k]["total"] += 1
        if d["match"]: cats[k]["hits"] += 1
    return cats

# ═══════════════════════════════════════════════════════════════
# QUALITY GATE — pré/pós ingest
# ═══════════════════════════════════════════════════════════════

def quality_gate():
    """Compara qualidade atual com baseline. Alerta se degradou."""
    current = measure_quality(verbose=False)
    baseline_score = float(redis_get("score") or current["score"])
    baseline_hits = int(redis_get("golden_hits") or current["hits"])
    trend = redis_get("trend") or "stable"
    last_commit = redis_get("last_commit") or "unknown"

    diff = current["score"] - baseline_score
    hits_diff = current["hits"] - baseline_hits

    print(f"  📊 Baseline: {baseline_score:.1f} (commit {last_commit})")
    print(f"  📊 Current:  {current['score']:.1f} ({current['hits']}/{current['total']})")
    print(f"  📊 Delta:    {diff:+.1f} pts ({'+' if hits_diff >= 0 else ''}{hits_diff} hits)")
    print()

    if diff >= 0:
        trend = "improving" if diff > 0 else "stable"
        print(f"  ✅ QUALITY GATE: PASS ({trend.upper()})")
        print(f"     Embed quality {current['score']:.1f} >= baseline {baseline_score:.1f}")
        action = "approve"
    elif diff > -5:
        trend = "degrading"
        print(f"  ⚠️ QUALITY GATE: WARN (DEGRADING)")
        print(f"     Embed quality caiu {abs(diff):.1f} pts. Dentro da margem, mas monitorar.")
        print(f"     OODA observe: flag para investigação na próxima sessão.")
        action = "warn"
    else:
        trend = "degrading"
        print(f"  ❌ QUALITY GATE: FAIL (DEGRADED >5pp)")
        print(f"     Embed quality caiu {abs(diff):.1f} pts! Acima do threshold de 5pp.")
        print(f"     OODA act: ROLLBACK do último ingest + investigar causa raiz.")
        print(f"     Commit fingerprint mudou? Verificar content_hash.")
        action = "fail"

    # Update Redis
    redis_set("score", current["score"])
    redis_set("golden_hits", current["hits"])
    redis_set("trend", trend)
    redis_set("checked_at", datetime.now(timezone.utc).isoformat())

    return action, current, baseline_score

# ═══════════════════════════════════════════════════════════════
# BOA INTEGRATION
# ═══════════════════════════════════════════════════════════════

def compute_boa_contribution(embed_score):
    """Calcula contribuição do embed_quality no BOA (peso 0.10)."""
    # embed_score: 0-100 → normalizado para 0-1
    normalized = embed_score / 100
    contribution = normalized * 0.10  # peso 0.10 na fórmula BOA
    return round(contribution, 4)

def ooda_recommendation(action, details):
    """Gera recomendação OODA baseada na qualidade do embed."""
    cats = by_category(details)

    if action == "approve":
        return "OODA → orient: embed saudável. Continuar pipeline normal."

    recs = []
    for kind, stats in cats.items():
        rate = stats["hits"] / stats["total"]
        if rate < 0.50:
            recs.append(f"🔴 {kind}: {stats['hits']}/{stats['total']} ({rate:.0%}) — CRÍTICO. Revisar payloads.")
        elif rate < 0.80:
            recs.append(f"🟡 {kind}: {stats['hits']}/{stats['total']} ({rate:.0%}) — MELHORAR. Payload names genéricos?")

    if not recs:
        return "OODA → observe: monitorando. Sem ações necessárias."

    return "OODA → decide:\n" + "\n".join(f"     {r}" for r in recs)

# ═══════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════

def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "check"

    print("🧪 ADSENTICE · EMBED QUALITY GATE — 5ª dimensão BOA")
    print(f"   Golden set: {len(GOLDEN_SET)} queries canônicas")
    print(f"   Collection: {COLLECTION} (tag={TAG})")
    print()

    # Measure
    metrics = measure_quality(verbose=(mode != "gate"))
    fp_hash, total_pts = content_fingerprint()

    # Always show summary
    print(f"\n{'═' * 60}")
    print(f"  EMBED QUALITY: {metrics['score']:.1f}/100")
    print(f"  Golden hits:   {metrics['hits']}/{metrics['total']}")
    print(f"  Weighted:      {metrics['weighted_hit_rate']:.0%}")
    print(f"  Content hash:  {fp_hash} ({total_pts} pts)")
    print(f"{'═' * 60}")

    # Category breakdown
    print(f"\n📊 BY CATEGORY:")
    for kind, stats in by_category(metrics["details"]).items():
        rate = stats["hits"] / stats["total"]
        icon = "✅" if rate >= 0.80 else "🟡" if rate >= 0.50 else "🔴"
        print(f"  {icon} {kind}: {stats['hits']}/{stats['total']} ({rate:.0%})")

    # BOA contribution
    boa_contrib = compute_boa_contribution(metrics["score"])
    print(f"\n📐 BOA 5ª DIMENSÃO:")
    print(f"  embed_quality: {metrics['score']:.1f}/100 × 0.10 = {boa_contrib:.4f}")
    print(f"  Fórmula: 0.25·stability + 0.20·performance + 0.15·error_free + 0.30·founder_signal + 0.10·embed_quality")

    if mode == "--gate":
        print(f"\n🚧 QUALITY GATE:")
        action, _, baseline = quality_gate()
        rec = ooda_recommendation(action, metrics["details"])
        print(f"\n{rec}")

    elif mode == "--save":
        redis_set("score", metrics["score"])
        redis_set("baseline", metrics["score"])
        redis_set("golden_hits", metrics["hits"])
        redis_set("content_hash", fp_hash)
        redis_set("trend", "stable")
        redis_set("checked_at", datetime.now(timezone.utc).isoformat())

        # Try to get git commit
        import subprocess
        try:
            commit = subprocess.run(["git", "rev-parse", "--short", "HEAD"],
                                    capture_output=True, text=True, timeout=5)
            if commit.returncode == 0:
                redis_set("last_commit", commit.stdout.strip())
        except:
            pass

        print(f"\n  ✅ Baseline salvo no Redis adsentice:embed:quality:*")
        print(f"     score={metrics['score']}, hash={fp_hash}, trend=stable")

if __name__ == "__main__":
    main()
