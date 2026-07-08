// adsentice · vault — o CONTRATO vault.put() (o write-ahead: OURO antes de índice).
//
// A LEI (o que resolve o medo do founder):
//   ① grava o BLOB cru no R2 (durável · dedup por blake3)  →
//   ② grava a SÉRIE no Postgres (durável · append-only)     →
//   ③ SÓ ENTÃO o chamador indexa (derivado · pode explodir).
// Se ② ou ① falharem, NADA é indexado e o chamador re-tenta. O índice NUNCA vê um dado que o cofre não tem.
// O blake3 é a identidade FÍSICA (dedup); o inode/id da série é a identidade LÓGICA (separadas · a lei nº1).

import { blake3 } from "@noble/hashes/blake3";
import { bytesToHex } from "@noble/hashes/utils";
import type { BlobStore, SeriesStore } from "./stores.js";
import type { VaultInput, VaultRecord } from "./types.js";

/** JSON canônico determinístico (chaves ordenadas) — o mesmo conteúdo → o mesmo blake3 → dedup estável. */
export function canonicalJson(value: unknown): string {
  const seen = new WeakSet();
  const norm = (v: unknown): unknown => {
    if (v === null || typeof v !== "object") return v;
    if (seen.has(v as object)) throw new Error("ciclo em canonicalJson");
    seen.add(v as object);
    if (Array.isArray(v)) return v.map(norm);
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v as Record<string, unknown>).sort()) {
      out[k] = norm((v as Record<string, unknown>)[k]);
    }
    return out;
  };
  return JSON.stringify(norm(value));
}

export function blake3Hex(input: string): string {
  return bytesToHex(blake3(new TextEncoder().encode(input)));
}

/**
 * Grava uma query DataForSEO já paga no COFRE DURÁVEL (write-ahead). Retorna a linha da série.
 * Indexar (③) é responsabilidade SEPARADA do chamador, DEPOIS que isto resolve — nunca antes.
 */
export async function vaultPut(
  input: VaultInput,
  stores: { blob: BlobStore; series: SeriesStore },
): Promise<VaultRecord> {
  const rawCanonical = canonicalJson(input.raw);
  const hash = blake3Hex(rawCanonical);
  const key = `raw/${hash}.json`;

  // ① WRITE-AHEAD · blob durável (R2) · dedup: se já existe, não regrava nem repaga.
  const existed = await stores.blob.has(key);
  if (!existed) {
    await stores.blob.put(key, rawCanonical, { immutable: true });
  }

  // ② WRITE-AHEAD · série durável (Postgres · append-only). Se isto lançar, ① já salvou o blob (recuperável)
  //    e NADA foi indexado — o chamador re-tenta com segurança.
  const provider = input.provider ?? "dataforseo";
  const mode = input.mode ?? "live";
  const status = input.status ?? "ok";
  const { id, ranAt } = await stores.series.append({
    tenantId: input.tenantId,
    capabilityId: input.capabilityId,
    inputHash: input.inputHash,
    blake3: hash,
    parsed: input.parsed,
    costUsd: input.costUsd ?? 0,
    provider,
    mode,
    status,
  });

  // ③ NÃO indexamos aqui. O ouro está seguro. O chamador chama derivedIndex.index(record) depois.
  return {
    id,
    tenantId: input.tenantId,
    capabilityId: input.capabilityId,
    inputHash: input.inputHash,
    blake3: hash,
    parsed: input.parsed,
    costUsd: input.costUsd ?? 0,
    provider,
    mode,
    status,
    ranAt,
    blobDeduped: existed,
  };
}
