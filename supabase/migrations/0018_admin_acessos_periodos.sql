-- KnowRa — contador de acesso no Painel ADM, quebrado por período
-- Ajuste do contador da migration anterior: em vez de só total+hoje, agora também
-- semana/mês/ano corrente. Continua reaproveitando a tabela sessoes, sem novo tracking.

create or replace function public.admin_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_resultado jsonb;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Acesso negado.';
  end if;

  select jsonb_build_object(
    'total_usuarios', (select count(*) from public.profiles),
    'total_perguntas', (select count(*) from public.perguntas),
    'total_desafios_avaliados', (select count(*) from public.desafios where avaliado_em is not null),
    'xp_distribuido', (select coalesce(sum(xp_total), 0) from public.profiles),
    'total_acessos', (select count(*) from public.sessoes),
    'acessos_hoje', (select count(*) from public.sessoes where criado_em >= date_trunc('day', now())),
    'acessos_semana', (select count(*) from public.sessoes where criado_em >= date_trunc('week', now())),
    'acessos_mes', (select count(*) from public.sessoes where criado_em >= date_trunc('month', now())),
    'acessos_ano', (select count(*) from public.sessoes where criado_em >= date_trunc('year', now())),
    'top_areas', (
      select coalesce(jsonb_agg(t), '[]'::jsonb) from (
        select a.nome, count(*) as total
        from public.perguntas p
        join public.areas a on a.id = p.area_id
        group by a.nome
        order by total desc
        limit 6
      ) t
    )
  ) into v_resultado;

  return v_resultado;
end;
$$;

revoke all on function public.admin_stats() from public, anon;
grant execute on function public.admin_stats() to authenticated;
