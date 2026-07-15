// ══════════════════════════════════════════════════════════════════
// ADSENTICE · L4 — Business Q&A ($0.00075/call, task-based)
// Perguntas e respostas REAIS de pacientes no Google Meu Negocio.
// Material riquissimo para copy do S10 e conteudo de blog.
//
// Endpoint: task_post → business_data/google/questions_and_answers/task_post
//           GET → task_get/{id}
// Fonte: EVO-API business.qa
// ══════════════════════════════════════════════════════════════════

import { getDFSEOClient } from "../client"

export interface QAItem {
  question: string; timestamp: string; profile_name: string | null
  answers: Array<{ answer: string; profile_name: string | null }>
}

const wait = (ms: number) => new Promise(r => setTimeout(r, ms))

export async function businessQA(params: {
  keyword: string; location_code?: number; language_code?: string
}): Promise<QAItem[] | null> {
  const c = getDFSEOClient()
  if (!params.keyword) return null
  const postBody = JSON.stringify([{
    keyword: params.keyword, location_code: params.location_code || 2076,
    language_code: params.language_code || "pt",
  }])
  const postRes = await fetch(`${c.activeUrl}/v3/business_data/google/questions_and_answers/task_post`, {
    method: "POST", headers: { Authorization: c.authHeader, "Content-Type": "application/json" }, body: postBody,
  })
  if (!postRes.ok) return null
  const postData = await postRes.json() as { tasks?: Array<{ id?: string }> }
  const taskId = postData.tasks?.[0]?.id
  if (!taskId) return null
  for (let i = 0; i < 6; i++) {
    await wait(3000)
    const pollRes = await fetch(`${c.activeUrl}/v3/business_data/google/questions_and_answers/task_get/${taskId}`, { headers: { Authorization: c.authHeader } })
    if (!pollRes.ok) continue
    const pollData = await pollRes.json() as { tasks?: Array<{ status_code?: number; result?: Array<Record<string, unknown>> }> }
    const task = pollData.tasks?.[0]
    if (task?.status_code === 20000 && task.result) {
      const items = (task.result[0]?.items || []) as Record<string, unknown>[]
      return items.map(r => ({
        question: (r.question_text as string) || "",
        timestamp: (r.timestamp as string) || "",
        profile_name: (r.profile_name as string) || null,
        answers: ((r.answers || []) as Array<{ answer_text: string; profile_name: string | null }>).map(a => ({
          answer: a.answer_text || "", profile_name: a.profile_name || null,
        })),
      }))
    }
    if (task?.status_code === 40601) break
  }
  return null
}
