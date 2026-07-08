// adsentice · vault/impl — R2BlobStore: o armazém de BLOBS crus imutáveis (Cloudflare R2 · S3-compat · egress zero).
// Implementa BlobStore. Dedup por chave (blake3) + conditional-put (If-None-Match) = nunca sobrescreve o ouro.

import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import type { BlobStore } from "../stores.js";

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

export class R2BlobStore implements BlobStore {
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(cfg: R2Config) {
    this.bucket = cfg.bucket;
    this.s3 = new S3Client({
      region: "auto",
      endpoint: `https://${cfg.accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
    });
  }

  /** Lê a config do ambiente (Railway/Cloudflare). Lança se faltar — fail-closed. */
  static fromEnv(env: NodeJS.ProcessEnv = process.env): R2BlobStore {
    const need = (k: string): string => {
      const v = env[k];
      if (!v) throw new Error(`R2BlobStore: falta a env ${k}`);
      return v;
    };
    return new R2BlobStore({
      accountId: need("R2_ACCOUNT_ID"),
      accessKeyId: need("R2_ACCESS_KEY_ID"),
      secretAccessKey: need("R2_SECRET_ACCESS_KEY"),
      bucket: need("R2_BUCKET"),
    });
  }

  async has(key: string): Promise<boolean> {
    try {
      await this.s3.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return true;
    } catch (e) {
      if (isNotFound(e)) return false;
      throw e;
    }
  }

  async put(key: string, body: string, _opts?: { immutable?: boolean }): Promise<void> {
    try {
      // If-None-Match: "*" → só cria se NÃO existe (imutável · o ouro nunca é sobrescrito · dedup à prova de corrida).
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: body,
          ContentType: "application/json",
          IfNoneMatch: "*",
        }),
      );
    } catch (e) {
      // 412 PreconditionFailed = já existe (outra corrida gravou) → tratamos como sucesso (dedup).
      if (isPreconditionFailed(e)) return;
      throw e;
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      const res = await this.s3.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
      return (await res.Body?.transformToString()) ?? null;
    } catch (e) {
      if (isNotFound(e)) return null;
      throw e;
    }
  }
}

function statusCode(e: unknown): number | undefined {
  const meta = (e as { $metadata?: { httpStatusCode?: number } })?.$metadata;
  return meta?.httpStatusCode;
}
function isNotFound(e: unknown): boolean {
  const name = (e as { name?: string })?.name;
  return name === "NotFound" || name === "NoSuchKey" || statusCode(e) === 404;
}
function isPreconditionFailed(e: unknown): boolean {
  const name = (e as { name?: string })?.name;
  return name === "PreconditionFailed" || statusCode(e) === 412;
}
