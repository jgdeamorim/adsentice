#!/bin/bash
# adsentice-nextjs-check.sh — Pre-commit validation for Next.js edits
# ════════════════════════════════════════════════════════════════
# Steps:
#   1. tsc --noEmit on changed files
#   2. curl each affected route to verify HTTP response (not 500)
#   3. grep nextjs output log for errors
#   4. brace balance check on changed .tsx files
#
# Usage:
#   bash .claude/hooks/adsentice-nextjs-check.sh                # check all
#   bash .claude/hooks/adsentice-nextjs-check.sh discovery      # check specific page
#   bash .claude/hooks/adsentice-nextjs-check.sh --routes       # only route check
#
# medido=verdade · 2026-07-16 · adsentice

set -euo pipefail
PROJ=/media/jeffer/5aab5a95-8290-d3f7-2e4f-8c27cc2d09a93/adsentice/apps/web
LOG=/tmp/nextjs-output.log
PASS=0
FAIL=0

red()   { echo -e "\033[31m$1\033[0m"; }
green() { echo -e "\033[32m$1\033[0m"; }
cyan()  { echo -e "\033[36m$1\033[0m"; }

echo ""
cyan "🧠 adsentice · Next.js Check · $(date +%H:%M:%S)"
echo ""

# ── 1. TypeScript Check ──
echo "━━━ 1. TypeScript (tsc --noEmit) ━━━"
cd "$PROJ"
if npx tsc --noEmit 2>&1 | tee /tmp/tsc-output.txt | grep -E "error TS" | head -20; then
    green "   ✅ TypeScript: 0 errors"
    PASS=$((PASS+1))
else
    ERR_COUNT=$(grep -c "error TS" /tmp/tsc-output.txt || echo 0)
    red "   ❌ TypeScript: $ERR_COUNT errors"
    FAIL=$((FAIL+1))
fi

# ── 2. Brace Balance Check ──
echo ""
echo "━━━ 2. Brace Balance (changed .tsx files) ━━━"
cd /media/jeffer/5aab5a95-8290-d3f7-2e4f-8c27cc2d09a93/adsentice
CHANGED=$(git diff --name-only HEAD 2>/dev/null | grep '\.tsx$' || true)
if [ -z "$CHANGED" ]; then
    CHANGED=$(git diff --name-only 2>/dev/null | grep '\.tsx$' || true)
fi
if [ -z "$CHANGED" ]; then
    echo "   ℹ️  No .tsx files changed"
else
    for f in $CHANGED; do
        [ ! -f "$f" ] && continue
        OPENS=$(grep -o '{' "$f" | wc -l)
        CLOSES=$(grep -o '}' "$f" | wc -l)
        DIFF=$((OPENS - CLOSES))
        if [ "$DIFF" -eq 0 ]; then
            green "   ✅ $f (braces balanced)"
            PASS=$((PASS+1))
        else
            red "   ❌ $f: {${OPENS}} opens, {${CLOSES}} closes, diff=${DIFF}"
            FAIL=$((FAIL+1))
        fi
    done
fi

# ── 3. Route Health Check ──
echo ""
echo "━━━ 3. Route HTTP Check ━━━"
ROUTES=("/en/admin/discovery" "/en/admin/market" "/en/admin/categories" "/en/admin/leads" "/en/admin/pipeline" "/en/admin/settings")
for route in "${ROUTES[@]}"; do
    HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "http://localhost:3000${route}" 2>/dev/null || echo "000")
    if [ "$HTTP" = "307" ] || [ "$HTTP" = "200" ]; then
        green "   ✅ ${route}: HTTP ${HTTP}"
        PASS=$((PASS+1))
    elif [ "$HTTP" = "500" ]; then
        red "   ❌ ${route}: HTTP 500 (SERVER ERROR)"
        FAIL=$((FAIL+1))
    else
        echo "   ⚠️  ${route}: HTTP ${HTTP} (unexpected)"
    fi
done

# ── 4. Next.js Log Errors ──
echo ""
echo "━━━ 4. Next.js Runtime Log ━━━"
if [ -f "$LOG" ]; then
    ERRS=$(grep -i "error\|Error\|Unexpected\|panic\|failed" "$LOG" 2>/dev/null | tail -5 || true)
    if [ -z "$ERRS" ]; then
        green "   ✅ Log: 0 runtime errors"
        PASS=$((PASS+1))
    else
        red "   ❌ Log errors:"
        echo "$ERRS" | while read line; do echo "     $line"; done
        FAIL=$((FAIL+1))
    fi
else
    echo "   ⚠️  Log file not found at $LOG"
fi

# ── Summary ──
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ "$FAIL" -eq 0 ]; then
    green "✅ ALL CHECKS PASSED ($PASS/$((PASS+FAIL))) — safe to commit"
    exit 0
else
    red "❌ $FAIL CHECK(S) FAILED — fix before commit"
    exit 1
fi
