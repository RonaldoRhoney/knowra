-- KnowRa — KNOWRA_AI Etapa I: Source Provenance (taxonomia de confiança)
-- Ver docs/foundation/KNOWRA_AI.md §10 e DECISIONS.md 2026-08-15.
--
-- `source` (já existe desde a Etapa A) mistura duas coisas diferentes:
-- ORIGEM (de onde veio o dado) e, implicitamente, CONFIABILIDADE. Esta
-- migration separa a dimensão de confiabilidade numa coluna própria,
-- ortogonal a `status` (que é sobre ciclo de vida/validação, não sobre
-- proveniência) e a `confidence` (que é o score numérico já existente).
--
-- VERIFIED     — fonte oficial confirmada (ex: source em wikimedia/wikidata/
--                dados_gov_br/ibge, com source_url preenchida de verdade)
-- COMMUNITY    — inserido manualmente (source='manual'), sem confirmação externa
-- AI_GENERATED — resposta da IA sem fonte externa confirmando (caso mais comum hoje)
-- UNVERIFIED   — default pra qualquer caso que não se encaixa nos anteriores
-- OUTDATED     — marcado manualmente pelo admin quando o motivo é "informação
--                antiga", distinto de "invalidado por estar errado" (status já cobre isso)
--
-- Regra de anti-contaminação (KNOWRA_AI.md §3/§10): promoção de proveniência
-- NUNCA é automática por volume de uso — só admin, via promover_provenance().

alter table public.knowledge_record
  add column provenance text not null default 'unverified'
  check (provenance in ('verified', 'community', 'ai_generated', 'unverified', 'outdated'));

-- Backfill das linhas que já existem (Etapas B/D já podem ter gravado
-- conhecimento em produção) — mesma regra que passa a valer pra linhas novas.
update public.knowledge_record
  set provenance = case
    when source in ('wikimedia', 'wikidata', 'dados_gov_br', 'ibge') and source_url is not null then 'verified'
    when source = 'anthropic' then 'ai_generated'
    when source = 'manual' then 'community'
    else 'unverified'
  end;

-- salvar_conhecimento(): mesma assinatura de antes (Etapa I não muda o
-- contrato de chamada do backend) — só passa a computar provenance
-- internamente, regra centralizada num único lugar (o banco), não
-- duplicada em TypeScript.
create or replace function public.salvar_conhecimento(
  p_question text,
  p_normalized_question text,
  p_embedding vector(384),
  p_answer text,
  p_topic text,
  p_subcategory text,
  p_source text,
  p_confidence numeric default 0.95,
  p_source_url text default null,
  p_source_title text default null,
  p_video_url text default null,
  p_video_title text default null
)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_provenance text := case
    when p_source in ('wikimedia', 'wikidata', 'dados_gov_br', 'ibge') and p_source_url is not null then 'verified'
    when p_source = 'anthropic' then 'ai_generated'
    when p_source = 'manual' then 'community'
    else 'unverified'
  end;
begin
  insert into public.knowledge_record
    (question, normalized_question, embedding, answer, topic, subcategory, source, confidence,
     last_verified_at, source_url, source_title, video_url, video_title, provenance)
  values
    (p_question, p_normalized_question, p_embedding, p_answer, p_topic, p_subcategory, p_source, p_confidence,
     now(), p_source_url, p_source_title, p_video_url, p_video_title, v_provenance);
end;
$$;

revoke all on function public.salvar_conhecimento(text, text, vector, text, text, text, text, numeric, text, text, text, text) from public, anon, authenticated;

-- buscar_conhecimento_semantico() e buscar_contexto_rag() passam a expor
-- provenance no resultado (transparência pra quando o frontend/admin
-- quiser mostrar) — mudança de "returns table" exige DROP + CREATE (não
-- "create or replace"), mesmo cuidado já registrado no achado de 0027.
drop function if exists public.buscar_conhecimento_semantico(vector, numeric);

create function public.buscar_conhecimento_semantico(
  p_embedding vector(384),
  p_limiar_similaridade numeric default 0.90
)
returns table (
  id uuid,
  answer text,
  topic text,
  subcategory text,
  similaridade numeric,
  confidence numeric,
  requer_verificacao boolean,
  provenance text,
  fonte_url text,
  fonte_titulo text,
  video_url text,
  video_titulo text
)
language sql
stable
set search_path = public
as $$
  select id, answer, topic, subcategory,
    round((1 - (embedding <=> p_embedding))::numeric, 4) as similaridade,
    confidence,
    (confidence < 0.90 or status = 'requer_revalidacao') as requer_verificacao,
    provenance,
    source_url as fonte_url, source_title as fonte_titulo,
    video_url, video_title as video_titulo
  from public.knowledge_record
  where status in ('valido', 'requer_revalidacao')
    and confidence >= 0.70
    and 1 - (embedding <=> p_embedding) >= p_limiar_similaridade
  order by embedding <=> p_embedding
  limit 1;
$$;

revoke all on function public.buscar_conhecimento_semantico(vector, numeric) from public, anon, authenticated;

drop function if exists public.buscar_contexto_rag(vector, text, text, int);

create function public.buscar_contexto_rag(
  p_embedding vector(384),
  p_texto_busca text,
  p_topic text default null,
  p_limite int default 5
)
returns table (
  id uuid,
  answer text,
  topic text,
  source text,
  confidence numeric,
  provenance text,
  score numeric
)
language sql
stable
set search_path = public
as $$
  select
    id, answer, topic, source, confidence, provenance,
    round((
      (0.7 * (1 - (embedding <=> p_embedding)))
      + (0.3 * coalesce(ts_rank(search_vector, plainto_tsquery('portuguese', p_texto_busca)), 0))
    )::numeric, 4) as score
  from public.knowledge_record
  where embedding is not null
    and status = 'valido'
    and confidence >= 0.70
    and (p_topic is null or topic = p_topic)
    and (
      (1 - (embedding <=> p_embedding)) >= 0.50
      or search_vector @@ plainto_tsquery('portuguese', p_texto_busca)
    )
  order by score desc
  limit p_limite;
$$;

revoke all on function public.buscar_contexto_rag(vector, text, text, int) from public, anon, authenticated;

-- Caminho manual de promoção/rebaixamento de proveniência — sempre ação
-- explícita do admin, nunca automática (regra de anti-contaminação).
-- Mesmo padrão de segurança de revisar_conhecimento(): security definer,
-- checa is_admin() internamente, liberado pra "authenticated" chamar (a
-- própria função rejeita quem não é admin).
create function public.promover_provenance(p_id uuid, p_provenance text)
returns public.knowledge_record
language plpgsql
security definer
set search_path = public
as $$
declare
  v_registro public.knowledge_record;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Acesso negado.';
  end if;
  if p_provenance not in ('verified', 'community', 'ai_generated', 'unverified', 'outdated') then
    raise exception 'Proveniência inválida.';
  end if;

  update public.knowledge_record
    set provenance = p_provenance,
        updated_at = now()
    where id = p_id
    returning * into v_registro;

  if v_registro is null then
    raise exception 'Registro não encontrado.';
  end if;

  return v_registro;
end;
$$;

revoke all on function public.promover_provenance(uuid, text) from public, anon;
grant execute on function public.promover_provenance(uuid, text) to authenticated;
