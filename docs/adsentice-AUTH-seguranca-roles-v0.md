# adsentice · Login, Autenticação, Segurança e Roles (admin/client) — análise v0

> Análise profunda da tela de login e do modelo de auth/segurança/roles. Aterrado no que já codamos (Supabase Auth +
> middleware + Materio) e nas melhores práticas Supabase/Next. Inclui 1 **bug de segurança real** achado e corrigido.

## 1. Autenticação (métodos + sessão)

- **Métodos:** email/senha + **Google OAuth** (Supabase). Já wired no `Login.tsx` (`signInWithPassword` + `signInWithOAuth`).
- **Sessão:** cookies `@supabase/ssr` (httpOnly · secure · sameSite) — o **middleware refaz a sessão a cada request**.
- **Regra de ouro (já aplicada):** decisões de auth no server usam **`supabase.auth.getUser()`** (revalida o JWT com o
  Supabase), NUNCA `getSession()` (que confia no cookie sem revalidar). O `getSessionUser` e o middleware usam `getUser` ✓.
- **A ligar (config Supabase · dashboard):** "Confirm email" ON (verificação de email) · rate-limit de login ·
  (opcional futuro) **MFA/TOTP** pro admin.

## 2. Segurança — as camadas (defense in depth)

| camada | o quê | estado |
|---|---|---|
| **Separação de chaves** | browser = ANON/publishable (`sb_publish`) · backend = SECRET/service_role. A secret NUNCA no frontend. | ✅ (o web usa a anon; o cofre/api usa a secret) |
| **RLS por tenant** | toda tabela filtra por `tenant_id` do JWT — o container de isolamento | ⚠️ **bug achado** (ver §4) |
| **Cloudflare (o "pai")** | WAF · rate-limit · bot-protection · API-key gateway na frente | a configurar (infra) |
| **Middleware** | gate de ROTA (redirect login · `/admin` exige role) | ✅ |
| **Defesa em profundidade** | a segurança REAL é a RLS, não o middleware/UI. Nunca confiar só no check de role do client. | princípio |

## 3. Roles (admin/client) — o modelo

**Onde guardar o role: `app_metadata` (NÃO `user_metadata`).**
- `app_metadata` = controlado pelo SERVIDOR · o usuário **não consegue alterar** → seguro pra role/tenant.
- `user_metadata` = editável pelo próprio usuário → **NUNCA** guardar role aí (escalonamento de privilégio).
- O nosso código lê `user.app_metadata.role` + `.tenant_id` ✓.

**Como SETAR o role + tenant_id:**
- **v0 (simples):** o admin cria o usuário e seta via **admin API** (service_role):
  `supabase.auth.admin.updateUserById(id, { app_metadata: { role, tenant_id } })`.
- **Escala (recomendado depois):** uma tabela **`profiles`** (`user_id → tenant_id, role`) como fonte de verdade +
  um **Custom Access Token Hook** (Auth Hook) que injeta `role`+`tenant_id` no JWT a cada emissão. Desacopla a gestão
  de role do `auth.users` e mantém o claim fresco.

**Modelo multi-tenant:**
- **admin** (adsentice) = cross-tenant · vê tudo · gerencia o engine.
- **client** (tenant) = pertence a UM tenant (v0: `app_metadata.tenant_id`) · vê só os seus leads/relatórios.
- Futuro: tabela `memberships` se um usuário puder acessar vários tenants.

**O fluxo do role:** login → JWT com `app_metadata.{role,tenant_id}` → **middleware** (gate de rota) + **RLS** (gate de
dado) + **UI** (mostra/esconde admin). Pós-login: redirect por role (admin → `/admin` · client → o dashboard).

## 4. 🔴 O BUG de segurança achado (e corrigido)

No `query_vault` (schema.sql) a policy RLS lia `auth.jwt() ->> 'tenant_id'` (**nível topo do JWT**) — mas o `tenant_id`
vive em **`app_metadata`**. O caminho certo é `auth.jwt() -> 'app_metadata' ->> 'tenant_id'`. Do jeito errado, o filtro
por tenant retornava NULL → **um client não veria os próprios dados** (ou pior, o filtro não isolaria). Corrigido no
`schema.sql` (a leitura do tenant e um gate de admin explícito).

## 5. Próximos passos concretos (a ordem)

1. **Corrigir a RLS do `query_vault`** (o path do tenant_id) + re-migrar. [feito neste arco]
2. **Tabela `profiles`** (user_id · tenant_id · role · nome) + trigger de signup (role=client default · tenant via convite).
3. **Custom Access Token Hook** (role+tenant → JWT) — o caminho limpo de escala.
4. **Pós-login redirect por role** no `Login.tsx`/callback (admin → `/admin` · client → dashboard).
5. **Seed do 1º admin** (nós) via admin API + criar 1 tenant `adsentice` + 1 client de teste.
6. **Cloudflare** na frente (quando for pro ar): WAF + rate-limit + o gateway.
