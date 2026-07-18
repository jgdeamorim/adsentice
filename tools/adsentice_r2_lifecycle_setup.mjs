// adsentice · R2 lifecycle setup one-shot (ADR-0038) — TTL físico dos artefatos S10
// Rule: prefix s10/ → delete após 35 dias (30d TTL lógico + 5d carência de inspeção).
// MERGE-SAFE: preserva rules existentes do bucket (backups!) — só adiciona/atualiza a nossa.
// Uso: node tools/adsentice_r2_lifecycle_setup.mjs
// medido=verdade · 2026-07-18
import { readFileSync } from 'node:fs'
import {
  S3Client,
  GetBucketLifecycleConfigurationCommand,
  PutBucketLifecycleConfigurationCommand,
} from '@aws-sdk/client-s3'

const env = {}
for (const line of readFileSync('apps/web/.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: env.CLOUDFLARE_R2_ACCESS_KEY, secretAccessKey: env.CLOUDFLARE_R2_SECRET_KEY },
})
const Bucket = env.CLOUDFLARE_R2_BUCKET || 'adsentice'

const S10_RULE = {
  ID: 's10-artifacts-ttl-35d',
  Status: 'Enabled',
  Filter: { Prefix: 's10/' },
  Expiration: { Days: 35 },
}

// 1. rules existentes (backups etc.) — preservar
let existing = []
try {
  const cur = await s3.send(new GetBucketLifecycleConfigurationCommand({ Bucket }))
  existing = cur.Rules ?? []
  console.log(`Rules existentes: ${existing.map(r => r.ID).join(', ') || '(nenhuma)'}`)
} catch (e) {
  if (e.name === 'NoSuchLifecycleConfiguration' || e.$metadata?.httpStatusCode === 404) {
    console.log('Bucket sem lifecycle config — criando a primeira rule')
  } else {
    throw e
  }
}

// 2. merge: substitui a nossa se já existir, mantém as demais
const Rules = [...existing.filter(r => r.ID !== S10_RULE.ID), S10_RULE]
await s3.send(new PutBucketLifecycleConfigurationCommand({ Bucket, LifecycleConfiguration: { Rules } }))
console.log(`✅ lifecycle aplicado no bucket "${Bucket}": ${Rules.map(r => `${r.ID} (${r.Expiration?.Days}d)`).join(' · ')}`)
