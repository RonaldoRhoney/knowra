-- KnowRa — KNOWRA_AI, Etapa B: cache semântico em runtime
-- Ver docs/foundation/KNOWRA_AI.md §5, §6 e DECISIONS.md 2026-08-15.
--
-- Complementa (não substitui) respostas_canonicas: o cache exato continua
-- sendo a primeira checagem em askQuestion.ts (mais barato, sem precisar de
-- embedding). Só em cache-miss exato é que o embedding é gerado e a busca
-- semântica acontece. Em qualquer cache-miss completo, a resposta nova é
-- salva nos DOIS caches (exato + semântico), não só num.
--
-- Nenhum grant pra anon/authenticated — mesmo motivo da Etapa A e do mesmo
-- padrão já usado em salvar_resposta_canonica()/registrar_pergunta(): só o
-- backend, via DATABASE_URL, acessa essas funções (nunca PostgREST direto).

-- Dimensão fixa agora que o modelo está decidido (Xenova/all-MiniLM-L6-v2,
-- validado em deploy real — ver DECISIONS.md). Tabela está vazia (Etapa A
-- não populou nada), então o ALTER é seguro.
alter table public.knowledge_record
  alter column embedding type vector(384);

-- Busca por similaridade de cosseno. Limiar provisório e conservador
-- (0.90) — só responde pela memória quando a correspondência é muito forte;
-- qualquer coisa abaixo disso vai pra Anthropic como cache-miss normal.
-- Valores intermediários (0.70-0.89, "responde + sinaliza verificação") são
-- evolução futura, não implementados agora — ver KNOWRA_AI.md §8.
create or replace function public.buscar_conhecimento_semantico(
  p_embedding vector(384),
  p_limiar numeric default 0.90
)
returns table (
  id uuid,
  answer text,
  topic text,
  subcategory text,
  similaridade numeric
)
language sql
stable
set search_path = public
as $$
  select id, answer, topic, subcategory,
    round((1 - (embedding <=> p_embedding))::numeric, 4) as similaridade
  from public.knowledge_record
  where status = 'valido'
    and 1 - (embedding <=> p_embedding) >= p_limiar
  order by embedding <=> p_embedding
  limit 1;
$$;

create or replace function public.salvar_conhecimento(
  p_question text,
  p_normalized_question text,
  p_embedding vector(384),
  p_answer text,
  p_topic text,
  p_subcategory text,
  p_source text,
  p_confidence numeric default 0.95
)
returns void
language plpgsql
set search_path = public
as $$
begin
  insert into public.knowledge_record
    (question, normalized_question, embedding, answer, topic, subcategory, source, confidence, last_verified_at)
  values
    (p_question, p_normalized_question, p_embedding, p_answer, p_topic, p_subcategory, p_source, p_confidence, now());
end;
$$;

create or replace function public.registrar_uso_conhecimento(p_id uuid)
returns void
language sql
set search_path = public
as $$
  update public.knowledge_record set times_used = times_used + 1 where id = p_id;
$$;

revoke all on function public.buscar_conhecimento_semantico(vector, numeric) from public, anon, authenticated;
revoke all on function public.salvar_conhecimento(text, text, vector, text, text, text, text, numeric) from public, anon, authenticated;
revoke all on function public.registrar_uso_conhecimento(uuid) from public, anon, authenticated;
