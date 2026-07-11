// ══════════════════════════════════════════════════════════════════
// ADSENTICE · POST /api/ag-ui/run
// AG-UI endpoint: input (URL) → 5 pipelines → SSE stream
// Protocolo: AG-UI v1.0 (MIT) · SSE · text/event-stream
// ══════════════════════════════════════════════════════════════════

import { NextRequest } from "next/server"
import { runDiscoveryPipeline, emitCardsAndTips } from "@/lib/pipeline"
import type { RunAgentInput } from "@/lib/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60 // Railway free tier: 60s max

export async function POST(request: NextRequest) {
  const body = (await request.json()) as RunAgentInput
  const { threadId = "anonymous", runId = crypto.randomUUID(), input } = body

  const url = input?.url
  if (!url) {
    return new Response(
      `event: message\ndata: ${JSON.stringify({
        type: "RUN_ERROR",
        threadId,
        runId,
        error: { message: "url é obrigatório no input" },
      })}\n\n`,
      {
        status: 400,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      }
    )
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      const write = (s: string) => controller.enqueue(encoder.encode(s))

      try {
        // ═══ RUN_STARTED ═══
        write(
          `event: message\ndata: ${JSON.stringify({
            type: "RUN_STARTED",
            threadId,
            runId,
            input: { url },
          })}\n\n`
        )

        // ═══ PIPELINE ═══
        const { result } = await (async () => {
          const gen = runDiscoveryPipeline(url)
          let last: Awaited<ReturnType<typeof runDiscoveryPipeline>["next"]>["value"] | undefined

          while (true) {
            const { value, done } = await gen.next()
            if (done) {
              last = value
              break
            }
            write(value as string)
          }

          if (!last) throw new Error("Pipeline não retornou resultado")
          return last
        })()

        // ═══ CARDS + TIPS ═══
        for (const chunk of emitCardsAndTips(result)) {
          write(chunk)
        }

        // ═══ RUN_FINISHED ═══
        write(
          `event: message\ndata: ${JSON.stringify({
            type: "RUN_FINISHED",
            threadId,
            runId,
            outcome: { type: "success" },
            result: {
              score: result.score,
              business: result.business,
              cardsCount: result.cards.length,
              tipsCount: result.tips.length,
            },
          })}\n\n`
        )
      } catch (error) {
        write(
          `event: message\ndata: ${JSON.stringify({
            type: "RUN_ERROR",
            threadId,
            runId,
            error: { message: String(error) },
          })}\n\n`
        )
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}
