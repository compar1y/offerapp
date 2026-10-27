-- REFERÊNCIA OPCIONAL. O app NÃO usa Supabase na fase 1 (o servidor usa a interface KV em server/kv.ts).
-- Fica aqui só para o caso de migrar para Postgres no futuro. Não rode nada sem decidir isso.

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  created_at timestamptz not null default now()
);

create table if not exists purchases (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  order_id text not null,                       -- payment.id da Wiapy (ou manual-/csv-)
  plan text,                                    -- basico | completo-1790 | completo-2290 | completo-3790
  bump boolean not null default false,
  upsell boolean not null default false,
  status text not null check (status in ('pending','paid','refunded','chargeback','declined')),
  source text not null check (source in ('wiapy','manual','csv')),
  amount_cents integer,
  checkout_id text,
  needs_review boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id)
);

-- direitos = compras com status 'paid' (view; o mapa plano -> itens fica em shared/catalog.ts)
create table if not exists entitlements (
  customer_id uuid not null references customers(id) on delete cascade,
  item_id text not null,
  purchase_id uuid not null references purchases(id) on delete cascade,
  primary key (customer_id, item_id, purchase_id)
);

create table if not exists events (
  id bigserial primary key,
  name text not null,                           -- purchase.paid, feedback.dificuldade, auth.login...
  origin text not null,                         -- wiapy:checkout:<id> | manual | csv | app
  email text,
  order_id text,
  props jsonb,
  created_at timestamptz not null default now()
);

alter table customers enable row level security;
alter table purchases enable row level security;
alter table entitlements enable row level security;
alter table events enable row level security;
-- sem policies: só a service role (servidor) lê e escreve. O navegador nunca fala direto com o banco.
