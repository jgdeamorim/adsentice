// adsentice · vault/impl — SupabaseSeriesStore: a SÉRIE durável append-only (Supabase/Postgres · query_vault).
// Implementa SeriesStore. Usa o SERVICE ROLE (o backend Railway) — escreve; o schema (RLS + trigger) garante
// append-only e isolamento por tenant. Ver schema.sql.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { loadSupabaseSecrets } from "../config/supabase-secrets.js";
import type { SeriesStore } from "../stores.js";
import type { VaultRecord } from "../types.js";

type AppendRow = Omit<VaultRecord, "id" | "ranAt" | "blobDeduped">;

export class SupabaseSeriesStore implements SeriesStore {
  constructor(
    private readonly db: SupabaseClient,
    private readonly table = "query_vault",
  ) {}

  /** Cria do ambiente com o SERVICE ROLE key (nunca o anon key — este escreve). Fail-closed se faltar. */
  static fromEnv(env: NodeJS.ProcessEnv = process.env): SupabaseSeriesStore {
    const url = env.SUPABASE_URL;
    const key = env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url) throw new Error("SupabaseSeriesStore: falta SUPABASE_URL");
    if (!key) throw new Error("SupabaseSeriesStore: falta SUPABASE_SERVICE_ROLE_KEY");
    return new SupabaseSeriesStore(createClient(url, key, { auth: { persistSession: false } }));
  }

  /** Cria a partir do arquivo de creds em self-essentials (SUPABASE_ENV_FILE) — a fonte única fora do git. */
  static fromSecretsFile(file?: string): SupabaseSeriesStore {
    const { url, secretKey } = loadSupabaseSecrets(file);
    return new SupabaseSeriesStore(createClient(url, secretKey, { auth: { persistSession: false } }));
  }

  async append(row: AppendRow): Promise<Pick<VaultRecord, "id" | "ranAt">> {
    const { data, error } = await this.db
      .from(this.table)
      .insert({
        tenant_id: row.tenantId,
        capability_id: row.capabilityId,
        input_hash: row.inputHash,
        blake3: row.blake3,
        parsed: row.parsed,
        cost_usd: row.costUsd,
        provider: row.provider,
        mode: row.mode,
        status: row.status,
      })
      .select("id, ran_at")
      .single();

    if (error) throw new Error(`SupabaseSeriesStore.append: ${error.message}`);
    return { id: data.id as string, ranAt: data.ran_at as string };
  }
}
