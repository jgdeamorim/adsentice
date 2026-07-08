// adsentice · CapabilityExecutor — o PONTO ÚNICO (Camada 1) por onde toda solicitação passa, seja qual for a porta
// (REST · MCP · brain · k0). Executa a capability → traduz o cru → vault.put (write-ahead: OURO antes do índice).
// O índice (③) é DOWNSTREAM opcional — nunca bloqueia o cofre.

import type { DerivedIndex, BlobStore, SeriesStore } from "../stores.js";
import type { VaultRecord } from "../types.js";
import { blake3Hex, canonicalJson, vaultPut } from "../vault.js";

/** A porta pro provider (a Camada 1 EVO-API/rsxt containerizada OU o DataForSEO direto). Só executa e devolve o cru. */
export interface ProviderPort {
  execute(
    capabilityId: string,
    input: Record<string, unknown>,
  ): Promise<{ raw: unknown; costUsd: number; mode: "live" | "sandbox"; status?: "ok" | "error" | "partial" }>;
}

/** Um translator: cru do provider → o parseado canônico (ex: o GMB rico dos 39 campos). */
export type Translator = (raw: unknown) => Record<string, unknown>;

export interface ExecuteRequest {
  tenantId: string;
  capabilityId: string;
  input: Record<string, unknown>;
}

export interface ExecuteResult {
  record: VaultRecord;
  parsed: Record<string, unknown>;
  indexed: boolean;
}

export interface ExecutorDeps {
  provider: ProviderPort;
  stores: { blob: BlobStore; series: SeriesStore };
  translators: Record<string, Translator>; // capabilityId → translator
  index?: DerivedIndex;                     // opcional · downstream · pode falhar sem risco
}

export class CapabilityExecutor {
  constructor(private readonly deps: ExecutorDeps) {}

  async execute(req: ExecuteRequest): Promise<ExecuteResult> {
    const inputHash = blake3Hex(canonicalJson(req.input));

    // 1) executa no provider (cost-gate/Evidence vivem na Camada 1) → cru
    const out = await this.deps.provider.execute(req.capabilityId, req.input);

    // 2) traduz o cru → parseado (o translator registrado · ex GMB rico). Sem translator = parsed vazio (mas o cru é salvo).
    const translate = this.deps.translators[req.capabilityId];
    const parsed = translate ? translate(out.raw) : {};

    // 3) WRITE-AHEAD: grava o OURO (blob R2 + série Postgres) ANTES de qualquer índice.
    const record = await vaultPut(
      {
        tenantId: req.tenantId,
        capabilityId: req.capabilityId,
        inputHash,
        raw: out.raw,
        parsed,
        costUsd: out.costUsd,
        mode: out.mode,
        status: out.status ?? "ok",
      },
      this.deps.stores,
    );

    // 4) índice DOWNSTREAM (derivado · descartável). Se falhar, o ouro já está salvo — só logamos.
    let indexed = false;
    if (this.deps.index) {
      try {
        await this.deps.index.index(record);
        indexed = true;
      } catch {
        indexed = false; // NUNCA propaga — o índice frágil não derruba a resposta nem perde o ouro.
      }
    }

    return { record, parsed, indexed };
  }
}
