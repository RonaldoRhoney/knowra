-- KnowRa — Fase 1: profiles + criação automática de perfil + admin padrão RhoneyInc

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text,
  avatar_url text,
  role text not null default 'user' check (role in ('user', 'admin')),
  nivel_global int not null default 1,
  xp_total int not null default 0,
  streak_atual int not null default 0,
  streak_recorde int not null default 0,
  criado_em timestamptz not null default now()
);

alter table public.profiles enable row level security;
revoke all on table public.profiles from anon, authenticated;
grant select, update (nome, avatar_url) on table public.profiles to authenticated;

-- security definer: evita recursão de RLS ao checar role dentro de policy
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles where id = uid and role = 'admin'
  );
$$;

create policy "usuario le o proprio perfil"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin(auth.uid()));

create policy "usuario atualiza o proprio perfil"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- criação automática de profile a cada novo usuário do Supabase Auth,
-- promovendo rhoneyinc@gmail.com a admin automaticamente (skill admin-padrao)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nome, avatar_url, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url',
    case when new.email = 'rhoneyinc@gmail.com' then 'admin' else 'user' end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
