// adsentice · a PORTA REST — framework-agnostic. Recebe {capabilityId, input, tenantId} → CapabilityExecutor → JSON.
// Serve pra Next Route Handler, Hono, Express, etc. (só passa o body). É 1 das 4 portas · todas caem no MESMO executor.

import type { CapabilityExecutor } from "./capability-executor.js";

export interface RestRequestBody {
  tenantId?: string;
  capabilityId?: string;
  input?: Record<string, unknown>;
}

export interface RestResponse {
  status: number;
  body: unknown;
}

/**
 * Trata uma solicitação REST de capability. Valida → executa → devolve o parseado + a ref do cofre.
 * NÃO devolve o cru inteiro (fica no R2); devolve o parsed + blake3 (ponteiro pro ouro).
 */
export async function handleCapabilityRest(
  body: RestRequestBody,
  executor: CapabilityExecutor,
): Promise<RestResponse> {
  const tenantId = body.tenantId?.trim();
  const capabilityId = body.capabilityId?.trim();
  const input = body.input ?? {};

  if (!tenantId) return { status: 400, body: { error: "tenantId obrigatório" } };
  if (!capabilityId) return { status: 400, body: { error: "capabilityId obrigatório" } };
  if (typeof input !== "object" || Array.isArray(input)) {
    return { status: 400, body: { error: "input deve ser objeto" } };
  }

  try {
    const { record, parsed, indexed } = await executor.execute({ tenantId, capabilityId, input });
    return {
      status: 200,
      body: {
        id: record.id,
        capabilityId,
        blake3: record.blake3, // ponteiro pro blob cru no R2 (o ouro)
        blobDeduped: record.blobDeduped,
        costUsd: record.costUsd,
        ranAt: record.ranAt,
        indexed,
        parsed, // o dado rico (ex: os 39 campos do GMB)
      },
    };
  } catch (e) {
    // o executor só falha se o provider ou o COFRE falharam. Se falhou, o ouro NÃO foi corrompido (write-ahead).
    return { status: 502, body: { error: "falha na execução/cofre", detail: (e as Error).message } };
  }
}
