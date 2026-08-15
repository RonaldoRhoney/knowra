-- KnowRa — correção de achado CRÍTICO da auditoria de segurança 2026-08-15
--
-- avaliar_desafio()/criar_desafio() são security definer, liberadas pra
-- "authenticated" via PostgREST, e aceitam p_nota/p_feedback_ia/p_enunciado/
-- p_dificuldade como parâmetro do cliente — nada verifica que vieram de uma
-- avaliação real da Anthropic. Qualquer usuário logado podia chamar
-- supabase.rpc('avaliar_desafio', {p_nota: 100, ...}) direto no console do
-- navegador e gerar XP/Nível/Rating/Badges ilimitados sem nunca usar IA.
--
-- Mesma família (severidade Alta): registrar_pergunta()/salvar_resposta_canonica()
-- aceitam resposta_ia como texto livre do cliente, sem checar origem —
-- permite contornar o limite diário de IA e envenenar o cache compartilhado
-- com conteúdo falso servido a outros usuários como se fosse resposta real.
--
-- Não dá pra "verificar no banco" que uma chamada de IA aconteceu de
-- verdade — o Postgres não tem visibilidade sobre o que o backend Node fez
-- antes de chamar a função. A correção real é mover o TRUST BOUNDARY:
-- essas 4 funções deixam de ser alcançáveis via PostgREST por qualquer
-- "authenticated" (revoke) e passam a ser chamadas só pelo backend, por uma
-- conexão privilegiada via DATABASE_URL (nunca service_role — mesma
-- decisão já registrada pro webhook do Mercado Pago). O corpo das funções
-- continua igual (auth.uid() etc.) — o backend simula a sessão do usuário
-- já validado pelo JWT real (SET ROLE authenticated + request.jwt.claim.sub),
-- mesma técnica já usada nos testes de RLS via psql deste projeto.

revoke execute on function public.avaliar_desafio(uuid, text, int, text) from authenticated;
revoke execute on function public.criar_desafio(uuid, text, text) from authenticated;
revoke execute on function public.salvar_resposta_canonica(text, text, text, text, boolean, text) from authenticated;

-- registrar_pergunta tem DUAS assinaturas vivas no banco: a de 4 parâmetros
-- (0003_knowledge.sql, já sem uso — 0014 substituiu com 2 parâmetros novos)
-- e a de 6 parâmetros (0014_verificacao_resposta.sql, a que o backend usa
-- de verdade). "create or replace function" com uma lista de parâmetros
-- diferente cria uma SEGUNDA função (overload), não substitui a primeira —
-- e a versão de 6 parâmetros NUNCA recebeu o "revoke all from public, anon"
-- que 0003 aplicou só na de 4. Resultado real, confirmado ao vivo: a versão
-- de 6 parâmetros estava liberada pro role PUBLIC inteiro — inclusive
-- "anon", usuário nem autenticado — não só "authenticated" como o resto
-- desta migration assumia. Fechando as duas assinaturas por completo.
revoke execute on function public.registrar_pergunta(text, text, text, text) from authenticated;
revoke execute on function public.registrar_pergunta(text, text, text, text, boolean, text) from public, anon, authenticated;
