-- KnowRa — limite diário de interações de IA no plano gratuito
-- Item #2 da estratégia de sustentabilidade financeira (ver ROADMAP.md e
-- DECISIONS.md), depois do cache de respostas canônicas (#1). Conta só
-- chamadas REAIS à Anthropic — cache hit nunca consome a cota, já que não
-- tem custo de IA. Limite provisório (5/dia, mesmo número já usado como
-- exemplo pelo Ronaldo na proposta original) — sem plano pago ainda pra
-- comprar mais, isso vem depois (item #3).

create table public.ia_uso_diario (
  usuario_id uuid not null references public.profiles (id) on delete cascade,
  dia date not null default current_date,
  chamadas int not null default 0,
  primary key (usuario_id, dia)
);

alter table public.ia_uso_diario enable row level security;
revoke all on table public.ia_uso_diario from anon, authenticated;
grant select on table public.ia_uso_diario to authenticated;

create policy "usuario le o proprio uso de ia"
  on public.ia_uso_diario for select
  using (auth.uid() = usuario_id or public.is_admin(auth.uid()));

-- Checa E incrementa atomicamente — deve ser chamada pelo backend ANTES de
-- cada chamada real à Anthropic (nunca em cache hit). Admin é isento (sem
-- limite) pra não travar teste/moderação.
create or replace function public.verificar_limite_ia()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limite constant int := 5;
  v_usadas int;
begin
  if public.is_admin(auth.uid()) then
    return jsonb_build_object('permitido', true, 'usadas_hoje', 0, 'limite', v_limite, 'ilimitado', true);
  end if;

  select chamadas into v_usadas
    from public.ia_uso_diario
    where usuario_id = auth.uid() and dia = current_date;
  v_usadas := coalesce(v_usadas, 0);

  if v_usadas >= v_limite then
    return jsonb_build_object('permitido', false, 'usadas_hoje', v_usadas, 'limite', v_limite, 'ilimitado', false);
  end if;

  insert into public.ia_uso_diario (usuario_id, dia, chamadas)
  values (auth.uid(), current_date, 1)
  on conflict (usuario_id, dia) do update set chamadas = public.ia_uso_diario.chamadas + 1;

  return jsonb_build_object('permitido', true, 'usadas_hoje', v_usadas + 1, 'limite', v_limite, 'ilimitado', false);
end;
$$;

revoke all on function public.verificar_limite_ia() from public, anon;
grant execute on function public.verificar_limite_ia() to authenticated;

-- Leitura sem incrementar — pro frontend mostrar "3/5 usadas hoje" antes do
-- usuário bater no limite, sem gastar cota nenhuma pra checar.
create or replace function public.meu_uso_ia()
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_limite constant int := 5;
  v_usadas int;
begin
  if public.is_admin(auth.uid()) then
    return jsonb_build_object('usadas_hoje', 0, 'limite', v_limite, 'ilimitado', true);
  end if;

  select chamadas into v_usadas
    from public.ia_uso_diario
    where usuario_id = auth.uid() and dia = current_date;

  return jsonb_build_object('usadas_hoje', coalesce(v_usadas, 0), 'limite', v_limite, 'ilimitado', false);
end;
$$;

revoke all on function public.meu_uso_ia() from public, anon;
grant execute on function public.meu_uso_ia() to authenticated;
