// ADSENTICE · Migration 019 Runner
// Conecta direto no Supabase Postgres via pooler e executa o DDL
// Uso: node tools/run-migration-019.mjs

import pkg from 'pg'
const { Pool } = pkg

const SQL = `
ALTER TABLE discovery_listings ADD COLUMN IF NOT EXISTS cid TEXT;
COMMENT ON COLUMN discovery_listings.cid IS 'Google Customer ID (numérico) — complementar ao place_id. L0, $0 adicional.';
ALTER TABLE discovery_listings ADD COLUMN IF NOT EXISTS region TEXT;
COMMENT ON COLUMN discovery_listings.region IS 'Região administrativa (address_info.region). L0, $0 adicional.';
COMMENT ON COLUMN discovery_listings.postal_code IS 'CEP (address_info.zip). L0 — NÃO depende de L1. Migração 001 rotulava errado como L1.';
COMMENT ON COLUMN discovery_listings.country_code IS 'Código ISO do país (address_info.country_code). L0 — NÃO depende de L1. Migração 001 rotulava errado como L1.';
COMMENT ON COLUMN discovery_listings.business_status IS 'Status operacional (OPERATIONAL, CLOSED, etc.). Confirmado: NÃO disponível no L0 — somente L1 my_business_info.';
COMMENT ON COLUMN discovery_listings.price_level IS 'Nível de preço 1-4. Top-level key no JSON L0 (confirmado live 2026-07-19). Migração 001 rotulava errado como L1-only.';
COMMENT ON COLUMN discovery_listings.contact_methods IS 'Canais de contato detectados (computado). NÃO depende de API — é derivado do scoring.';
COMMENT ON COLUMN discovery_listings.enrichment_level IS '0=pre-flight L0, 1=L0 completo (contatos), 2=L2 Website+SEO, 3=L3 Social, 4=L4 IBGE. ADR-0039: L1 DEPRECATED.';
CREATE INDEX IF NOT EXISTS idx_listings_cid ON discovery_listings(cid);
`

const pool = new Pool({
  host: 'aws-0.us-east-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  user: 'postgres.tdigauruusdhnpvppixb',
  password: 'pmaxnpmiJ6WfcX46',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
})

async function run() {
  const client = await pool.connect()
  try {
    // Extrai só os statements não-comentário
    const stmts = SQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    console.log(`Executando ${stmts.length} statements...\n`)

    for (let i = 0; i < stmts.length; i++) {
      const stmt = stmts[i]
      const preview = stmt.replace(/\n/g, ' ').slice(0, 80)
      try {
        await client.query(stmt)
        console.log(`  ✅ [${i + 1}/${stmts.length}] ${preview}...`)
      } catch (e) {
        console.log(`  ❌ [${i + 1}/${stmts.length}] ${e.message}`)
        console.log(`     SQL: ${preview}`)
      }
    }

    // Verifica
    console.log('\n=== Verificação ===')
    const { rows: cols } = await client.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'discovery_listings' AND column_name IN ('cid', 'region')`
    )
    for (const r of cols) console.log(`  ✅ Coluna: ${r.column_name}`)

    const { rows: idx } = await client.query(
      `SELECT indexname FROM pg_indexes
       WHERE tablename = 'discovery_listings' AND indexname = 'idx_listings_cid'`
    )
    if (idx.length) console.log(`  ✅ Índice: idx_listings_cid`)

    const { rows: comm } = await client.query(
      `SELECT col_description('public.discovery_listings'::regclass,
        (SELECT ordinal_position FROM information_schema.columns
         WHERE table_name='discovery_listings' AND column_name='enrichment_level')) as comment`
    )
    if (comm[0]?.comment) console.log(`  ✅ COMMENT enrichment_level: ${comm[0].comment.slice(0, 80)}...`)

    console.log('\n✅ Migration 019 aplicada!')
  } finally {
    client.release()
    await pool.end()
  }
}

run().catch(e => { console.error(e); process.exit(1) })
