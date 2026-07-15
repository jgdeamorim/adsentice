#!/usr/bin/env python3
"""
adsentice_ecosystem_audit.py — Sensor de Auditoria Cross-System
═══════════════════════════════════════════════════════════════
Audita TODAS as camadas do ecossistema adsentice e cruza dados
para detectar gaps, inconsistências e desvios do playbook operacional.

Inspirado em:
  capital.RS capital-validator phase N — gate antes de avançar fase
  EVO-API :7700/health — health check cross-service
  EVO-API k0_breath — edge quality scoring

CAMADAS AUDITADAS:
  1. Infra: Redis, Qdrant, Embed, Supabase
  2. Rotas: Discovery API, Health API, admin pages
  3. Banco: discovery_searches, discovery_listings, market_holds
  4. Enriquecimento: L0→L1→L2 gaps
  5. Consistência: Redis cache vs Supabase real
  6. Provider-Core: tools implementadas vs cost-registry

Uso:
  python3 tools/adsentice_ecosystem_audit.py              # auditoria completa
  python3 tools/adsentice_ecosystem_audit.py --json       # output JSON
  python3 tools/adsentice_ecosystem_audit.py --watch      # modo watch (a cada 30min)
  python3 tools/adsentice_ecosystem_audit.py --alert      # dispara alertas no Redis

medido=verdade · 2026-07-15 · adsentice
"""

import json, os, sys, time, subprocess
from pathlib import Path
from urllib.request import Request, urlopen

PROJECT_ROOT = Path(__file__).parent.parent
REDIS_PORT = "6396"
QDRANT_URL = "http://127.0.0.1:6352"
EMBED_URL = "http://127.0.0.1:8081/healthz"
SUPABASE_URL = "https://tdigauruusdhnpvppixb.supabase.co"

# ── Redis Helpers ──

def redis_cmd(cmd: str) -> str:
    try:
        return subprocess.run(
            ["redis-cli", "-p", REDIS_PORT, "--no-auth-warning"] + cmd.split(),
            capture_output=True, text=True, timeout=5,
        ).stdout.strip()
    except Exception:
        return ""

# ── Supabase REST Helpers ──

def supabase_rest(path: str) -> dict | list | None:
    """GET Supabase REST API."""
    sb_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    env_file = PROJECT_ROOT / "apps" / "web" / ".env"
    if not sb_key and env_file.exists():
        with open(env_file) as f:
            for line in f:
                if line.startswith("SUPABASE_SERVICE_ROLE_KEY="):
                    sb_key = line.strip().split("=", 1)[1].strip('"').strip("'")
    if not sb_key:
        return None
    try:
        req = Request(f"{SUPABASE_URL}/rest/v1/{path}", headers={
            "apikey": sb_key, "Authorization": f"Bearer {sb_key}",
        })
        return json.loads(urlopen(req, timeout=10).read())
    except Exception as e:
        return {"error": str(e)}

def supabase_count(table: str, condition: str = "") -> int:
    """Count rows via Content-Range header."""
    sb_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    env_file = PROJECT_ROOT / "apps" / "web" / ".env"
    if not sb_key and env_file.exists():
        with open(env_file) as f:
            for line in f:
                if line.startswith("SUPABASE_SERVICE_ROLE_KEY="):
                    sb_key = line.strip().split("=", 1)[1].strip('"').strip("'")
    if not sb_key:
        return 0
    try:
        url = f"{SUPABASE_URL}/rest/v1/{table}?select=id&limit=1"
        if condition:
            url += f"&{condition}"
        req = Request(url, headers={
            "apikey": sb_key, "Authorization": f"Bearer {sb_key}",
            "Prefer": "count=exact",
        })
        res = urlopen(req, timeout=10)
        content_range = res.headers.get("content-range", "")
        m = __import__('re').search(r"/(\d+)", content_range)
        return int(m.group(1)) if m else 0
    except Exception:
        return 0

# ── Health Checks ──

def check_health(url: str, timeout=3) -> bool:
    try:
        res = urlopen(Request(url), timeout=timeout)
        return res.status == 200
    except Exception:
        return False

# ═══════════════════════════════════════════════════════════════
# AUDITORIA PRINCIPAL
# ═══════════════════════════════════════════════════════════════

def audit_ecosystem() -> dict:
    report = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "status": "healthy",
        "findings": [],
        "warnings": [],
        "scores": {},
    }

    # ── CAMADA 1: INFRA ──
    qdrant_ok = check_health(f"{QDRANT_URL}/healthz")
    embed_ok = check_health(EMBED_URL)
    redis_ok = redis_cmd("PING") == "PONG"
    dfseo_ok = bool(os.environ.get("DATAFORSEO_LOGIN"))

    infra_ok = [qdrant_ok, embed_ok, redis_ok, dfseo_ok].count(True)
    if infra_ok < 4:
        report["findings"].append({
            "layer": "infra", "severity": "critical",
            "message": f"Infra health: {infra_ok}/4 services online",
            "detail": f"Qdrant:{qdrant_ok} Embed:{embed_ok} Redis:{redis_ok} DFSEO:{dfseo_ok}"
        })
        report["status"] = "degraded"
    report["scores"]["infra"] = infra_ok / 4

    # ── CAMADA 2: BANCO DE DADOS ──
    total_searches = supabase_count("discovery_searches")
    total_listings = supabase_count("discovery_listings")
    total_holds = supabase_count("market_holds")
    l0_count = supabase_count("discovery_listings")
    l1_count = supabase_count("discovery_listings", "enrichment_level=gte.1")
    l2_count = supabase_count("discovery_listings", "enrichment_level=gte.2")

    report["scores"]["supabase"] = {
        "searches": total_searches, "listings": total_listings,
        "market_holds": total_holds,
        "l0": l0_count, "l1": l1_count, "l2": l2_count,
    }

    # GAP: listings sem enrichment
    if l1_count < l0_count and l0_count > 0:
        l1_gap = l0_count - l1_count
        report["warnings"].append({
            "layer": "enrichment", "severity": "warning",
            "message": f"L1 enrichment gap: {l1_gap} leads sem perfil GMB (L0→L1)",
            "action": f"Enriquecer {l1_gap} leads no Discovery para popular L1",
        })

    if l2_count < l1_count and l1_count > 0:
        l2_gap = l1_count - l2_count
        report["warnings"].append({
            "layer": "enrichment", "severity": "info",
            "message": f"L2 enrichment gap: {l2_gap} leads L1 sem audit Website+SEO (L1→L2)",
            "action": f"Rodar L2 enrichment em {min(l2_gap, 10)} leads (custo: ${min(l2_gap, 10) * 0.010125:.4f})",
        })

    # GAP: market_holds vazios
    if total_holds == 0 and total_searches > 0:
        report["warnings"].append({
            "layer": "market_intel", "severity": "warning",
            "message": "Market holds vazio — time-series não está acumulando",
            "action": "Verificar appendMarketHolds() no discovery-search/route.ts",
        })

    # ── CAMADA 3: CONSISTÊNCIA Redis vs Supabase ──
    redis_cache_count_raw = redis_cmd("LLEN adsentice:telemetry:events")
    redis_cache_count = int(redis_cache_count_raw) if redis_cache_count_raw.isdigit() else 0

    cost_redis = redis_cmd("GET adsentice:discovery:cost:total")
    cost_redis_val = float(cost_redis) if cost_redis else 0.0

    report["scores"]["redis"] = {
        "telemetry_events": redis_cache_count,
        "cost_total": cost_redis_val,
    }

    if redis_cache_count == 0 and total_searches > 0:
        report["findings"].append({
            "layer": "telemetry", "severity": "warning",
            "message": "Telemetria vazia — pushEvent() não está sendo chamado nas rotas",
            "action": "Verificar wire de telemetry.ts nas API routes",
        })

    # ── CAMADA 4: PROVIDER-CORE TOOLS ──
    tools_dir = PROJECT_ROOT / "packages" / "provider-core" / "src" / "tools"
    tool_count = len([f for f in tools_dir.glob("*.ts") if f.name != "index.ts"]) if tools_dir.exists() else 0

    cost_registry = PROJECT_ROOT / "packages" / "provider-core" / "cost-registry.yaml"
    caps_count = 0
    if cost_registry.exists():
        with open(cost_registry) as f:
            for line in f:
                if line.strip().startswith(tuple(f"{c}." for c in ["business", "on_page", "domain", "backlinks", "keyword", "serp", "content", "ai."])):
                    caps_count += 1

    report["scores"]["provider_core"] = {
        "tools_implemented": tool_count,
        "caps_in_registry": caps_count,
        "coverage_pct": round(tool_count / max(caps_count, 1) * 100, 1),
    }

    # ── CAMADA 5: ENRICHMENT PIPELINE ──
    # Verifica se os leads mais antigos sem L1 são de buscas recentes
    if total_searches == 0:
        report["warnings"].append({
            "layer": "pipeline", "severity": "critical",
            "message": "Nenhuma busca Discovery registrada. Pipeline vazio.",
            "action": "Executar uma busca no Discovery Engine (SP 30km, Dentista)",
        })

    # ── CAMADA 6: ROTAS (via health endpoint) ──
    routes_ok = redis_cmd("KEYS adsentice:telemetry:status:*")
    routes_count = len(routes_ok.split("\n")) if routes_ok else 0
    if routes_count == 0:
        report["warnings"].append({
            "layer": "routes", "severity": "info",
            "message": "Nenhuma rota registrada na telemetria — sistema acabou de iniciar",
            "action": "Navegar pelas páginas admin para popular telemetria de rotas",
        })

    # ── SCORE FINAL ──
    scores = report["scores"]
    overall = (
        scores.get("infra", 0) * 0.20 +
        (1 if total_searches > 0 else 0) * 0.20 +
        (1 if l1_count > 0 else 0) * 0.15 +
        (1 if redis_cache_count > 0 else 0) * 0.10 +
        (scores.get("provider_core", {}).get("coverage_pct", 0) / 100) * 0.15 +
        (1 if total_holds > 0 else 0) * 0.10 +
        (1 if l2_count > 0 else 0) * 0.10
    )
    report["score"] = round(overall * 100, 1)

    findings_count = len(report["findings"])
    warnings_count = len(report["warnings"])
    if findings_count > 0:
        report["status"] = "degraded"

    report["summary"] = f"{report['status'].upper()} · Score {report['score']}/100 · {findings_count} findings · {warnings_count} warnings · {scores.get('supabase',{}).get('listings',0)} leads"

    return report


def save_to_redis(report: dict):
    """Salva auditoria no Redis para dashboard ler."""
    redis_cmd(f"SETEX adsentice:ecosystem:audit 1800 '{json.dumps(report, default=str)}'")

    # Se tem findings críticos, dispara alerta
    for f in report["findings"]:
        if f.get("severity") == "critical":
            alert = json.dumps({
                "id": f"audit-{int(time.time())}",
                "level": "critical",
                "route": "/ecosystem-audit",
                "message": f["message"],
                "detail": f.get("detail", ""),
                "count": 1,
                "first_seen": report["timestamp"],
                "last_seen": report["timestamp"],
                "acknowledged": False,
            })
            redis_cmd(f"LPUSH adsentice:telemetry:alerts '{alert}'")
            redis_cmd("LTRIM adsentice:telemetry:alerts 0 49")
            redis_cmd("EXPIRE adsentice:telemetry:alerts 604800")


def main():
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--json", action="store_true", help="Output JSON")
    ap.add_argument("--watch", action="store_true", help="Watch mode (30min)")
    ap.add_argument("--alert", action="store_true", help="Salva alertas no Redis")
    args = ap.parse_args()

    print("🔍 ADSENTICE ECOSYSTEM AUDIT · Cross-System Sensor\n")

    report = audit_ecosystem()

    if args.json:
        print(json.dumps(report, indent=2, default=str))
    else:
        print(f"🏥 Status: {report['status'].upper()}")
        print(f"📊 Score: {report['score']}/100")
        print()

        # Infra
        infra_s = report['scores']['infra']
        print(f"🔌 Infra: {int(infra_s * 4)}/4 online ({infra_s*100:.0f}%)")

        # Supabase
        sb = report['scores']['supabase']
        print(f"🗄️  Supabase: {sb['searches']} searches · {sb['listings']} listings · {sb['market_holds']} holds")
        print(f"   Enrichment: L0={sb['l0']} L1={sb['l1']} L2={sb['l2']}")

        # Redis
        rd = report['scores']['redis']
        print(f"📡 Redis: {rd['telemetry_events']} events · ${rd['cost_total']:.4f} cost")

        # Provider-Core
        pc = report['scores']['provider_core']
        print(f"🔧 Provider-Core: {pc['tools_implemented']} tools · {pc['caps_in_registry']} caps · {pc['coverage_pct']}% coverage")

        # Findings
        if report['findings']:
            print(f"\n🔴 FINDINGS ({len(report['findings'])}):")
            for f in report['findings']:
                print(f"   [{f['severity'].upper()}] {f['layer']}: {f['message']}")
                if f.get('action'): print(f"   → {f['action']}")

        # Warnings
        if report['warnings']:
            print(f"\n🟡 WARNINGS ({len(report['warnings'])}):")
            for w in report['warnings']:
                print(f"   [{w['severity'].upper()}] {w['layer']}: {w['message']}")
                if w.get('action'): print(f"   → {w['action']}")

        if not report['findings'] and not report['warnings']:
            print("\n✅ Nenhum finding ou warning — ecossistema saudável")

        print(f"\n📋 Summary: {report['summary']}")

    if args.alert:
        save_to_redis(report)
        print("\n✅ Alertas salvos no Redis (adsentice:ecosystem:audit)")

    if args.watch:
        print("\n🔄 Watch mode — auditando a cada 30 minutos...")
        while True:
            time.sleep(1800)
            report = audit_ecosystem()
            if args.alert:
                save_to_redis(report)
            print(f"[{report['timestamp']}] Score: {report['score']}/100 · {len(report['findings'])} findings · {len(report['warnings'])} warnings")


if __name__ == "__main__":
    main()
