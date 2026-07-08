// adsentice · vault — tipos do cofre (o OURO das queries DataForSEO)

/** O que o chamador (a Camada 1 EVO-API/rsxt) entrega pro cofre depois de executar uma query. */
export interface VaultInput {
  tenantId: string;            // o cliente do adsentice · 'global' p/ histórico não-tenant
  capabilityId: string;        // ex: 'gmb.profile.rich'
  inputHash: string;           // blake3 do input canônico (a "pergunta")
  raw: unknown;                // a RESPOSTA CRUA do provider (JSON) — vira o blob imutável no R2
  parsed: Record<string, unknown>; // os campos extraídos (ex: os 66 do GMB) — pro score/consulta
  costUsd?: number;            // custo medido (default 0)
  provider?: string;           // default 'dataforseo'
  mode?: "live" | "sandbox";   // default 'live'
  status?: "ok" | "error" | "partial";
}

/** A linha durável gravada na série (Postgres). Reflete query_vault. */
export interface VaultRecord {
  id: string;
  tenantId: string;
  capabilityId: string;
  inputHash: string;
  blake3: string;              // a ref pro blob no R2
  parsed: Record<string, unknown>;
  costUsd: number;
  provider: string;
  mode: "live" | "sandbox";
  status: "ok" | "error" | "partial";
  ranAt: string;               // ISO
  /** true = o blob já existia no R2 (dedup · não pagou/gravou 2×). */
  blobDeduped: boolean;
}
