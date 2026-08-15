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

---

## Anti-cheat (planejado — Competitive Mode, atualização 2026-08-15)

> Ver [DECISIONS.md](DECISIONS.md). Ranking/Rating amplia o risco de segurança em relação ao Knowledge Mode: lá, manipular o próprio XP só infla um número pessoal; num ranking competitivo, manipular Rating/posição afeta a percepção de justiça pra **todos os usuários**. Regra: nenhuma informação crítica de competição é confiável só porque veio do cliente — mesma régua já aplicada a XP (ver §Cuidado específico do KnowRa acima), estendida a Rating.

Superfícies a considerar quando o Competitive Mode for implementado: manipulação de requisição, alteração de XP/Rating direto no client, replay de respostas (reenviar a mesma resposta certa repetidamente), automação/bots, múltiplas contas, abuso de API, respostas compartilhadas entre usuários, exploração de falhas na fórmula de rating, comportamento estatisticamente anormal (ex: 100% de acerto em questões difíceis num tempo impossível). Não implementar detecção agora — só não desenhar o schema/API de um jeito que torne essas checagens impossíveis depois (ex: sempre calcular Rating no banco via RPC, nunca aceitar Rating vindo do client, mesmo padrão já usado pra XP).

## Rate limiting (planejado)

Hoje não há rate limit em `/api/ask` além do custo natural por chamada de IA. Quando o volume de usuários crescer (e principalmente com Competitive Mode, onde há incentivo a automação pra subir no ranking), avaliar rate limit por usuário/IP nos endpoints de IA e de avaliação — não implementar agora, mas registrar como item de segurança pendente, não esquecido.

## LGPD e privacidade — dados demográficos e de sessão (implementado 2026-08-15)

Primeira coleta real de dado pessoal sensível do produto: faixa etária e gênero, sempre **opcionais**, com opção explícita "prefiro não informar", e sem qualquer bloqueio de funcionalidade caso o usuário recuse (card dispensável, RPC `atualizar_demografia` só roda com ação explícita do usuário). `profiles.dados_demograficos_consentidos_em` registra o momento do consentimento — sem isso marcado, o app pergunta de novo na próxima sessão (uma vez por sessão de navegador, não a cada carregamento de tela).

Dispositivo/país/região (tabela `sessoes`) são coletados a cada login para observabilidade agregada — **o IP bruto do usuário nunca é armazenado**, só o resultado já processado da geolocalização (país/região). Geolocalização feita via `ip-api.com` (best-effort — timeout de 2.5s, falha nunca bloqueia login, resultado fica `null`/`null` se a chamada falhar). Nenhuma linha de `sessoes` é exposta individualmente ao client, só agregada via `admin_demographics()` (RPC restrita a admin).

## LGPD e privacidade (atualização 2026-08-15)

O **perfil de conhecimento do usuário** (histórico de perguntas, respostas, domínio por área, desempenho, futuramente Rating/ranking/histórico competitivo) deve ser tratado como dado pessoal sensível do sistema, não só "dado de produto". Considerar desde já, mesmo sem implementar agora:

* retenção — por quanto tempo histórico de perguntas/desafios fica guardado;
* exclusão — usuário deve poder pedir exclusão da própria conta e dados associados (`ON DELETE CASCADE` já usado em `profiles`→demais tabelas ajuda, mas exclusão de conta via UI ainda não existe);
* anonimização — caso dados agregados (ex: médias por área) precisem ser mantidos após exclusão de conta individual;
* consentimento — principalmente relevante quando o perfil público/ranking for implementado (ver [GAME_RULES.md](GAME_RULES.md) §Privacidade do ranking) — usuário nunca é obrigado a expor dado pessoal pra competir.

## Antes de cada deploy de produção

Rodar o checklist completo das 5 falhas (grep de segredo hardcoded, verificação de RLS via SQL, grep de `dangerouslySetInnerHTML`/`innerHTML`/`eval`, teste de IDOR manual em pelo menos os endpoints de `desafios` e `profiles`) e registrar o resultado na tabela de status da skill `vibe-coding-5-falhas`, mesmo padrão já aplicado no VoaRadar.
