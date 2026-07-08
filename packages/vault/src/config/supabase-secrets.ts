// adsentice · loader seguro das creds Supabase. FONTE ÚNICA: o arquivo em self-essentials (fora do git · nunca copiado
// pro repo). Extrai só o que o cofre precisa (URL + service/secret key) · NUNCA loga valor. O path vem de env
// (SUPABASE_ENV_FILE) pra não hardcodar segredo nem caminho de máquina no código versionado.

import { readFileSync } from "node:fs";

export interface SupabaseSecrets {
  url: string;        // https://<project-id>.supabase.co
  secretKey: string;  // sb_secret_... (server-side · bypassa RLS) OU o service_role JWT legado
}

/** Lê o arquivo de creds (formato `chave: valor`, tolerante a hífen/maiúsc). Extrai project-id + secret-key. */
export function loadSupabaseSecrets(file = process.env.SUPABASE_ENV_FILE): SupabaseSecrets {
  if (!file) throw new Error("loadSupabaseSecrets: defina SUPABASE_ENV_FILE (path do .env.SUPABASE em self-essentials)");
  const text = readFileSync(file, "utf-8");

  const pick = (names: string[]): string | undefined => {
    for (const raw of text.split(/\r?\n/)) {
      const m = raw.match(/^\s*([A-Za-z0-9_-]+)\s*[:=]\s*(.+?)\s*$/);
      if (!m) continue;
      const key = m[1].toLowerCase().replace(/[_-]/g, "");
      if (names.includes(key) && m[2]) return m[2].trim();
    }
    return undefined;
  };

  const projectId = pick(["projectid"]);
  // preferimos a nova secret key (sb_secret_...); se faltar, o service_role legado.
  const secretKey = pick(["secretkey"]) ?? pick(["servicerolesecret", "servicerole"]);

  if (!projectId) throw new Error("loadSupabaseSecrets: PROJECT-ID não encontrado no arquivo");
  if (!secretKey) throw new Error("loadSupabaseSecrets: SECRET-KEY / service_role não encontrado no arquivo");

  // se o arquivo já trouxer uma URL data-api explícita, respeita; senão monta do project-id.
  const explicitUrl = pick(["url", "supabaseurl", "restfulldataapi", "dataapi"]);
  const url = explicitUrl && /^https?:\/\//.test(explicitUrl)
    ? explicitUrl.replace(/\/+$/, "")
    : `https://${projectId}.supabase.co`;

  return { url, secretKey };
}
