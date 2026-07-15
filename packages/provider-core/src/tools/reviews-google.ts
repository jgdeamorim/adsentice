// ══════════════════════════════════════════════════════════════════
// ADSENTICE · L4 — Google Reviews ($0.00075/call)
// Texto completo das reviews do Google — task-based (task_post → GET).
// medido=verdade · Sandbox+Live testados.
//
// Flow: POST task_post → 20100 → GET task_get/{id} → 20000
// Response: result[0].items[] com rating {value, votes_count}
// Fonte: EVO-API business.reviews.google · Live testado
// ══════════════════════════════════════════════════════════════════

import { getDFSEOClient } from "../client"

export interface GoogleReview {
  rating: number
  review_text: string
  timestamp: string
  reviewer_name: string | null
  owner_answer: string | null
}

export interface GoogleReviewsResult {
  rating_value: number | null
  reviews_count: number
  reviews: GoogleReview[]
}

const wait = (ms: number) => new Promise(r => setTimeout(r, ms))

/**
 * L4 — Google Reviews ($0.00075). Task-based, ~15-20s total.
 */
export async function googleReviews(params: {
  keyword: string
  location_code?: number
  language_code?: string
  depth?: number
}): Promise<GoogleReviewsResult | null> {
  const c = getDFSEOClient()
  if (!params.keyword) return null

  // Step 1: POST task_post
  const postBody = JSON.stringify([{
    keyword: params.keyword,
    location_code: params.location_code || 2076,
    language_code: params.language_code || "pt",
    depth: params.depth || 10,
  }])
  const postUrl = `${c.activeUrl}/v3/business_data/google/reviews/task_post`
  const postRes = await fetch(postUrl, {
    method: "POST",
    headers: { Authorization: c.authHeader, "Content-Type": "application/json" },
    body: postBody,
  })
  if (!postRes.ok) return null
  const postData = await postRes.json() as {
    tasks?: Array<{ id?: string; status_code?: number }>
  }
  const taskId = postData.tasks?.[0]?.id
  if (!taskId) return null

  // Step 2: GET poll (max 8 tentativas × 3s)
  for (let attempt = 0; attempt < 8; attempt++) {
    await wait(3000)
    const pollUrl = `${c.activeUrl}/v3/business_data/google/reviews/task_get/${taskId}`
    const pollRes = await fetch(pollUrl, {
      headers: { Authorization: c.authHeader },
    })
    if (!pollRes.ok) continue
    const pollData = await pollRes.json() as {
      tasks?: Array<{ status_code?: number; result?: Array<Record<string, unknown>> }>
    }
    const task = pollData.tasks?.[0]
    if (task?.status_code === 20000 && task.result) {
      const block = task.result[0]
      if (!block) return null

      const items = (block.items || block.reviews || []) as Record<string, unknown>[]
      const reviews: GoogleReview[] = items.map(r => {
        const rObj = (r.rating || {}) as Record<string, unknown>
        return {
          rating: (rObj.value as number) ?? (r.rating_value as number) ?? 0,
          review_text: (r.review_text as string) || (r.text as string) || "",
          timestamp: (r.time_ago as string) || (r.timestamp as string) || "",
          reviewer_name: (r.profile_name as string) || null,
          owner_answer: (r.owner_answer as string) || null,
        }
      })

      return {
        rating_value: (block.rating_value as number) ?? null,
        reviews_count: (block.reviews_count as number) ?? reviews.length,
        reviews,
      }
    }
    if (task?.status_code === 40601) break
  }

  return null
}
