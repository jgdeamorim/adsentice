import { NextRequest, NextResponse } from "next/server"
import { rankCategories } from "@/lib/category-ranker"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  const body = await request.json()
  const result = await rankCategories(body)
  return NextResponse.json(result)
}
