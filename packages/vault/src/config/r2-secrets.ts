// adsentice · loader seguro das creds R2 (Cloudflare). FONTE ÚNICA: o arquivo em self-essentials (fora do git).
// Extrai account-id + access-key-id + secret + bucket · NUNCA loga valor. Path via CLOUDFLARE_ENV_FILE.
// ⚠️ O R2BlobStore usa a API S3 → precisa de Access Key ID + Secret Access Key (um "R2 API Token" tipo S3),
// NÃO o API Token bearer da Cloudflare (que só gerencia buckets).

import { readFileSync } from "node:fs";
import type { R2Config } from "../impl/r2-blob-store.js";

export function loadR2Config(file = process.env.CLOUDFLARE_ENV_FILE): R2Config {
  if (!file) throw new Error("loadR2Config: defina CLOUDFLARE_ENV_FILE (path do .env.CLOUDFLARE em self-essentials)");
  const text = readFileSync(file, "utf-8");
  const pick = (names: string[]): string | undefined => {
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z0-9_.-]+)\s*[:=]\s*(.+?)\s*$/);
      if (!m) continue;
      const key = m[1].toLowerCase().replace(/[_.-]/g, "");
      if (names.includes(key) && m[2]) return m[2].trim();
    }
    return undefined;
  };

  const accountId = pick(["accountid", "r2accountid"]);
  const accessKeyId = pick(["r2accesskeyid", "accesskeyid"]);
  const secretAccessKey = pick(["r2secretaccesskey", "secretaccesskey"]);
  const bucket = pick(["r2bucket", "bucket"]) ?? "adsentice-vault";

  if (!accountId) throw new Error("loadR2Config: ACCOUNT-ID não encontrado");
  if (!accessKeyId) throw new Error("loadR2Config: R2_ACCESS_KEY_ID não encontrado (gere um R2 API Token tipo S3)");
  if (!secretAccessKey) throw new Error("loadR2Config: R2_SECRET_ACCESS_KEY não encontrado (gere um R2 API Token tipo S3)");

  return { accountId, accessKeyId, secretAccessKey, bucket };
}
