-- KnowRa — mensagens de boas-vindas / "sentimos sua falta" baseadas no último acesso

alter table public.profiles add column ultimo_acesso timestamptz;

drop function if exists public.registrar_sessao(text, text, text);

-- retorna o tipo de mensagem a exibir: primeiro_acesso | ausencia_longa (7d+) |
-- ausencia_media (72h+) | normal — decidido no banco, nunca no client
create or replace function public.registrar_sessao(p_dispositivo text, p_pais text, p_regiao text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ultimo timestamptz;
  v_tipo text;
begin
  select ultimo_acesso into v_ultimo from public.profiles where id = auth.uid();

  if v_ultimo is null then
    v_tipo := 'primeiro_acesso';
  elsif v_ultimo < now() - interval '7 days' then
    v_tipo := 'ausencia_longa';
  elsif v_ultimo < now() - interval '72 hours' then
    v_tipo := 'ausencia_media';
  else
    v_tipo := 'normal';
  end if;

  update public.profiles set ultimo_acesso = now() where id = auth.uid();

  insert into public.sessoes (usuario_id, dispositivo, pais, regiao)
  values (auth.uid(), p_dispositivo, p_pais, p_regiao);

  return v_tipo;
end;
$$;

revoke all on function public.registrar_sessao(text, text, text) from public, anon;
grant execute on function public.registrar_sessao(text, text, text) to authenticated;
