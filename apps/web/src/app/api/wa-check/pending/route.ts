// ══════════════════════════════════════════════════════════════════
// ADSENTICE · Wa-Check Pending — DELETE /api/wa-check/pending
// Limpa flag de pendência (dismiss do alerta)
// medido=verdade · $0 · 2026-07-19
// ══════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server'
import { execSync } from 'child_process'

export async function DELETE() {
  try {
    execSync('redis-cli -p 6396 --no-auth-warning DEL adsentice:wa-check:pending', {
      encoding: 'utf-8', timeout: 2000,
    })
    return NextResponse.json({ cleared: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
