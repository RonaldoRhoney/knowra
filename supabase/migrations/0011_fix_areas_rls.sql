-- KnowRa — mesmo bug do 0010: areas tinha RLS ativo sem nenhuma policy.
-- Efeito: histórico de perguntas nunca mostrava a área (join silenciosamente vazio),
-- e o backend nunca via áreas existentes pra reaproveitar na classificação da IA.

create policy "areas sao publicas para autenticados"
  on public.areas for select
  using (true);
