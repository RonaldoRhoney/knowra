-- KnowRa — Fase 7a: Concursos Públicos (Question Engine mínimo)
-- Ver revisão técnica aprovada em DECISIONS.md. Separação estrita de Pergunta/Desafio
-- (Knowledge Mode) vs Questão/Tentativa (Concursos) — nunca reaproveita perguntas/desafios/
-- avaliar_desafio, que ficam intocados nesta migration.

-- ============================================================================
-- Concurso conceitual. `cargo` é atributo simples por ora — vira entidade própria
-- quando houver necessidade real de reutilização/filtro entre concursos diferentes.
-- ============================================================================
create table public.concursos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  orgao text,
  banca text,
  ano int,
  cargo text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

alter table public.concursos enable row level security;
revoke all on table public.concursos from anon, authenticated;
grant select on table public.concursos to authenticated;

create policy "concursos sao publicos para autenticados"
  on public.concursos for select
  using (true);

-- ============================================================================
-- Questão: item reutilizável e estruturado, distinto de Pergunta/Desafio
-- (ver KNOWLEDGE_MODEL.md §Pergunta vs. Questão vs. Desafio). Sem grant de SELECT
-- direto — o client só enxerga via listar_questoes()/responder_questao(), nunca
-- vê gabarito/explicacao antes de responder.
-- ============================================================================
create table public.questoes (
  id uuid primary key default gen_random_uuid(),
  concurso_id uuid references public.concursos (id) on delete set null,
  area_id uuid references public.areas (id) on delete set null,
  enunciado text not null,
  alternativas jsonb not null,
  gabarito text not null,
  explicacao text not null,
  dificuldade text not null check (dificuldade in ('facil', 'normal', 'dificil', 'avancado', 'mestre')),
  origem text not null default 'ia_knowra'
    check (origem in ('ia_knowra', 'provider_licensed', 'manual', 'import_licensed')),
  generation_model text,
  prompt_version text,
  generated_at timestamptz,
  review_status text not null default 'pending_review'
    check (review_status in ('generated', 'pending_review', 'approved', 'published')),
  revisado_por uuid references public.profiles (id),
  revisado_em timestamptz,
  criado_em timestamptz not null default now()
);

alter table public.questoes enable row level security;
revoke all on table public.questoes from anon, authenticated;
-- sem grant de select: leitura só via RPC (listar_questoes) e revisão via admin

-- ============================================================================
-- Tentativa: toda resposta fica registrada (repetição permitida), mas só a
-- primeira tentativa por questão conta como `valida_para_progresso`.
-- ============================================================================
create table public.tentativas_questao (
  id uuid primary key default gen_random_uuid(),
  questao_id uuid not null references public.questoes (id) on delete cascade,
  usuario_id uuid not null references public.profiles (id) on delete cascade,
  alternativa_escolhida text not null,
  correta boolean not null,
  valida_para_progresso boolean not null,
  criado_em timestamptz not null default now()
);

alter table public.tentativas_questao enable row level security;
revoke all on table public.tentativas_questao from anon, authenticated;
grant select on table public.tentativas_questao to authenticated;

create policy "usuario le as proprias tentativas"
  on public.tentativas_questao for select
  using (auth.uid() = usuario_id or public.is_admin(auth.uid()));

-- ============================================================================
-- Progresso por concurso — mesmo molde de progresso_area, mas fonte de dado
-- separada: só responder_questao() escreve aqui; avaliar_desafio() nunca toca.
-- ============================================================================
create table public.progresso_concurso (
  usuario_id uuid not null references public.profiles (id) on delete cascade,
  concurso_id uuid not null references public.concursos (id) on delete cascade,
  total_questoes_validas int not null default 0,
  acertos_validos int not null default 0,
  dominio_pct numeric(5,2) not null default 0,
  atualizado_em timestamptz not null default now(),
  primary key (usuario_id, concurso_id)
);

alter table public.progresso_concurso enable row level security;
revoke all on table public.progresso_concurso from anon, authenticated;
grant select on table public.progresso_concurso to authenticated;

create policy "usuario le o proprio progresso de concurso"
  on public.progresso_concurso for select
  using (auth.uid() = usuario_id or public.is_admin(auth.uid()));

-- ============================================================================
-- RPCs
-- ============================================================================

-- Catálogo de questões publicadas de um concurso — nunca inclui gabarito/explicacao/
-- origem/generation_model.
create or replace function public.listar_questoes(p_concurso_id uuid, p_limite int default 20)
returns table (
  id uuid,
  enunciado text,
  alternativas jsonb,
  dificuldade text,
  area_id uuid
)
language sql
security definer
set search_path = public
stable
as $$
  select q.id, q.enunciado, q.alternativas, q.dificuldade, q.area_id
  from public.questoes q
  where q.concurso_id = p_concurso_id
    and q.review_status = 'published'
  order by q.criado_em
  limit greatest(1, least(coalesce(p_limite, 20), 100));
$$;

revoke all on function public.listar_questoes(uuid, int) from public, anon;
grant execute on function public.listar_questoes(uuid, int) to authenticated;

-- Responde uma questão: correção 100% no banco (comparação de string, zero IA),
-- gabarito/explicação só saem DEPOIS de corrigir. usuario_id sempre de auth.uid(),
-- nunca de parâmetro — impossível responder em nome de outro usuário.
create or replace function public.responder_questao(p_questao_id uuid, p_alternativa text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_questao public.questoes;
  v_correta boolean;
  v_valida boolean;
  v_progresso public.progresso_concurso;
begin
  select * into v_questao from public.questoes
    where id = p_questao_id and review_status = 'published';

  if v_questao is null then
    raise exception 'Questão não encontrada ou não disponível.';
  end if;
  if p_alternativa is null or char_length(trim(p_alternativa)) = 0 then
    raise exception 'Alternativa inválida.';
  end if;

  v_correta := (p_alternativa = v_questao.gabarito);

  select not exists (
    select 1 from public.tentativas_questao
    where questao_id = p_questao_id and usuario_id = auth.uid()
  ) into v_valida;

  insert into public.tentativas_questao
    (questao_id, usuario_id, alternativa_escolhida, correta, valida_para_progresso)
  values (p_questao_id, auth.uid(), p_alternativa, v_correta, v_valida);

  if v_valida and v_questao.concurso_id is not null then
    insert into public.progresso_concurso
      (usuario_id, concurso_id, total_questoes_validas, acertos_validos, dominio_pct, atualizado_em)
    values (
      auth.uid(), v_questao.concurso_id, 1,
      case when v_correta then 1 else 0 end,
      case when v_correta then 100 else 0 end,
      now()
    )
    on conflict (usuario_id, concurso_id) do update
      set total_questoes_validas = public.progresso_concurso.total_questoes_validas + 1,
          acertos_validos = public.progresso_concurso.acertos_validos + case when v_correta then 1 else 0 end,
          dominio_pct = round(
            100.0 * (public.progresso_concurso.acertos_validos + case when v_correta then 1 else 0 end)
            / (public.progresso_concurso.total_questoes_validas + 1), 2),
          atualizado_em = now()
    returning * into v_progresso;
  end if;

  return jsonb_build_object(
    'correta', v_correta,
    'gabarito', v_questao.gabarito,
    'explicacao', v_questao.explicacao,
    'valida_para_progresso', v_valida,
    'dominio_pct_concurso', v_progresso.dominio_pct
  );
end;
$$;

revoke all on function public.responder_questao(uuid, text) from public, anon;
grant execute on function public.responder_questao(uuid, text) to authenticated;

-- Revisão/publicação de questão — admin-only. MVP simplificado: sem pipeline
-- automático, promoção de status é manual.
create or replace function public.revisar_questao(p_questao_id uuid, p_status text)
returns public.questoes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_questao public.questoes;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Acesso negado.';
  end if;
  if p_status not in ('generated', 'pending_review', 'approved', 'published') then
    raise exception 'Status inválido.';
  end if;

  update public.questoes
    set review_status = p_status,
        revisado_por = auth.uid(),
        revisado_em = now()
    where id = p_questao_id
    returning * into v_questao;

  if v_questao is null then
    raise exception 'Questão não encontrada.';
  end if;

  return v_questao;
end;
$$;

revoke all on function public.revisar_questao(uuid, text) from public, anon;
grant execute on function public.revisar_questao(uuid, text) to authenticated;

-- Ranking por concurso — mesmo padrão de segurança da ranking_por_area (Fase 6):
-- security definer, opt-in via profiles.aparecer_no_ranking (reaproveitada, não
-- duplicada), mínimo de 5 questões válidas. Regra MVP: acurácia pura sobre
-- tentativas válidas, sem peso de dificuldade/consistência ainda — evolução futura
-- documentada em DECISIONS.md, `questoes.dificuldade` já disponível pra isso sem
-- precisar de nova coluna.
create or replace function public.ranking_por_concurso(p_concurso_id uuid, p_limite int default 50)
returns table (
  posicao bigint,
  nickname text,
  avatar_url text,
  dominio_pct numeric,
  total_questoes_validas int
)
language sql
security definer
set search_path = public
stable
as $$
  select
    row_number() over (order by pc.dominio_pct desc, pc.usuario_id) as posicao,
    coalesce(p.nickname, 'Explorador ' || substr(p.id::text, 1, 4)) as nickname,
    p.avatar_url,
    pc.dominio_pct,
    pc.total_questoes_validas
  from public.progresso_concurso pc
  join public.profiles p on p.id = pc.usuario_id
  where pc.concurso_id = p_concurso_id
    and p.aparecer_no_ranking = true
    and pc.total_questoes_validas >= 5
  order by pc.dominio_pct desc, pc.usuario_id
  limit greatest(1, least(coalesce(p_limite, 50), 200));
$$;

revoke all on function public.ranking_por_concurso(uuid, int) from public, anon;
grant execute on function public.ranking_por_concurso(uuid, int) to authenticated;
