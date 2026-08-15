-- KnowRa — cache de respostas canônicas (redução de custo de IA)
-- Prioridade #1 da estratégia de sustentabilidade financeira: perguntas com o
-- mesmo texto normalizado reaproveitam a resposta já gerada pela IA, sem nova
-- chamada à Anthropic. Cache exato (normalização de texto), não semântico —
-- semântico/embeddings fica como evolução futura, registrado em DECISIONS.md.

create extension if not exists unaccent;

create or replace function public.normalizar_pergunta(p_texto text)
returns text
language sql
stable
as $$
  select trim(
    regexp_replace(
      trim(regexp_replace(unaccent(lower(p_texto)), '\s+', ' ', 'g')),
      '[?!.]+$', ''
    )
  );
$$;

create table public.respostas_canonicas (
  id uuid primary key default gen_random_uuid(),
  pergunta_normalizada text not null unique,
  pergunta_original text not null,
  resposta_ia text not null,
  area_nome text,
  area_slug text,
  requer_verificacao boolean not null default false,
  observacao_verificacao text,
  reaproveitada_count int not null default 0,
  criado_em timestamptz not null default now()
);

alter table public.respostas_canonicas enable row level security;
revoke all on table public.respostas_canonicas from anon, authenticated;
-- sem grant de select direto: acesso só via RPC (busca já incrementa o contador
-- de reaproveitamento atomicamente, e mantém o texto original fora de leitura livre)

-- Busca + incrementa reaproveitada_count atomicamente (evita corrida leitura+escrita
-- separadas). Retorna encontrado=false (sem lançar erro) em cache miss.
create or replace function public.buscar_resposta_canonica(p_pergunta text)
returns table (
  resposta_ia text,
  area_nome text,
  area_slug text,
  requer_verificacao boolean,
  observacao_verificacao text,
  encontrado boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_normalizada text := public.normalizar_pergunta(p_pergunta);
  v_row public.respostas_canonicas;
begin
  update public.respostas_canonicas
    set reaproveitada_count = reaproveitada_count + 1
    where pergunta_normalizada = v_normalizada
    returning * into v_row;

  if v_row is null then
    return query select null::text, null::text, null::text, null::boolean, null::text, false;
  else
    return query select v_row.resposta_ia, v_row.area_nome, v_row.area_slug,
                        v_row.requer_verificacao, v_row.observacao_verificacao, true;
  end if;
end;
$$;

revoke all on function public.buscar_resposta_canonica(text) from public, anon;
grant execute on function public.buscar_resposta_canonica(text) to authenticated;

-- Grava no cache após uma chamada real de IA (cache miss). Qualquer usuário
-- autenticado pode "primeiro perguntar" e assim popular o cache pros próximos —
-- não é admin-only, é exatamente o mecanismo pretendido. ON CONFLICT DO NOTHING
-- protege contra corrida de duas perguntas idênticas simultâneas.
create or replace function public.salvar_resposta_canonica(
  p_pergunta text,
  p_resposta_ia text,
  p_area_nome text,
  p_area_slug text,
  p_requer_verificacao boolean default false,
  p_observacao_verificacao text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.respostas_canonicas
    (pergunta_normalizada, pergunta_original, resposta_ia, area_nome, area_slug,
     requer_verificacao, observacao_verificacao)
  values
    (public.normalizar_pergunta(p_pergunta), p_pergunta, p_resposta_ia, p_area_nome, p_area_slug,
     coalesce(p_requer_verificacao, false), p_observacao_verificacao)
  on conflict (pergunta_normalizada) do nothing;
end;
$$;

revoke all on function public.salvar_resposta_canonica(text, text, text, text, boolean, text) from public, anon;
grant execute on function public.salvar_resposta_canonica(text, text, text, text, boolean, text) to authenticated;

-- Observabilidade: quanto o cache está economizando (custo por usuário deve
-- virar métrica de produto, já registrado em AI_ENGINE.md §Custo de IA).
create or replace function public.admin_cache_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Acesso negado.';
  end if;

  return jsonb_build_object(
    'total_respostas_unicas', (select count(*) from public.respostas_canonicas),
    'total_reaproveitamentos', (select coalesce(sum(reaproveitada_count), 0) from public.respostas_canonicas),
    'top_reaproveitadas', (
      select coalesce(jsonb_agg(t), '[]'::jsonb) from (
        select pergunta_original, reaproveitada_count
        from public.respostas_canonicas
        where reaproveitada_count > 0
        order by reaproveitada_count desc
        limit 10
      ) t
    )
  );
end;
$$;

revoke all on function public.admin_cache_stats() from public, anon;
grant execute on function public.admin_cache_stats() to authenticated;
