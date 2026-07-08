// adsentice · e2e do CapabilityExecutor + porta REST + GMB rico. Fixture GMB no shape MEDIDO (envelope DataForSEO).
// Prova: executa → traduz os 39 campos → vault.put (ouro) → REST 200 com o parsed rico.

import assert from "node:assert/strict";
import { test } from "node:test";
import type { BlobStore, SeriesStore } from "../stores.js";
import { translators } from "../translators.js";
import { CapabilityExecutor, type ProviderPort } from "./capability-executor.js";
import { handleCapabilityRest } from "./rest.js";

// fixture no shape REAL (envelope tasks[].result[].items[]) — LuRocha-like, ficha não reivindicada = lead quente
const GMB_RAW = {
  tasks: [{ result: [{ items: [{
    type: "maps_search",
    title: "LuRocha Contabilidade",
    category: "Contador",
    additional_categories: ["Consultoria tributária"],
    description: null,
    url: "https://lurocha.com.br",
    domain: "lurocha.com.br",
    phone: "+55 51 99999-9999",
    book_online_url: null,
    total_photos: 2,
    main_image: "https://img/main.jpg",
    logo: null,
    address: "Rua X, 100, Porto Alegre",
    address_info: { city: "Porto Alegre", zip: "90000-000", region: "RS", country_code: "BR" },
    latitude: -30.03, longitude: -51.23,
    is_claimed: false,
    rating: { rating_type: "Max5", value: 3.8, votes_count: 12, rating_max: 5 },
    rating_distribution: { "1": 2, "2": 1, "3": 1, "4": 3, "5": 5 },
    place_topics: { atendimento: 8, preço: 3 },
    attributes: { available_attributes: { service_options: ["online_appointments"] } },
    place_id: "ChIJxxxx", cid: "123", feature_id: "0x0:0x0",
  }] }] }],
};

class MemBlob implements BlobStore {
  store = new Map<string, string>();
  async has(k: string) { return this.store.has(k); }
  async put(k: string, b: string) { this.store.set(k, b); }
  async get(k: string) { return this.store.get(k) ?? null; }
}
class MemSeries implements SeriesStore {
  rows: any[] = [];
  async append(row: object) { const id = `id_${this.rows.length}`; this.rows.push({ id, ...row }); return { id, ranAt: "2026-07-08T00:00:00Z" }; }
}
const fakeProvider: ProviderPort = {
  async execute() { return { raw: GMB_RAW, costUsd: 0.02, mode: "live" as const, status: "ok" as const }; },
};

test("executor GMB rico: traduz os 39 campos + grava o ouro (write-ahead)", async () => {
  const blob = new MemBlob(); const series = new MemSeries();
  const executor = new CapabilityExecutor({ provider: fakeProvider, stores: { blob, series }, translators });

  const { parsed, record } = await executor.execute({
    tenantId: "lurocha", capabilityId: "gmb.profile.rich", input: { place_id: "ChIJxxxx" },
  });

  // os campos RICOS que os 10 fininhos NÃO tinham:
  assert.equal(parsed.url, "https://lurocha.com.br", "website (url) — antes não existia");
  assert.equal(parsed.total_photos, 2, "fotos");
  assert.equal((parsed.rating as any).value, 3.8);
  assert.equal((parsed.rating as any).votes_count, 12);
  assert.equal(parsed.is_claimed, false, "não reivindicada = lead quente");
  assert.deepEqual(parsed.place_topics, { atendimento: 8, preço: 3 });
  assert.equal((parsed.address_info as any).city, "Porto Alegre");
  assert.ok(parsed.attributes, "attributes (delivery/serviços) presente");
  assert.deepEqual(parsed.additional_categories, ["Consultoria tributária"]);

  // o OURO foi gravado (blob + série)
  assert.equal(blob.store.size, 1, "blob cru no cofre");
  assert.equal(series.rows.length, 1, "série no cofre");
  assert.ok(record.blake3.length > 0);
});

test("porta REST: 200 com o parsed rico + ponteiro pro ouro (blake3)", async () => {
  const blob = new MemBlob(); const series = new MemSeries();
  const executor = new CapabilityExecutor({ provider: fakeProvider, stores: { blob, series }, translators });

  const res = await handleCapabilityRest(
    { tenantId: "lurocha", capabilityId: "gmb.profile.rich", input: { place_id: "ChIJxxxx" } },
    executor,
  );
  assert.equal(res.status, 200);
  const b = res.body as any;
  assert.equal(b.capabilityId, "gmb.profile.rich");
  assert.equal(b.parsed.title, "LuRocha Contabilidade");
  assert.ok(b.blake3, "devolve o ponteiro pro ouro (não o cru inteiro)");
});

test("porta REST: 400 sem tenantId", async () => {
  const executor = new CapabilityExecutor({ provider: fakeProvider, stores: { blob: new MemBlob(), series: new MemSeries() }, translators });
  const res = await handleCapabilityRest({ capabilityId: "gmb.profile.rich", input: {} }, executor);
  assert.equal(res.status, 400);
});
