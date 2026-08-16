-- KnowRa — Corrige bug real: areas_recorrentes_entre_concursos() sem security definer
-- Ver DECISIONS.md 2026-08-16.
--
-- Migration 0039 esqueceu "security definer" nesta função — ela rodava com o
-- privilégio de quem chama (authenticated), que não tem SELECT direto em
-- questoes/concursos/areas (só acessíveis via RPC com security definer,
-- mesmo padrão de todo o resto do projeto). Achado ao testar contra o banco
-- real logo após aplicar 0039: "permission denied for table questoes".
--
-- create or replace function é suficiente aqui (mesma assinatura, mesmo
-- retorno — só a propriedade SECURITY muda, não precisa DROP+CREATE).
create or replace function public.areas_recorrentes_entre_concursos(p_limite int default 10)
returns table (
  area_id uuid,
  area_nome text,
  total_concursos bigint,
  concursos jsonb
)
language sql
security definer
stable
set search_path = public
as $$
  select
    a.id, a.nome,
    count(distinct q.concurso_id) as total_concursos,
    jsonb_agg(distinct jsonb_build_object('id', c.id, 'nome', c.nome))
  from public.questoes q
  join public.areas a on a.id = q.area_id
  join public.concursos c on c.id = q.concurso_id
  where c.ativo = true
    and c.status in ('aberto', 'andamento')
    and q.review_status = 'published'
  group by a.id, a.nome
  having count(distinct q.concurso_id) > 1
  order by count(distinct q.concurso_id) desc
  limit greatest(1, least(coalesce(p_limite, 10), 50));
$$;

revoke all on function public.areas_recorrentes_entre_concursos(int) from public, anon;
grant execute on function public.areas_recorrentes_entre_concursos(int) to authenticated;
