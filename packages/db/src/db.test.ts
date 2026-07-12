// ══════════════════════════════════════════════════════════════════
// @adsentice/db — Testes (6 testes · $0 · sem infra externa)
// node --import tsx --test packages/db/src/db.test.ts
// ══════════════════════════════════════════════════════════════════

import assert from "node:assert/strict"
import { test } from "node:test"
import { createDb, resetDb } from "./client"
import type { DbClient } from "./types"

let db: DbClient

test("DB · init — dev mode, all in-memory", async () => {
  resetDb()
  db = createDb("dev")
  const health = await db.health()
  assert.equal(health.env, "dev")
  assert.equal(health.blob, "memory")
  assert.equal(health.series, "memory")
  assert.equal(health.cache, "memory")
  assert.equal(health.search, "memory")
})

test("DB · blob — put, has, get, dedup", async () => {
  const key = "raw/test.json"
  assert.equal(await db.blob.has(key), false)
  await db.blob.put(key, JSON.stringify({ hello: "world" }))
  assert.equal(await db.blob.has(key), true)

  const body = await db.blob.get(key)
  assert.ok(body)
  assert.equal(JSON.parse(body!).hello, "world")

  // Dedup: segunda gravação do mesmo conteúdo não sobrescreve
  await db.blob.put(key, "diferente")
  const body2 = await db.blob.get(key)
  assert.equal(body2, JSON.stringify({ hello: "world" })) // imutável
})

test("DB · series — append + query", async () => {
  const { id, ranAt } = await db.series.append({
    tenantId: "clinica-x",
    capabilityId: "seo.discovery",
    inputHash: "hash_abc",
    blake3: "blake3_abc",
    parsed: { keywords: 23 },
    costUsd: 0.02,
    provider: "dataforseo",
    mode: "live",
    status: "ok",
  })
  assert.ok(id)
  assert.ok(ranAt)

  const rows = await db.series.query({ tenantId: "clinica-x" })
  assert.equal(rows.length, 1)
  assert.equal(rows[0].capabilityId, "seo.discovery")
})

test("DB · cache — set, get, TTL, hit rate", async () => {
  await db.cache.set("diagnostic:clinica.com", { score: 72, cards: [] })
  const cached = await db.cache.get<{ score: number }>("diagnostic:clinica.com")
  assert.ok(cached)
  assert.equal(cached!.score, 72)

  // Cache miss
  assert.equal(await db.cache.get("never:cached"), null)

  // Stats
  const { hitRate } = await db.cache.stats()
  assert.ok(hitRate > 0)
})

test("DB · search — keyword + upsert", async () => {
  await db.search.upsert([
    {
      id: "doc-1",
      vector: [],
      payload: { text: "SEO local para clínicas em São Paulo", source: "spec", kind: "doc" },
    },
    {
      id: "doc-2",
      vector: [],
      payload: { text: "Google Meu Negócio e reputação online", source: "spec", kind: "doc" },
    },
    {
      id: "doc-3",
      vector: [],
      payload: { text: "Performance e Lighthouse audit", source: "spec", kind: "doc" },
    },
  ])

  assert.equal(await db.search.count(), 3)

  const results = await db.search.search("SEO clínicas São Paulo")
  assert.ok(results.length > 0)
  assert.equal(results[0].source, "spec")
})

test("DB · leads — upsert, find, list, stage pipeline", async () => {
  await db.leads.upsert({
    domain: "esteticasp.com.br",
    businessName: "Estética SP",
    stage: 3,
    score: 72,
    priority: "hot",
  })
  await db.leads.upsert({
    domain: "dentistasp.com.br",
    businessName: "Dentista SP",
    stage: 1,
    score: 45,
    priority: "cold",
  })

  const lead = await db.leads.find("esteticasp.com.br")
  assert.ok(lead)
  assert.equal(lead!.stage, 3)
  assert.equal(lead!.priority, "hot")

  const hot = await db.leads.list({ priority: "hot" })
  assert.equal(hot.length, 1)

  const stage1 = await db.leads.list({ stage: 1 })
  assert.equal(stage1.length, 1)

  // Update stage (S3 → S5)
  await db.leads.updateStage("esteticasp.com.br", 5)
  const updated = await db.leads.find("esteticasp.com.br")
  assert.equal(updated!.stage, 5)
})
