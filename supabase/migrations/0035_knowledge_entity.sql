-- KnowRa — KNOWRA_AI Etapa J: Knowledge Entity (granularidade = tema/conceito)
-- Ver docs/foundation/KNOWRA_AI.md §11 e DECISIONS.md 2026-08-16.
--
-- Decisão do Ronaldo: a "entidade de conhecimento" (Knowledge Entity) é o
-- tema/conceito — mesma granularidade que a árvore de áreas (`areas`) já usa
-- desde a Fase 2 pra classificar perguntas, com dedup por slug ("reaproveita
-- área existente" — KNOWLEDGE_MODEL.md). Em vez de criar uma tabela nova de
-- "entidade", reaproveitamos `areas`: ela já É o conceito de entidade que a
-- proposta original descrevia ("Constituição Federal" como nó central com
-- múltiplas facetas) — só faltava `knowledge_record` (a memória de RAG) se
-- ligar a ela por id, em vez de um campo `topic` solto em texto livre sem
-- deduplicação garantida.
--
-- Ganho real: perguntas diferentes que a IA classifica na mesma área (ex:
-- "O que é a Constituição Federal?" e "Quando a Constituição foi promulgada?")
-- passam a apontar pro MESMO knowledge_record.area_id — agrupamento e futura
-- correção em nível de entidade ficam possíveis sem inferência automática
-- nem chamada de IA nova (mesmo princípio de custo-zero já aplicado à
-- Etapa E, Knowledge Graph).

alter table public.knowledge_record
  add column area_id uuid references public.areas (id) on delete set null;

-- Extrai a lógica de upsert-por-slug que já existia (duplicada seria) inline
-- em registrar_pergunta() pra uma função própria, reutilizável também por
-- salvar_conhecimento() — garante que os dois caminhos (pergunta registrada
-- E conhecimento gravado pra memória) resolvem pra exatamente a MESMA linha
-- de `areas` quando a classificação da IA for a mesma, em vez de duas
-- inserções independentes arriscando divergir.
create function public.upsert_area(p_nome text, p_slug text)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_area_id uuid;
begin
  insert into public.areas (nome, slug, criado_por_ia)
  values (p_nome, p_slug, true)
  on conflict (slug) do update set nome = excluded.nome
  returning id into v_area_id;

  return v_area_id;
end;
$$;

revoke all on function public.upsert_area(text, text) from public, anon, authenticated;

create or replace function public.registrar_pergunta(
  p_texto text,
  p_resposta_ia text,
  p_area_nome text default null,
  p_area_slug text default null,
  p_requer_verificacao boolean default false,
  p_observacao_verificacao text default null,
  p_fonte_url text default null,
  p_fonte_titulo text default null,
  p_video_url text default null,
  p_video_titulo text default null
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
    v_area_id := public.upsert_area(p_area_nome, p_area_slug);
  end if;

  insert into public.perguntas
    (usuario_id, area_id, texto, resposta_ia, requer_verificacao, observacao_verificacao,
     fonte_url, fonte_titulo, video_url, video_titulo)
  values
    (auth.uid(), v_area_id, p_texto, p_resposta_ia, p_requer_verificacao, p_observacao_verificacao,
     p_fonte_url, p_fonte_titulo, p_video_url, p_video_titulo)
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

-- create or replace mantém a mesma assinatura de antes (0032) — grants não
-- mudam, mas revogar de novo é barato e remove qualquer dúvida.
revoke all on function public.registrar_pergunta(text, text, text, text, boolean, text, text, text, text, text) from public, anon, authenticated;

-- salvar_conhecimento(): novo parâmetro p_area_slug (opcional) — muda a
-- assinatura, exige DROP + CREATE (mesmo cuidado de sempre nesta etapa).
drop function if exists public.salvar_conhecimento(text, text, vector, text, text, text, text, numeric, text, text, text, text);

create function public.salvar_conhecimento(
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
  p_video_title text default null,
  p_area_slug text default null
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
  v_area_id uuid;
begin
  if p_area_slug is not null then
    v_area_id := public.upsert_area(p_topic, p_area_slug);
  end if;

  insert into public.knowledge_record
    (question, normalized_question, embedding, answer, topic, subcategory, source, confidence,
     last_verified_at, source_url, source_title, video_url, video_title, provenance, area_id)
  values
    (p_question, p_normalized_question, p_embedding, p_answer, p_topic, p_subcategory, p_source, p_confidence,
     now(), p_source_url, p_source_title, p_video_url, p_video_title, v_provenance, v_area_id);
end;
$$;

revoke all on function public.salvar_conhecimento(text, text, vector, text, text, text, text, numeric, text, text, text, text, text) from public, anon, authenticated;

-- buscar_contexto_rag(): expõe area_id no resultado (útil pra um consumidor
-- futuro agrupar/filtrar por entidade — ver KNOWRA_AI.md §12, não wired
-- ainda em askQuestion.ts porque a área da pergunta atual só é conhecida
-- DEPOIS da IA responder, não antes de buscar o contexto).
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
  area_id uuid,
  score numeric
)
language sql
stable
set search_path = public
as $$
  select
    id, answer, topic, source, confidence, provenance, area_id,
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

-- Backfill best-effort das linhas que já existem: casa knowledge_record.topic
-- (texto livre) com areas.nome (mesma classificação da IA, já que topic foi
-- sempre preenchido a partir de area_nome em askQuestion.ts) — não é garantido
-- 100% (nome pode ter mudado desde então), mas é a melhor correspondência
-- disponível sem inferência nova.
update public.knowledge_record kr
  set area_id = a.id
  from public.areas a
  where kr.area_id is null
    and kr.topic is not null
    and lower(trim(kr.topic)) = lower(trim(a.nome));
