-- KnowRa — KNOWRA_AI, Etapa E: Knowledge Graph (parte estrutural)
-- Ver KNOWRA_AI.md §4, §8 e DECISIONS.md 2026-08-15.
--
-- Mesmo raciocínio da Etapa D: inferir relações entre conhecimentos
-- automaticamente (ex: via IA, ou por co-ocorrência de uso) exigiria dado
-- de uso real que ainda não existe, e adicionaria uma chamada de IA nova
-- (contradiria o próprio objetivo de custo-zero da iniciativa). Por isso,
-- só o CRUD administrado manualmente — sem inferência automática, sem
-- wiring no fluxo de resposta (não existe ainda nenhuma decisão de produto
-- de como "conhecimento relacionado" apareceria pro usuário).

create or replace function public.criar_relacao_conhecimento(
  p_origem uuid,
  p_relacionado uuid,
  p_tipo text
)
returns public.knowledge_relation
language plpgsql
security definer
set search_path = public
as $$
declare
  v_relacao public.knowledge_relation;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Acesso negado.';
  end if;
  if p_origem = p_relacionado then
    raise exception 'Um conhecimento não pode se relacionar consigo mesmo.';
  end if;

  insert into public.knowledge_relation (record_id_origem, record_id_relacionado, tipo_relacao)
  values (p_origem, p_relacionado, p_tipo)
  returning * into v_relacao;

  return v_relacao;
end;
$$;

revoke all on function public.criar_relacao_conhecimento(uuid, uuid, text) from public, anon;
grant execute on function public.criar_relacao_conhecimento(uuid, uuid, text) to authenticated;

create or replace function public.remover_relacao_conhecimento(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Acesso negado.';
  end if;

  delete from public.knowledge_relation where id = p_id;
end;
$$;

revoke all on function public.remover_relacao_conhecimento(uuid) from public, anon;
grant execute on function public.remover_relacao_conhecimento(uuid) to authenticated;

-- Leitura de conhecimentos relacionados a um registro — não chamada por
-- nenhum fluxo ainda (nenhuma decisão de produto de como isso apareceria
-- pro usuário), fica pronta pra quando existir.
create or replace function public.buscar_relacionados(p_id uuid)
returns table (
  id uuid,
  answer text,
  topic text,
  tipo_relacao text
)
language sql
stable
set search_path = public
as $$
  select kr.id, kr.answer, kr.topic, rel.tipo_relacao
  from public.knowledge_relation rel
  join public.knowledge_record kr on kr.id = rel.record_id_relacionado
  where rel.record_id_origem = p_id and kr.status = 'valido';
$$;

revoke all on function public.buscar_relacionados(uuid) from public, anon, authenticated;

-- Mesmo padrão de knowledge_record (Etapa D) — admin lê pra gerenciar,
-- ninguém mais tem acesso direto à tabela.
create policy knowledge_relation_select_admin on public.knowledge_relation
  for select using (public.is_admin(auth.uid()));

grant select on public.knowledge_relation to authenticated;
