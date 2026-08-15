-- KnowRa — Fase 1: RPC para o Painel ADM listar usuários sem precisar de service_role no client

create or replace function public.admin_list_profiles()
returns setof public.profiles
language sql
security definer
set search_path = public
stable
as $$
  select *
  from public.profiles
  where public.is_admin(auth.uid())
  order by criado_em desc;
$$;

revoke all on function public.admin_list_profiles() from public, anon;
grant execute on function public.admin_list_profiles() to authenticated;
