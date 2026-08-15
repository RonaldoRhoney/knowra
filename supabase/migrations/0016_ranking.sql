-- KnowRa — Fase 6: Rankings
-- Leaderboard geral/por área, comparativo do usuário, privacidade (opt-in + nickname).
-- Regra de GAME_RULES.md §Ranking justo: farm não pode ganhar de desempenho consistente —
-- por isso o mínimo de avaliações antes de entrar no ranking. Algoritmo de rating em si
-- (Fase 5) continua provisório, não mexido aqui.

-- Opt-in explícito (default false): usuário nunca é exposto em ranking sem escolher isso.
alter table public.profiles add column aparecer_no_ranking boolean not null default false;
alter table public.profiles add column nickname text check (char_length(nickname) between 2 and 24);

-- nickname/aparecer_no_ranking seguem o mesmo padrão de nome/avatar_url: usuário só edita o próprio.
grant update (nickname, aparecer_no_ranking) on table public.profiles to authenticated;

-- mínimo de desafios avaliados pra entrar em qualquer ranking (evita "1 acerto de sorte no topo")
-- número provisório — ver GAME_RULES.md §Ranking justo.

-- ranking geral: só quem optou por aparecer e atingiu o mínimo. Nunca expõe nome real/e-mail/dado
-- demográfico — só nickname (ou um rótulo genérico), avatar, rating e nível.
create or replace function public.ranking_geral(p_limite int default 50)
returns table (
  posicao bigint,
  nickname text,
  avatar_url text,
  rating int,
  nivel_global int
)
language sql
security definer
set search_path = public
stable
as $$
  select
    row_number() over (order by p.rating desc, p.id) as posicao,
    coalesce(p.nickname, 'Explorador ' || substr(p.id::text, 1, 4)) as nickname,
    p.avatar_url,
    p.rating,
    p.nivel_global
  from public.profiles p
  where p.aparecer_no_ranking = true
    and (
      select count(*) from public.desafios d
      where d.usuario_id = p.id and d.avaliado_em is not null
    ) >= 5
  order by p.rating desc, p.id
  limit greatest(1, least(coalesce(p_limite, 50), 200));
$$;

revoke all on function public.ranking_geral(int) from public, anon;
grant execute on function public.ranking_geral(int) to authenticated;

-- ranking por área: usa dominio_pct (progresso_area, Fase 4) como métrica provisória —
-- mesmo princípio de "não é o algoritmo definitivo", só a fundação estrutural.
create or replace function public.ranking_por_area(p_area_id uuid, p_limite int default 50)
returns table (
  posicao bigint,
  nickname text,
  avatar_url text,
  dominio_pct numeric,
  total_desafios int
)
language sql
security definer
set search_path = public
stable
as $$
  select
    row_number() over (order by pa.dominio_pct desc, pa.usuario_id) as posicao,
    coalesce(p.nickname, 'Explorador ' || substr(p.id::text, 1, 4)) as nickname,
    p.avatar_url,
    pa.dominio_pct,
    pa.total_desafios
  from public.progresso_area pa
  join public.profiles p on p.id = pa.usuario_id
  where pa.area_id = p_area_id
    and p.aparecer_no_ranking = true
    and pa.total_desafios >= 5
  order by pa.dominio_pct desc, pa.usuario_id
  limit greatest(1, least(coalesce(p_limite, 50), 200));
$$;

revoke all on function public.ranking_por_area(uuid, int) from public, anon;
grant execute on function public.ranking_por_area(uuid, int) to authenticated;

-- comparativo do próprio usuário: posição/percentual/média — sempre calculado contra TODOS os
-- elegíveis (mínimo de avaliações atingido), independente de quem optou por aparecer publicamente.
-- Isso não expõe identidade de ninguém (só contagem agregada), então não fere a regra de opt-in.
create or replace function public.meu_ranking()
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_elegivel boolean;
  v_rating int;
  v_posicao bigint;
  v_total bigint;
  v_percentil numeric;
  v_media_rating numeric;
  v_por_area jsonb;
begin
  select p.rating into v_rating from public.profiles p where p.id = auth.uid();

  select count(*) >= 5 into v_elegivel
    from public.desafios d where d.usuario_id = auth.uid() and d.avaliado_em is not null;

  with elegiveis as (
    select p.id, p.rating
    from public.profiles p
    where (
      select count(*) from public.desafios d
      where d.usuario_id = p.id and d.avaliado_em is not null
    ) >= 5
  )
  select
    count(*) filter (where rating >= v_rating),
    count(*),
    round(avg(rating))
  into v_posicao, v_total, v_media_rating
  from elegiveis;

  if v_total > 0 then
    v_percentil := round(100.0 * v_posicao / v_total);
  end if;

  select jsonb_agg(jsonb_build_object(
    'area_id', pa.area_id,
    'area_nome', a.nome,
    'dominio_pct', pa.dominio_pct,
    'posicao', (
      select count(*) + 1 from public.progresso_area pa2
      where pa2.area_id = pa.area_id and pa2.dominio_pct > pa.dominio_pct and pa2.total_desafios >= 5
    ),
    'total_participantes', (
      select count(*) from public.progresso_area pa3
      where pa3.area_id = pa.area_id and pa3.total_desafios >= 5
    )
  ))
  into v_por_area
  from public.progresso_area pa
  join public.areas a on a.id = pa.area_id
  where pa.usuario_id = auth.uid() and pa.total_desafios >= 5;

  return jsonb_build_object(
    'elegivel', v_elegivel,
    'rating', v_rating,
    'posicao', v_posicao,
    'total_participantes', v_total,
    'percentil_top', v_percentil,
    'media_rating_plataforma', v_media_rating,
    'por_area', coalesce(v_por_area, '[]'::jsonb)
  );
end;
$$;

revoke all on function public.meu_ranking() from public, anon;
grant execute on function public.meu_ranking() to authenticated;
