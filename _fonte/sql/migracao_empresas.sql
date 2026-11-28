-- Empresas a contactar (propostas B2B)
create table if not exists empresas (
  id uuid primary key default gen_random_uuid(),
  nif text unique,
  nome text not null,
  cae text,
  atividade text,
  concelho text,
  distrito text,
  trabalhadores int,
  email text,
  tel text,
  site text,
  origem text default 'einforma',
  grupo text,                    -- 'cliente_antigo' | 'motoristas_nossos' | 'nova'
  aprovado boolean not null default false,  -- só sai depois do "sim" da Flávia
  estado text not null default 'por_enviar' check (estado in ('por_enviar','enviado','respondeu','interessada','sair','erro')),
  enviado_em timestamptz,
  message_id text,
  opt_out boolean not null default false,
  token uuid not null default gen_random_uuid(),
  obs text,
  created_at timestamptz not null default now()
);
create index if not exists empresas_envio on empresas (aprovado, estado);
alter table empresas enable row level security;
create policy equipa_all on empresas for all to authenticated using (is_equipa()) with check (is_equipa());
