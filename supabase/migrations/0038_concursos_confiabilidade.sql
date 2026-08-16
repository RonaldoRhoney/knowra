-- KnowRa — Concursos Hub: modelo de confiabilidade do dado (antes da Etapa 7c.5)
-- Ver docs/foundation/CONCURSOS_HUB.md e DECISIONS.md 2026-08-16.
--
-- Achado do Ronaldo antes de autorizar popular o MVP: cadastro manual sem
-- rastro de "quando foi verificado por último" gera risco real — um
-- concurso cadastrado hoje como "aberto" pode estar desatualizado em
-- poucas semanas sem ninguém perceber. Este ajuste NÃO implementa Ingestion
-- Engine/dados.gov.br/RAG (fora de escopo, confirmado) — só fortalece o
-- modelo de dado que já existe.
--
-- Decisão de design: confiabilidade é CALCULADA (idade de
-- ultima_verificacao_em), nunca armazenada como coluna que precisaria de
-- job agendado pra decair sozinha — mesmo princípio já usado no Confidence
-- Engine do KNOWRA_AI ("sem expiração automática por tempo", este projeto
-- não tem infraestrutura de cron). Admin "reverifica" via confirmar_concurso()
-- quando confirma que o dado ainda está correto, mesmo sem mudar nada.

alter table public.concursos
  add column cadastrado_por uuid references public.profiles (id),
  add column ultima_verificacao_em timestamptz not null default now();

-- cadastrar_concurso: mesma assinatura de antes (nenhum parâmetro novo —
-- cadastrado_por/ultima_verificacao_em são sempre auto-preenchidos, nunca
-- decisão do cliente) — create or replace basta, sem drop.
create or replace function public.cadastrar_concurso(
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
     edital_url, pagina_oficial_url, fonte, fonte_atualizado_em, cadastrado_por, ultima_verificacao_em)
  values
    (p_nome, p_orgao, p_banca, p_ano, p_cargo, p_status, p_vagas, p_cadastro_reserva, p_salario_min, p_salario_max,
     p_escolaridade, p_localidade, p_inscricoes_inicio, p_inscricoes_fim, p_data_prova, p_taxa_inscricao,
     p_edital_url, p_pagina_oficial_url, 'admin_manual', now(), auth.uid(), now())
  returning * into v_concurso;

  return v_concurso;
end;
$$;

-- atualizar_status_concurso: mudar status também conta como reverificação.
create or replace function public.atualizar_status_concurso(p_concurso_id uuid, p_status text)
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
    set status = p_status, fonte_atualizado_em = now(), ultima_verificacao_em = now()
    where id = p_concurso_id
    returning * into v_concurso;

  if v_concurso is null then
    raise exception 'Concurso não encontrado.';
  end if;

  return v_concurso;
end;
$$;

-- Nova: admin confirma que o dado ainda está correto, sem mudar nada além
-- da data de verificação — reseta a "idade" usada pra calcular confiabilidade.
create function public.confirmar_concurso(p_concurso_id uuid)
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

  update public.concursos
    set ultima_verificacao_em = now()
    where id = p_concurso_id
    returning * into v_concurso;

  if v_concurso is null then
    raise exception 'Concurso não encontrado.';
  end if;

  return v_concurso;
end;
$$;

revoke all on function public.confirmar_concurso(uuid) from public, anon;
grant execute on function public.confirmar_concurso(uuid) to authenticated;

-- listar_concursos: expõe confiabilidade calculada + rastro de verificação.
-- Muda "returns table" — DROP + CREATE, não "create or replace".
drop function if exists public.listar_concursos(text, text, int);

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
  questoes_gratis bigint,
  fonte text,
  ultima_verificacao_em timestamptz,
  confiabilidade text
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
    least(count(q.id) filter (where q.review_status = 'published'), 10) as questoes_gratis,
    c.fonte, c.ultima_verificacao_em,
    case
      when c.ultima_verificacao_em >= now() - interval '30 days' then 'verificado'
      when c.ultima_verificacao_em >= now() - interval '90 days' then 'requer_atualizacao'
      else 'desatualizado'
    end as confiabilidade
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
