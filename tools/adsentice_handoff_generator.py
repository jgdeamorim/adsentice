#!/usr/bin/env python3
"""
adsentice_handoff_generator.py
Gera handoffs numerados (v001, v002...) no padrao EVO-API para o adsentice.
Pipeline: PreCompact hook → este script → HANDOFF-YYYY-MM-DD-vNNN-{slug}.md

Formato:
  # HANDOFF vNNN (YYYY-MM-DD) · {titulo}
  ## 🛑 START-HERE (proxima sessao)
  ## ✅ O QUE FOI FEITO (medido · commits)
  ## 🧠 O ENTENDIMENTO (decisoes, contexto)
  ## ▶️ PROXIMO (a fila)
  ## 📊 SCORE (BOA na hora do handoff)

Numeração sequencial via Redis :6396 (adsentice:handoff:next_number).
"""

import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent
HANDOFF_DIR = PROJECT_ROOT / "docs" / "handoff" / "active"
REDIS_HOST = "127.0.0.1"
REDIS_PORT = 6396

def get_next_number() -> int:
    """Retorna o proximo numero sequencial (Redis INCR)."""
    try:
        import redis
        r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, socket_connect_timeout=1)
        return r.incr("adsentice:handoff:next_number")
    except Exception:
        # Fallback: conta arquivos existentes
        existing = list(HANDOFF_DIR.glob("HANDOFF-*.md"))
        return len(existing) + 1

def get_latest_git_commits(n: int = 5) -> list[str]:
    """Ultimos N commits."""
    try:
        result = subprocess.run(
            ["git", "-C", str(PROJECT_ROOT), "log", f"-{n}", "--oneline", "--no-decorate"],
            capture_output=True, text=True, timeout=5
        )
        return [line.strip() for line in result.stdout.strip().split("\n") if line.strip()]
    except Exception:
        return []

def get_boa_score() -> dict:
    """Le BOA score do Redis."""
    try:
        import redis
        r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, socket_connect_timeout=1)
        return {
            "score": (r.get("adsentice:boa:score") or b"?").decode(),
            "verdict": (r.get("adsentice:boa:verdict") or b"?").decode(),
        }
    except Exception:
        return {"score": "?", "verdict": "?"}

def get_ooda_stages() -> dict:
    """Le estagios OODA do Redis."""
    try:
        import redis
        r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, socket_connect_timeout=1)
        ns = "adsentice:ooda"
        return {
            "observe": (r.get(f"{ns}:stage:observe") or b"").decode()[:200],
            "orient": (r.get(f"{ns}:stage:orient") or b"").decode()[:200],
            "decide": (r.get(f"{ns}:stage:decide") or b"").decode()[:200],
            "act": (r.get(f"{ns}:stage:act") or b"").decode()[:200],
        }
    except Exception:
        return {}

def extract_title_from_messages(messages: list) -> str:
    """Extrai um titulo descritivo das mensagens do usuario."""
    user_msgs = [m.get("content", "") for m in messages if m.get("role") == "user"]
    if not user_msgs:
        return "sessao-adsentice"

    # Usa a primeira mensagem significativa como base do titulo
    first = user_msgs[0][:80].strip()
    # Limpa para usar como slug
    title = first.lower()
    title = re.sub(r'[^a-z0-9\s-]', '', title)
    title = re.sub(r'\s+', '-', title)
    return title[:60] or "sessao-adsentice"

def extract_key_messages(messages: list) -> dict:
    """Extrai mensagens-chave: ultimo user, ultimo assistant, decisoes."""
    user_msgs = [m for m in messages if m.get("role") == "user"]
    assistant_msgs = [m for m in messages if m.get("role") == "assistant"]

    last_user = user_msgs[-1].get("content", "")[:500] if user_msgs else ""
    last_assistant = assistant_msgs[-1].get("content", "")[:800] if assistant_msgs else ""

    # Detecta decisoes nas mensagens do assistant
    decisions = []
    for m in assistant_msgs[-3:]:
        content = m.get("content", "")
        for pattern in [r"(?:criar|criado|commit)\s+([^\s]+)", r"ADR-\d{4}", r"docs/[^\s]+\.md"]:
            found = re.findall(pattern, content, re.IGNORECASE)
            decisions.extend(found)

    return {
        "last_user": last_user,
        "last_assistant": last_assistant,
        "decisions": decisions[-10:],
    }

def generate_handoff(
    session_id: str = "unknown",
    messages: list = None,
    title_override: str = "",
    extra_context: str = "",
) -> str:
    """Gera o handoff em formato markdown."""
    if messages is None:
        messages = []

    now = datetime.now(timezone.utc)
    date_str = now.strftime("%Y-%m-%d")
    number = get_next_number()
    commits = get_latest_git_commits(5)
    boa = get_boa_score()
    ooda = get_ooda_stages()

    # Titulo
    if title_override:
        title = title_override
    else:
        title = extract_title_from_messages(messages)

    key = extract_key_messages(messages)

    # START-HERE
    start_here = "1. `redis`(v{0:03d}) · ler `adsentice:ooda:stage:*` + `adsentice:boa:*`\n".format(number)
    start_here += "2. **Docs essenciais:** `docs/adsentice-objetivos-solucoes-criterios.md` + `docs/adsentice-chat-spec.md`\n"
    if commits:
        start_here += f"3. **Ultimo commit:** `{commits[0]}`"

    # O que foi feito
    done = ""
    for c in commits:
        done += f"- `{c}`\n"
    if not done:
        done = "(nenhum commit nesta sessao)"

    # Entendimento
    understanding = ""
    if key["last_user"]:
        understanding += f"**Ultima pergunta do founder:**\n> {key['last_user'][:300]}\n\n"
    if key["decisions"]:
        understanding += f"**Decisoes detectadas:** {', '.join(key['decisions'][:5])}\n\n"
    if extra_context:
        understanding += f"**Contexto adicional:**\n{extra_context[:400]}\n\n"

    # OODA
    ooda_block = ""
    for stage, value in ooda.items():
        if value:
            ooda_block += f"- **{stage}:** {value[:150]}\n"

    # Proximo
    next_steps = key["last_assistant"][:500] if key["last_assistant"] else "(nenhuma sugestao detectada)"

    # Monta o handoff
    handoff = f"""# HANDOFF v{number:03d} ({date_str}) · {title}

> Auto-gerado pelo PreCompact · sessao `{session_id}` · {now.strftime('%H:%M UTC')}
> BOA: {boa['score']} ({boa['verdict']}) · {len(messages)} mensagens

## 🛑 START-HERE (proxima sessao)
{start_here}

## ✅ O QUE FOI FEITO (medido · commits)
{done}

## 🧠 O ENTENDIMENTO (decisoes, contexto)
{understanding}
## 🎯 ESTADO OODA
{ooda_block}
## ▶️ PROXIMO (a fila)
{next_steps}

## 📊 SCORE (BOA no momento do handoff)
- **BOA:** {boa['score']} → **{boa['verdict']}**
- **Formula:** 0.30·stability + 0.20·performance + 0.15·error_free + 0.35·founder_signal

---
*HANDOFF v{number:03d} · auto-compact · {date_str} · adsentice*
"""

    return handoff

def save_handoff(content: str) -> str:
    """Salva o handoff no diretorio active/ e retorna o path."""
    HANDOFF_DIR.mkdir(parents=True, exist_ok=True)

    date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    # Extrai numero do titulo
    m = re.search(r'HANDOFF v(\d+)', content)
    number = int(m.group(1)) if m else 0

    # Extrai slug do titulo
    first_line = content.split("\n")[0]
    slug = first_line.split("·")[-1].strip() if "·" in first_line else "sessao"
    slug = re.sub(r'[^a-z0-9-]', '', slug.lower())[:50]

    filename = f"HANDOFF-{date_str}-v{number:03d}-{slug}.md"
    filepath = HANDOFF_DIR / filename
    filepath.write_text(content)
    return str(filepath)

def update_changelog(handoff_path: str, handoff_number: int, title: str):
    """Atualiza o changelog na base-matriz."""
    base_matriz = PROJECT_ROOT / "docs" / "spec" / "base-matriz-adsentice.md"
    if not base_matriz.exists():
        return

    content = base_matriz.read_text()
    date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    entry = f"| v{handoff_number:03d} | {date_str} | {title[:80]} | `{Path(handoff_path).name}` | ✅ vivo |"

    # Insere apos o marcador CHANGELOG
    marker = "<!-- CHANGELOG -->"
    if marker in content:
        content = content.replace(marker, f"{marker}\n{entry}")
    else:
        # Adiciona secao changelog antes do final
        changelog_section = f"\n\n## Changelog\n\n| Versao | Data | Descricao | Handoff | Status |\n|---|---|---|---|---|\n{entry}\n"
        content = content.rstrip() + changelog_section

    base_matriz.write_text(content)


if __name__ == "__main__":
    # Modo 1: Gerar de stdin (PreCompact hook)
    stdin_data = {}
    try:
        raw = sys.stdin.read()
        if raw.strip():
            stdin_data = json.loads(raw)
    except Exception:
        pass

    session_id = stdin_data.get("session_id", "manual")
    messages = stdin_data.get("messages", [])
    title_override = stdin_data.get("title", "")
    extra = stdin_data.get("extra_context", "")

    handoff = generate_handoff(
        session_id=session_id,
        messages=messages,
        title_override=title_override,
        extra_context=extra,
    )

    path = save_handoff(handoff)

    # Extrai numero
    m = re.search(r'HANDOFF v(\d+)', handoff)
    number = int(m.group(1)) if m else 0
    title = handoff.split("\n")[0].split("·")[-1].strip() if "·" in handoff.split("\n")[0] else "sessao"

    # Changelog
    update_changelog(path, number, title)

    # Output pro hook
    print(json.dumps({
        "handoff_path": path,
        "number": number,
        "title": title,
        "status": "generated"
    }))
