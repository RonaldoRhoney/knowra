-- KnowRa — KNOWRA_AI Etapa H: RAG Retrieval Engine híbrido
-- Ver docs/foundation/KNOWRA_AI.md §9 e DECISIONS.md 2026-08-15.
--
-- Diferença em relação ao que já existia (Etapa B/D, buscar_conhecimento_semantico):
-- aquela função serve UMA resposta pronta direto da memória (cache). Esta função
-- (buscar_contexto_rag) devolve TOP-K registros relacionados como CONTEXTO pra
-- alimentar uma nova geração da IA — RAG de verdade (retrieval-augmented
-- generation), não só cache. As duas convivem: a primeira continua sendo a
-- checagem "responde direto sem gastar IA?"; esta entra só quando aquela dá miss,
-- imediatamente antes de chamar a Anthropic.
--
-- Full Text Search nativo do Postgres (to_tsvector/plainto_tsquery, config
-- "portuguese") — nenhuma extensão nova, mesmo espírito de custo-zero já
-- aplicado a pgvector. Reranking é a combinação de score vetorial + score
-- textual (fórmula simples, não um modelo separado — over-engineering pro
-- volume de dado atual).

alter table public.knowledge_record
  add column search_vector tsvector
  generated always as (
    to_tsvector('portuguese', coalesce(question, '') || ' ' || coalesce(answer, '') || ' ' || coalesce(topic, ''))
  ) stored;

create index knowledge_record_search_vector_idx on public.knowledge_record using gin (search_vector);

-- Índice de similaridade vetorial (ivfflat/hnsw) continua propositalmente
-- fora daqui — KNOWRA_AI.md já registra que isso fica pra quando o volume
-- de linhas justificar (tabela ainda pequena, scan sequencial é rápido o
-- bastante e ivfflat mal calibrado com poucos dados fica pior que sem índice).

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
  score numeric
)
language sql
stable
set search_path = public
as $$
  select
    id, answer, topic, source, confidence,
    round((
      (0.7 * (1 - (embedding <=> p_embedding)))
      + (0.3 * coalesce(ts_rank(search_vector, plainto_tsquery('portuguese', p_texto_busca)), 0))
    )::numeric, 4) as score
  from public.knowledge_record
  where embedding is not null
    -- Mesmo piso de confiabilidade do Confidence Engine (Etapa D) — conteúdo
    -- abaixo disso nunca é servido da memória, nem como resposta pronta nem
    -- como contexto de geração (regra de anti-contaminação, KNOWRA_AI.md §3).
    and status = 'valido'
    and confidence >= 0.70
    and (p_topic is null or topic = p_topic)
    and (
      -- Piso solto de relevância (0.50) pra não trazer contexto totalmente
      -- desconexo só porque bateu alguma palavra no full text — qualquer um
      -- dos dois sinais (vetorial OU textual) já qualifica pra entrar no
      -- ranking, o corte de qualidade real é o "order by score desc limit".
      (1 - (embedding <=> p_embedding)) >= 0.50
      or search_vector @@ plainto_tsquery('portuguese', p_texto_busca)
    )
  order by score desc
  limit p_limite;
$$;

-- Mesma postura de segurança de todo o resto do KNOWRA_AI (Etapas A/B/D):
-- só o backend, via DATABASE_URL, chama esta função — nunca PostgREST direto.
revoke all on function public.buscar_contexto_rag(vector, text, text, int) from public, anon, authenticated;
