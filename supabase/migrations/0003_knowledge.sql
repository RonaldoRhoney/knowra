-- KnowRa — Fase 2: areas (arvore de conhecimento) + perguntas

create table public.areas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  slug text not null unique,
  parent_id uuid references public.areas (id) on delete set null,
  criado_por_ia boolean not null default true,
  criado_em timestamptz not null default now()
);

alter table public.areas enable row level security;
revoke all on table public.areas from anon, authenticated;
grant select on table public.areas to authenticated;
-- inserção de área nova só via backend (usa a service role futuramente, ou RPC dedicada) —
-- por ora nenhum grant de insert/update pro client, seguindo o mesmo padrão sem service_role key

create table public.perguntas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.profiles (id) on delete cascade,
  area_id uuid references public.areas (id) on delete set null,
  texto text not null check (char_length(texto) between 3 and 2000),
  resposta_ia text,
  criado_em timestamptz not null default now()
);

alter table public.perguntas enable row level security;
revoke all on table public.perguntas from anon, authenticated;
grant select on table public.perguntas to authenticated;

create policy "usuario le as proprias perguntas"
  on public.perguntas for select
  using (auth.uid() = usuario_id or public.is_admin(auth.uid()));

-- RPC: cria pergunta + resposta como o próprio usuário autenticado (mantém RLS,
-- sem precisar de service_role no backend) — a classificação de área e a chamada
-- de IA acontecem no backend antes de chamar esta função
create or replace function public.registrar_pergunta(
  p_texto text,
  p_resposta_ia text,
  p_area_nome text default null,
  p_area_slug text default null
)
returns public.perguntas
language plpgsql
security definer
set search_path = public
as $$
declare
  v_area_id uuid;
  v_pergunta public.perguntas;
begin
  if p_area_slug is not null then
    insert into public.areas (nome, slug, criado_por_ia)
    values (p_area_nome, p_area_slug, true)
    on conflict (slug) do update set nome = excluded.nome
    returning id into v_area_id;
  end if;

  insert into public.perguntas (usuario_id, area_id, texto, resposta_ia)
  values (auth.uid(), v_area_id, p_texto, p_resposta_ia)
  returning * into v_pergunta;

  return v_pergunta;
end;
$$;

revoke all on function public.registrar_pergunta(text, text, text, text) from public, anon;
grant execute on function public.registrar_pergunta(text, text, text, text) to authenticated;
