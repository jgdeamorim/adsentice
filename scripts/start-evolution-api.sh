#!/bin/bash
# ══════════════════════════════════════════════════════════════════
# ADSENTICE · Evolution API startup script
# Versão: 2.3.7 · Engine: Baileys WhatsApp Web
# Porta: :3100 · Banco: adsentice-pg :6397/evolution_api
# medido=verdade · 2026-07-19
# ══════════════════════════════════════════════════════════════════

set -euo pipefail

EVO_DIR="/media/jeffer/5aab5a95-8290-d3f7-2e4f-8c27cc2d09a93/EVO-API/self-essentials/evolution-api-main"
PID_FILE="/tmp/evolution-api-adsentice.pid"

# ── Cores ──
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

log()  { echo -e "${GREEN}[evo]${NC} $*"; }
warn() { echo -e "${YELLOW}[evo]${NC} $*"; }
err()  { echo -e "${RED}[evo]${NC} $*" >&2; }

# ── Pre-flight ──
preflight() {
  if [ ! -d "$EVO_DIR" ]; then
    err "Diretório EVO-API não encontrado: $EVO_DIR"
    exit 1
  fi

  # Verifica se já está rodando
  if [ -f "$PID_FILE" ]; then
    local pid
    pid=$(cat "$PID_FILE")
    if kill -0 "$pid" 2>/dev/null; then
      warn "Evolution API já está rodando (PID $pid)"
      return 1
    else
      warn "PID file stale ($pid morto), removendo..."
      rm -f "$PID_FILE"
    fi
  fi

  # Verifica se :3100 já responde
  if curl -s --max-time 2 http://localhost:3100/ > /dev/null 2>&1; then
    warn ":3100 já está respondendo — Evolution API já está rodando"
    return 1
  fi

  # Verifica dependências
  if ! curl -s --max-time 2 http://localhost:6396/ > /dev/null 2>&1; then
    if ! redis-cli -p 6396 PING > /dev/null 2>&1; then
      err "Redis :6396 não está respondendo"
      exit 1
    fi
  fi

  log "Pre-flight OK"
  return 0
}

# ── Start ──
start_evo() {
  log "Iniciando Evolution API v2.3.7..."
  cd "$EVO_DIR"

  # Usa systemd se disponível
  if systemctl --user is-active evolution-api.service > /dev/null 2>&1; then
    warn "systemd service já ativo"
    return 0
  fi

  if systemctl --user is-enabled evolution-api.service > /dev/null 2>&1; then
    log "Iniciando via systemd..."
    systemctl --user start evolution-api.service
    systemctl --user status evolution-api.service --no-pager
    return 0
  fi

  # Fallback: start direto
  log "Systemd não configurado, iniciando direto com npm..."
  nohup npm start > /tmp/evolution-api.log 2>&1 &
  local pid=$!
  echo "$pid" > "$PID_FILE"
  log "PID $pid · Logs: /tmp/evolution-api.log"

  # Espera :3100 responder (até 30s)
  log "Aguardando :3100..."
  for i in $(seq 1 30); do
    if curl -s --max-time 2 http://localhost:3100/ > /dev/null 2>&1; then
      log "✅ Evolution API pronta em :3100 ($i segundos)"
      return 0
    fi
    sleep 1
  done
  warn "⚠️  :3100 não respondeu após 30s. Verifique /tmp/evolution-api.log"
  return 1
}

# ── Main ──
case "${1:-start}" in
  start)
    if preflight; then
      start_evo
    fi
    ;;
  stop)
    if [ -f "$PID_FILE" ]; then
      pid=$(cat "$PID_FILE")
      log "Parando PID $pid..."
      kill "$pid" 2>/dev/null || true
      rm -f "$PID_FILE"
    fi
    systemctl --user stop evolution-api.service 2>/dev/null || true
    log "Parado"
    ;;
  status)
    if curl -s --max-time 2 http://localhost:3100/ | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'  Version: {d[\"version\"]}'); print(f'  Status:  {d[\"message\"]}'); print(f'  WA Web:  {d[\"whatsappWebVersion\"]}')" 2>/dev/null; then
      echo ""
    else
      warn ":3100 offline"
    fi
    if systemctl --user is-active evolution-api.service 2>/dev/null; then
      systemctl --user status evolution-api.service --no-pager -l 2>/dev/null || true
    elif [ -f "$PID_FILE" ]; then
      pid=$(cat "$PID_FILE")
      if kill -0 "$pid" 2>/dev/null; then
        log "Rodando direto (PID $pid, sem systemd)"
      else
        warn "PID file existe mas processo morto"
      fi
    fi
    ;;
  *)
    echo "Uso: $0 {start|stop|status}"
    exit 1
    ;;
esac
