// ══════════════════════════════════════════════════════════════════
// ADSENTICE · GET /api/cep?q=01310100
// CEP → coordenadas + IBGE panorama + município
// medido=verdade · 2026-07-16
// ══════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server"

import { resolveCEP } from "@/lib/cep"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get("q")

  if (!q || q.replace(/\D/g, "").length < 8) {
    return NextResponse.json({ error: "CEP inválido (8 dígitos)" }, { status: 400 })
  }

  try {
    const result = await resolveCEP(q)

    if (!result) {
      return NextResponse.json({ error: "CEP não encontrado" }, { status: 404 })
    }

    
return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
