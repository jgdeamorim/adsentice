// adsentice · aplicador de migrations DDL REAL — pg direct :5432
// Resolve a limitação do adsentice_supabase_sql.py (REST não roda DDL).
// Provado no probe ADR-0038: pg:direct-5432 OK.
//
// Uso: node tools/adsentice_migrate_pg.mjs 014        (aplica migration 014)
//      node tools/adsentice_migrate_pg.mjs --sql "SELECT COUNT(*) FROM s10_artifacts"
// medido=verdade · 2026-07-18
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const MIGRATIONS_DIR = join(ROOT, 'packages/db/supabase/migrations')
const PROJECT = 'tdigauruusdhnpvppixb'

// ── creds do .env do web (fonte única local) ──
const env = {}
for (const line of readFileSync(join(ROOT, 'apps/web/.env'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}
if (!env.SUPABASE_DB_PASSWORD) { console.error('FALTA SUPABASE_DB_PASSWORD no apps/web/.env'); process.exit(1) }

const client = new pg.Client({
  host: `db.${PROJECT}.supabase.co`, port: 5432, user: 'postgres', database: 'postgres',
  password: env.SUPABASE_DB_PASSWORD, ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
})

const arg = process.argv[2]
if (!arg) { console.error('Uso: node tools/adsentice_migrate_pg.mjs <numero|--sql "...">'); process.exit(1) }

await client.connect()
try {
  if (arg === '--sql') {
    const r = await client.query(process.argv[3])
    console.log(JSON.stringify(r.rows ?? [], null, 2))
  } else {
    const file = readdirSync(MIGRATIONS_DIR).find(f => f.startsWith(arg + '_'))
    if (!file) { console.error(`Migration ${arg}_* não encontrada em ${MIGRATIONS_DIR}`); process.exit(1) }
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8')
    console.log(`Aplicando ${file} (${sql.length} bytes)...`)
    await client.query(sql) // arquivo inteiro numa transação implícita por statement; DO blocks ok
    console.log(`✅ ${file} aplicada`)
  }
} finally {
  await client.end()
}
