# SECURITY.md — KnowRa

Este produto segue o checklist padrão RhoneyInc contra as 5 falhas mais comuns de vibe coding (skill `vibe-coding-5-falhas`, `MyApps/.claude/skills/`) — obrigatório antes de qualquer deploy e sempre que uma auditoria de segurança for pedida.

## 1. RLS (Row Level Security)

Toda tabela do schema `public` no Supabase é auto-exposta via PostgREST. Regra: **toda tabela nova nasce com `ENABLE ROW LEVEL SECURITY` e `REVOKE ALL ... FROM anon, authenticated`** na mesma migration que a cria — nunca como passo separado.

Tabelas com `usuario_id` (`perguntas`, `desafios`, `progresso_area`, `usuario_badges`) precisam de policy restringindo a `auth.uid() = usuario_id`, exceto para `role = 'admin'`. `profiles` precisa de policy que permite ao próprio usuário ler/atualizar seu registro, mas nunca `role` ou `xp_total` diretamente (ver abaixo).

## 2. Nenhuma permissão decidida no frontend

`role = 'admin'`, cálculo de XP, nível e domínio por área são sempre decididos e persistidos no backend/banco — nunca no client. O frontend só reage ao que o backend já decidiu. `rhoneyinc@gmail.com` é promovida a admin via trigger no banco (skill `admin-padrao`), não por flag manual em lugar nenhum do client.

## 3. IDOR

Todo endpoint que recebe um `id` de recurso (pergunta, desafio, badge do usuário) precisa confirmar posse (`resource.usuario_id == auth.uid()`) antes de devolver ou alterar — reforçado via RLS no Postgres, não só checagem manual no backend (defesa em profundidade).

## 4. Chaves de API expostas

Chave da IA (Anthropic) e `SERVICE_ROLE` do Supabase **nunca** no frontend nem hardcoded no repo — sempre variável de ambiente, usadas só em código server-side (backend/serverless functions). `.env.example` sempre com placeholders, nunca valores reais. Confirmar `.env` no `.gitignore` desde o primeiro commit (já configurado neste repo).

## 5. XSS

Resposta da IA e enunciado de desafio são conteúdo gerado por LLM e renderizados na interface — tratar como conteúdo não confiável. Não usar `dangerouslySetInnerHTML` (React) para exibir texto gerado por IA; renderizar como texto puro ou markdown sanitizado por biblioteca confiável, nunca HTML cru interpretado.

## Cuidado específico do KnowRa: integridade de XP

Como XP tem valor de progressão (afeta nível, badges, percepção de conquista), ele é um alvo natural de manipulação. Regras adicionais:

* `xp_ganho` de um desafio é calculado e gravado **apenas** pelo backend, na etapa de avaliação — nunca aceito como valor vindo do client.
* Reavaliação do mesmo desafio (tentar reenviar resposta para "recalcular XP") deve ser bloqueada ou explicitamente tratada como não gerando XP adicional — decisão final na Fase 3, registrar em [DECISIONS.md](DECISIONS.md) quando definida.
* `profiles.xp_total` e `nivel_global` recalculados a partir de `desafios.xp_ganho`, nunca incrementados por escrita direta vinda do frontend.

## Autenticação

Supabase Auth (e-mail/senha + Google OAuth) — ver [ARCHITECTURE.md](ARCHITECTURE.md). Nunca armazenar senha em texto puro (Supabase Auth já cobre isso nativamente, não reimplementar). Sessão via token gerenciado pelo SDK do Supabase, não implementar JWT customizado.

## Antes de cada deploy de produção

Rodar o checklist completo das 5 falhas (grep de segredo hardcoded, verificação de RLS via SQL, grep de `dangerouslySetInnerHTML`/`innerHTML`/`eval`, teste de IDOR manual em pelo menos os endpoints de `desafios` e `profiles`) e registrar o resultado na tabela de status da skill `vibe-coding-5-falhas`, mesmo padrão já aplicado no VoaRadar.
