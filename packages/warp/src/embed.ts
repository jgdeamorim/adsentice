/**
 * packages/warp/src/embed.ts
 * Embed utilities — mpnet 768d multilíngue via :8081
 *
 * DAG audit (2026-07-15): removida ficção e0/e1 + classe EmbedRouter.
 * mpnet 768d JÁ É multilíngue (70% PT-BR, 100% golden set).
 * Dual embed testado: 20% vs 70% — mpnet único vence.
 *
 * medido=verdade · 2026-07-15 · adsentice
 */

const EMBED_URL = 'http://127.0.0.1:8081/embed'

/** Embed single text via :8081 */
export async function embedText(text: string): Promise<number[]> {
  const normalized = text.trim().replace(/\s+/g, ' ').slice(0, 800)
  const res = await fetch(EMBED_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texts: [normalized] }),
  })
  const data = (await res.json()) as { vectors: number[][] }
  return data.vectors[0] ?? []
}

/** Embed batch via :8081 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  const normalized = texts.map((t) => t.trim().replace(/\s+/g, ' ').slice(0, 800))
  const res = await fetch(EMBED_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texts: normalized }),
  })
  const data = (await res.json()) as { vectors: number[][] }
  return data.vectors
}
