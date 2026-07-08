// adsentice · runner de migração — roda schema.sql no Postgres do Supabase.
// Lê as creds do arquivo em SUPABASE_ENV_FILE (fora do git) EM RUNTIME · NUNCA imprime senha/segredo.
// Tenta conexão direta e pooler (session mode 5432) · SSL. Uso: SUPABASE_ENV_FILE=... node scripts/migrate.mjs

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const here = dirname(fileURLToPath(import.meta.url));
const envFile = process.env.SUPABASE_ENV_FILE;
if (!envFile) { console.error("defina SUPABASE_ENV_FILE"); process.exit(1); }

// parse tolerante (chave: valor · hífen/maiúsc) — só extrai o necessário, nada é impresso.
const text = readFileSync(envFile, "utf-8");
const pick = (names) => {
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z0-9_-]+)\s*[:=]\s*(.+?)\s*$/);
    if (!m) continue;
    const k = m[1].toLowerCase().replace(/[_-]/g, "");
    if (names.includes(k) && m[2]) return m[2].trim();
  }
  return undefined;
};

const password = pick(["databasepassword", "dbpassword", "password"]);
const ref = pick(["projectid"]);
let region = pick(["projectregion"]) || "";
region = region.trim();
if (!password || !ref) { console.error("faltou database-password ou project-id no arquivo"); process.exit(1); }

// roda as migrations em ordem (schema do cofre → profiles/roles)
const SQL_FILES = ["schema.sql", "profiles.sql"];
const sql = SQL_FILES.map(f => readFileSync(join(here, "..", f), "utf-8")).join("\n;\n");

// candidatos de conexão (session mode 5432 · SSL) — direto primeiro, depois pooler.
const candidates = [
  { label: "direto", host: `db.${ref}.supabase.co`, port: 5432, user: "postgres" },
  { label: "pooler", host: `aws-0-${region}.pooler.supabase.com`, port: 5432, user: `postgres.${ref}` },
  { label: "pooler-6543", host: `aws-0-${region}.pooler.supabase.com`, port: 6543, user: `postgres.${ref}` },
];

let ran = false;
for (const c of candidates) {
  const client = new pg.Client({
    host: c.host, port: c.port, user: c.user, password, database: "postgres",
    ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 8000,
  });
  try {
    await client.connect();
    console.log(`✓ conectado via ${c.label} (${c.host.replace(ref, "***")}:${c.port})`);
    await client.query(sql);
    const r = await client.query(
      "select count(*)::int as n from information_schema.tables where table_name='query_vault'",
    );
    console.log(`✓ schema aplicado · query_vault existe: ${r.rows[0].n === 1 ? "SIM" : "NÃO"}`);
    const pol = await client.query("select count(*)::int as n from pg_policies where tablename='query_vault'");
    console.log(`✓ políticas RLS na query_vault: ${pol.rows[0].n}`);
    await client.end();
    ran = true;
    break;
  } catch (e) {
    console.log(`  ${c.label}: falhou (${String(e.message).slice(0, 50)})`);
    try { await client.end(); } catch {}
  }
}
process.exit(ran ? 0 : 2);
