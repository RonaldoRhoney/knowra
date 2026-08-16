-- KnowRa — Concursos Intelligence Etapas 7e.3-7e.4 (cross-concurso + recomendação)
-- Ver docs/foundation/CONCURSOS_INTELLIGENCE.md e DECISIONS.md 2026-08-16.
--
-- Reaproveita infraestrutura já existente (questoes.area_id, concursos.status,
-- progresso_disciplina_questoes) — nenhuma tabela nova, nenhuma IA nova.
-- Recomendação é regra determinística (menor domínio entre disciplinas
-- recorrentes), NUNCA machine learning nem geração de texto livre por IA —
-- decisão explícita do Ronaldo pra essa etapa.

-- Índices que faltavam — as RPCs abaixo filtram/agrupam exatamente por essas
-- colunas, e questoes só tinha índice de PK até aqui.
create index questoes_area_id_idx on public.questoes (area_id);
create index questoes_concurso_id_idx on public.questoes (concurso_id);

-- === 7e.3: disciplinas recorrentes entre concursos ativos ===
create function public.areas_recorrentes_entre_concursos(p_limite int default 10)
returns table (
  area_id uuid,
  area_nome text,
  total_concursos bigint,
  concursos jsonb
)
language sql
stable
set search_path = public
as $$
  select
    a.id, a.nome,
    count(distinct q.concurso_id) as total_concursos,
    jsonb_agg(distinct jsonb_build_object('id', c.id, 'nome', c.nome))
  from public.questoes q
  join public.areas a on a.id = q.area_id
  join public.concursos c on c.id = q.concurso_id
  where c.ativo = true
    and c.status in ('aberto', 'andamento')
    and q.review_status = 'published'
  group by a.id, a.nome
  having count(distinct q.concurso_id) > 1
  order by count(distinct q.concurso_id) desc
  limit greatest(1, least(coalesce(p_limite, 10), 50));
$$;

revoke all on function public.areas_recorrentes_entre_concursos(int) from public, anon;
grant execute on function public.areas_recorrentes_entre_concursos(int) to authenticated;

-- === 7e.4: recomendação de estudo (regra determinística, sem ML) ===
-- Ordem de decisão, sempre explicada no retorno (nunca "caixa preta"):
--   1. Entre as disciplinas RECORRENTES (aparecem em >1 concurso ativo) que o
--      usuário já praticou, recomenda a de menor domínio.
--   2. Se o usuário praticou disciplina, mas nenhuma é recorrente, recomenda
--      a de menor domínio mesmo assim (sem o bônus "beneficia vários concursos").
--   3. Se o usuário nunca praticou nenhuma disciplina, recomenda começar pela
--      disciplina mais recorrente entre os concursos ativos (sem domínio ainda).
--   4. Se não há disciplina recorrente nem histórico nenhum, devolve null
--      (honesto — "sem recomendação ainda" em vez de forçar uma resposta vazia
--      de sentido).
create function public.recomendacao_estudo()
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_area_id uuid;
  v_area_nome text;
  v_dominio_pct numeric;
  v_concursos jsonb;
  v_total_concursos int;
  v_motivo text;
  v_prioridade text;
begin
  -- Caso 1: disciplina recorrente que o usuário já praticou, menor domínio primeiro.
  select r.area_id, r.area_nome, p.dominio_pct, r.concursos, r.total_concursos
    into v_area_id, v_area_nome, v_dominio_pct, v_concursos, v_total_concursos
  from public.progresso_disciplina_questoes p
  join public.areas_recorrentes_entre_concursos(50) r on r.area_id = p.area_id
  where p.usuario_id = auth.uid()
  order by p.dominio_pct asc
  limit 1;

  if v_area_id is not null then
    v_motivo := format(
      'Você está se preparando para %s concursos que possuem %s em comum. Seu desempenho nessa disciplina está em %s%%.',
      v_total_concursos, v_area_nome, v_dominio_pct
    );
  else
    -- Caso 2: disciplina praticada, mas nenhuma recorrente entre concursos ativos.
    select p.area_id, a.nome, p.dominio_pct
      into v_area_id, v_area_nome, v_dominio_pct
    from public.progresso_disciplina_questoes p
    join public.areas a on a.id = p.area_id
    where p.usuario_id = auth.uid()
    order by p.dominio_pct asc
    limit 1;

    if v_area_id is not null then
      v_concursos := '[]'::jsonb;
      v_total_concursos := 0;
      v_motivo := format(
        'Seu desempenho em %s está em %s%%, a disciplina mais fraca no seu histórico até agora.',
        v_area_nome, v_dominio_pct
      );
    else
      -- Caso 3: sem histórico nenhum — sugere a disciplina mais recorrente.
      select r.area_id, r.area_nome, r.concursos, r.total_concursos
        into v_area_id, v_area_nome, v_concursos, v_total_concursos
      from public.areas_recorrentes_entre_concursos(1) r
      limit 1;

      if v_area_id is not null then
        v_dominio_pct := null;
        v_motivo := format(
          'Você ainda não praticou nenhuma disciplina. %s aparece em %s concursos ativos — é um bom ponto de partida.',
          v_area_nome, v_total_concursos
        );
      else
        -- Caso 4: nada pra recomendar ainda (nenhum concurso com questão publicada).
        return null;
      end if;
    end if;
  end if;

  v_prioridade := case
    when v_dominio_pct is null then 'alta'
    when v_dominio_pct < 50 then 'alta'
    when v_dominio_pct < 75 then 'media'
    else 'baixa'
  end;

  return jsonb_build_object(
    'area_id', v_area_id,
    'area_nome', v_area_nome,
    'dominio_pct', v_dominio_pct,
    'concursos_beneficiados', coalesce(v_concursos, '[]'::jsonb),
    'motivo', v_motivo,
    'prioridade', v_prioridade
  );
end;
$$;

revoke all on function public.recomendacao_estudo() from public, anon;
grant execute on function public.recomendacao_estudo() to authenticated;
