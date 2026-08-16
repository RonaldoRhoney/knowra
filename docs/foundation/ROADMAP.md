# ROADMAP.md — KnowRa

## Regra de ouro do roadmap

```text
MVP → validar → medir → melhorar → expandir.
```

Nunca:

```text
MVP → 50 funcionalidades → arquitetura complexa → difícil manutenção.
```

Não avançar de fase sem confirmação explícita do Ronaldo — mesmo que a fase atual pareça "pronta o suficiente".

## FASE 0 — Discovery *(atual)*

Sem código. Produzir a documentação de fundação:

`PRODUCT.md`, `VISION.md`, `CORE_LOOP.md`, `GAME_RULES.md`, `KNOWLEDGE_MODEL.md`, `AI_ENGINE.md`, `UX_PRINCIPLES.md`, `ARCHITECTURE.md`, `DATA_MODEL.md`, `SECURITY.md`, `ROADMAP.md` (este arquivo), `DECISIONS.md`.

**Critério de conclusão**: todos os 12 documentos existem, cobrem o brief original (`KnowRaV0.1/v0.1.txt` e `KnowRa.png`), e foram aprovados pelo Ronaldo.

## FASE 1 — Foundation

* Estrutura de projeto (frontend + backend), conforme [ARCHITECTURE.md](ARCHITECTURE.md).
* Ambiente configurado (`.env.example`, scripts de dev).
* Design system inicial (tokens de cor/tipografia da identidade KnowRa).
* Autenticação: Supabase Auth com e-mail/senha **e Google OAuth** (obrigatório desde esta fase, ver [ARCHITECTURE.md](ARCHITECTURE.md)).
* Banco: projeto Supabase criado, schema inicial de `profiles` + trigger de admin (`rhoneyinc@gmail.com`).
* Estrutura de domínio (pastas `auth/`, `knowledge/`, `game/`, `ai/` no backend).
* API base (health check, rotas iniciais).
* Observabilidade mínima (log estruturado, sem PII sensível em log).

**Critério de conclusão**: usuário consegue criar conta (e-mail/senha ou Google), logar e ver uma Home vazia com seu nome — sem ainda ter Core Loop funcional.

## FASE 2 — Knowledge ✅ concluída (validada em produção 2026-08-15)

* ✅ Campo "Pergunte qualquer coisa" funcional (`Home.tsx`).
* ✅ Resposta da IA (ver [AI_ENGINE.md](AI_ENGINE.md)) via Claude Haiku, com classificação em área por `tool use` estruturado.
* ✅ Histórico de perguntas do usuário (`HistoricoPerguntas.tsx`).
* ✅ Categorização (tabela `areas`, ver [DATA_MODEL.md](DATA_MODEL.md)) — reaproveita área existente por slug.
* ⏳ Contexto passado à IA hoje é só a lista de áreas já existentes (pra reaproveitar classificação) — contexto de nível/histórico do próprio usuário (ver `AI_ENGINE.md`) fica pra quando isso fizer diferença prática (Fase 3+, quando desafio/avaliação existirem).

**Critério de conclusão**: ✅ usuário pergunta algo, recebe resposta contextualizada, e consegue ver essa pergunta depois no histórico — testado em produção com pergunta real, resposta da IA e classificação de área gravadas corretamente no banco.

## FASE 3 — Gamification ✅ concluída (2026-08-15)

* ✅ Migration em produção: `niveis`, `badges`, `usuario_badges`, `desafios`, RPCs `criar_desafio`/`avaliar_desafio`/`conceder_badge` — RLS conferido, XP/nível/streak/badge calculados 100% no banco.
* ✅ Backend: geração de desafio via IA (`gerarDesafio`) e avaliação (`avaliarDesafio`), endpoints `/api/perguntas/:id/desafio` e `/api/desafios/:id/avaliar`.
* ✅ Frontend: fluxo completo — "quer testar seu conhecimento?" → enunciado com chip de dificuldade → resposta livre → resultado com nota (gauge circular), feedback, XP ganho, celebração de subida de nível, badges novas.
* ✅ Polimento visual pós-feedback do Ronaldo ("muito simples e sem poder atrativo"): barra de XP com progresso até o próximo nível, streak em destaque, vitrine de badges conquistadas — Home deixou de ser texto plano.
* ✅ Painel ADM atualizado com métricas reais (perguntas, desafios avaliados, XP distribuído — antes placeholder "chega na Fase 2/3") e visualização de áreas mais exploradas.

**Critério de conclusão**: ✅ Core Loop completo funciona ponta a ponta — pergunta → resposta → desafio → avaliação → XP → badge — testado em produção.

## FASE 4 — Progression ✅ concluída (2026-08-15)

* ✅ Perfil completo (nível, XP, taxa de acerto, perguntas feitas, áreas em destaque) — `/perfil`.
* ✅ Domínio por área (`progresso_area`, média corrente de nota por área, calculada dentro de `avaliar_desafio`).
* ✅ Streak (contagem de dias consecutivos) — já calculado desde a Fase 3, exibido na Home desde então.
* ✅ Missões diárias simples (`missoes_hoje()`, calculadas ao vivo, não são tabela): pergunta hoje, desafio hoje, área nova hoje.
* ✅ Mapa de Conhecimento (`/mapa`) — barra de domínio por área, ordenado do maior pro menor.
* ⏳ Bônus de XP por "missão concluída" (+50%, citado em `GAME_RULES.md`) **não foi implementado** nesta fase — missões aqui são só informativas/motivacionais. Gap registrado, decisão de wire-up adiada (ver [DECISIONS.md](DECISIONS.md)).

**Critério de conclusão**: ✅ usuário enxerga sua evolução de forma visual (nível, XP, domínio por área, missões do dia) e tem motivo pra voltar.

---

## FASE 5 — Competitive Foundation ✅ concluída (2026-08-15)

Preparação arquitetural para o Competitive Mode, sem UI competitiva pública ainda:

* ✅ **Rating** (`profiles.rating`, default 1200) separado de XP (DEC-001) — calculado dentro de `avaliar_desafio()`, fórmula v1 baseada em desempenho relativo à nota 50, escalada por dificuldade. Algoritmo **não é definitivo** (ver [GAME_RULES.md](GAME_RULES.md) §Rating) — só a separação estrutural precisava existir nesta fase.
* ✅ Fundação de anti-cheat: `avaliar_desafio()` agora rejeita avaliação enviada em menos de 3 segundos após a criação do desafio (testado — bloqueia envio instantâneo, não bloqueia uso normal).
* ✅ Rating visível **só no Painel ADM** (interno, ao lado de nível/XP na lista de usuários) — nenhum ranking público, nenhuma UI competitiva exposta ao usuário comum, conforme o critério de conclusão.
* ⏳ Generalizar o Assessment Engine pra `Question` (Concursos) **não foi feito** — decisão consciente de adiar até a Fase 7 existir de verdade, pra não generalizar código especulativamente sem o caso de uso real na frente (mesmo princípio de `DATA_MODEL.md`).

**Critério de conclusão**: ✅ arquitetura suporta Rating sem nenhuma feature de ranking visível ainda.

## FASE 6 — Rankings ✅ concluída (2026-08-15)

* ✅ Migration em produção: `profiles.aparecer_no_ranking` (opt-in, default `false`) + `profiles.nickname`; RPCs `ranking_geral`/`ranking_por_area`/`meu_ranking` — RLS/grants conferidos (`anon` sem acesso, IDOR impossível pois tudo usa `auth.uid()`), rating/nome real/e-mail nunca expostos a outros usuários.
* ✅ Leaderboard geral e por área (`/ranking`), mínimo de 5 desafios avaliados pra entrar em qualquer ranking — evita "1 acerto de sorte no topo" (ver [GAME_RULES.md](GAME_RULES.md) §Ranking justo).
* ✅ Comparativo do usuário (posição, percentual "top X%", comparação com média da plataforma, geral e por área) — sempre visível ao próprio usuário, mesmo sem opt-in público, pois é dado agregado, não identidade.
* ✅ Privacidade: opt-in explícito (nunca opt-out) pra aparecer publicamente + apelido opcional, configurável em `/perfil` — usuário nunca é obrigado a expor dado pessoal pra competir (ver [SECURITY.md](SECURITY.md) §LGPD).
* ⏳ **Por domínio** dentro de área (ex: Tecnologia → Programação → Python) **não foi implementado** — ranking por área usa `progresso_area.dominio_pct` (mesma métrica provisória da Fase 4); domínio (subárea) fica pra quando a árvore de conhecimento tiver profundidade real em uso.
* ⏳ **Perfil público/privado** (ver outro usuário) **não foi implementado** — só o próprio comparativo e o leaderboard agregado existem; visualizar o perfil de outro usuário fica fora de escopo até haver pedido real.
* ⏳ Algoritmo definitivo de rating/ranking **continua não decidido** (mesma ressalva da Fase 5) — só a fundação estrutural (mínimo de avaliações, opt-in, sem farm por volume) precisava existir nesta fase.

**Critério de conclusão**: ✅ usuário consegue ver sua posição no ranking geral e por área, comparar-se com a média da plataforma, e decidir se quer aparecer publicamente — testado com checklist de segurança (RLS ativo, `anon` sem acesso às RPCs/colunas novas, sem IDOR).

## FASE 7 — Concursos Públicos *(em andamento — 7a concluída, 2026-08-15)*

* ✅ **7a — Question Engine mínimo**: migration em produção (`concursos`, `questoes`, `tentativas_questao`, `progresso_concurso`) + RPCs (`listar_questoes`, `responder_questao`, `revisar_questao`, `ranking_por_concurso`) — revisão técnica completa aprovada antes da aplicação, checklist de segurança rodado, repetição/progresso testados em transação. Detalhe completo em [DECISIONS.md](DECISIONS.md) e [DATA_MODEL.md](DATA_MODEL.md) §Concursos Públicos.
* ✅ Correção 100% no banco, zero chamada de IA no caminho de resposta do usuário — decisão estratégica de custo.
* ✅ `Subject` reaproveita `areas` (Disciplina/Assunto), `Contest`/`ChallengeAttempt` implementados como `concursos`/`tentativas_questao`.
* ⏳ **7b — próximos passos, ainda não implementados**: frontend (`/concursos` — catálogo, resolução de questões, resultado com explicação, progresso), script de geração de questões em lote (offline, IA + revisão manual antes de publicar), extensão de `meu_ranking()` com bloco `por_concurso`.
* ⏳ `QuestionProvider` real (integração com fonte externa licenciada) **não implementado** — MVP usa só questões geradas por IA (`origem = 'ia_knowra'`), schema já extensível pra quando/se isso for integrado (ver [ARCHITECTURE.md](ARCHITECTURE.md) §Provider Layer). Nenhuma integração externa sem validar licença/termos de uso antes.
* ⏳ `Cargo` como entidade própria, simulados cronometrados, ranking por período/banca — fora de escopo até haver dado real que justifique.
* ⏳ **7c-7e — Concursos Hub (discovery completo, 2026-08-16)**: evolução de `/concursos` pra Central de Preparação (abertos/andamento/encerrados, simulados, videoaulas, desempenho) — projeto completo em [CONCURSOS_HUB.md](CONCURSOS_HUB.md), nenhuma implementação ainda, aguardando aprovação etapa por etapa.

**Critério de conclusão (7b)**: usuário consegue escolher um concurso, responder questões objetivas, ver o resultado com explicação imediatamente (sem espera de IA), acompanhar progresso por concurso, e (opcionalmente) aparecer no ranking daquele concurso — tudo com o banco de questões pré-gerado e revisado, nunca gerado ao vivo por tentativa.

## FASE 8 — Seasons & Leagues ✅ concluída (2026-08-15)

* ✅ Migration em produção: `ligas` (catálogo fixo, liga sempre derivada do rating), `temporadas` (no máximo uma `ativa` por vez), `temporada_resultados` (snapshot congelado) + RPCs `iniciar_temporada`/`encerrar_temporada`/`ranking_temporada` — checklist de segurança rodado (admin-only testado de verdade: usuário comum bloqueado, segunda temporada ativa bloqueada, snapshot conferido).
* ✅ Recompensa por liga reaproveita `badges`/`conceder_badge()` — 7 badges novas, sem currency nova.
* ✅ `/temporadas`: liga atual do usuário, temporada ativa em andamento (linka pro ranking ao vivo já existente), histórico de temporadas encerradas com leaderboard congelado, controles de admin (iniciar/encerrar) na mesma página.
* ⏳ Encerramento **é manual** (ação do admin), não automático por data — sem infraestrutura de cron no projeto. Documentado como dependência operacional, não esquecido.
* ⏳ Limiares de rating por liga são provisórios (mesma ressalva do algoritmo de Rating desde a Fase 5) — sem dado real de distribuição ainda.
* ⏳ Temporada por área/concurso, promoção/rebaixamento como mecânica própria — fora de escopo, mesmo princípio de não generalizar sem uso real.

**Critério de conclusão**: ✅ admin consegue iniciar e encerrar uma temporada, o encerramento congela ranking+liga+percentual de cada usuário elegível e distribui badge de liga, e o usuário consegue ver sua liga atual e o histórico de temporadas passadas — testado em produção com bloqueio de segurança confirmado (não-admin não consegue iniciar/encerrar).

## FASE 9+ — Social *(futuro, fora de escopo por ora — levantamento técnico feito 2026-08-15)*

Amigos, desafios entre usuários, eventos. Não iniciar código sem pedido explícito **e** sem as fases anteriores validadas com uso real — condição ainda não atingida em 2026-08-15 (uso de produção ainda muito baixo). Pedido explícito de avançar foi dado nesta data, mas a decisão foi planejar sem codificar, respeitando a segunda condição.

**Restrição de design herdada de [VISION.md](VISION.md) §O que NÃO queremos nos tornar**: "uma rede social de conhecimento onde o foco vira competição/vaidade em vez de aprendizado" é um anti-goal explícito do produto — qualquer feature social aqui precisa reforçar aprendizado, nunca virar métrica de vaidade (contagem pública de seguidores, feed de comparação, pressão social vazia).

**Decomposição dos três itens, com perguntas em aberto pro Ronaldo decidir antes de qualquer migration:**

1. **Amigos** — "seguir" unidirecional (mais simples, mas mais parecido com rede social de vaidade) vs. amizade com aceite mútuo (mais alinhado ao anti-goal do VISION.md, sem contagem pública de seguidores). Não decidido.
2. **Desafios entre usuários** — recomendação técnica: reaproveitar o banco de **Questões** (Fase 7, correção determinística, zero custo de IA por tentativa) em vez de abrir um novo tipo de desafio no Knowledge Mode (que envolveria IA/custo de novo). Não decidido.
3. **Eventos** — item mais subespecificado do ROADMAP original; pode ser torneio temporário (Temporada só entre amigos), notificação de atividade, ou outra coisa. Precisa de definição de produto antes de qualquer desenho técnico.

Ver [DECISIONS.md](DECISIONS.md) pro registro completo desse levantamento.

## Audio Engine *(discovery apenas, 2026-08-15 — fora da numeração de fases)*

Levantamento técnico completo em [AUDIO_ENGINE.md](AUDIO_ENGINE.md) — identidade sonora própria (música ambiente + efeitos de gamificação). **Nenhuma linha de código, biblioteca, tabela ou asset de áudio existe ainda.** Roadmap próprio (Etapas A a G, independente da numeração de Fases do produto) documentado lá — cada etapa exige aprovação explícita separada antes de virar implementação, mesma regra de todo o resto deste roadmap.

## KNOWRA_AI — Knowledge Memory + AI cost-zero/local-first *(discovery apenas, 2026-08-15 — fora da numeração de fases)*

Auditoria completa de dependências externas em [AI_COST_ZERO.md](AI_COST_ZERO.md), projeto de arquitetura em [KNOWRA_AI.md](KNOWRA_AI.md) — Knowledge Memory (cache semântico via `pgvector`, viabilidade alta, sem infra nova) + AI Engine local opcional via Ollama (viabilidade baixa no deploy serverless atual, exige decisão de infraestrutura separada). **Nenhuma tabela, dependência ou infraestrutura criada ainda.** Roadmap próprio (Etapas A a G) documentado em `KNOWRA_AI.md` §9 — etapas A-F não dependem de infraestrutura nova e podem ser aprovadas independentemente; etapa G (Ollama em runtime) exige decisão de infraestrutura explícita antes de qualquer código. Anthropic, KnowRa Pro, Mercado Pago e limites de IA **não foram alterados** por esta discovery.

## Sustentabilidade financeira *(em andamento, fora da numeração de fases)*

Estratégia combinada com o Ronaldo em 2026-08-15 (ver [DECISIONS.md](DECISIONS.md) e [AI_ENGINE.md](AI_ENGINE.md) §Custo de IA e sustentabilidade financeira) — ordem de prioridade, maior retorno/menor risco primeiro:

1. ✅ **Cache de respostas canônicas** — implementado. Reduz chamadas de IA repetidas sem exigir decisão de preço/plano.
2. ✅ **Limite diário de interações de IA** — implementado. 5 chamadas reais de IA por dia por usuário (cache hit não consome cota), admin isento. Número provisório — sem plano pago ainda pra comprar mais, isso é o item #3.
3. ✅ **KnowRa Pro (assinatura via Mercado Pago)** — implementado 2026-08-15. Desbloqueia limite de IA maior (30/dia vs. 5/dia free) e acesso completo a Concursos (free vê 10 questões por concurso, prática por disciplina continua livre). Ver DECISIONS.md. `MP_ACCESS_TOKEN` ainda não configurado em produção — checkout real ainda não testado ponta a ponta.
4. ⏳ AI Router multi-provider (modelo barato pra tarefas simples, Anthropic pra onde a qualidade importa).
5. ⏳ Pacotes de créditos avulsos.
6. ⏳ B2B/EDU, publicidade controlada no plano gratuito.

Não pular pra um item mais abaixo sem o anterior estar implementado ou explicitamente descartado — mesmo princípio de "MVP → validar → medir → melhorar → expandir" já aplicado ao resto do roadmap.

---

Nenhuma fase 5+ tem data ou compromisso — só existem aqui pra Fases 1-4 (já em código) não precisarem de retrabalho estrutural quando essas fases chegarem. Não avançar pra Fase 5 sem aprovação explícita do Ronaldo, mesmo que a arquitetura já esteja pronta pra isso.

## Publicação

Assim que houver primeiro deploy de produção (mesmo incompleto), aplicar o checklist da skill `novo-app-no-ar`: domínio `knowra.rhoneyinc.com`, ícone, registro na tabela `softwares` do hub, rodapé no padrão, link no rodapé do hub — status inicial `em_desenvolvimento`, nunca `disponivel` sem confirmação explícita do Ronaldo.
