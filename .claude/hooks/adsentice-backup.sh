#!/bin/bash
# adsentice-backup.sh — Backup automático (Hook SessionStart + crontab)
# Fallback: R2 primeiro, local se R2 falhar.
# Log: backups/cron.log

BACKUP_SCRIPT="/media/jeffer/5aab5a95-8290-d3f7-2e4f-8c27cc2d09a93/adsentice/tools/adsentice_backup.py"
LOG_FILE="/media/jeffer/5aab5a95-8290-d3f7-2e4f-8c27cc2d09a93/adsentice/backups/cron.log"

echo "[$(date -Iseconds)] 🧠 adsentice backup started" >> "$LOG_FILE"
uv run --quiet --script "$BACKUP_SCRIPT" >> "$LOG_FILE" 2>&1
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
    echo "[$(date -Iseconds)] ⚠️ R2 backup failed, trying local-only..." >> "$LOG_FILE"
    uv run --quiet --script "$BACKUP_SCRIPT" --local-only >> "$LOG_FILE" 2>&1
fi

echo "[$(date -Iseconds)] done (exit=$EXIT_CODE)" >> "$LOG_FILE"
