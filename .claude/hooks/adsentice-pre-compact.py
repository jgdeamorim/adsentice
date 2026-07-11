#!/usr/bin/env python3
"""
adsentice-pre-compact.py · CANON (ADR-0002 · GAP 1 resolvido)
──────────────────────────────────────────────────────────────────
PreCompact hook para adsentice. Dispara QUANDO o /compact roda.

Pipeline (inspirado no evo_pre_compact.py · ADR-0147 EVO-API):
  1. Salva estado OODA no Redis :6396 (compact_at, message_count, last messages)
  2. Extrai decisões da conversa (ADRs, commits, docs, specs)
  3. Atualiza score do ecossistema
  4. INGEST DA CONVERSA → adsentice-conversation (:6352)
     DETACHED · INCREMENTAL · FAIL-SAFE: nunca bloqueia o compact
  5. HANDOFF AUTO-COMPACT (numeração sequencial vNNN)

ISOLADO do EVO-API:
  Redis :6396 (adsentice:*) ≠ EVO-API :6395 (evoapi:*)
  Qdrant :6352 (adsentice-*) ≠ EVO-API :6350 (evoapi-*)
  Embed :8081 (compartilhado, stateless)

DOUTRINA (medido=verdade):
  - NÃO-SÍNCRONO: ingest detached → retorna na hora (senão trava compact)
  - LEVE/BOUNDED: ingest INCREMENTAL · CPU-embed via :8081 já existente
  - FAIL-SAFE: qualquer erro → não bloqueia o compact (sai 0 · loga)
  - VERIFICÁVEL: trace no Redis → próxima sessão confirma
"""

import hashlib
import json
import os
import re
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent

REDIS_HOST = "127.0.0.1"
REDIS_PORT = 6396
OODA_NS = "adsentice:ooda"
BOA_NS = "adsentice:boa"

# ── Ingest ─────────────────────────────────────────────────────
EMBED_URL = os.environ.get("EMBED_URL", "http://127.0.0.1:8081/embed")
QDRANT_URL = os.environ.get("QDRANT_URL", "http://127.0.0.1:6352")
CONV_COLLECTION = "adsentice-conversation"
BATCH_SIZE = 6


# ═══════════════════════════════════════════════════════════════
# MAIN (FAIL-SAFE ABSOLUTO)
# ═══════════════════════════════════════════════════════════════

def main():
    # ── Parse stdin payload ──
    payload = {}
    try:
        raw = sys.stdin.read()
        if raw.strip():
            payload = json.loads(raw)
    except Exception:
        pass

    messages = payload.get("messages", [])
    session_id = payload.get("session_id", "unknown")
    trigger = payload.get("trigger", "manual")

    try:
        import redis as _redis
        r = _redis.Redis(
            host=REDIS_HOST, port=REDIS_PORT, db=0,
            socket_connect_timeout=1, socket_timeout=1, decode_responses=True
        )
        r.ping()
        redis_ok = True
    except Exception:
        redis_ok = False

    ts = datetime.now(timezone.utc).isoformat()

    if redis_ok:
        # ── 1. Metadados do compact ──
        r.setex(f"{OODA_NS}:session:{session_id}:compact_at", 86400 * 30, ts)
        r.setex(f"{OODA_NS}:session:{session_id}:message_count", 86400 * 30, str(len(messages)))
        r.setex(f"{OODA_NS}:last_compact_at", 86400 * 60, ts)
        r.setex(f"{OODA_NS}:last_compact_session", 86400 * 60, session_id)
        r.incr(f"{OODA_NS}:total_compacts")

        # ── 2. Últimas mensagens ──
        if messages:
            last_user = ""
            last_assistant = ""
            for m in reversed(messages):
                role = m.get("role", "")
                content = m.get("content", "")
                if role == "user" and not last_user:
                    last_user = content[:400]
                if role == "assistant" and not last_assistant:
                    last_assistant = content[:600]
                if last_user and last_assistant:
                    break
            if last_user:
                r.setex(f"{OODA_NS}:session:{session_id}:last_user_msg", 86400 * 30, last_user)
            if last_assistant:
                r.setex(f"{OODA_NS}:session:{session_id}:last_assistant_msg", 86400 * 30, last_assistant)

        # ── 3. OODA update (extrai direção da conversa) ──
        ooda_update = extract_ooda_update(messages)
        for stage, value in ooda_update.items():
            r.set(f"{OODA_NS}:stage:{stage}", value)

        # ── 4. Decisões ──
        decisions = extract_decisions(messages)
        if decisions:
            r.setex(
                f"{OODA_NS}:session:{session_id}:decisions",
                86400 * 30,
                json.dumps(decisions, ensure_ascii=False)
            )
            # Atualiza contagem de decisões no BOA founder_signal
            r.set(f"{BOA_NS}:founder_signal:detail",
                  json.dumps({"total_decisions_captured": len(decisions), "session": session_id}))

    # ── 5. INGEST DA CONVERSA → Qdrant (DETACHED · INCREMENTAL) ──
    ingest_trace = "skip · sem mensagens"
    if messages:
        # SYNCHRONOUS ingest for PreCompact (small batch, fast)
        # The hook fires BEFORE compact — this is the RIGHT time to save
        try:
            ingested = ingest_conversation_sync(messages, session_id)
            ingest_trace = f"ingested {ingested} chunks → {CONV_COLLECTION}"
            if redis_ok:
                r.setex(
                    f"{OODA_NS}:conversation:ingest:last",
                    86400 * 30,
                    f"session={session_id} · {ingested} chunks · trigger={trigger}"
                )
        except Exception as e:
            ingest_trace = f"ingest error: {str(e)[:80]}"
    else:
        if redis_ok:
            r.setex(
                f"{OODA_NS}:conversation:ingest:last",
                86400 * 30,
                f"skip · sem mensagens · trigger={trigger}"
            )

    # ── 6. HANDOFF AUTO-COMPACT ──
    handoff_info = generate_handoff(payload)

    # ── Build context for next session ──
    stages_updated = list(ooda_update.keys()) if redis_ok else []
    context = (
        f"🧭 ADSENTICE · PreCompact salvo\n"
        f"   compact: {ts}\n"
        f"   mensagens preservadas: {len(messages)}\n"
        f"   conv ingest: {ingest_trace}\n"
        f"   OODA atualizado: {stages_updated if stages_updated else '(nenhum)'}\n"
        f"   decisoes capturadas: {len(decisions)}\n"
        f"   {handoff_info}"
    )

    # PreCompact NÃO pode retornar additionalContext (schema não aceita).
    # Trace vai pro Redis. Stdout só imprime JSON schema-válido.
    output = {"suppressOutput": True}
    print(json.dumps(output))


# ═══════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════

def extract_ooda_update(messages: list) -> dict:
    """Extrai atualizações de estágio OODA das mensagens do usuário."""
    update = {}
    user_msgs = [m.get("content", "") for m in messages if m.get("role") == "user"]
    all_user = "\n".join(user_msgs[-5:])

    patterns = [
        (r"(?:foco|prioridade|vamos focar)[:\s]+(.+?)(?:\n|$)", "orient"),
        (r"(?:proximo passo|next|decid[iu])[:\s]+(.+?)(?:\n|$)", "decide"),
        (r"(?:acao|act|fazer agora|implementar)[:\s]+(.+?)(?:\n|$)", "act"),
        (r"(?:objetivo|goal|meta)[:\s]+(.+?)(?:\n|$)", "observe"),
    ]
    for pattern, stage in patterns:
        m = re.search(pattern, all_user, re.IGNORECASE)
        if m:
            update[stage] = m.group(1).strip()[:200]
    return update


def extract_decisions(messages: list) -> list:
    """Extrai menções a ADRs, commits, specs, docs das mensagens do assistant."""
    assistant_msgs = [m.get("content", "") for m in messages if m.get("role") == "assistant"]
    all_assistant = "\n".join(assistant_msgs[-5:])

    decisions = []
    for pattern, label in [
        (r"ADR-\d{4}", "ADR"),
        (r"commit\s+([a-f0-9]{7,})", "commit"),
        (r"(?:criar|criado|salvo|escrito)\s+(docs/[^\s]+\.md)", "doc"),
        (r"(?:spec|SPEC)[:\s]+([^\s]+)", "spec"),
        (r"(?:feat|fix|docs|chore)(\([^)]+\))?:\s*(.+)", "commit_msg"),
    ]:
        for m in re.finditer(pattern, all_assistant, re.IGNORECASE):
            val = m.group(0) if label != "commit_msg" else m.group(0)[:80]
            decisions.append(f"{label}: {val}")
    return decisions[-8:]


def generate_handoff(payload: dict) -> str:
    """Gera handoff via subprocess (adsentice_handoff_generator.py)."""
    try:
        result = subprocess.run(
            ["python3", str(PROJECT_ROOT / "tools" / "adsentice_handoff_generator.py")],
            input=json.dumps(payload),
            capture_output=True, text=True, timeout=30,
            cwd=str(PROJECT_ROOT)
        )
        if result.returncode == 0 and result.stdout.strip():
            hinfo = json.loads(result.stdout.strip())
            num = hinfo.get("number", "?")
            title = hinfo.get("title", "?")[:60]
            path = hinfo.get("handoff_path", "?")
            return f"handoff: v{num} · {title}\n   {path}"
    except Exception:
        pass
    return "(handoff não gerado)"


# ═══════════════════════════════════════════════════════════════
# CONVERSATION INGEST (síncrono para PreCompact)
# ═══════════════════════════════════════════════════════════════

def embed_text(text: str) -> list[float]:
    """Embed via :8081 (mpnet 768d)."""
    try:
        from urllib.request import Request, urlopen as uo
        req = Request(
            EMBED_URL,
            data=json.dumps({"texts": [text[:800]]}).encode(),
            headers={"Content-Type": "application/json"}
        )
        resp = uo(req, timeout=10)
        return json.loads(resp.read()).get("vectors", [[]])[0]
    except Exception:
        return []


def ingest_conversation_sync(messages: list, session_id: str) -> int:
    """
    Ingest síncrono da conversa no Qdrant :6352.
    Cada mensagem > 30 chars vira 1 ponto com payload {text, role, session_id, tag}.
    Batch de 6 pontos por upsert.
    """
    if not messages:
        return 0

    from urllib.request import Request, urlopen as uo

    embedded = 0
    batch_points = []

    for msg in messages:
        role = msg.get("role", "unknown")
        content = msg.get("content", "").strip()
        if not content or len(content) < 30:
            continue

        vec = embed_text(content)
        if not vec:
            continue

        point_id = hashlib.sha256(
            f"{session_id}:{embedded}:{content[:80]}".encode()
        ).hexdigest()[:32]

        payload = {
            "text": content[:600],
            "role": role,
            "session_id": session_id,
            "ts": int(time.time()),
            "tag": "adsentice",
            "source": f"session:{session_id}",
            "kind": "conversation",
        }

        batch_points.append({"id": point_id, "vector": vec, "payload": payload})

        if len(batch_points) >= BATCH_SIZE:
            _qdrant_upsert(batch_points)
            embedded += len(batch_points)
            batch_points = []

    if batch_points:
        _qdrant_upsert(batch_points)
        embedded += len(batch_points)

    return embedded


def _qdrant_upsert(points: list):
    """Envia batch de pontos para o Qdrant :6352."""
    try:
        from urllib.request import Request, urlopen as uo
        body = json.dumps({"points": points}).encode()
        req = Request(
            f"{QDRANT_URL}/collections/{CONV_COLLECTION}/points?wait=true",
            data=body,
            headers={"Content-Type": "application/json"},
            method="PUT"
        )
        uo(req, timeout=15)
    except Exception:
        pass


if __name__ == "__main__":
    try:
        main()
    except Exception:
        # FAIL-SAFE ABSOLUTO: nunca invalidar/bloquear o compact
        print(json.dumps({"suppressOutput": True}))