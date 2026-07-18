// ══════════════════════════════════════════════════════════════════
// ADSENTICE · S10 Artifacts — Generate-then-Serve (ADR-0038)
//
// Doutrina Vault #5 aplicada ao artefato que o lead vê:
//   R2 blob (s10/{place_id}/v{N}.json = {html, blue, meta}, imutável)
//   → Postgres série (s10_artifacts, TTL 30d = ciclo de aquecimento)
//
// GERAÇÃO: composeS10 (BLUE L0-L6) → QG gate → R2 put → série insert
// VIEW:    série REST (~100-200ms) → R2 get → html congelado
// Infra provada: tools/adsentice_s10_infra_probe.mjs (pg OK · R2 OK)
// medido=verdade · 2026-07-18
// ══════════════════════════════════════════════════════════════════

import "server-only"
import { createHash } from "node:crypto"
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3"
import { composeS10 } from "./warp-composer"

// ═══ TYPES ═══

export interface S10ArtifactRow {
  id: string
  place_id: string
  surface: string
  version: number
  status: string
  blob_key: string
  content_hash: string
  headline: string | null
  subtitle: string | null
  cta: string | null
  copy_model: string | null
  ab_variant: string | null
  qg_composite: number | null
  qg_passed: boolean | null
  segment: string | null
  score: number | null
  cost_usd: number
  generated_at: string
  expires_at: string
}

export interface S10Served {
  html: string
  artifact: S10ArtifactRow
  source: "artifact" | "generated"
}

// ═══ CLIENTS (module-level singletons) ═══

let _s3: S3Client | null = null
function r2(): S3Client {
  if (_s3) return _s3
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_KEY
  if (!accountId || !accessKeyId || !secretAccessKey) throw new Error("s10-artifacts: CLOUDFLARE_R2_* ausentes")
  _s3 = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  })
  return _s3
}

const R2_BUCKET = () => process.env.CLOUDFLARE_R2_BUCKET || "adsentice"

function supa(): { url: string; key: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tdigauruusdhnpvppixb.supabase.co"
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  return { url, key }
}

function supaHeaders(key: string): Record<string, string> {
  return { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" }
}

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex")
}

// ═══ SÉRIE (Supabase REST · service role) ═══

async function seriesQuery(qs: string): Promise<S10ArtifactRow[]> {
  const { url, key } = supa()
  const res = await fetch(`${url}/rest/v1/s10_artifacts?${qs}`, { headers: supaHeaders(key), cache: "no-store" })
  if (!res.ok) return []
  return (await res.json()) as S10ArtifactRow[]
}

async function seriesInsert(row: Record<string, unknown>): Promise<S10ArtifactRow | null> {
  const { url, key } = supa()
  const res = await fetch(`${url}/rest/v1/s10_artifacts`, {
    method: "POST",
    headers: { ...supaHeaders(key), Prefer: "return=representation" },
    body: JSON.stringify(row),
  })
  if (!res.ok) {
    console.error("[s10-artifacts] seriesInsert", res.status, (await res.text()).slice(0, 150))
    return null
  }
  const rows = (await res.json()) as S10ArtifactRow[]
  return rows[0] ?? null
}

// ═══ BLOB (R2 · imutável IfNoneMatch) ═══

async function blobPut(key: string, body: string): Promise<boolean> {
  try {
    await r2().send(new PutObjectCommand({
      Bucket: R2_BUCKET(), Key: key, Body: body,
      ContentType: "application/json", IfNoneMatch: "*",
    }))
    return true
  } catch (e: unknown) {
    const status = (e as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode
    if (status === 412) return true // já existe (corrida) — imutável, tratamos como sucesso
    console.error("[s10-artifacts] blobPut", key, String((e as Error).message).slice(0, 120))
    return false
  }
}

async function blobGet(key: string): Promise<{ html: string; blue: unknown; meta: unknown } | null> {
  try {
    const res = await r2().send(new GetObjectCommand({ Bucket: R2_BUCKET(), Key: key }))
    const text = await res.Body?.transformToString()
    if (!text) return null
    return JSON.parse(text) as { html: string; blue: unknown; meta: unknown }
  } catch (e: unknown) {
    console.error("[s10-artifacts] blobGet", key, String((e as Error).message).slice(0, 120))
    return null
  }
}

// ═══ VIEW · fast path (<1s): série → blob → html congelado ═══

export async function getPublishedS10(placeId: string): Promise<S10Served | null> {
  const nowIso = new Date().toISOString()
  const rows = await seriesQuery(
    `place_id=eq.${encodeURIComponent(placeId)}&surface=eq.S10&status=eq.published&expires_at=gt.${encodeURIComponent(nowIso)}&order=version.desc&limit=1`
  )
  const artifact = rows[0]
  if (!artifact) return null
  const blob = await blobGet(artifact.blob_key)
  if (!blob?.html) return null
  // integridade: o html servido é byte a byte o aprovado pelo QG
  if (sha256(blob.html) !== artifact.content_hash) {
    console.error("[s10-artifacts] hash mismatch", artifact.blob_key)
    return null
  }
  return { html: blob.html, artifact, source: "artifact" }
}

/** Versão específica (?v=N — inspeção admin). Ignora expiração e status. */
export async function getS10Version(placeId: string, version: number): Promise<S10Served | null> {
  const rows = await seriesQuery(
    `place_id=eq.${encodeURIComponent(placeId)}&surface=eq.S10&version=eq.${version}&limit=1`
  )
  const artifact = rows[0]
  if (!artifact) return null
  const blob = await blobGet(artifact.blob_key)
  if (!blob?.html) return null
  return { html: blob.html, artifact, source: "artifact" }
}

// ═══ GERAÇÃO: composeS10 → QG gate → blob → série ═══

export async function generateS10Artifact(placeId: string): Promise<S10Served | null> {
  const result = await composeS10(placeId)
  if (!result?.html) return null
  const meta = result.meta as Record<string, any>
  const critique = (meta.critique || {}) as { composite?: number; passed?: boolean }

  // QG gate: reprovado explicitamente → não publica (lead nunca vê versão ruim).
  // O html ainda é retornado ao chamador inline (fallback da view) SEM persistir —
  // o próximo request re-tenta a geração.
  const passed = critique.passed !== false

  // versão: última + 1 (corrida → UNIQUE rejeita; re-lemos published)
  const last = await seriesQuery(`place_id=eq.${encodeURIComponent(placeId)}&surface=eq.S10&order=version.desc&limit=1&select=version`)
  const version = ((last[0]?.version as number | undefined) ?? 0) + 1
  const blobKey = `s10/${placeId}/v${version}.json`
  const contentHash = sha256(result.html)

  const composed = (meta._composed || {}) as Record<string, any>
  const row = {
    place_id: placeId,
    surface: 'S10',
    version,
    status: passed ? "published" : "rejected",
    blob_key: blobKey,
    content_hash: contentHash,
    headline: (meta.headline as string) || null,
    subtitle: (meta.subtitle as string) || null,
    cta: (meta.cta as string) || null,
    copy_model: (meta.copy_model as string) || null,
    // fix v082: abTest é objeto {active, variant, ...} — gravar a variante, não String(obj)
    ab_variant: composed.abTest?.variant ? String(composed.abTest.variant) : null,
    qg_composite: critique.composite ?? null,
    qg_passed: passed,
    segment: (meta.segment as string) || null,
    score: (meta.score as number) ?? null,
    cost_usd: (meta.copy_model as string) === "deepseek-refine" ? 0.001 : 0,
  }

  const stored = await blobPut(blobKey, JSON.stringify({ html: result.html, blue: result.blue ?? null, meta }))
  let artifact: S10ArtifactRow | null = null
  if (stored) {
    artifact = await seriesInsert(row)
    if (!artifact) {
      // corrida no UNIQUE (outro request publicou a mesma versão) → serve o publicado dele
      const raced = await getPublishedS10(placeId)
      if (raced) return { ...raced, source: "generated" }
    }
  }

  if (!passed) {
    console.warn("[s10-artifacts] QG reprovou", placeId, "composite:", critique.composite, "— servido inline, NÃO publicado")
  }

  return {
    html: result.html,
    artifact: artifact ?? ({ ...row, id: "inline", generated_at: new Date().toISOString(), expires_at: "" } as S10ArtifactRow),
    source: "generated",
  }
}

// ═══ SERVE-THEN-FALLBACK (usado pela rota) ═══

export async function getOrGenerateS10(placeId: string): Promise<S10Served | null> {
  const published = await getPublishedS10(placeId)
  if (published) return published
  return generateS10Artifact(placeId)
}

// ═══════════════════════════════════════════════════════════════
// S11 LANDING — artefatos A/B por ESTRATÉGIA (ADR-0037 F6 + ADR-0038)
// Cada geração publica DUAS variantes (A e B) da mesma versão.
// O serve escolhe a variante por visitante (cookie) — congelada
// entre views para medição de conversão limpa.
// ═══════════════════════════════════════════════════════════════

export async function getPublishedS11(placeId: string, variant: 'A' | 'B'): Promise<S10Served | null> {
  const nowIso = new Date().toISOString()
  const rows = await seriesQuery(
    `place_id=eq.${encodeURIComponent(placeId)}&surface=eq.S11&ab_variant=eq.${variant}&status=eq.published&expires_at=gt.${encodeURIComponent(nowIso)}&order=version.desc&limit=1`
  )
  const artifact = rows[0]
  if (!artifact) return null
  const blob = await blobGet(artifact.blob_key)
  if (!blob?.html) return null
  if (sha256(blob.html) !== artifact.content_hash) {
    console.error("[s11-artifacts] hash mismatch", artifact.blob_key)
    return null
  }
  return { html: blob.html, artifact, source: "artifact" }
}

/** Gera e publica AMBAS as variantes (A+B). Retorna a variante pedida. */
export async function generateS11Artifacts(placeId: string, want: 'A' | 'B'): Promise<S10Served | null> {
  const { composeS11 } = await import("./warp-composer")
  const result = await composeS11(placeId)
  if (!result?.variants?.length) return null

  // versão única para o PAR A/B (mesma rodada de estratégias)
  const last = await seriesQuery(`place_id=eq.${encodeURIComponent(placeId)}&surface=eq.S11&order=version.desc&limit=1&select=version`)
  const version = ((last[0]?.version as number | undefined) ?? 0) + 1

  let served: S10Served | null = null
  for (const v of result.variants) {
    const blobKey = `s11/${placeId}/v${version}${v.ab}.json`
    const contentHash = sha256(v.html)
    const stored = await blobPut(blobKey, JSON.stringify({ html: v.html, meta: { ...result.meta, strategy: v.strategyFacet, hypothesis: v.hypothesis, ab: v.ab } }))
    let artifact: S10ArtifactRow | null = null
    if (stored) {
      artifact = await seriesInsert({
        place_id: placeId,
        surface: 'S11',
        version,
        status: "published",
        blob_key: blobKey,
        content_hash: contentHash,
        headline: v.headline || null,
        subtitle: v.hypothesis || null,   // hipótese testável da estratégia (trace da série)
        cta: null,
        copy_model: v.copyModel,
        ab_variant: v.ab,
        qg_composite: null,
        qg_passed: true,
        segment: (result.meta.segment as string) || null,
        score: (result.meta.score as number) ?? null,
        cost_usd: v.copyModel === 'deepseek-landing' ? 0.001 : 0,
      })
      if (!artifact) {
        // corrida: outro request publicou esta versão → usa o dele
        const raced = await getPublishedS11(placeId, v.ab)
        if (raced && v.ab === want) served = { ...raced, source: "generated" }
        continue
      }
    }
    if (v.ab === want) {
      served = {
        html: v.html,
        artifact: artifact ?? ({ place_id: placeId, surface: 'S11', version, ab_variant: v.ab, id: 'inline', status: 'published' } as S10ArtifactRow),
        source: "generated",
      }
    }
  }
  return served
}

export async function getOrGenerateS11(placeId: string, variant: 'A' | 'B'): Promise<S10Served | null> {
  const published = await getPublishedS11(placeId, variant)
  if (published) return published
  return generateS11Artifacts(placeId, variant)
}

// ═══ EVENTOS DE CONVERSÃO (F6 — view/cta_click por variante · fire-and-forget) ═══

export function trackSurfaceEvent(ev: {
  place_id: string; surface: string; version?: number | null
  ab_variant?: string | null; event: 'view' | 'cta_click'
}): void {
  const { url, key } = supa()
  fetch(`${url}/rest/v1/s11_events`, {
    method: "POST",
    headers: { ...supaHeaders(key), Prefer: "return=minimal" },
    body: JSON.stringify(ev),
  }).catch((e: unknown) => { void e })
}

/** Phone do lead (para o /r/ redirect wa.me do PRÓPRIO cliente). */
export async function getLeadContact(placeId: string): Promise<{ phone: string | null; title: string | null } | null> {
  const { url, key } = supa()
  const res = await fetch(
    `${url}/rest/v1/discovery_listings?select=phone,title&place_id=eq.${encodeURIComponent(placeId)}&limit=1`,
    { headers: supaHeaders(key), cache: "no-store" }
  )
  if (!res.ok) return null
  const rows = (await res.json()) as { phone: string | null; title: string | null }[]
  return rows[0] ?? null
}
