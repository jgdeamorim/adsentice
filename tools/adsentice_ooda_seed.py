#!/usr/bin/env python3
"""
adsentice_ooda_seed.py — Inicializa o estado OODA do adsentice no Redis (:6396).
Roda UMA vez para criar as keys iniciais. Idempotente (nao sobrescreve se ja existir).
ISOLADO do EVO-API: Redis :6396, namespace adsentice:ooda:*
"""

import sys
from datetime import datetime, timezone
import redis

HOST = "127.0.0.1"
PORT = 6396
DB = 0
NS = "adsentice:ooda"

def seed(r: redis.Redis, force: bool = False):
    existing = r.keys(f"{NS}:*")
    if existing and not force:
        print(f"⚠️  {len(existing)} keys OODA ja existem. Use --force para resetar.")
        print("   Keys existentes:")
        for k in sorted(existing):
            print(f"     {k.decode()}")
        return

    if force and existing:
        for k in existing:
            r.delete(k)
        print(f"🧹 {len(existing)} keys removidas (--force)")

    ts = datetime.now(timezone.utc).isoformat()
    sid = f"seed-{datetime.now().strftime('%Y%m%d%H%M%S')}"

    # Sessao corrente
    r.set(f"{NS}:current_session_id", sid)

    # Estagios OODA
    r.set(f"{NS}:stage:observe", "adsentice ecossistema inicializado · 2026-07-11 · 7 docs de estrategia · ADR-0001 aceito · chat spec pronta")
    r.set(f"{NS}:stage:orient", "Foco: construir MVP do adsentice Chat — pipeline discovery funcional + chat UI + creditos")
    r.set(f"{NS}:stage:decide", "Proximo passo: POST /api/chat/discover — 6 pipelines paralelos com DataForSEO MCP oficial")
    r.set(f"{NS}:stage:act", "Acao atual: montar infraestrutura .claude/ + MCP servers + base-matriz + OODA Redis")

    # Meta-dados
    meta = {
        "foundation": "2026-07-11",
        "stack": "Next.js + Railway + Supabase + Cloudflare R2 + DataForSEO MCP",
        "mission": "Hub inteligente de marketing para negocios locais (SMB Brasil)",
        "ticket": "R$0 (free) · R$47 (starter) · R$197 (pro) · R$497 (escala)",
        "niche_primary": "clinicas esteticas SP (100% coberto)",
        "evidences": "vault 6/6 testes · DataForSEO 9 modulos via MCP oficial · Qwen local $0 · DeepSeek cost-capped",
        "repo": "github.com/jgdeamorim/adsentice",
        "commits": "14 commits · 8 docs · 2 hooks · 2 skills · 1 docker-compose",
        "portas": "Redis :6396 · Qdrant :6352 · Embed :8081 (compartilhado)",
        "corpora": "A=self(adsentice) ≠ B=cliente(tenant·PII) ≠ C=tooling",
    }
    for k, v in meta.items():
        r.set(f"{NS}:meta:{k}", v)

    # Score inicial
    r.set(f"{NS}:score:overall", "35/100 · MVP · spec pronta, codigo a construir")
    r.set(f"{NS}:score:docs", "85/100 · 8 documentos estrategicos + base-matriz + ADR-0001")
    r.set(f"{NS}:score:infra", "80/100 · Redis + Qdrant + Embed + Claude hooks + MCP servers")
    r.set(f"{NS}:score:produto", "5/100 · chat spec pronta, zero codigo backend")

    # Watermark
    r.set(f"{NS}:initialized_at", ts)

    keys_created = len(r.keys(f"{NS}:*"))
    print(f"✅ OODA adsentice inicializado: {keys_created} keys em {NS}:* no Redis :{PORT}")
    print(f"   Sessao: {sid}")
    print(f"   Estagios: observe/decide → orient → decide → act")
    print(f"   Meta: {len(meta)} campos")
    print(f"   Score: 4 dimensoes")

if __name__ == "__main__":
    force = "--force" in sys.argv or "-f" in sys.argv
    try:
        r = redis.Redis(host=HOST, port=PORT, db=DB, socket_connect_timeout=2, socket_timeout=2)
        r.ping()
        seed(r, force=force)
    except redis.ConnectionError as e:
        print(f"❌ Redis :{PORT} offline: {e}")
        sys.exit(1)
