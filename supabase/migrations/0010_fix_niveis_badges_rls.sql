-- KnowRa — corrige bug real: RLS ativo em niveis/badges sem nenhuma policy
-- (GRANT sozinho não basta com RLS ligado — sem policy, resultado é sempre vazio)
-- Efeito visível: barra de XP sempre aparecia 100% cheia mesmo com 0 XP,
-- e vitrine de badges nunca aparecia.

create policy "niveis sao publicos para autenticados"
  on public.niveis for select
  using (true);

create policy "badges sao publicas para autenticados"
  on public.badges for select
  using (true);
