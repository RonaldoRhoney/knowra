-- KnowRa — Fase 5: Competitive Foundation
-- Rating separado de XP (DEC-001) + fundação de anti-cheat.
-- Sem nenhuma feature de ranking visível ainda — só preparação.

alter table public.profiles add column rating int not null default 1200;

-- avaliar_desafio: mesma lógica da Fase 4, agora também:
--   (a) calculando Rating (v1, fórmula simples — algoritmo definitivo não decidido, ver GAME_RULES.md)
--   (b) bloqueando avaliação "instantânea demais" (anti-cheat básico contra automação)
create or replace function public.avaliar_desafio(
  p_desafio_id uuid,
  p_resposta_usuario text,
  p_nota int,
  p_feedback_ia text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_desafio public.desafios;
  v_area_id uuid;
  v_base_xp numeric;
  v_peso_dificuldade numeric;
  v_multiplicador numeric := 1.0;
  v_bonus_streak numeric := 0;
  v_bonus_area numeric := 0;
  v_bonus_perfeito numeric := 0;
  v_xp_ganho int;
  v_ultimo_avaliado date;
  v_streak_novo int;
  v_xp_total_novo int;
  v_nivel_novo int;
  v_nivel_anterior int;
  v_badges_novas text[] := '{}';
  v_rating_atual int;
  v_delta_rating int;
  v_rating_novo int;
begin
  select * into v_desafio from public.desafios
    where id = p_desafio_id and usuario_id = auth.uid()
    for update;

  if v_desafio is null then
    raise exception 'Desafio não encontrado ou não pertence ao usuário.';
  end if;
  if v_desafio.avaliado_em is not null then
    raise exception 'Este desafio já foi avaliado.';
  end if;
  if p_nota < 0 or p_nota > 100 then
    raise exception 'Nota inválida.';
  end if;
  -- anti-cheat básico: exige um mínimo de tempo entre criar o desafio e avaliar
  -- (dificulta automação/farm de XP por bot respondendo instantaneamente)
  if now() - v_desafio.criado_em < interval '3 seconds' then
    raise exception 'Resposta enviada rápido demais. Tente novamente.';
  end if;

  v_peso_dificuldade := case v_desafio.dificuldade
    when 'facil' then 0.5
    when 'normal' then 1
    when 'dificil' then 2
    when 'avancado' then 3
    when 'mestre' then 5
  end;
  v_base_xp := v_peso_dificuldade * 25;

  select max(avaliado_em::date) into v_ultimo_avaliado
    from public.desafios
    where usuario_id = auth.uid() and avaliado_em is not null and id <> v_desafio.id;

  select streak_atual into v_streak_novo from public.profiles where id = auth.uid();
  if v_ultimo_avaliado is null then
    v_streak_novo := 1;
  elsif v_ultimo_avaliado = current_date then
    v_streak_novo := greatest(v_streak_novo, 1);
  elsif v_ultimo_avaliado = current_date - 1 then
    v_streak_novo := v_streak_novo + 1;
  else
    v_streak_novo := 1;
  end if;

  if v_streak_novo >= 2 then
    v_bonus_streak := least(0.5, 0.1 * (v_streak_novo - 1));
  end if;

  select area_id into v_area_id from public.perguntas where id = v_desafio.pergunta_id;
  if v_area_id is not null and not exists (
    select 1 from public.desafios d
    join public.perguntas pg on pg.id = d.pergunta_id
    where d.usuario_id = auth.uid() and pg.area_id = v_area_id
      and d.avaliado_em is not null and d.id <> v_desafio.id
  ) then
    v_bonus_area := 0.2;
  end if;

  if p_nota = 100 then
    v_bonus_perfeito := 0.2;
  end if;

  v_multiplicador := 1 + v_bonus_streak + v_bonus_area + v_bonus_perfeito;
  v_xp_ganho := round(v_base_xp * (p_nota / 100.0) * v_multiplicador);

  update public.desafios
    set resposta_usuario = p_resposta_usuario,
        nota = p_nota,
        feedback_ia = p_feedback_ia,
        xp_ganho = v_xp_ganho,
        avaliado_em = now()
    where id = p_desafio_id;

  select nivel_global, xp_total, rating into v_nivel_anterior, v_xp_total_novo, v_rating_atual
    from public.profiles where id = auth.uid();
  v_xp_total_novo := v_xp_total_novo + v_xp_ganho;
  select max(nivel) into v_nivel_novo from public.niveis where xp_necessario <= v_xp_total_novo;

  -- Rating v1: desempenho relativo ao "esperado" (nota 50), escalado pela dificuldade.
  -- Nunca decresce por errar sozinho abaixo de 0. Fórmula provisória — ver GAME_RULES.md §Rating.
  v_delta_rating := round((p_nota - 50) / 50.0 * 8 * v_peso_dificuldade);
  v_rating_novo := greatest(0, v_rating_atual + v_delta_rating);

  update public.profiles
    set xp_total = v_xp_total_novo,
        nivel_global = v_nivel_novo,
        streak_atual = v_streak_novo,
        streak_recorde = greatest(streak_recorde, v_streak_novo),
        rating = v_rating_novo
    where id = auth.uid();

  if v_area_id is not null then
    insert into public.progresso_area (usuario_id, area_id, dominio_pct, total_desafios, atualizado_em)
    values (auth.uid(), v_area_id, p_nota, 1, now())
    on conflict (usuario_id, area_id) do update
      set dominio_pct = round(
            ((public.progresso_area.dominio_pct * public.progresso_area.total_desafios) + p_nota)
            / (public.progresso_area.total_desafios + 1), 2),
          total_desafios = public.progresso_area.total_desafios + 1,
          atualizado_em = now();
  end if;

  if v_streak_novo >= 7 and public.conceder_badge(auth.uid(), 'sequencia_conhecimento') then
    v_badges_novas := array_append(v_badges_novas, 'sequencia_conhecimento');
  end if;
  if v_streak_novo >= 30 and public.conceder_badge(auth.uid(), 'incansavel') then
    v_badges_novas := array_append(v_badges_novas, 'incansavel');
  end if;
  if (
    select count(*) from public.desafios
    where usuario_id = auth.uid() and avaliado_em is not null
      and dificuldade in ('dificil', 'avancado', 'mestre') and nota >= 70
  ) >= 20 and public.conceder_badge(auth.uid(), 'pensamento_critico') then
    v_badges_novas := array_append(v_badges_novas, 'pensamento_critico');
  end if;

  return jsonb_build_object(
    'xp_ganho', v_xp_ganho,
    'xp_total', v_xp_total_novo,
    'nivel_anterior', v_nivel_anterior,
    'nivel_novo', v_nivel_novo,
    'subiu_de_nivel', v_nivel_novo > v_nivel_anterior,
    'streak_atual', v_streak_novo,
    'badges_novas', v_badges_novas,
    'rating', v_rating_novo
  );
end;
$$;
