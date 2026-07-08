// adsentice · registro de translators (capabilityId → translator). Managed-first: um objeto simples;
// vira Registry/Manifest quando o manager for construído (M-fases). Adicionar capability = registrar aqui.

import type { Translator } from "./executor/capability-executor.js";
import { translateGmbProfile } from "./gmb/translate.js";

export const translators: Record<string, Translator> = {
  "gmb.profile.rich": (raw) => translateGmbProfile(raw) as unknown as Record<string, unknown>,
};
