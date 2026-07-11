#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# adsentice_pipeline_auto_compact.sh — O RITUAL COMPLETO de fechamento de sessão
# CANON · INVIOLÁVEL · ISOLADO do EVO-API (Redis :6396 · Qdrant :6352)
# ═══════════════════════════════════════════════════════════════════════════════
#
# Inspirado no pipeline-auto-compact.sh do EVO-API (ADR-0140/ADR-0147).
# Adaptado para adsentice: portas, namespaces, corpora e doc paths próprios.
#
# Os 6 PASSOS (ordem · todos obrigatórios):
#   1. git: tudo commitado (selo) · tree limpo
#   2. handoff vNNN (docs/handoff/active) — o START-HERE da próxima sessão
#   3. base-matriz (docs/spec/base-matriz-adsentice.md) — version sync
#   4. OODA redis (adsentice:ooda:*) — estado salvo pelo PreCompact hook
#   5. corpus C: INGEST DA CONVERSA → adsentice-conversation (Qdrant :6352)
#   6. corpus A: SELF-INGEST → adsentice-self (Qdrant :6352)
#
# A=self ≠ B=cliente ≠ C=conversa (corpora INVIOLÁVEIS · ADR-0001/ADR-0002).
# Os DOIS ingests (C E A) SEMPRE.
#
# Uso:  bash tools/adsentice_pipeline_auto_compact.sh            # executa completo
#       bash tools/adsentice_pipeline_auto_compact.sh --check    # só audita (não executa)
#       bash tools/adsentice_pipeline_auto_compact.sh --dry-run  # simula sem escrever
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"; cd "$ROOT" || exit 1
CHECK_ONLY="${1:-}"
DRY="${2:-}"

RED="\033[0;31m"; GREEN="\033[0;32m"; YELLOW="\033[0;33m"; NC="\033[0m"
ok(){  echo -e "  ${GREEN}✅${NC} $*"; }
warn(){ echo -e "  ${YELLOW}⚠️${NC}  $*"; }
fail(){ echo -e "  ${RED}❌${NC} $*"; }
step(){ echo; echo "── $* ──"; }

passed=0; warnings=0

# ═══════════════════════════════════════════════════════════════════════════
step "1 · GIT (commits + tree limpo)"
# ────────────────────────────────────────────────────────────────────────────
DIRTY=$(git status --short | wc -l)
HEAD=$(git rev-parse --short HEAD)
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$DIRTY" -eq 0 ]; then
  ok "tree limpo · HEAD ${HEAD} · branch ${BRANCH}"
  passed=$((passed + 1))
else
  fail "$DIRTY arquivo(s) NÃO commitado(s) — commitar o selo ANTES de fechar"
  git status --short | head -10
  warnings=$((warnings + 1))
fi

# ═══════════════════════════════════════════════════════════════════════════
step "2 · HANDOFF"
# ────────────────────────────────────────────────────────────────────────────
HO=$(ls -t docs/handoff/active/HANDOFF-*.md 2>/dev/null | head -1)
if [ -n "$HO" ]; then
  HO_BASE=$(basename "$HO")
  HO_NUM=$(echo "$HO_BASE" | grep -oP 'v\d+' | head -1)
  ok "handoff: ${HO_BASE} (${HO_NUM})"
  passed=$((passed + 1))
else
  warn "sem handoff ativo em docs/handoff/active/"
  warnings=$((warnings + 1))
fi

# ═══════════════════════════════════════════════════════════════════════════
step "3 · BASE-MATRIZ (version sync)"
# ────────────────────────────────────────────────────────────────────────────
BM="docs/spec/base-matriz-adsentice.md"
if [ -f "$BM" ]; then
  BM_VER=$(grep -m1 '^version:' "$BM" | grep -oP '"[0-9]+\.[0-9]+\.[0-9]+"' | tr -d '"')
  BM_TITLE=$(grep -m1 '^title:' "$BM" | cut -d'"' -f2 | head -c 60)
  ok "base-matriz ${BM_VER} · ${BM_TITLE}..."
  passed=$((passed + 1))

  # Check changelog vs version sync
  BM_DATE=$(grep -m1 '^updated:' "$BM" | cut -d':' -f2- | xargs)
  [ -n "$BM_DATE" ] && ok "  última atualização: ${BM_DATE}"
else
  fail "base-matriz NÃO encontrada em ${BM}"
  warnings=$((warnings + 1))
fi

# ═══════════════════════════════════════════════════════════════════════════
step "4 · OODA REDIS (estado da sessão)"
# ────────────────────────────────────────────────────────────────────────────
OODA_ACT=$(redis-cli -p 6396 GET adsentice:ooda:stage:act 2>/dev/null | head -c 80 || echo "")
BOA=$(redis-cli -p 6396 GET adsentice:boa:score 2>/dev/null || echo "")
KEYS=$(redis-cli -p 6396 KEYS "adsentice:*" 2>/dev/null | wc -l)

if [ -n "$OODA_ACT" ]; then
  ok "OODA act: ${OODA_ACT}"
  passed=$((passed + 1))
else
  warn "OODA redis :6396 vazio/inacessível"
  warnings=$((warnings + 1))
fi
[ -n "$BOA" ] && ok "  BOA: ${BOA} · ${KEYS} keys ativas"
ok "  ADRs: $(ls docs/adr/0*.md 2>/dev/null | wc -l) · skills: $(ls .claude/skills/*/SKILL.md 2>/dev/null | wc -l)"

# ═══════════════════════════════════════════════════════════════════════════
step "5 · CORPUS C · INGEST DA CONVERSA → Qdrant (:6352 · adsentice-conversation)"
# ────────────────────────────────────────────────────────────────────────────
# O PreCompact hook já tenta ingerir sincronamente. Aqui garantimos que
# o histórico de conversas (history.jsonl) também está ingerido.
CONV_SCRIPT="tools/adsentice_claude_history_ingest.py"
CONV_POINTS_BEFORE=$(curl -s -X POST http://127.0.0.1:6352/collections/adsentice-conversation/points/count \
  -H "Content-Type: application/json" -d '{}' 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('result',{}).get('count','?'))" 2>/dev/null || echo "?")

AV_MB=$(free -m | awk '/^Mem/{print $7}')

if [ "${AV_MB:-0}" -lt 900 ]; then
  warn "RAM ${AV_MB}MB < 900MB · ADIAR ingest-conversa (pesado)"
  warnings=$((warnings + 1))
elif [ -f "$CONV_SCRIPT" ]; then
  if [ "$CHECK_ONLY" != "--check" ] && [ "$DRY" != "--dry-run" ]; then
    echo "  🧮 Ingerindo histórico de conversas Claude → Qdrant :6352..."
    python3 "$CONV_SCRIPT" 2>&1 | tail -5
    CONV_POINTS_AFTER=$(curl -s -X POST http://127.0.0.1:6352/collections/adsentice-conversation/points/count \
      -H "Content-Type: application/json" -d '{}' 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('result',{}).get('count','?'))" 2>/dev/null || echo "?")
    ok "  corpus C: ${CONV_POINTS_BEFORE} → ${CONV_POINTS_AFTER} pontos"
    passed=$((passed + 1))
  else
    echo "  🔍 CHECK-ONLY · corpus C: ${CONV_POINTS_BEFORE} pontos atuais em adsentice-conversation"
    passed=$((passed + 1))
  fi
else
  warn "  script de ingest não encontrado: ${CONV_SCRIPT}"
  warnings=$((warnings + 1))
fi

# ═══════════════════════════════════════════════════════════════════════════
step "6 · CORPUS A · SELF-INGEST → Qdrant (:6352 · adsentice-self)"
# ────────────────────────────────────────────────────────────────────────────
SELF_SCRIPT="tools/adsentice_self_ingest.py"
SELF_POINTS_BEFORE=$(curl -s -X POST http://127.0.0.1:6352/collections/adsentice-self/points/count \
  -H "Content-Type: application/json" -d '{}' 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('result',{}).get('count','?'))" 2>/dev/null || echo "?")

if [ "${AV_MB:-0}" -lt 1500 ]; then
  warn "RAM ${AV_MB}MB < 1500MB · ADIAR self-ingest (índice ~500MB RAM-resident)"
  warnings=$((warnings + 1))
elif [ -f "$SELF_SCRIPT" ]; then
  if [ "$CHECK_ONLY" != "--check" ] && [ "$DRY" != "--dry-run" ]; then
    echo "  🧮 Self-ingest → Qdrant :6352 (collection adsentice-self)..."
    python3 "$SELF_SCRIPT" 2>&1 | tail -5
    SELF_POINTS_AFTER=$(curl -s -X POST http://127.0.0.1:6352/collections/adsentice-self/points/count \
      -H "Content-Type: application/json" -d '{}' 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('result',{}).get('count','?'))" 2>/dev/null || echo "?")
    ok "  corpus A: ${SELF_POINTS_BEFORE} → ${SELF_POINTS_AFTER} pontos"
    passed=$((passed + 1))
  else
    echo "  🔍 CHECK-ONLY · corpus A: ${SELF_POINTS_BEFORE} pontos atuais em adsentice-self"
    passed=$((passed + 1))
  fi
else
  warn "  script self-ingest não encontrado: ${SELF_SCRIPT}"
  warnings=$((warnings + 1))
fi

# ═══════════════════════════════════════════════════════════════════════════
echo
echo "═════════════════════════════════════════════════════════════════"
echo "  PIPELINE AUTO-COMPACT COMPLETO"
echo "  ${GREEN}${passed} passos OK${NC} · ${YELLOW}${warnings} warnings${NC}"
echo "  corpora: A(self)≠B(cliente)≠C(conversa) · ADR-0001"
echo "  HEAD: ${HEAD} · branch: ${BRANCH}"
echo "═════════════════════════════════════════════════════════════════"

[ "$CHECK_ONLY" = "--check" ] && echo "  ⚠️  CHECK-ONLY — não executei ingests" && exit 0
exit 0