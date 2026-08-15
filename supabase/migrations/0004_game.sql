-- KnowRa — Fase 3: niveis, desafios, badges, XP

create table public.niveis (
  nivel int primary key,
  titulo text not null,
  xp_necessario int not null
);
insert into public.niveis (nivel, titulo, xp_necessario) values
  (1, 'Curioso', 0),
  (2, 'Explorador', 500),
  (3, 'Aprendiz', 1200),
  (4, 'Investigador', 2500),
  (5, 'Conhecedor', 4500),
  (6, 'Especialista', 7500),
  (7, 'Mestre', 12000),
  (8, 'Mentor', 18000),
  (9, 'Sábio', 26000),
  (10, 'Lenda', 40000);

alter table public.niveis enable row level security;
revoke all on table public.niveis from anon, authenticated;
grant select on table public.niveis to authenticated;

create table public.badges (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nome text not null,
  descricao text not null
);
insert into public.badges (codigo, nome, descricao) values
  ('primeira_curiosidade', 'Primeira Curiosidade', 'Fez sua primeira pergunta.'),
  ('mente_curiosa', 'Mente Curiosa', 'Explorou 5 áreas diferentes.'),
  ('sequencia_conhecimento', 'Sequência de Conhecimento', 'Aprendeu 7 dias seguidos.'),
  ('incansavel', 'Incansável', '30 dias de sequência.'),
  ('pensamento_critico', 'Pensamento Crítico', 'Resolveu 20 desafios difíceis com bom desempenho.');

alter table public.badges enable row level security;
revoke all on table public.badges from anon, authenticated;
grant select on table public.badges to authenticated;

create table public.usuario_badges (
  usuario_id uuid not null references public.profiles (id) on delete cascade,
  badge_id uuid not null references public.badges (id) on delete cascade,
  conquistado_em timestamptz not null default now(),
  primary key (usuario_id, badge_id)
);

alter table public.usuario_badges enable row level security;
revoke all on table public.usuario_badges from anon, authenticated;
grant select on table public.usuario_badges to authenticated;

create policy "usuario le as proprias badges"
  on public.usuario_badges for select
  using (auth.uid() = usuario_id or public.is_admin(auth.uid()));

create table public.desafios (
  id uuid primary key default gen_random_uuid(),
  pergunta_id uuid not null references public.perguntas (id) on delete cascade,
  usuario_id uuid not null references public.profiles (id) on delete cascade,
  enunciado text not null,
  dificuldade text not null check (dificuldade in ('facil', 'normal', 'dificil', 'avancado', 'mestre')),
  resposta_usuario text,
  nota int check (nota between 0 and 100),
  feedback_ia text,
  xp_ganho int,
  criado_em timestamptz not null default now(),
  avaliado_em timestamptz
);

alter table public.desafios enable row level security;
revoke all on table public.desafios from anon, authenticated;
grant select on table public.desafios to authenticated;

create policy "usuario le os proprios desafios"
  on public.desafios for select
  using (auth.uid() = usuario_id or public.is_admin(auth.uid()));

-- badge helper: concede uma badge se ainda não tiver, retorna true se foi nova
create or replace function public.conceder_badge(p_usuario_id uuid, p_codigo text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_badge_id uuid;
  v_novo boolean;
begin
  select id into v_badge_id from public.badges where codigo = p_codigo;
  if v_badge_id is null then
    return false;
  end if;

  insert into public.usuario_badges (usuario_id, badge_id)
  values (p_usuario_id, v_badge_id)
  on conflict do nothing;

  v_novo := found;
  return v_novo;
end;
$$;

-- cria um desafio a partir de uma pergunta do próprio usuário
create or replace function public.criar_desafio(
  p_pergunta_id uuid,
  p_enunciado text,
  p_dificuldade text
)
returns public.desafios
language plpgsql
security definer
set search_path = public
as $$
declare
  v_desafio public.desafios;
begin
  if not exists (select 1 from public.perguntas where id = p_pergunta_id and usuario_id = auth.uid()) then
    raise exception 'Pergunta não encontrada ou não pertence ao usuário.';
  end if;

  insert into public.desafios (pergunta_id, usuario_id, enunciado, dificuldade)
  values (p_pergunta_id, auth.uid(), p_enunciado, p_dificuldade)
  returning * into v_desafio;

  return v_desafio;
end;
$$;

revoke all on function public.criar_desafio(uuid, text, text) from public, anon;
grant execute on function public.criar_desafio(uuid, text, text) to authenticated;

-- avalia um desafio: calcula XP, atualiza streak/nível do perfil e badges,
-- tudo no banco (nunca confia em XP calculado no client) — ver SECURITY.md
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

  -- XP base por dificuldade
  v_base_xp := case v_desafio.dificuldade
    when 'facil' then 12
    when 'normal' then 25
    when 'dificil' then 50
    when 'avancado' then 75
    when 'mestre' then 125
  end;

  -- streak: dias consecutivos com pelo menos um desafio avaliado
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

  -- bônus de área nova: primeiro desafio avaliado do usuário nessa área
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

  select nivel_global, xp_total into v_nivel_anterior, v_xp_total_novo from public.profiles where id = auth.uid();
  v_xp_total_novo := v_xp_total_novo + v_xp_ganho;
  select max(nivel) into v_nivel_novo from public.niveis where xp_necessario <= v_xp_total_novo;

  update public.profiles
    set xp_total = v_xp_total_novo,
        nivel_global = v_nivel_novo,
        streak_atual = v_streak_novo,
        streak_recorde = greatest(streak_recorde, v_streak_novo)
    where id = auth.uid();

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
    'badges_novas', v_badges_novas
  );
end;
$$;

revoke all on function public.avaliar_desafio(uuid, text, int, text) from public, anon;
grant execute on function public.avaliar_desafio(uuid, text, int, text) to authenticated;

-- amplia registrar_pergunta (Fase 2) para conceder badges de curiosidade
create or replace function public.registrar_pergunta(
  p_texto text,
  p_resposta_ia text,
  p_area_nome text default null,
  p_area_slug text default null
)
returns public.perguntas
language plpgsql
security definer
set search_path = public
as $$
declare
  v_area_id uuid;
  v_pergunta public.perguntas;
  v_areas_distintas int;
begin
  if p_area_slug is not null then
    insert into public.areas (nome, slug, criado_por_ia)
    values (p_area_nome, p_area_slug, true)
    on conflict (slug) do update set nome = excluded.nome
    returning id into v_area_id;
  end if;

  insert into public.perguntas (usuario_id, area_id, texto, resposta_ia)
  values (auth.uid(), v_area_id, p_texto, p_resposta_ia)
  returning * into v_pergunta;

  perform public.conceder_badge(auth.uid(), 'primeira_curiosidade');

  select count(distinct area_id) into v_areas_distintas
    from public.perguntas where usuario_id = auth.uid() and area_id is not null;
  if v_areas_distintas >= 5 then
    perform public.conceder_badge(auth.uid(), 'mente_curiosa');
  end if;

  return v_pergunta;
end;
$$;
