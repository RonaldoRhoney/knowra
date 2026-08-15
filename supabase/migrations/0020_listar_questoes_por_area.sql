-- KnowRa — Fase 7b: listar_questoes() ganha suporte a questão genérica (sem concurso)
--
-- Achado ao validar o script de geração em lote: o schema já previa questoes.concurso_id
-- nullable ("questão genérica de disciplina"), mas listar_questoes() só aceitava
-- p_concurso_id — com concurso_id = null, `q.concurso_id = p_concurso_id` nunca bate
-- (NULL = NULL não é true em SQL), então a questão gerada ficava invisível pro client.
--
-- Correção: aceita p_concurso_id OU p_area_id (pelo menos um obrigatório). Mesma proteção
-- de sempre — nunca expõe gabarito/explicacao, só review_status = 'published'.

drop function if exists public.listar_questoes(uuid, int);

create or replace function public.listar_questoes(
  p_concurso_id uuid default null,
  p_area_id uuid default null,
  p_limite int default 20
)
returns table (
  id uuid,
  enunciado text,
  alternativas jsonb,
  dificuldade text,
  area_id uuid
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if p_concurso_id is null and p_area_id is null then
    raise exception 'Informe p_concurso_id ou p_area_id.';
  end if;

  return query
  select q.id, q.enunciado, q.alternativas, q.dificuldade, q.area_id
  from public.questoes q
  where q.review_status = 'published'
    and (p_concurso_id is null or q.concurso_id = p_concurso_id)
    and (p_area_id is null or q.area_id = p_area_id)
  order by q.criado_em
  limit greatest(1, least(coalesce(p_limite, 20), 100));
end;
$$;

revoke all on function public.listar_questoes(uuid, uuid, int) from public, anon;
grant execute on function public.listar_questoes(uuid, uuid, int) to authenticated;
