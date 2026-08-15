-- KnowRa — dados demográficos opcionais (consentimento) + sessões (dispositivo/região/país)

alter table public.profiles
  add column faixa_etaria text check (faixa_etaria in ('<18', '18-24', '25-34', '35-44', '45-54', '55+', 'prefiro_nao_informar')),
  add column genero text check (genero in ('feminino', 'masculino', 'nao_binario', 'prefiro_nao_informar')),
  add column dados_demograficos_consentidos_em timestamptz;

create table public.sessoes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.profiles (id) on delete cascade,
  dispositivo text not null check (dispositivo in ('mobile', 'tablet', 'desktop')),
  pais text,
  regiao text,
  criado_em timestamptz not null default now()
);

alter table public.sessoes enable row level security;
revoke all on table public.sessoes from anon, authenticated;
-- sem SELECT direto pro client: só leitura agregada via admin_demographics()

-- usuário atualiza os próprios dados demográficos, sempre com consentimento explícito
create or replace function public.atualizar_demografia(p_faixa_etaria text, p_genero text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
begin
  update public.profiles
    set faixa_etaria = p_faixa_etaria,
        genero = p_genero,
        dados_demograficos_consentidos_em = now()
    where id = auth.uid()
    returning * into v_profile;

  return v_profile;
end;
$$;

revoke all on function public.atualizar_demografia(text, text) from public, anon;
grant execute on function public.atualizar_demografia(text, text) to authenticated;

-- registra uma sessão (chamado pelo backend a cada login) — sem guardar IP bruto
create or replace function public.registrar_sessao(p_dispositivo text, p_pais text, p_regiao text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.sessoes (usuario_id, dispositivo, pais, regiao)
  values (auth.uid(), p_dispositivo, p_pais, p_regiao);
end;
$$;

revoke all on function public.registrar_sessao(text, text, text) from public, anon;
grant execute on function public.registrar_sessao(text, text, text) to authenticated;

-- métricas demográficas agregadas pro Painel ADM (só admin, nunca dado individual exposto)
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
        select to_char(dia, 'YYYY-MM-DD') as data, coalesce(cnt, 0) as total
        from generate_series(current_date - interval '13 days', current_date, interval '1 day') as dia
        left join (
          select criado_em::date as dia, count(*) as cnt
          from public.perguntas
          where criado_em >= current_date - interval '13 days'
          group by criado_em::date
        ) p on p.dia = dia::date
        order by dia
      ) t
    )
  ) into v_resultado;

  return v_resultado;
end;
$$;

revoke all on function public.admin_demographics() from public, anon;
grant execute on function public.admin_demographics() to authenticated;
