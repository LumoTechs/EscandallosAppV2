-- Suscripciones Stripe — MVP single-tenant: una fila por usuario.
-- El webhook de Stripe es el único que escribe esta tabla (vía service role).
-- El cliente solo lee la suya por RLS.

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_customer_id text not null,
  stripe_subscription_id text,
  stripe_price_id text,
  plan text check (plan in ('basico','pro','premium')),
  status text not null,
  cancel_at_period_end boolean not null default false,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists subscriptions_user_id_key
  on public.subscriptions(user_id);
create unique index if not exists subscriptions_stripe_subscription_id_key
  on public.subscriptions(stripe_subscription_id)
  where stripe_subscription_id is not null;
create index if not exists subscriptions_stripe_customer_idx
  on public.subscriptions(stripe_customer_id);

alter table public.subscriptions enable row level security;

drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own"
  on public.subscriptions for select
  to authenticated
  using (auth.uid() = user_id);

create or replace function public.touch_subscriptions_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_subscriptions_updated_at on public.subscriptions;
create trigger trg_subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.touch_subscriptions_updated_at();
