-- KnowRa — Fase 7b: catálogo de Concursos e Disciplinas com prática livre
-- Duas portas de entrada pro módulo: "por concurso" (questoes.concurso_id preenchido)
-- e "praticar por Disciplina" (questoes genéricas, concurso_id null). Ambas as RPCs
-- só contam questões 'published' — nunca expõem gabarito/explicacao/status/origem.

create or replace function public.catalogo_concursos(p_limite int default 50)
returns table (
  id uuid,
  nome text,
  orgao text,
  banca text,
  ano int,
  cargo text,
  total_questoes bigint
)
language sql
security definer
set search_path = public
stable
as $$
  select c.id, c.nome, c.orgao, c.banca, c.ano, c.cargo, count(q.id) as total_questoes
  from public.concursos c
  join public.questoes q on q.concurso_id = c.id and q.review_status = 'published'
  where c.ativo = true
  group by c.id
  order by c.criado_em desc
  limit greatest(1, least(coalesce(p_limite, 50), 100));
$$;

revoke all on function public.catalogo_concursos(int) from public, anon;
grant execute on function public.catalogo_concursos(int) to authenticated;

create or replace function public.disciplinas_com_pratica(p_limite int default 50)
returns table (
  area_id uuid,
  area_nome text,
  total_questoes bigint
)
language sql
security definer
set search_path = public
stable
as $$
  select a.id, a.nome, count(q.id) as total_questoes
  from public.questoes q
  join public.areas a on a.id = q.area_id
  where q.concurso_id is null and q.review_status = 'published'
  group by a.id, a.nome
  order by total_questoes desc
  limit greatest(1, least(coalesce(p_limite, 50), 100));
$$;

revoke all on function public.disciplinas_com_pratica(int) from public, anon;
grant execute on function public.disciplinas_com_pratica(int) to authenticated;
