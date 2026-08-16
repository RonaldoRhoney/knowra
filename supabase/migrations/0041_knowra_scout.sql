-- KnowRa — KNOWRA Scout Etapas Scout.1-Scout.2 (Source Registry)
-- Ver docs/foundation/KNOWRA_SCOUT.md e DECISIONS.md 2026-08-16.
--
-- ACHADO ao testar esta migration: fontes_externas já existia de verdade
-- (criada na Etapa 7c.1, migration 0037_concursos_hub.sql — schema básico,
-- 0 linhas, nunca usada até agora). KNOWRA_SCOUT.md tratou como "não
-- implementada" por engano. Corrigido aqui: ALTER TABLE aditivo em vez de
-- CREATE TABLE (que teria falhado — "relation already exists" foi
-- exatamente o erro pego testando em transação antes de aplicar de
-- verdade).

alter table public.fontes_externas
  add column access_method text check (access_method in ('rest', 'rss', 'sitemap', 'manual')),
  add column enabled boolean not null default true,
  add column priority int not null default 4 check (priority between 1 and 4),
  add column rate_limit text,
  add column concurso_id uuid references public.concursos (id) on delete set null,
  add column area_id uuid references public.areas (id) on delete set null,
  add column content_hash text,
  add column confidence numeric(4, 3) check (confidence between 0 and 1),
  add column ultima_mudanca_em timestamptz;

alter table public.fontes_externas
  add constraint fontes_externas_tipo_check
  check (tipo in ('edital', 'concurso_listagem', 'video', 'questao_publica', 'material', 'outro'));

-- RLS/revoke já estavam corretos desde 0037 (enable row level security +
-- revoke all from anon/authenticated) — nada a repetir aqui.

create function public.cadastrar_fonte_externa(
  p_nome text,
  p_url text,
  p_tipo text,
  p_access_method text,
  p_priority int default 4,
  p_rate_limit text default null,
  p_concurso_id uuid default null,
  p_area_id uuid default null,
  p_licenca_uso text default null,
  p_observacoes text default null
)
returns public.fontes_externas
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fonte public.fontes_externas;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Acesso negado.';
  end if;

  insert into public.fontes_externas
    (nome, url, tipo, access_method, priority, rate_limit, concurso_id, area_id, licenca_uso, observacoes)
  values
    (p_nome, p_url, p_tipo, p_access_method, greatest(1, least(coalesce(p_priority, 4), 4)),
     p_rate_limit, p_concurso_id, p_area_id, p_licenca_uso, p_observacoes)
  returning * into v_fonte;

  return v_fonte;
end;
$$;

revoke all on function public.cadastrar_fonte_externa(text, text, text, text, int, text, uuid, uuid, text, text) from public, anon;
grant execute on function public.cadastrar_fonte_externa(text, text, text, text, int, text, uuid, uuid, text, text) to authenticated;

-- Atualização usada tanto pelo admin (ex: desativar fonte instável) quanto
-- pelo script de ingestão (backend, via DATABASE_URL) depois de checar a
-- fonte — por isso aceita content_hash/status/ultima_consulta_em/
-- ultima_mudanca_em como parâmetros, todos opcionais (só atualiza o que
-- for passado).
create function public.atualizar_fonte_externa(
  p_id uuid,
  p_status text default null,
  p_enabled boolean default null,
  p_content_hash text default null,
  p_mudou boolean default false,
  p_observacoes text default null
)
returns public.fontes_externas
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fonte public.fontes_externas;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Acesso negado.';
  end if;
  if p_status is not null and p_status not in ('ativa', 'instavel', 'descontinuada') then
    raise exception 'Status inválido.';
  end if;

  update public.fontes_externas
    set status = coalesce(p_status, status),
        enabled = coalesce(p_enabled, enabled),
        content_hash = coalesce(p_content_hash, content_hash),
        observacoes = coalesce(p_observacoes, observacoes),
        ultima_consulta_em = now(),
        ultima_mudanca_em = case when p_mudou then now() else ultima_mudanca_em end
    where id = p_id
    returning * into v_fonte;

  if v_fonte is null then
    raise exception 'Fonte não encontrada.';
  end if;

  return v_fonte;
end;
$$;

revoke all on function public.atualizar_fonte_externa(uuid, text, boolean, text, boolean, text) from public, anon;
grant execute on function public.atualizar_fonte_externa(uuid, text, boolean, text, boolean, text) to authenticated;

create function public.listar_fontes_externas(p_tipo text default null)
returns setof public.fontes_externas
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Acesso negado.';
  end if;

  return query
  select * from public.fontes_externas
  where p_tipo is null or tipo = p_tipo
  order by priority asc, criado_em desc;
end;
$$;

revoke all on function public.listar_fontes_externas(text) from public, anon;
grant execute on function public.listar_fontes_externas(text) to authenticated;
