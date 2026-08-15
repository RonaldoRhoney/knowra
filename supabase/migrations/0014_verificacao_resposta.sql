-- KnowRa — sinalização honesta de "requer verificação externa" nas respostas
-- (nunca um link inventado pela IA — só um aviso + tipo de fonte recomendada)

alter table public.perguntas add column requer_verificacao boolean not null default false;
alter table public.perguntas add column observacao_verificacao text;

create or replace function public.registrar_pergunta(
  p_texto text,
  p_resposta_ia text,
  p_area_nome text default null,
  p_area_slug text default null,
  p_requer_verificacao boolean default false,
  p_observacao_verificacao text default null
)
returns public.perguntas
language plpgsql
security definer
set search_path = public
as $$
declare
  v_area_id uuid;
  v_pergunta public.perguntas;
  v_areas_distintas int;
begin
  if p_area_slug is not null then
    insert into public.areas (nome, slug, criado_por_ia)
    values (p_area_nome, p_area_slug, true)
    on conflict (slug) do update set nome = excluded.nome
    returning id into v_area_id;
  end if;

  insert into public.perguntas (usuario_id, area_id, texto, resposta_ia, requer_verificacao, observacao_verificacao)
  values (auth.uid(), v_area_id, p_texto, p_resposta_ia, p_requer_verificacao, p_observacao_verificacao)
  returning * into v_pergunta;

  perform public.conceder_badge(auth.uid(), 'primeira_curiosidade');

  select count(distinct area_id) into v_areas_distintas
    from public.perguntas where usuario_id = auth.uid() and area_id is not null;
  if v_areas_distintas >= 5 then
    perform public.conceder_badge(auth.uid(), 'mente_curiosa');
  end if;

  return v_pergunta;
end;
$$;
