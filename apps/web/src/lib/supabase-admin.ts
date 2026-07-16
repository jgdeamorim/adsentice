// ══════════════════════════════════════════════════════════════════
// ADSENTICE · Supabase Admin Client — substitui pg Pool (porta 6543 bloqueada)
// Usa @supabase/supabase-js com service_role key (HTTPS/443).
// Suporta: .from().select(), .rpc(), .auth.admin
// medido=verdade · 2026-07-15
// ══════════════════════════════════════════════════════════════════

import "server-only"
import { createClient } from "@supabase/supabase-js"

const SFX = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tdigauruusdhnpvppixb.supabase.co"
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

let _admin: any = null

export function getAdminClient() {
  if (_admin) return _admin
  if (!KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY missing")
  _admin = createClient(SFX, KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: "public" },
  })
  return _admin
}
