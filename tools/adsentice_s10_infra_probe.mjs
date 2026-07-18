// adsentice · probe de infra para ADR-0038 — pg DDL? R2 real?
// Uso: node tools/adsentice_s10_infra_probe.mjs
// medido=verdade · 2026-07-18
import { readFileSync } from 'node:fs'
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import pg from 'pg'

// ── carrega .env do web (sem dotenv) ──
const env = {}
for (const line of readFileSync('apps/web/.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}

const results = {}

// ── PG: 3 rotas de conexão ──
const PROJECT = 'tdigauruusdhnpvppixb'
const pgTargets = [
  { name: 'direct-5432', host: `db.${PROJECT}.supabase.co`, port: 5432, user: 'postgres' },
  { name: 'pooler-session-5432', host: 'aws-0-sa-east-1.pooler.supabase.com', port: 5432, user: `postgres.${PROJECT}` },
  { name: 'pooler-tx-6543', host: 'aws-0-sa-east-1.pooler.supabase.com', port: 6543, user: `postgres.${PROJECT}` },
]
for (const t of pgTargets) {
  const client = new pg.Client({
    host: t.host, port: t.port, user: t.user, database: 'postgres',
    password: env.SUPABASE_DB_PASSWORD, ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
  })
  try {
    await client.connect()
    const r = await client.query('SELECT current_user, version()')
    results[`pg:${t.name}`] = `OK · ${r.rows[0].current_user}`
    await client.end()
  } catch (e) {
    results[`pg:${t.name}`] = `FAIL · ${String(e.message).slice(0, 60)}`
    try { await client.end() } catch { /* já fechado */ }
  }
}

// ── R2: put + get + delete real ──
try {
  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: env.CLOUDFLARE_R2_ACCESS_KEY, secretAccessKey: env.CLOUDFLARE_R2_SECRET_KEY },
  })
  const Bucket = env.CLOUDFLARE_R2_BUCKET || 'adsentice-vault'
  const Key = 's10/_probe-adr0038.json'
  const body = JSON.stringify({ probe: 'adr-0038', at: new Date().toISOString() })
  await s3.send(new PutObjectCommand({ Bucket, Key, Body: body, ContentType: 'application/json' }))
  const got = await s3.send(new GetObjectCommand({ Bucket, Key }))
  const round = await got.Body.transformToString()
  await s3.send(new DeleteObjectCommand({ Bucket, Key }))
  results['r2:put-get-delete'] = round === body ? `OK · bucket=${Bucket} roundtrip íntegro` : 'FAIL · roundtrip diverge'
} catch (e) {
  results['r2:put-get-delete'] = `FAIL · ${String(e.message).slice(0, 80)}`
}

console.log(JSON.stringify(results, null, 2))
