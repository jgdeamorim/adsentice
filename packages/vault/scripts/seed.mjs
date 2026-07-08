// adsentice · seed de usuários de teste (admin + client). Usa o service_role (admin API) do SUPABASE_ENV_FILE.
// Seta app_metadata.{role,tenant_id} → vai pro JWT (RLS/middleware) → o trigger cria o profile. Idempotente.
// Uso: SUPABASE_ENV_FILE=... node scripts/seed.mjs

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const envFile = process.env.SUPABASE_ENV_FILE
if (!envFile) { console.error('defina SUPABASE_ENV_FILE'); process.exit(1) }
const t = readFileSync(envFile, 'utf-8')
const pick = names => { for (const l of t.split(/\r?\n/)) { const m = l.match(/^\s*([A-Za-z0-9_-]+)\s*[:=]\s*(.+?)\s*$/); if (m) { const k = m[1].toLowerCase().replace(/[_-]/g, ''); if (names.includes(k) && m[2]) return m[2].trim() } } }
const url = `https://${pick(['projectid'])}.supabase.co`
const key = pick(['secretkey']) || pick(['servicerolesecret'])

const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

const PASSWORD = 'Adsentice2026!' // ⚠️ senha de TESTE (dev) · trocar em produção
const USERS = [
  { email: 'admin@adsentice.com', role: 'admin', tenant_id: 'adsentice', full_name: 'Admin adsentice' },
  { email: 'client@adsentice.com', role: 'client', tenant_id: 'demo', full_name: 'Cliente Demo' }
]

async function findByEmail(email) {
  // pagina até achar (poucos usuários no seed)
  for (let page = 1; page <= 5; page++) {
    const { data } = await db.auth.admin.listUsers({ page, perPage: 200 })
    const u = data?.users?.find(u => u.email === email)
    if (u) return u
    if (!data?.users?.length) break
  }
  return null
}

for (const u of USERS) {
  const app_metadata = { role: u.role, tenant_id: u.tenant_id }
  const { data, error } = await db.auth.admin.createUser({
    email: u.email, password: PASSWORD, email_confirm: true,
    app_metadata, user_metadata: { full_name: u.full_name }
  })
  if (error && /already|registered|exists/i.test(error.message)) {
    const existing = await findByEmail(u.email)
    if (existing) {
      await db.auth.admin.updateUserById(existing.id, { app_metadata, user_metadata: { full_name: u.full_name }, password: PASSWORD })
      // garante o profile (o trigger só roda no INSERT)
      await db.from('profiles').upsert({ id: existing.id, role: u.role, tenant_id: u.tenant_id, full_name: u.full_name })
      console.log(`↻ atualizado: ${u.email} · role=${u.role} · tenant=${u.tenant_id}`)
    } else {
      console.log(`⚠ ${u.email}: existe mas não achei pra atualizar`)
    }
  } else if (error) {
    console.log(`✗ ${u.email}: ${error.message.slice(0, 60)}`)
  } else {
    console.log(`✓ criado: ${u.email} · role=${u.role} · tenant=${u.tenant_id} · id=${data.user.id.slice(0, 8)}…`)
  }
}
console.log(`\nsenha de teste (ambos): ${PASSWORD}`)
