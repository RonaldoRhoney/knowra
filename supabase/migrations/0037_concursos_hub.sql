-- KnowRa — Concursos Hub, Etapas 7c.1-7c.3 (schema + RPCs + simulado)
-- Ver docs/foundation/CONCURSOS_HUB.md e DECISIONS.md 2026-08-16.
--
-- Migration puramente aditiva: nenhuma coluna/tabela/função existente é
-- removida ou tem comportamento alterado. catalogo_concursos() continua
-- existindo intocada (usada só pelo fluxo antigo de "concurso com
-- questões prontas") — listar_concursos() é a nova leitura, mais ampla
-- (mostra concurso real mesmo sem questão ainda, com filtro de status/busca).

-- === 7c.1: schema ===

alter table public.concursos
  add column status text not null default 'aberto' check (status in ('aberto', 'andamento', 'encerrado')),
  add column vagas int,
  add column cadastro_reserva boolean not null default false,
  add column salario_min numeric,
  add column salario_max numeric,
  add column escolaridade text,
  add column localidade text,
  add column inscricoes_inicio date,
  add column inscricoes_fim date,
  add column data_prova date,
  add column taxa_inscricao numeric,
  add column edital_url text,
  add column pagina_oficial_url text,
  add column fonte text not null default 'admin_manual' check (fonte in ('admin_manual', 'dados_gov_br', 'outro')),
  add column fonte_atualizado_em timestamptz not null default now();

create table public.recursos_video (
  id uuid primary key default gen_random_uuid(),
  video_id text not null,
  titulo text not null,
  canal text,
  thumbnail_url text,
  video_url text not null,
  area_id uuid references public.areas (id) on delete set null,
  topico text,
  origem text not null default 'admin_manual' check (origem in ('admin_manual', 'youtube_api')),
  cadastrado_por uuid references public.profiles (id),
  criado_em timestamptz not null default now()
);

alter table public.recursos_video enable row level security;
revoke all on table public.recursos_video from anon, authenticated;
grant select on table public.recursos_video to authenticated;

create policy "qualquer autenticado le recursos_video"
  on public.recursos_video for select
  using (true);

create table public.fontes_externas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  url text not null,
  tipo text not null,
  status text not null default 'ativa' check (status in ('ativa', 'instavel', 'descontinuada')),
  ultima_consulta_em timestamptz,
  licenca_uso text,
  observacoes text,
  criado_em timestamptz not null default now()
);

alter table public.fontes_externas enable row level security;
revoke all on table public.fontes_externas from anon, authenticated;
-- Sem grant de select pra authenticated — é metadado operacional (auditoria
-- de proveniência), não dado de produto; consultado direto via psql/admin.

-- === 7c.2: RPCs ===

-- Leitura ampla, pública pro app (authenticated): mostra concurso real
-- mesmo sem questão de prática ainda — diferente de catalogo_concursos()
-- (que exige questão publicada, inner join). p_status/p_busca opcionais.
create function public.listar_concursos(
  p_status text default null,
  p_busca text default null,
  p_limite int default 50
)
returns table (
  id uuid,
  nome text,
  orgao text,
  banca text,
  ano int,
  cargo text,
  status text,
  vagas int,
  cadastro_reserva boolean,
  salario_min numeric,
  salario_max numeric,
  escolaridade text,
  localidade text,
  inscricoes_inicio date,
  inscricoes_fim date,
  data_prova date,
  edital_url text,
  pagina_oficial_url text,
  total_questoes bigint,
  questoes_gratis bigint
)
language sql
security definer
set search_path = public
stable
as $$
  select
    c.id, c.nome, c.orgao, c.banca, c.ano, c.cargo, c.status, c.vagas, c.cadastro_reserva,
    c.salario_min, c.salario_max, c.escolaridade, c.localidade,
    c.inscricoes_inicio, c.inscricoes_fim, c.data_prova, c.edital_url, c.pagina_oficial_url,
    count(q.id) filter (where q.review_status = 'published') as total_questoes,
    least(count(q.id) filter (where q.review_status = 'published'), 10) as questoes_gratis
  from public.concursos c
  left join public.questoes q on q.concurso_id = c.id
  where c.ativo = true
    and (p_status is null or c.status = p_status)
    and (
      p_busca is null or p_busca = '' or
      c.nome ilike '%' || p_busca || '%' or
      c.orgao ilike '%' || p_busca || '%' or
      c.cargo ilike '%' || p_busca || '%'
    )
  group by c.id
  order by c.criado_em desc
  limit greatest(1, least(coalesce(p_limite, 50), 100));
$$;

revoke all on function public.listar_concursos(text, text, int) from public, anon;
grant execute on function public.listar_concursos(text, text, int) to authenticated;

-- Escrita admin-only, mesmo padrão de revisar_questao()/promover_provenance():
-- security definer, checa is_admin() internamente, liberado pra authenticated
-- chamar (a própria função rejeita quem não é admin).
create function public.cadastrar_concurso(
  p_nome text,
  p_orgao text default null,
  p_banca text default null,
  p_ano int default null,
  p_cargo text default null,
  p_status text default 'aberto',
  p_vagas int default null,
  p_cadastro_reserva boolean default false,
  p_salario_min numeric default null,
  p_salario_max numeric default null,
  p_escolaridade text default null,
  p_localidade text default null,
  p_inscricoes_inicio date default null,
  p_inscricoes_fim date default null,
  p_data_prova date default null,
  p_taxa_inscricao numeric default null,
  p_edital_url text default null,
  p_pagina_oficial_url text default null
)
returns public.concursos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_concurso public.concursos;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Acesso negado.';
  end if;
  if p_status not in ('aberto', 'andamento', 'encerrado') then
    raise exception 'Status inválido.';
  end if;

  insert into public.concursos
    (nome, orgao, banca, ano, cargo, status, vagas, cadastro_reserva, salario_min, salario_max,
     escolaridade, localidade, inscricoes_inicio, inscricoes_fim, data_prova, taxa_inscricao,
     edital_url, pagina_oficial_url, fonte, fonte_atualizado_em)
  values
    (p_nome, p_orgao, p_banca, p_ano, p_cargo, p_status, p_vagas, p_cadastro_reserva, p_salario_min, p_salario_max,
     p_escolaridade, p_localidade, p_inscricoes_inicio, p_inscricoes_fim, p_data_prova, p_taxa_inscricao,
     p_edital_url, p_pagina_oficial_url, 'admin_manual', now())
  returning * into v_concurso;

  return v_concurso;
end;
$$;

revoke all on function public.cadastrar_concurso(text, text, text, int, text, text, int, boolean, numeric, numeric, text, text, date, date, date, numeric, text, text) from public, anon;
grant execute on function public.cadastrar_concurso(text, text, text, int, text, text, int, boolean, numeric, numeric, text, text, date, date, date, numeric, text, text) to authenticated;

create function public.atualizar_status_concurso(p_concurso_id uuid, p_status text)
returns public.concursos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_concurso public.concursos;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Acesso negado.';
  end if;
  if p_status not in ('aberto', 'andamento', 'encerrado') then
    raise exception 'Status inválido.';
  end if;

  update public.concursos
    set status = p_status, fonte_atualizado_em = now()
    where id = p_concurso_id
    returning * into v_concurso;

  if v_concurso is null then
    raise exception 'Concurso não encontrado.';
  end if;

  return v_concurso;
end;
$$;

revoke all on function public.atualizar_status_concurso(uuid, text) from public, anon;
grant execute on function public.atualizar_status_concurso(uuid, text) to authenticated;

create function public.cadastrar_recurso_video(
  p_video_id text,
  p_titulo text,
  p_video_url text,
  p_canal text default null,
  p_thumbnail_url text default null,
  p_area_id uuid default null,
  p_topico text default null
)
returns public.recursos_video
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recurso public.recursos_video;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Acesso negado.';
  end if;

  insert into public.recursos_video
    (video_id, titulo, video_url, canal, thumbnail_url, area_id, topico, origem, cadastrado_por)
  values
    (p_video_id, p_titulo, p_video_url, p_canal, p_thumbnail_url, p_area_id, p_topico, 'admin_manual', auth.uid())
  returning * into v_recurso;

  return v_recurso;
end;
$$;

revoke all on function public.cadastrar_recurso_video(text, text, text, text, text, uuid, text) from public, anon;
grant execute on function public.cadastrar_recurso_video(text, text, text, text, text, uuid, text) to authenticated;

-- Leitura livre (sem dado sensível) — qualquer autenticado.
create function public.listar_recursos_video(p_area_id uuid default null, p_topico text default null)
returns setof public.recursos_video
language sql
stable
set search_path = public
as $$
  select * from public.recursos_video
  where (p_area_id is null or area_id = p_area_id)
    and (p_topico is null or topico ilike '%' || p_topico || '%')
  order by criado_em desc
  limit 50;
$$;

revoke all on function public.listar_recursos_video(uuid, text) from public, anon;
grant execute on function public.listar_recursos_video(uuid, text) to authenticated;

-- === 7c.3: Simulado personalizado ===
-- Reaproveita a mesma trava de segurança de listar_questoes(): nunca
-- questão vinculada a concurso (evita vazar conteúdo Pro-gated pelo
-- caminho de simulado livre), nunca questão já acertada antes.
create function public.gerar_simulado(
  p_areas uuid[] default null,
  p_dificuldade text default null,
  p_quantidade int default 20
)
returns table (
  id uuid,
  enunciado text,
  alternativas jsonb,
  dificuldade text,
  area_id uuid,
  area_nome text
)
language sql
security definer
set search_path = public
stable
as $$
  select q.id, q.enunciado, q.alternativas, q.dificuldade, q.area_id, a.nome
  from public.questoes q
  left join public.areas a on a.id = q.area_id
  where q.review_status = 'published'
    and q.concurso_id is null
    and (p_areas is null or array_length(p_areas, 1) is null or q.area_id = any(p_areas))
    and (p_dificuldade is null or q.dificuldade = p_dificuldade)
    and not exists (
      select 1 from public.tentativas_questao t
      where t.questao_id = q.id and t.usuario_id = auth.uid() and t.correta = true
    )
  order by random()
  limit greatest(1, least(coalesce(p_quantidade, 20), 100));
$$;

revoke all on function public.gerar_simulado(uuid[], text, int) from public, anon;
grant execute on function public.gerar_simulado(uuid[], text, int) to authenticated;
