#!/bin/bash
# ══════════════════════════════════════════════════════════════════
# ADSENTICE · Weekly Ingest Cron — self-ingest + history + BOA
# Roda via CronCreate toda segunda-feira 08:57 (evita :00/:30 peak)
# ══════════════════════════════════════════════════════════════════
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== adsentice weekly ingest — $(date -Iseconds) ==="

# 1. Self-ingest (docs/ADRs/specs → adsentice-self :6352)
echo "[1/4] self-ingest..."
python3 tools/adsentice_self_ingest.py

# 2. Core skills ingest (47 Corey marketing skills)
echo "[2/4] corey-ingest..."
python3 tools/adsentice_corey_ingest.py

# 3. History ingest (conversation → adsentice-conversation :6352)
echo "[3/4] history-ingest..."
python3 tools/adsentice_claude_history_ingest.py

# 4. BOA recalc + save to Redis :6396
echo "[4/4] BOA recalc..."
python3 tools/adsentice_boa_score.py --save

echo "=== done — $(date -Iseconds) ==="
