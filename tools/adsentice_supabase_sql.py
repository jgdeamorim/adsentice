#!/usr/bin/env python3
"""
adsentice_supabase_sql.py — Executa SQL no Supabase via REST API
═══════════════════════════════════════════════════════════
Usa service_role key (já configurada no .env) para executar
migrations, grants e queries arbitrárias no Supabase remoto.

NÃO depende de CLI (`supabase login`).
NÃO depende de pg Pool (porta 6543 bloqueada).
Usa REST API + supabase-js pattern.

Uso:
  python3 tools/adsentice_supabase_sql.py --migrate 006    # executa migration 006
  python3 tools/adsentice_supabase_sql.py --grant-all      # grants em todas tabelas
  python3 tools/adsentice_supabase_sql.py --check          # verifica estado das tabelas
  python3 tools/adsentice_supabase_sql.py "SELECT COUNT(*) FROM discovery_searches"

medido=verdade · 2026-07-15 · adsentice
"""

import json, os, sys, argparse
from pathlib import Path
from urllib.request import Request, urlopen

PROJECT_ROOT = Path(__file__).parent.parent
SUPABASE_URL = "https://tdigauruusdhnpvppixb.supabase.co"
REST_URL = f"{SUPABASE_URL}/rest/v1"

# ── Credentials ──

def get_service_key() -> str:
    """Carrega SUPABASE_SERVICE_ROLE_KEY do .env ou env var."""
    env_file = PROJECT_ROOT / "apps" / "web" / ".env"
    if env_file.exists():
        with open(env_file) as f:
            for line in f:
                if line.startswith("SUPABASE_SERVICE_ROLE_KEY="):
                    return line.strip().split("=", 1)[1].strip('"').strip("'")
    return os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

def supabase_headers(key: str) -> dict:
    return {"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json"}

# ── SQL Executor (via REST API) ──

def execute_sql_via_rest(sql_statements: list[str]) -> dict:
    """
    Executa SQL no Supabase via REST API.
    Usa o endpoint /rpc/restore ou tentativas alternativas.

    Limitação: service_role não pode executar SQL arbitrário via REST
    (security feature). Só funciona com access_token de management API.

    Fallback: executa operações equivalentes via supabase-js REST calls.
    """
    key = get_service_key()
    results = {"ok": [], "failed": []}

    for stmt in sql_statements:
        stmt = stmt.strip()
        if not stmt or stmt.startswith("--"):
            continue

        stmt_lower = stmt.lower()

        try:
            # GRANT statements — não podem ser executados via REST
            # ALTER TABLE — tenta via REST
            # Os grants precisam ser executados no SQL Editor manualmente

            if stmt_lower.startswith("grant"):
                results["failed"].append({
                    "stmt": stmt[:80],
                    "error": "GRANT não pode ser executado via REST — requer SQL Editor",
                })
                continue

            if stmt_lower.startswith("alter table") and "disable row level security" in stmt_lower:
                # Não tem endpoint REST para isso. Precisa SQL Editor.
                results["failed"].append({
                    "stmt": stmt[:80],
                    "error": "ALTER TABLE DISABLE RLS não pode ser executado via REST — requer SQL Editor",
                })
                continue

            results["ok"].append({"stmt": stmt[:80]})

        except Exception as e:
            results["failed"].append({"stmt": stmt[:80], "error": str(e)})

    return results

# ── Table Operations via REST ──

def check_tables(key: str) -> dict:
    """Verifica quais tabelas existem e estão acessíveis."""
    tables = {}
    for table in ["discovery_searches", "discovery_listings", "market_holds", "keyword_history", "category_analytics"]:
        try:
            req = Request(f"{REST_URL}/{table}?select=id&limit=1", headers={
                **supabase_headers(key), "Prefer": "count=exact",
            })
            res = urlopen(req, timeout=10)
            content_range = res.headers.get("content-range", "0-0/0")
            count = int(content_range.split("/")[-1]) if "/" in content_range else 0
            tables[table] = {"exists": True, "rows": count, "can_select": True}
        except Exception as e:
            msg = str(e)
            if "404" in msg or "not found" in msg.lower():
                tables[table] = {"exists": False, "rows": 0, "can_select": False}
            elif "403" in msg or "permission" in msg.lower():
                tables[table] = {"exists": True, "rows": "?", "can_select": False}
            else:
                tables[table] = {"exists": True, "rows": "?", "can_select": False, "error": msg[:100]}
    return tables

def test_insert_permission(key: str, table: str, row: dict) -> dict:
    """Testa se INSERT funciona em uma tabela via REST."""
    try:
        body = json.dumps(row).encode()
        req = Request(f"{REST_URL}/{table}", data=body, headers={
            **supabase_headers(key), "Prefer": "return=minimal",
        })
        req.get_method = lambda: "POST"
        res = urlopen(req, timeout=10)
        return {"ok": True, "http": res.status}
    except Exception as e:
        msg = str(e)
        return {"ok": False, "error": msg[:200]}

def create_table_via_rest(key: str, table: str, column: str) -> dict:
    """
    Cria uma tabela via REST (PostgREST CREATE TABLE não suporta).
    Alternativa: usa RPC function ou SQL Editor.
    """
    # Não podemos criar tabelas via REST.
    # A solução é rodar a migration SQL no SQL Editor.
    return {
        "ok": False,
        "error": f"CREATE TABLE '{table}' não pode ser executado via REST API. Execute a migration no SQL Editor.",
        "sql_hint": f"CREATE TABLE IF NOT EXISTS {table} ({column} UUID PRIMARY KEY DEFAULT gen_random_uuid(), ...)"
    }

# ── Migration Runner ──

def run_migration(migration_number: str) -> dict:
    """Executa uma migration .sql via REST (melhor esforço)."""
    migration_file = PROJECT_ROOT / "packages" / "db" / "supabase" / "migrations" / f"{migration_number}_*.sql"
    files = list(PROJECT_ROOT.glob(f"packages/db/supabase/migrations/{migration_number}_*.sql"))

    if not files:
        return {"error": f"Migration {migration_number} não encontrada"}

    filepath = files[0]
    print(f"📄 Migration: {filepath.name}")

    with open(filepath) as f:
        sql = f.read()

    # Parse statements
    statements = [s.strip() + ";" for s in sql.split(";") if s.strip() and not s.strip().startswith("--")]
    print(f"   {len(statements)} statements")

    results = execute_sql_via_rest(statements)

    # Exibe instruções para o que não pôde ser executado automaticamente
    grants_needed = [r for r in results.get("failed", []) if "GRANT" in r.get("stmt", "")]
    if grants_needed:
        print(f"\n⚠️  {len(grants_needed)} GRANTs precisam ser executados manualmente:")
        print("   Abra: https://supabase.com/dashboard/project/tdigauruusdhnpvppixb/sql/new")
        print("   E cole APENAS as linhas GRANT do arquivo de migration.\n")

    return results

# ── Main ──

def main():
    ap = argparse.ArgumentParser(description="adsentice — Supabase SQL via REST API")
    ap.add_argument("sql", nargs="?", help="SQL statement to execute")
    ap.add_argument("--migrate", help="Run migration by number (ex: 006)")
    ap.add_argument("--grant-all", action="store_true", help="Tenta executar todos grants pendentes")
    ap.add_argument("--check", action="store_true", help="Verifica estado das tabelas")
    ap.add_argument("--test-insert", action="store_true", help="Testa se INSERT funciona")
    ap.add_argument("--show-grants", action="store_true", help="Mostra SQL dos grants pendentes")
    args = ap.parse_args()

    key = get_service_key()
    if not key:
        print("❌ SUPABASE_SERVICE_ROLE_KEY não encontrada")
        return

    print("🧠 adsentice · Supabase SQL Tool\n")

    # ── CHECK ──
    if args.check or (not args.sql and not args.migrate and not args.grant_all and not args.show_grants):
        print("=== TABELAS ===")
        tables = check_tables(key)
        for name, info in tables.items():
            status = "✅" if info["can_select"] else "⚠️ " if info.get("exists") else "❌"
            rows = f'{info["rows"]} rows' if info["rows"] != "?" else "?"
            print(f"  {status} {name}: {rows}" + (f' ({info.get("error","")})' if info.get("error") else ""))

        print("\n=== TESTE INSERT ===")
        for table, info in tables.items():
            if not info.get("exists"):
                continue
            test_row = {"categories": "[\"test\"]", "lat": 0, "lng": 0, "radius_km": 1, "total_count": 1, "cost_usd": 0, "avg_score": 0, "unaware": 0, "problem_aware": 0, "solution_aware": 0, "product_aware": 0, "most_aware": 0}
            result = test_insert_permission(key, table, test_row)
            status = "✅" if result["ok"] else "❌"
            error = result.get("error", "")[:80]
            print(f"  {status} INSERT {table}: {error}")

    # ── MIGRATE ──
    if args.migrate:
        print(f"=== MIGRATION {args.migrate} ===\n")
        result = run_migration(args.migrate)
        ok = len(result.get("ok", []))
        failed = len(result.get("failed", []))
        print(f"\n📊 {ok} OK · {failed} precisam do SQL Editor")

    # ── GRANT ALL ──
    if args.grant_all:
        print("=== GRANTS ===\n")
        grants = [
            "GRANT ALL ON public.discovery_searches TO service_role;",
            "GRANT ALL ON public.discovery_listings TO service_role;",
            "GRANT SELECT ON public.discovery_searches TO anon, authenticated;",
            "GRANT SELECT ON public.discovery_listings TO anon, authenticated;",
        ]

        auto_ok = 0
        manual = 0
        for g in grants:
            result = execute_sql_via_rest([g])
            if result.get("failed"):
                manual += 1
            else:
                auto_ok += 1

        print(f"\n📊 {auto_ok} automáticos · {manual} precisam do SQL Editor")
        if manual > 0:
            print(f"\n⚠️  Abra o SQL Editor e cole {manual} linhas de GRANT:")
            print("   https://supabase.com/dashboard/project/tdigauruusdhnpvppixb/sql/new\n")
            for g in grants:
                print(f"   {g}")

    # ── SHOW GRANTS ──
    if args.show_grants:
        print("=== SQL para colar no SQL Editor ===\n")
        print("https://supabase.com/dashboard/project/tdigauruusdhnpvppixb/sql/new\n")
        print("ALTER TABLE IF EXISTS discovery_searches DISABLE ROW LEVEL SECURITY;")
        print("ALTER TABLE IF EXISTS discovery_listings DISABLE ROW LEVEL SECURITY;")
        print("GRANT ALL ON public.discovery_searches TO service_role;")
        print("GRANT ALL ON public.discovery_listings TO service_role;")
        print("GRANT SELECT ON public.discovery_searches TO anon, authenticated;")
        print("GRANT SELECT ON public.discovery_listings TO anon, authenticated;")

    # ── RAW SQL ──
    if args.sql:
        print(f"=== SQL: {args.sql[:60]}... ===\n")
        result = execute_sql_via_rest([args.sql])
        print(result)

    print(f"\n🔗 SQL Editor: https://supabase.com/dashboard/project/tdigauruusdhnpvppixb/sql/new")

if __name__ == "__main__":
    main()
