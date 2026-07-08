-- adsentice · Cofre (Vault) — a SÉRIE durável das queries DataForSEO já pagas (o OURO)
-- Sistema de Registro (fonte da verdade) · NUNCA o índice frágil. Supabase/Postgres.
-- Regra: APPEND-ONLY (hold-trading · nunca UPDATE destrutivo) · RLS por tenant (o "container de segurança").
-- O blob CRU vive no R2 (r2://vault/raw/<blake3>.json) · aqui só metadados + o parseado + a ref blake3.

create extension if not exists "pgcrypto";        -- gen_random_uuid()

create table if not exists query_vault (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     text not null,                    -- o cliente do adsentice · 'global' p/ histórico não-tenant
  capability_id text not null,                    -- ex: 'gmb.profile.rich', 'reviews.google'
  input_hash    text not null,                    -- blake3 do INPUT canônico (mesma pergunta → mesmo hash)
  blake3        text not null,                    -- blake3 da RESPOSTA crua → a chave do blob no R2
  parsed        jsonb not null default '{}',      -- os campos extraídos (ex: os 66 do GMB) · pro score/consulta
  cost_usd      numeric(12,6) not null default 0, -- quanto essa query custou (medido · vira ROI)
  provider      text not null default 'dataforseo',
  mode          text not null default 'live',     -- 'live' | 'sandbox'
  status        text not null default 'ok',       -- 'ok' | 'error' | 'partial'
  ran_at        timestamptz not null default now()
);

-- APPEND-ONLY: sem UPDATE/DELETE em uso normal. A série CRESCE (o mesmo negócio ao longo do tempo = ouro temporal).
-- índices pra as 3 leituras quentes: por tenant, por capability, por tempo (a série), e por blob (dedup/rebuild do índice).
create index if not exists idx_qv_tenant_cap_time on query_vault (tenant_id, capability_id, ran_at desc);
create index if not exists idx_qv_input           on query_vault (capability_id, input_hash, ran_at desc);
create index if not exists idx_qv_blake3          on query_vault (blake3);

-- RLS (o container de segurança por tenant · isolamento nativo do Postgres/Supabase)
alter table query_vault enable row level security;

-- o service role (o backend Railway · write-ahead) escreve tudo; o tenant só LÊ o que é dele. (idempotente)
drop policy if exists qv_service_all on query_vault;
create policy qv_service_all on query_vault
  for all to service_role using (true) with check (true);
drop policy if exists qv_tenant_read on query_vault;
create policy qv_tenant_read on query_vault
  for select to authenticated using (tenant_id = (auth.jwt() ->> 'tenant_id'));

-- guarda dura contra o pecado destrutivo: bloqueia UPDATE/DELETE (o ouro é imutável · só append).
create or replace function forbid_mutation() returns trigger language plpgsql as $$
begin
  raise exception 'query_vault é APPEND-ONLY (hold-trading) — UPDATE/DELETE proibido (o ouro não se sobrescreve)';
end $$;
drop trigger if exists no_mutation on query_vault;
create trigger no_mutation before update or delete on query_vault
  for each row execute function forbid_mutation();

-- GRANTS explícitos (o "auto-expose new tables" está DESLIGADO de propósito — o ouro não fica público por acidente).
-- service_role (o backend Railway · bypassa RLS) escreve+lê; authenticated (tenant) só lê (a RLS limita as linhas);
-- anon NÃO recebe nada (o cofre nunca é público). PostgREST precisa do grant além da policy.
grant usage on schema public to service_role, authenticated;
grant insert, select on query_vault to service_role;
grant select on query_vault to authenticated;
-- recarrega o cache do PostgREST (a Data API passa a enxergar a tabela nova imediatamente).
notify pgrst, 'reload schema';
