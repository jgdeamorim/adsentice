// adsentice · vault — prova da invariante (node:test). Stores em memória · determinístico · $0.
// Prova: ① blob ANTES da ② série · dedup do blob · série append-only · ③ índice NÃO é tocado pelo vaultPut.

import assert from "node:assert/strict";
import { test } from "node:test";
import type { BlobStore, SeriesStore } from "./stores.js";
import { blake3Hex, canonicalJson, vaultPut } from "./vault.js";

const trace: string[] = [];

class MemBlob implements BlobStore {
  store = new Map<string, string>();
  async has(k: string) { trace.push(`blob.has:${k.slice(0, 12)}`); return this.store.has(k); }
  async put(k: string, b: string) { trace.push(`blob.put:${k.slice(0, 12)}`); this.store.set(k, b); }
  async get(k: string) { return this.store.get(k) ?? null; }
}
class MemSeries implements SeriesStore {
  rows: unknown[] = [];
  async append(row: object) { trace.push("series.append"); const id = `id_${this.rows.length}`; this.rows.push({ id, ...row }); return { id, ranAt: "2026-07-08T00:00:00Z" }; }
}

const input = {
  tenantId: "lurocha", capabilityId: "gmb.profile.rich", inputHash: "in_abc",
  raw: { title: "LuRocha Contabilidade", rating: 3.8, is_claimed: false },
  parsed: { title: "LuRocha Contabilidade", rating: 3.8 }, costUsd: 0.02,
};

test("write-ahead: blob ANTES da série · índice não é tocado", async () => {
  trace.length = 0;
  const blob = new MemBlob(); const series = new MemSeries();
  const rec = await vaultPut(input, { blob, series });

  // ordem: has → put → append (blob durável ANTES da série)
  assert.deepEqual(trace, [
    `blob.has:${(`raw/${blake3Hex(canonicalJson(input.raw))}.json`).slice(0, 12)}`,
    `blob.put:${(`raw/${blake3Hex(canonicalJson(input.raw))}.json`).slice(0, 12)}`,
    "series.append",
  ]);
  assert.equal(series.rows.length, 1);
  assert.equal(rec.blobDeduped, false);
  assert.equal(rec.blake3, blake3Hex(canonicalJson(input.raw)));
});

test("dedup: 2ª gravação do MESMO conteúdo não regrava o blob (não paga 2×), mas a série CRESCE (hold-trading)", async () => {
  const blob = new MemBlob(); const series = new MemSeries();
  await vaultPut(input, { blob, series });
  const rec2 = await vaultPut(input, { blob, series });   // mesma resposta, tempo depois
  assert.equal(blob.store.size, 1, "1 blob só (dedup por blake3)");
  assert.equal(series.rows.length, 2, "2 linhas de série (o ouro temporal cresce)");
  assert.equal(rec2.blobDeduped, true);
});

test("se a série falhar, o índice NUNCA foi tocado (o ouro do blob fica recuperável)", async () => {
  const blob = new MemBlob();
  const failing: SeriesStore = { async append() { throw new Error("db down"); } };
  await assert.rejects(() => vaultPut(input, { blob, series: failing }), /db down/);
  assert.equal(blob.store.size, 1, "o blob durável já foi salvo antes da falha (recuperável)");
});
