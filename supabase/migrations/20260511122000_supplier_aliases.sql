-- Aliases manuales para unificación de proveedores.
-- Permite mapear variantes de nombre a un proveedor canónico.

create table if not exists public.supplier_aliases (
  alias text primary key,
  canonical text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists supplier_aliases_canonical_idx
  on public.supplier_aliases(canonical);

alter table public.supplier_aliases enable row level security;

drop policy if exists "supplier_aliases_select_authenticated" on public.supplier_aliases;
create policy "supplier_aliases_select_authenticated"
  on public.supplier_aliases for select
  to authenticated
  using (true);

drop policy if exists "supplier_aliases_write_service_role" on public.supplier_aliases;
create policy "supplier_aliases_write_service_role"
  on public.supplier_aliases for all
  to service_role
  using (true)
  with check (true);

create or replace function public.touch_supplier_aliases_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_supplier_aliases_updated_at on public.supplier_aliases;
create trigger trg_supplier_aliases_updated_at
  before update on public.supplier_aliases
  for each row execute function public.touch_supplier_aliases_updated_at();
