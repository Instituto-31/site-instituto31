-- Site: marcações de psicotécnicos com pagamento MB WAY + pedidos do site
-- Só as edge functions (service role) escrevem; a equipa lê/gere pela app.

create table if not exists public.psi_horarios (
  id          uuid primary key default gen_random_uuid(),
  dia_semana  smallint not null check (dia_semana between 1 and 7), -- 1=seg … 7=dom
  hora        time not null,
  ativo       boolean not null default true,
  unique (dia_semana, hora)
);

create table if not exists public.psi_bloqueios (
  id      uuid primary key default gen_random_uuid(),
  data    date not null,
  hora    time,            -- null = dia inteiro
  motivo  text,
  created_at timestamptz default now()
);

create table if not exists public.marcacoes_psi (
  id             uuid primary key default gen_random_uuid(),
  data           date not null,
  hora           time not null,
  tipo           text not null default 'obtencao' check (tipo in ('obtencao','renovacao')),
  lingua         text not null default 'pt' check (lingua in ('pt','en','fr')),
  formando       boolean not null default false,
  nome           text not null,
  telemovel      text not null,
  email          text,
  valor          numeric(8,2) not null,
  estado         text not null default 'pendente'
                 check (estado in ('pendente','pago','expirado','recusado','cancelado','faltou','realizado')),
  metodo_pag     text default 'mbway',
  order_id       text unique,
  request_id     text,
  pago_em        timestamptz,
  consent_marketing boolean default false,
  consent_rgpd_em   timestamptz,
  pessoa_id      uuid references public.pessoas(id),
  consulta_id    uuid references public.consultas_psi(id),
  fatura_id      uuid references public.faturas(id),
  obs            text,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);
create index if not exists marcacoes_psi_data_idx on public.marcacoes_psi (data, hora);
-- uma vaga só pode ter uma marcação ativa (paga ou pendente)
create unique index if not exists marcacoes_psi_vaga_ativa
  on public.marcacoes_psi (data, hora) where estado in ('pendente','pago');

create table if not exists public.pedidos_site (
  id          uuid primary key default gen_random_uuid(),
  tipo        text not null check (tipo in ('pre_inscricao','aviso_abertura','contacto','empresa')),
  curso       text,
  turma       text,
  nome        text,
  email       text,
  telemovel   text,
  dados       jsonb default '{}'::jsonb,
  consent_marketing boolean default false,
  consent_rgpd_em   timestamptz,
  estado      text not null default 'novo' check (estado in ('novo','tratado','arquivado')),
  created_at  timestamptz default now()
);

alter table public.psi_horarios  enable row level security;
alter table public.psi_bloqueios enable row level security;
alter table public.marcacoes_psi enable row level security;
alter table public.pedidos_site  enable row level security;

create policy equipa_all on public.psi_horarios  for all to authenticated using (public.is_equipa()) with check (public.is_equipa());
create policy equipa_all on public.psi_bloqueios for all to authenticated using (public.is_equipa()) with check (public.is_equipa());
create policy equipa_all on public.marcacoes_psi for all to authenticated using (public.is_equipa()) with check (public.is_equipa());
create policy equipa_all on public.pedidos_site  for all to authenticated using (public.is_equipa()) with check (public.is_equipa());

create trigger marcacoes_psi_updated before update on public.marcacoes_psi
  for each row execute function public.update_updated_at();

-- Horário (Flávia, 26/11): seg–sex às 10:00, 11:15, 14:30 e 15:45
insert into public.psi_horarios (dia_semana, hora)
select d, h::time from generate_series(1,5) d,
  unnest(array['10:00','11:15','14:30','15:45']) h
on conflict do nothing;
