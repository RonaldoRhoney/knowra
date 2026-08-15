-- KnowRa — completar cadastro pós-login (nome, cidade, país, idade, gênero)
-- substitui faixa_etaria (bucket fixo) por idade exata, opcional

alter table public.profiles drop column faixa_etaria;
alter table public.profiles add column idade int check (idade is null or idade between 1 and 120);
alter table public.profiles add column cidade text;
alter table public.profiles add column pais text;

drop function if exists public.atualizar_demografia(text, text);

create or replace function public.completar_cadastro(
  p_nome text,
  p_cidade text,
  p_pais text,
  p_idade int,
  p_genero text
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
begin
  if p_idade is not null and (p_idade < 1 or p_idade > 120) then
    raise exception 'Idade inválida.';
  end if;

  update public.profiles
    set nome = coalesce(nullif(trim(p_nome), ''), nome),
        cidade = nullif(trim(p_cidade), ''),
        pais = nullif(trim(p_pais), ''),
        idade = p_idade,
        genero = p_genero,
        dados_demograficos_consentidos_em = now()
    where id = auth.uid()
    returning * into v_profile;

  return v_profile;
end;
$$;

revoke all on function public.completar_cadastro(text, text, text, int, text) from public, anon;
grant execute on function public.completar_cadastro(text, text, text, int, text) to authenticated;

-- admin_demographics(): troca faixa_etaria (coluna removida) por faixa calculada a partir de idade,
-- e adiciona cidades autodeclaradas
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
    'cidades', (
      select coalesce(jsonb_agg(t), '[]'::jsonb) from (
        select cidade as nome, count(*) as total from public.profiles
        where cidade is not null group by cidade order by total desc limit 8
      ) t
    ),
    'faixas_etarias', (
      select coalesce(jsonb_agg(t), '[]'::jsonb) from (
        select
          case
            when idade < 18 then '<18'
            when idade between 18 and 24 then '18-24'
            when idade between 25 and 34 then '25-34'
            when idade between 35 and 44 then '35-44'
            when idade between 45 and 54 then '45-54'
            else '55+'
          end as nome,
          count(*) as total
        from public.profiles
        where idade is not null
        group by 1
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
