#!/usr/bin/env bash
# adsentice_cron_backup.sh — Backup diário (cron madrugada) + local 4h
# R2: full backup diário às 2:57, retenção 7 dias
# Local (BKP): full backup a cada 4h, retenção 30 dias
set -euo pipefail

ROOT="/media/jeffer/5aab5a95-8290-d3f7-2e4f-8c27cc2d09a93/adsentice"
BACKUP_TOOL="$ROOT/tools/adsentice_backup.py"
LOG="$ROOT/backups/cron.log"
BKP_DIR="/media/jeffer/BKP/backups/adsentice"

# Qual modo: R2 (diário) ou Local (4h)
MODE="${1:-r2}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

echo "[$TIMESTAMP] 🧠 backup $MODE iniciado" >> "$LOG"

if [ "$MODE" = "r2" ]; then
    # Full backup → R2 + local
    cd "$ROOT"
    python3 "$BACKUP_TOOL" >> "$LOG" 2>&1
    
    # Limpa R2: apaga backups anteriores a 7 dias
    find "$ROOT/backups/" -name "adsentice-backup-*.json.gz" -mtime +7 -delete 2>/dev/null || true
    echo "[$TIMESTAMP] ✅ R2 backup + limpeza 7d concluído" >> "$LOG"

elif [ "$MODE" = "local" ]; then
    # Full backup → BKP externo
    cd "$ROOT"
    python3 "$BACKUP_TOOL" --local-only >> "$LOG" 2>&1
    
    # Copia o último backup local para o BKP externo
    LATEST=$(ls -t "$ROOT/backups/"*/*.json.gz 2>/dev/null | head -1)
    if [ -n "$LATEST" ]; then
        cp "$LATEST" "$BKP_DIR/"
        echo "[$TIMESTAMP] 📦 $LATEST → $BKP_DIR" >> "$LOG"
    fi
    
    # Limpa BKP externo: 30 dias
    find "$BKP_DIR" -name "*.json.gz" -mtime +30 -delete 2>/dev/null || true
    echo "[$TIMESTAMP] ✅ local 4h backup + limpeza 30d concluído" >> "$LOG"
fi
