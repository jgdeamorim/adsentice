-- adsentice · profiles — a fonte de gestão de user→tenant→role (espelha o app_metadata do JWT).
-- app_metadata (no auth.users) é a VERDADE pro JWT/RLS (servidor · imutável pelo user); profiles é a visão gerenciável.
-- Supabase/Postgres.

create table if not exists profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  tenant_id  text not null default 'adsentice',
  role       text not null default 'client' check (role in ('admin', 'client')),
  full_name  text,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

-- o próprio usuário lê o seu profile; admin lê todos.
drop policy if exists profiles_read on profiles;
create policy profiles_read on profiles
  for select to authenticated using (
    id = auth.uid() or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- só o service_role (o backend) escreve; anon nada.
grant usage on schema public to service_role, authenticated;
grant select on profiles to authenticated;
grant all on profiles to service_role;

-- TRIGGER: ao criar um usuário no auth, cria o profile espelhando o app_metadata (role/tenant) — signup vira profile.
create or replace function handle_new_user()
  returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, tenant_id, role, full_name)
  values (
    new.id,
    coalesce(new.raw_app_meta_data ->> 'tenant_id', 'adsentice'),
    coalesce(new.raw_app_meta_data ->> 'role', 'client'),
    new.raw_user_meta_data ->> 'full_name'
  )
  on conflict (id) do update
    set tenant_id = excluded.tenant_id, role = excluded.role, full_name = excluded.full_name;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

notify pgrst, 'reload schema';
