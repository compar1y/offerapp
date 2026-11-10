-- Banco do App da Fornada. Rodar uma vez no SQL Editor do Supabase.
-- Nenhuma tabela é lida pelo navegador: só o servidor (chave de serviço) acessa. Por isso o RLS fica ligado e sem políticas.

create table if not exists compras (
  id bigint generated always as identity primary key,
  email text not null,
  produto text not null check (produto in ('kit','recheios','encomenda','primeira','videoaulas','etiquetas','contafeita')),
  status text not null check (status in ('pago','pendente','recusado','estornado')),
  pagamento_id text not null,
  checkout_id text,
  valor_centavos integer,
  metodo text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (pagamento_id, produto)
);
create index if not exists compras_email on compras (email);

create table if not exists usuarias (
  email text primary key,
  apelido text,
  avatar smallint,
  perfil text,
  respostas smallint[],
  estado jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now(),
  visto_em timestamptz
);

create table if not exists eventos (
  id bigint generated always as identity primary key,
  email text,
  tipo text not null,
  dados jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);
create index if not exists eventos_tipo on eventos (tipo, criado_em);

-- corpo do webhook sem dados pessoais (só quando WEBHOOK_GUARDAR_BRUTO=1, para conferir o formato real da Wiapy)
create table if not exists webhook_bruto (
  id bigint generated always as identity primary key,
  recebido_em timestamptz not null default now(),
  corpo jsonb
);

alter table compras enable row level security;
alter table usuarias enable row level security;
alter table eventos enable row level security;
alter table webhook_bruto enable row level security;

-- armazenamento PRIVADO das páginas (as imagens só abrem por link temporário gerado pelo servidor)
insert into storage.buckets (id, name, public) values ('paginas', 'paginas', false)
on conflict (id) do update set public = false;
