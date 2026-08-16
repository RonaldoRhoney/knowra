-- KnowRa — KNOWRA_AI, Etapa D: Confidence Engine (parte estrutural)
-- Ver KNOWRA_AI.md §8 e DECISIONS.md 2026-08-15.
--
-- Escopo deliberadamente limitado: os números 0.90/0.70 continuam
-- provisórios (KNOWRA_AI.md já registra que precisam de dado real de uso
-- pra calibrar) — essa migration só liga o MECANISMO (responder com sinal
-- de verificação quando a confiança não é máxima) e dá um caminho manual
-- pro admin marcar uma entrada como requer_revalidacao/invalidado, mesmo
-- padrão já usado em Questões de Concursos (revisar_questao()). Nenhuma
-- expiração automática por tempo — isso exigiria dado de "o que
-- costuma ficar desatualizado" que ainda não existe.

drop function if exists public.buscar_conhecimento_semantico(vector, numeric);

create or replace function public.buscar_conhecimento_semantico(
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
  requer_verificacao boolean
)
language sql
stable
set search_path = public
as $$
  select id, answer, topic, subcategory,
    round((1 - (embedding <=> p_embedding))::numeric, 4) as similaridade,
    confidence,
    -- Confidence Engine (KNOWRA_AI.md §8, limiares provisórios):
    -- confidence >= 0.90 responde direto; 0.70-0.89 responde mas sinaliza
    -- verificação (reaproveita requer_verificacao/observacao_verificacao,
    -- já existente desde a Fase 4); abaixo de 0.70 nunca serve da memória
    -- (filtrado no where). status='requer_revalidacao' (marcado manualmente
    -- pelo admin) sempre força o sinal de verificação, mesmo com
    -- confidence alta.
    (confidence < 0.90 or status = 'requer_revalidacao') as requer_verificacao
  from public.knowledge_record
  where status in ('valido', 'requer_revalidacao')
    and confidence >= 0.70
    and 1 - (embedding <=> p_embedding) >= p_limiar_similaridade
  order by embedding <=> p_embedding
  limit 1;
$$;

revoke all on function public.buscar_conhecimento_semantico(vector, numeric) from public, anon, authenticated;

-- Caminho manual de revisão — mesmo padrão de revisar_questao() (Concursos).
-- Admin marca uma entrada como precisando de checagem ou já invalidada;
-- nada disso acontece automaticamente ainda.
create or replace function public.revisar_conhecimento(p_id uuid, p_status text)
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
  if p_status not in ('valido', 'requer_revalidacao', 'invalidado') then
    raise exception 'Status inválido.';
  end if;

  update public.knowledge_record
    set status = p_status,
        last_verified_at = case when p_status = 'valido' then now() else last_verified_at end,
        updated_at = now()
    where id = p_id
    returning * into v_registro;

  if v_registro is null then
    raise exception 'Registro não encontrado.';
  end if;

  return v_registro;
end;
$$;

revoke all on function public.revisar_conhecimento(uuid, text) from public, anon;
grant execute on function public.revisar_conhecimento(uuid, text) to authenticated;

-- Painel ADM precisa listar as entradas pra revisar — só admin lê.
create policy knowledge_record_select_admin on public.knowledge_record
  for select using (public.is_admin(auth.uid()));

grant select on public.knowledge_record to authenticated;
