// ══════════════════════════════════════════════════════════════════
// ADSENTICE · DB Blob Store — Dev (in-memory) · Prod (Cloudflare R2)
// ══════════════════════════════════════════════════════════════════

import type { BlobStore } from "./types"

// ── In-Memory (dev) ──────────────────────────────────────────

export class MemBlobStore implements BlobStore {
  private store = new Map<string, string>()

  async has(key: string): Promise<boolean> {
    return this.store.has(key)
  }

  async put(key: string, body: string): Promise<void> {
    if (!this.store.has(key)) {
      this.store.set(key, body)
    }
  }

  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null
  }

  get size(): number {
    return this.store.size
  }
}

// ── Factory ──────────────────────────────────────────────────

export function createBlobStore(env: "dev" | "prod", config?: Record<string, string>): BlobStore {
  if (env === "dev") {
    return new MemBlobStore()
  }

  // Prod: Cloudflare R2 via S3-compatible API
  try {
    const { R2BlobStore } = require("@adsentice/vault/src/impl/r2-blob-store") as typeof import("@adsentice/vault/src/impl/r2-blob-store")
    return new R2BlobStore({
      accountId: config?.R2_ACCOUNT_ID || process.env.R2_ACCOUNT_ID || "",
      accessKeyId: config?.R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID || "",
      secretAccessKey: config?.R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY || "",
      bucket: config?.R2_BUCKET || process.env.R2_BUCKET || "adsentice",
    })
  } catch {
    console.warn("[adsentice-db] R2 config ausente — usando storage em memória (dev mode)")
    return new MemBlobStore()
  }
}
