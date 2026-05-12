-- Registro de aceptación de políticas por usuario.
-- Se exige aceptación explícita de privacidad, términos y aviso legal.

create table if not exists public.legal_acceptances (
  user_id uuid primary key references auth.users(id) on delete cascade,
  privacy_accepted boolean not null default false,
  terms_accepted boolean not null default false,
  legal_notice_accepted boolean not null default false,
  policies_version text not null default '2025-04-22',
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.legal_acceptances enable row level security;

drop policy if exists "legal_acceptances_select_own" on public.legal_acceptances;
create policy "legal_acceptances_select_own"
  on public.legal_acceptances for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "legal_acceptances_insert_own" on public.legal_acceptances;
create policy "legal_acceptances_insert_own"
  on public.legal_acceptances for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "legal_acceptances_update_own" on public.legal_acceptances;
create policy "legal_acceptances_update_own"
  on public.legal_acceptances for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.touch_legal_acceptances_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_legal_acceptances_updated_at on public.legal_acceptances;
create trigger trg_legal_acceptances_updated_at
  before update on public.legal_acceptances
  for each row execute function public.touch_legal_acceptances_updated_at();
