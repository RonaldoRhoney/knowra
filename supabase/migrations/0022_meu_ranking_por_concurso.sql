-- KnowRa — Fase 7b: meu_ranking() ganha bloco por_concurso, mesmo molde de por_area.

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
  v_por_concurso jsonb;
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

  select jsonb_agg(jsonb_build_object(
    'concurso_id', pc.concurso_id,
    'concurso_nome', c.nome,
    'dominio_pct', pc.dominio_pct,
    'posicao', (
      select count(*) + 1 from public.progresso_concurso pc2
      where pc2.concurso_id = pc.concurso_id and pc2.dominio_pct > pc.dominio_pct
        and pc2.total_questoes_validas >= 5
    ),
    'total_participantes', (
      select count(*) from public.progresso_concurso pc3
      where pc3.concurso_id = pc.concurso_id and pc3.total_questoes_validas >= 5
    )
  ))
  into v_por_concurso
  from public.progresso_concurso pc
  join public.concursos c on c.id = pc.concurso_id
  where pc.usuario_id = auth.uid() and pc.total_questoes_validas >= 5;

  return jsonb_build_object(
    'elegivel', v_elegivel,
    'rating', v_rating,
    'posicao', v_posicao,
    'total_participantes', v_total,
    'percentil_top', v_percentil,
    'media_rating_plataforma', v_media_rating,
    'por_area', coalesce(v_por_area, '[]'::jsonb),
    'por_concurso', coalesce(v_por_concurso, '[]'::jsonb)
  );
end;
$$;

revoke all on function public.meu_ranking() from public, anon;
grant execute on function public.meu_ranking() to authenticated;
