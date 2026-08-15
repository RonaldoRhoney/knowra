-- KnowRa — corrige ambiguidade de coluna "dia" em admin_demographics()

create or replace function public.admin_demographics()
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
    'dispositivos', (
      select coalesce(jsonb_agg(t), '[]'::jsonb) from (
        select dispositivo as nome, count(*) as total from public.sessoes
        group by dispositivo order by total desc
      ) t
    ),
    'paises', (
      select coalesce(jsonb_agg(t), '[]'::jsonb) from (
        select pais as nome, count(*) as total from public.sessoes
        where pais is not null group by pais order by total desc limit 8
      ) t
    ),
    'regioes', (
      select coalesce(jsonb_agg(t), '[]'::jsonb) from (
        select regiao as nome, count(*) as total from public.sessoes
        where regiao is not null group by regiao order by total desc limit 8
      ) t
    ),
    'faixas_etarias', (
      select coalesce(jsonb_agg(t), '[]'::jsonb) from (
        select faixa_etaria as nome, count(*) as total from public.profiles
        where faixa_etaria is not null and faixa_etaria <> 'prefiro_nao_informar'
        group by faixa_etaria
      ) t
    ),
    'generos', (
      select coalesce(jsonb_agg(t), '[]'::jsonb) from (
        select genero as nome, count(*) as total from public.profiles
        where genero is not null and genero <> 'prefiro_nao_informar'
        group by genero order by total desc
      ) t
    ),
    'frequencia_14_dias', (
      select coalesce(jsonb_agg(t), '[]'::jsonb) from (
        select to_char(g.dia, 'YYYY-MM-DD') as data, coalesce(p.cnt, 0) as total
        from generate_series(current_date - interval '13 days', current_date, interval '1 day') as g(dia)
        left join (
          select criado_em::date as dia, count(*) as cnt
          from public.perguntas
          where criado_em >= current_date - interval '13 days'
          group by criado_em::date
        ) p on p.dia = g.dia
        order by g.dia
      ) t
    )
  ) into v_resultado;

  return v_resultado;
end;
$$;
