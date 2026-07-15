#!/usr/bin/env python3
"""
adsentice_finding_arbiter.py — DeepSeek como árbitro de Finding Alerts
═══════════════════════════════════════════════════════════════
Analisa eventos de telemetria do Redis e usa DeepSeek V4 Flash
para classificar severidade, sugerir root cause e recomendar correções.

Padrão EVO-API: LLM = árbitro NUNCA extrator — o sensor coleta,
o árbitro interpreta.

Uso:
  python3 tools/adsentice_finding_arbiter.py              # analisa últimas 2h
  python3 tools/adsentice_finding_arbiter.py --all        # analisa tudo
  python3 tools/adsentice_finding_arbiter.py --watch      # modo watch (cron)

medido=verdade · 2026-07-15 · adsentice
"""

import json, os, sys, time, subprocess
from pathlib import Path
from urllib.request import Request, urlopen

REDIS_PORT = "6396"
DEEPSEEK_API = "https://api.deepseek.com/v1/chat/completions"
DEEPSEEK_MODEL = "deepseek-v4-flash"
PROJECT_ROOT = Path(__file__).parent.parent

def load_deepseek_key():
    """Carrega DEEPSEEK_API_KEY de docs/secret/ ou env."""
    for p in [
        PROJECT_ROOT / "docs" / "secret" / ".env.DEEPSEEK",
        Path(os.path.expanduser("~")) / ".deepseek" / ".env",
    ]:
        if p.exists():
            with open(p) as f:
                for line in f:
                    if line.startswith("DEEPSEEK_API_KEY="):
                        return line.strip().split("=", 1)[1]
    return os.environ.get("DEEPSEEK_API_KEY", "")

def redis_cmd(cmd: str) -> str:
    """Executa redis-cli e retorna resultado."""
    try:
        return subprocess.run(
            ["redis-cli", "-p", REDIS_PORT, "--no-auth-warning"] + cmd.split(),
            capture_output=True, text=True, timeout=5,
        ).stdout.strip()
    except Exception:
        return ""

def get_events(limit=100) -> list[dict]:
    """Lê últimos N eventos de telemetria do Redis."""
    raw = redis_cmd(f"LRANGE adsentice:telemetry:events 0 {limit-1}")
    if not raw:
        return []
    events = []
    for line in raw.split("\n"):
        try:
            e = json.loads(line)
            if isinstance(e, dict):
                events.append(e)
        except json.JSONDecodeError:
            continue
    return events

def get_alerts() -> list[dict]:
    """Lê alertas ativos do Redis."""
    raw = redis_cmd("LRANGE adsentice:telemetry:alerts 0 49")
    if not raw:
        return []
    alerts = []
    for line in raw.split("\n"):
        try:
            a = json.loads(line)
            if isinstance(a, dict):
                alerts.append(a)
        except json.JSONDecodeError:
            continue
    return alerts

def get_route_stats() -> dict:
    """Lê estatísticas por rota do Redis."""
    keys = redis_cmd("KEYS adsentice:telemetry:status:*")
    stats = {}
    for key in keys.split("\n"):
        if not key.strip():
            continue
        route = key.replace("adsentice:telemetry:status:", "")
        total = int(redis_cmd(f"HGET {key} total") or "0")
        errors = int(redis_cmd(f"HGET {key} errors") or "0")
        latency = int(redis_cmd(f"HGET {key} latency_ms") or "0")
        if total > 0:
            stats[route] = {"total": total, "errors": errors, "avg_latency_ms": latency // total}
    return stats

def arbitrate(events: list[dict], alerts: list[dict], stats: dict) -> str | None:
    """DeepSeek analisa os dados e emite parecer."""
    key = load_deepseek_key()
    if not key:
        print("⚠️  DEEPSEEK_API_KEY ausente. Pulando arbitragem LLM.")
        return None

    # Prepara contexto para o árbitro
    errors_last_24h = [e for e in events if e.get("status", 200) >= 400]
    error_summary = "\n".join(
        f"- [{e.get('timestamp','?')}] {e.get('route','?')} → HTTP {e.get('status','?')} ({e.get('provider','?')}): {e.get('error','?')[:100]}"
        for e in errors_last_24h[:15]
    )
    stats_summary = "\n".join(
        f"- {route}: {s['total']} calls, {s['errors']} errors ({round(s['errors']/max(s['total'],1)*100,1)}% error rate), {s['avg_latency_ms']}ms avg"
        for route, s in sorted(stats.items(), key=lambda x: x[1]['errors'], reverse=True)[:10]
    )
    alerts_summary = "\n".join(
        f"- [{a.get('level','?')}] {a.get('route','?')}: {a.get('message','?')} (×{a.get('count',1)})"
        for a in alerts[:10]
    )

    system_prompt = """Você é um SRE (Site Reliability Engineer) sênior analisando telemetria de uma aplicação Next.js que faz chamadas a APIs externas (DataForSEO, DeepSeek, Supabase).

    REGRAS:
    - Analise os dados de telemetria e identifique PADRÕES de falha
    - Classifique a severidade de cada problema (critical/warning/info)
    - Sugira ROOT CAUSE provável para cada erro
    - Recomende AÇÕES CORRETIVAS específicas
    - Seja CONCISO — máximo 3 parágrafos
    - Foque em AÇÃO — o que fazer AGORA para resolver
    - Português brasileiro (pt-BR)
    - NUNCA invente dados — só analise o que foi fornecido"""

    user_prompt = f"""Analise a telemetria do adsentice e emita um parecer de SRE.

    ═══ ERROS RECENTES (últimas 24h) ═══
    {error_summary if error_summary else "Nenhum erro registrado ✅"}

    ═══ ESTATÍSTICAS POR ROTA ═══
    {stats_summary if stats_summary else "Nenhuma rota registrada"}

    ═══ ALERTAS ATIVOS ═══
    {alerts_summary if alerts_summary else "Nenhum alerta ativo ✅"}

    ═══ PARECER ═══
    Com base nos dados acima, emita um parecer com:
    1. Severidade geral do sistema (🟢 healthy / 🟡 degraded / 🔴 critical)
    2. Principais problemas identificados
    3. Ações recomendadas (o que fazer AGORA)"""

    try:
        import httpx
        r = httpx.post(DEEPSEEK_API, json={
            "model": DEEPSEEK_MODEL,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "max_tokens": 600, "temperature": 0.3,
        }, headers={"Authorization": f"Bearer {key}"}, timeout=20)

        data = r.json()
        verdict = data["choices"][0]["message"]["content"].strip()

        # Salva no Redis para o dashboard ler
        subprocess.run(
            ["redis-cli", "-p", REDIS_PORT, "--no-auth-warning",
             "SETEX", "adsentice:telemetry:arbiter_verdict", "7200",
             json.dumps({"verdict": verdict, "at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "events_analyzed": len(events), "errors_found": len(errors_last_24h)})],
            capture_output=True, timeout=3,
        )

        return verdict
    except Exception as e:
        print(f"⚠️  DeepSeek indisponível: {e}")
        return None

def main():
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--all", action="store_true", help="Analisa todos os eventos")
    ap.add_argument("--watch", action="store_true", help="Modo watch (executa a cada 5min)")
    args = ap.parse_args()

    print("🧠 ADSENTICE FINDING ARBITER · DeepSeek V4 Flash")
    print(f"   Redis :{REDIS_PORT} · Model: {DEEPSEEK_MODEL}\n")

    limit = 500 if args.all else 100
    events = get_events(limit)
    alerts = get_alerts()
    stats = get_route_stats()

    errors = [e for e in events if e.get("status", 200) >= 400]
    print(f"📊 {len(events)} eventos · {len(errors)} erros · {len(alerts)} alertas · {len(stats)} rotas\n")

    if errors:
        print("🔥 ÚLTIMOS ERROS:")
        for e in errors[:5]:
            print(f"   [{e.get('timestamp','?')[:19]}] {e.get('route','?')} → HTTP {e.get('status','?')} ({e.get('provider','?')}): {e.get('error','?')[:100]}")
        print()

    if stats:
        print("📈 TOP ROTAS COM ERRO:")
        for route, s in sorted(stats.items(), key=lambda x: x[1]['errors'], reverse=True)[:5]:
            pct = round(s['errors'] / max(s['total'], 1) * 100, 1)
            print(f"   {route}: {s['errors']}/{s['total']} erros ({pct}%) · {s['avg_latency_ms']}ms avg")
        print()

    print("🤖 DeepSeek Arbitrando...")
    verdict = arbitrate(events, alerts, stats)

    if verdict:
        print("\n" + "="*60)
        print("📋 PARECER DO ÁRBITRO (DeepSeek V4 Flash):")
        print("="*60)
        print(verdict)
        print("="*60)
        print("\n✅ Parecer salvo no Redis (adsentice:telemetry:arbiter_verdict, TTL 2h)")
    else:
        print("\n⚠️  Árbitro offline — verifique DEEPSEEK_API_KEY")

    if args.watch:
        print("\n🔄 Watch mode — executando a cada 5 minutos...")
        while True:
            time.sleep(300)
            events = get_events(limit)
            alerts = get_alerts()
            stats = get_route_stats()
            arbitrate(events, alerts, stats)

if __name__ == "__main__":
    main()
