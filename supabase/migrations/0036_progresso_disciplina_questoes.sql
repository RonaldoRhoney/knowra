-- KnowRa — Progresso por disciplina em Questões + não repetir + fallback cross-disciplina
-- Ver DECISIONS.md 2026-08-16.
--
-- Prática de Questões por disciplina solta (sem concurso_id) hoje não grava
-- pontuação nenhuma em lugar nenhum — só concurso-linked alimenta
-- progresso_concurso. Esta migration:
--   1. Cria progresso_disciplina_questoes (mesmo padrão de progresso_concurso,
--      mas por área — NÃO reaproveita progresso_area porque aquela tabela é
--      alimentada por avaliar_desafio() (desafio aberto avaliado por IA),
--      um tipo de avaliação bem diferente de responder_questao() (múltipla
--      escolha, correção determinística). Misturar as duas inflaria/
--      distorceria o "domínio por área" com dois instrumentos de medida
--      diferentes.
--   2. responder_questao() passa a gravar nessa tabela quando a questão tem
--      area_id, além de continuar gravando em progresso_concurso quando
--      tem concurso_id (uma questão pode alimentar as duas).
--   3. listar_questoes() (modo área, p_concurso_id is null) passa a excluir
--      questões que o usuário já acertou antes, e completa o restante do
--      limite com questões de OUTRAS disciplinas quando a área pedida não
--      tem mais questões novas — nunca inclui questão vinculada a concurso
--      nesse fallback (evita vazar conteúdo Pro-gated pelo caminho de
--      prática livre, que é sempre sem teto).

create table public.progresso_disciplina_questoes (
  usuario_id uuid not null references public.profiles (id) on delete cascade,
  area_id uuid not null references public.areas (id) on delete cascade,
  total_questoes_validas int not null default 0,
  acertos_validos int not null default 0,
  dominio_pct numeric(5,2) not null default 0,
  atualizado_em timestamptz not null default now(),
  primary key (usuario_id, area_id)
);

alter table public.progresso_disciplina_questoes enable row level security;
revoke all on table public.progresso_disciplina_questoes from anon, authenticated;
grant select on table public.progresso_disciplina_questoes to authenticated;

create policy "usuario le o proprio progresso de disciplina"
  on public.progresso_disciplina_questoes for select
  using (auth.uid() = usuario_id or public.is_admin(auth.uid()));

-- === responder_questao(): mesma assinatura, corpo estendido ===
create or replace function public.responder_questao(p_questao_id uuid, p_alternativa text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limite_free_concurso constant int := 10;
  v_questao public.questoes;
  v_correta boolean;
  v_valida boolean;
  v_progresso public.progresso_concurso;
  v_progresso_disciplina public.progresso_disciplina_questoes;
  v_plano text;
  v_posicao int;
begin
  select * into v_questao from public.questoes
    where id = p_questao_id and review_status = 'published';

  if v_questao is null then
    raise exception 'Questão não encontrada ou não disponível.';
  end if;
  if p_alternativa is null or char_length(trim(p_alternativa)) = 0 then
    raise exception 'Alternativa inválida.';
  end if;

  if v_questao.concurso_id is not null then
    select plano into v_plano from public.profiles where profiles.id = auth.uid();
    if coalesce(v_plano, 'free') <> 'pro' then
      select count(*) into v_posicao
        from public.questoes
        where concurso_id = v_questao.concurso_id
          and review_status = 'published'
          and ordem <= v_questao.ordem;
      if v_posicao > v_limite_free_concurso then
        raise exception 'Esta questão faz parte do conteúdo KnowRa Pro.';
      end if;
    end if;
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

  -- Novo: progresso por disciplina, independente de ser questão de
  -- concurso ou de prática livre — a questão "sobre o que o usuário
  -- domina" vale pra qualquer questão com area_id, não só as de concurso.
  if v_valida and v_questao.area_id is not null then
    insert into public.progresso_disciplina_questoes
      (usuario_id, area_id, total_questoes_validas, acertos_validos, dominio_pct, atualizado_em)
    values (
      auth.uid(), v_questao.area_id, 1,
      case when v_correta then 1 else 0 end,
      case when v_correta then 100 else 0 end,
      now()
    )
    on conflict (usuario_id, area_id) do update
      set total_questoes_validas = public.progresso_disciplina_questoes.total_questoes_validas + 1,
          acertos_validos = public.progresso_disciplina_questoes.acertos_validos + case when v_correta then 1 else 0 end,
          dominio_pct = round(
            100.0 * (public.progresso_disciplina_questoes.acertos_validos + case when v_correta then 1 else 0 end)
            / (public.progresso_disciplina_questoes.total_questoes_validas + 1), 2),
          atualizado_em = now()
    returning * into v_progresso_disciplina;
  end if;

  return jsonb_build_object(
    'correta', v_correta,
    'gabarito', v_questao.gabarito,
    'explicacao', v_questao.explicacao,
    'valida_para_progresso', v_valida,
    'dominio_pct_concurso', v_progresso.dominio_pct,
    'dominio_pct_disciplina', v_progresso_disciplina.dominio_pct
  );
end;
$$;

revoke all on function public.responder_questao(uuid, text) from public, anon;
grant execute on function public.responder_questao(uuid, text) to authenticated;

-- === listar_questoes(): exclui já-acertadas, completa com outras disciplinas ===
-- Muda o "returns table" (novo campo area_nome) — precisa DROP + CREATE,
-- não "create or replace" (mesmo cuidado de sempre neste projeto).
drop function if exists public.listar_questoes(uuid, uuid, int);

create function public.listar_questoes(
  p_concurso_id uuid default null,
  p_area_id uuid default null,
  p_limite int default 20
)
returns table (
  id uuid,
  enunciado text,
  alternativas jsonb,
  dificuldade text,
  area_id uuid,
  area_nome text
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_limite_free_concurso constant int := 10;
  v_plano text;
  v_limite_efetivo int;
  v_encontradas int;
begin
  if p_concurso_id is null and p_area_id is null then
    raise exception 'Informe p_concurso_id ou p_area_id.';
  end if;

  v_limite_efetivo := greatest(1, least(coalesce(p_limite, 20), 100));

  if p_concurso_id is not null then
    select plano into v_plano from public.profiles where profiles.id = auth.uid();
    if coalesce(v_plano, 'free') <> 'pro' then
      v_limite_efetivo := least(v_limite_efetivo, v_limite_free_concurso);
    end if;

    -- Modo concurso: comportamento inalterado (ordem fixa, sem exclusão de
    -- já respondidas — repetir questão de concurso real é esperado, o
    -- usuário pode querer revisar o concurso inteiro de novo).
    return query
    select q.id, q.enunciado, q.alternativas, q.dificuldade, q.area_id, a.nome
    from public.questoes q
    left join public.areas a on a.id = q.area_id
    where q.review_status = 'published' and q.concurso_id = p_concurso_id
    order by q.ordem
    limit v_limite_efetivo;
    return;
  end if;

  -- Modo prática livre por disciplina (p_area_id): exclui questão que o
  -- usuário já acertou antes (qualquer área) — não faz sentido reservar
  -- "não errada ainda" só pra área atual, o objetivo é sempre trazer
  -- questão nova pro usuário. Erros continuam podendo reaparecer (retry
  -- já era o comportamento existente). Subquery correlacionada em vez de
  -- tabela temporária — evita DDL dentro de função "stable".
  return query
  select q.id, q.enunciado, q.alternativas, q.dificuldade, q.area_id, a.nome
  from public.questoes q
  left join public.areas a on a.id = q.area_id
  where q.review_status = 'published'
    and q.area_id = p_area_id
    and not exists (
      select 1 from public.tentativas_questao t
      where t.questao_id = q.id and t.usuario_id = auth.uid() and t.correta = true
    )
  order by q.ordem
  limit v_limite_efetivo;

  get diagnostics v_encontradas = row_count;

  -- Fallback cross-disciplina: se a área pedida não tem (mais) o
  -- suficiente, completa com questões de QUALQUER outra área — nunca
  -- questão vinculada a concurso (evita vazar conteúdo Pro-gated pelo
  -- caminho de prática livre, que é sempre sem teto).
  if v_encontradas < v_limite_efetivo then
    return query
    select q.id, q.enunciado, q.alternativas, q.dificuldade, q.area_id, a.nome
    from public.questoes q
    left join public.areas a on a.id = q.area_id
    where q.review_status = 'published'
      and q.area_id is not null
      and q.area_id <> p_area_id
      and q.concurso_id is null
      and not exists (
        select 1 from public.tentativas_questao t
        where t.questao_id = q.id and t.usuario_id = auth.uid() and t.correta = true
      )
    order by random()
    limit (v_limite_efetivo - v_encontradas);
  end if;
end;
$$;

revoke all on function public.listar_questoes(uuid, uuid, int) from public, anon;
grant execute on function public.listar_questoes(uuid, uuid, int) to authenticated;
