-- KnowRa — Fonte real + vídeo (API pública, licença aberta) na resposta
-- Ver DECISIONS.md 2026-08-15 ("Fonte, vídeo e leitura em voz alta").
--
-- Fonte/vídeo NUNCA vêm da IA — são resultado de busca real (Wikipedia
-- opensearch + YouTube Data API filtrado por licença Creative Commons),
-- feita pelo backend só quando a pergunta é realmente nova (cache miss
-- total, o mesmo ponto que já chama a Anthropic). Cache hit (exato ou
-- semântico) reaproveita o que já foi buscado — mesma filosofia de custo
-- zero já aplicada em todo o resto do KNOWRA_AI, e evita estourar a quota
-- gratuita do YouTube (10000 unidades/dia, ~100 buscas) numa pergunta que
-- já tinha sido feita antes.
--
-- Se a busca não encontrar nada, o campo fica NULL — nunca um link
-- inventado, mesma regra já aplicada a observacao_verificacao.

alter table public.respostas_canonicas add column fonte_url text;
alter table public.respostas_canonicas add column fonte_titulo text;
alter table public.respostas_canonicas add column video_url text;
alter table public.respostas_canonicas add column video_titulo text;

-- knowledge_record já tinha source_url (Etapa A) sem uso ainda — reaproveitado
-- em vez de duplicar coluna. source_title/video_* são novos.
alter table public.knowledge_record add column source_title text;
alter table public.knowledge_record add column video_url text;
alter table public.knowledge_record add column video_title text;

alter table public.perguntas add column fonte_url text;
alter table public.perguntas add column fonte_titulo text;
alter table public.perguntas add column video_url text;
alter table public.perguntas add column video_titulo text;

-- === buscar_resposta_canonica: precisa devolver os 4 campos novos ===
-- Mudar a lista de colunas do "returns table" não é compatível com
-- "create or replace function" — precisa DROP + CREATE (ver DECISIONS.md,
-- achado do bypass de avaliar_desafio: função nova = grants NOVOS,
-- perdendo o que a versão anterior tinha).
drop function if exists public.buscar_resposta_canonica(text);

create function public.buscar_resposta_canonica(p_pergunta text)
returns table (
  resposta_ia text,
  area_nome text,
  area_slug text,
  requer_verificacao boolean,
  observacao_verificacao text,
  fonte_url text,
  fonte_titulo text,
  video_url text,
  video_titulo text,
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
    return query select null::text, null::text, null::text, null::boolean, null::text,
                        null::text, null::text, null::text, null::text, false;
  else
    return query select v_row.resposta_ia, v_row.area_nome, v_row.area_slug,
                        v_row.requer_verificacao, v_row.observacao_verificacao,
                        v_row.fonte_url, v_row.fonte_titulo, v_row.video_url, v_row.video_titulo,
                        true;
  end if;
end;
$$;

revoke all on function public.buscar_resposta_canonica(text) from public, anon;
grant execute on function public.buscar_resposta_canonica(text) to authenticated;

-- === salvar_resposta_canonica: 4 parâmetros novos, opcionais ===
-- Assinatura muda (mais parâmetros) => overload novo, não substitui a
-- antiga sozinho. DROP explícito da antiga primeiro.
drop function if exists public.salvar_resposta_canonica(text, text, text, text, boolean, text);

create function public.salvar_resposta_canonica(
  p_pergunta text,
  p_resposta_ia text,
  p_area_nome text,
  p_area_slug text,
  p_requer_verificacao boolean default false,
  p_observacao_verificacao text default null,
  p_fonte_url text default null,
  p_fonte_titulo text default null,
  p_video_url text default null,
  p_video_titulo text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.respostas_canonicas
    (pergunta_normalizada, pergunta_original, resposta_ia, area_nome, area_slug,
     requer_verificacao, observacao_verificacao, fonte_url, fonte_titulo, video_url, video_titulo)
  values
    (public.normalizar_pergunta(p_pergunta), p_pergunta, p_resposta_ia, p_area_nome, p_area_slug,
     coalesce(p_requer_verificacao, false), p_observacao_verificacao,
     p_fonte_url, p_fonte_titulo, p_video_url, p_video_titulo)
  on conflict (pergunta_normalizada) do nothing;
end;
$$;

-- Mesma postura de segurança de 0027: só o backend (DATABASE_URL) chama
-- esta função. EXECUTE de função nova é concedido a PUBLIC por padrão —
-- revogar explicitamente, não herda o revoke da função antiga.
revoke all on function public.salvar_resposta_canonica(text, text, text, text, boolean, text, text, text, text, text) from public, anon, authenticated;

-- === salvar_conhecimento / buscar_conhecimento_semantico: mesma extensão ===
drop function if exists public.salvar_conhecimento(text, text, vector, text, text, text, text, numeric);

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
  p_video_title text default null
)
returns void
language plpgsql
set search_path = public
as $$
begin
  insert into public.knowledge_record
    (question, normalized_question, embedding, answer, topic, subcategory, source, confidence,
     last_verified_at, source_url, source_title, video_url, video_title)
  values
    (p_question, p_normalized_question, p_embedding, p_answer, p_topic, p_subcategory, p_source, p_confidence,
     now(), p_source_url, p_source_title, p_video_url, p_video_title);
end;
$$;

revoke all on function public.salvar_conhecimento(text, text, vector, text, text, text, text, numeric, text, text, text, text) from public, anon, authenticated;

drop function if exists public.buscar_conhecimento_semantico(vector, numeric);

create function public.buscar_conhecimento_semantico(
  p_embedding vector(384),
  p_limiar numeric default 0.90
)
returns table (
  id uuid,
  answer text,
  topic text,
  subcategory text,
  similaridade numeric,
  requer_verificacao boolean,
  confidence numeric,
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
    (confidence < 0.90 or status = 'requer_revalidacao') as requer_verificacao,
    confidence,
    source_url as fonte_url, source_title as fonte_titulo,
    video_url, video_title as video_titulo
  from public.knowledge_record
  where status = 'valido'
    and confidence >= 0.70
    and 1 - (embedding <=> p_embedding) >= p_limiar
  order by embedding <=> p_embedding
  limit 1;
$$;

revoke all on function public.buscar_conhecimento_semantico(vector, numeric) from public, anon, authenticated;

-- === registrar_pergunta: 4 parâmetros novos, opcionais ===
drop function if exists public.registrar_pergunta(text, text, text, text, boolean, text);

create function public.registrar_pergunta(
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
    insert into public.areas (nome, slug, criado_por_ia)
    values (p_area_nome, p_area_slug, true)
    on conflict (slug) do update set nome = excluded.nome
    returning id into v_area_id;
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

revoke all on function public.registrar_pergunta(text, text, text, text, boolean, text, text, text, text, text) from public, anon, authenticated;
