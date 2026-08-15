-- KnowRa — Fase 8: Seasons & Leagues (MVP)
-- Liga é sempre DERIVADA do rating (mesmo princípio de nivel_global via niveis) —
-- nunca um estado promovido/rebaixado à parte. Temporada é encerrada por ação
-- explícita do admin (sem infra de cron neste projeto), congelando um snapshot
-- do ranking geral em temporada_resultados. Recompensa reaproveita badges/
-- conceder_badge() já existentes — sem currency nova.

create table public.ligas (
  ordem int primary key,
  codigo text not null unique,
  nome text not null,
  rating_minimo int not null
);
insert into public.ligas (ordem, codigo, nome, rating_minimo) values
  (1, 'bronze', 'Bronze', 0),
  (2, 'prata', 'Prata', 1000),
  (3, 'ouro', 'Ouro', 1150),
  (4, 'platina', 'Platina', 1300),
  (5, 'diamante', 'Diamante', 1450),
  (6, 'mestre', 'Mestre', 1600),
  (7, 'lenda', 'Lenda', 1800);

alter table public.ligas enable row level security;
revoke all on table public.ligas from anon, authenticated;
grant select on table public.ligas to authenticated;

create policy "ligas sao publicas para autenticados"
  on public.ligas for select
  using (true);

-- Badges de liga — mesmo catálogo fixo já usado desde a Fase 3. Concedida na
-- primeira vez que o usuário termina QUALQUER temporada naquela liga (não é
-- por temporada — reaproveita o modelo existente de badge única por usuário).
insert into public.badges (codigo, nome, descricao) values
  ('liga_bronze', 'Liga Bronze', 'Terminou uma temporada competitiva na Liga Bronze.'),
  ('liga_prata', 'Liga Prata', 'Terminou uma temporada competitiva na Liga Prata.'),
  ('liga_ouro', 'Liga Ouro', 'Terminou uma temporada competitiva na Liga Ouro.'),
  ('liga_platina', 'Liga Platina', 'Terminou uma temporada competitiva na Liga Platina.'),
  ('liga_diamante', 'Liga Diamante', 'Terminou uma temporada competitiva na Liga Diamante.'),
  ('liga_mestre', 'Liga Mestre', 'Terminou uma temporada competitiva na Liga Mestre.'),
  ('liga_lenda', 'Liga Lenda', 'Terminou uma temporada competitiva na Liga Lenda.');

create table public.temporadas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  inicio date not null,
  fim date not null,
  status text not null default 'planejada' check (status in ('planejada', 'ativa', 'encerrada')),
  congelada_em timestamptz,
  criado_em timestamptz not null default now()
);

-- no máximo uma temporada 'ativa' por vez
create unique index temporadas_uma_ativa on public.temporadas ((true)) where status = 'ativa';

alter table public.temporadas enable row level security;
revoke all on table public.temporadas from anon, authenticated;
grant select on table public.temporadas to authenticated;

create policy "temporadas sao publicas para autenticados"
  on public.temporadas for select
  using (true);

-- Snapshot congelado no encerramento — inclui TODO usuário elegível (mesmo
-- limiar de 5 desafios avaliados já usado em ranking_geral/meu_ranking),
-- independente de aparecer_no_ranking: é um registro histórico pessoal
-- (RLS só deixa cada um ver a própria linha), não uma vitrine pública —
-- a vitrine pública é ranking_temporada(), que aí sim respeita o opt-in.
create table public.temporada_resultados (
  temporada_id uuid not null references public.temporadas (id) on delete cascade,
  usuario_id uuid not null references public.profiles (id) on delete cascade,
  rating_final int not null,
  liga_final text not null,
  posicao bigint not null,
  percentil_top numeric,
  primary key (temporada_id, usuario_id)
);

alter table public.temporada_resultados enable row level security;
revoke all on table public.temporada_resultados from anon, authenticated;
grant select on table public.temporada_resultados to authenticated;

create policy "usuario le o proprio resultado de temporada"
  on public.temporada_resultados for select
  using (auth.uid() = usuario_id or public.is_admin(auth.uid()));

-- ============================================================================
-- RPCs
-- ============================================================================

create or replace function public.iniciar_temporada(p_nome text, p_inicio date, p_fim date)
returns public.temporadas
language plpgsql
security definer
set search_path = public
as $$
declare
  v_temporada public.temporadas;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Acesso negado.';
  end if;
  if exists (select 1 from public.temporadas where status = 'ativa') then
    raise exception 'Já existe uma temporada ativa. Encerre-a antes de iniciar outra.';
  end if;
  if p_fim <= p_inicio then
    raise exception 'Data de fim precisa ser depois da data de início.';
  end if;

  insert into public.temporadas (nome, inicio, fim, status)
  values (p_nome, p_inicio, p_fim, 'ativa')
  returning * into v_temporada;

  return v_temporada;
end;
$$;

revoke all on function public.iniciar_temporada(text, date, date) from public, anon;
grant execute on function public.iniciar_temporada(text, date, date) to authenticated;

create or replace function public.encerrar_temporada(p_temporada_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_temporada public.temporadas;
  v_resultado record;
  v_total_participantes int := 0;
  v_badge_codigo text;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Acesso negado.';
  end if;

  select * into v_temporada from public.temporadas where id = p_temporada_id for update;
  if v_temporada is null then
    raise exception 'Temporada não encontrada.';
  end if;
  if v_temporada.status <> 'ativa' then
    raise exception 'Só é possível encerrar uma temporada ativa.';
  end if;

  insert into public.temporada_resultados (temporada_id, usuario_id, rating_final, liga_final, posicao, percentil_top)
  select
    p_temporada_id,
    p.id,
    p.rating,
    (select l.nome from public.ligas l where l.rating_minimo <= p.rating order by l.rating_minimo desc limit 1),
    row_number() over (order by p.rating desc, p.id),
    round(100.0 * row_number() over (order by p.rating desc, p.id) / count(*) over ())
  from public.profiles p
  where (
    select count(*) from public.desafios d
    where d.usuario_id = p.id and d.avaliado_em is not null
  ) >= 5;

  get diagnostics v_total_participantes = row_count;

  for v_resultado in
    select tr.usuario_id, l.codigo
    from public.temporada_resultados tr
    join public.ligas l on l.nome = tr.liga_final
    where tr.temporada_id = p_temporada_id
  loop
    v_badge_codigo := 'liga_' || v_resultado.codigo;
    perform public.conceder_badge(v_resultado.usuario_id, v_badge_codigo);
  end loop;

  update public.temporadas
    set status = 'encerrada', congelada_em = now()
    where id = p_temporada_id;

  return jsonb_build_object(
    'temporada_id', p_temporada_id,
    'total_participantes', v_total_participantes
  );
end;
$$;

revoke all on function public.encerrar_temporada(uuid) from public, anon;
grant execute on function public.encerrar_temporada(uuid) to authenticated;

-- Leaderboard público de uma temporada encerrada — mesmo padrão de segurança
-- de ranking_geral: opt-in via aparecer_no_ranking, nunca nome real/e-mail.
create or replace function public.ranking_temporada(p_temporada_id uuid, p_limite int default 50)
returns table (
  posicao bigint,
  nickname text,
  avatar_url text,
  rating_final int,
  liga_final text
)
language sql
security definer
set search_path = public
stable
as $$
  select
    tr.posicao,
    coalesce(p.nickname, 'Explorador ' || substr(p.id::text, 1, 4)) as nickname,
    p.avatar_url,
    tr.rating_final,
    tr.liga_final
  from public.temporada_resultados tr
  join public.profiles p on p.id = tr.usuario_id
  where tr.temporada_id = p_temporada_id
    and p.aparecer_no_ranking = true
  order by tr.posicao
  limit greatest(1, least(coalesce(p_limite, 50), 200));
$$;

revoke all on function public.ranking_temporada(uuid, int) from public, anon;
grant execute on function public.ranking_temporada(uuid, int) to authenticated;
