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

## FASE 6 — Rankings *(planejado)*

* Leaderboard geral, por área, por domínio (ver [GAME_RULES.md](GAME_RULES.md) §Ranking justo).
* Comparativo do usuário (posição, percentual, comparação com média) na UI de perfil.
* Privacidade do ranking (nickname, opt-out, perfil público/privado) — ver [SECURITY.md](SECURITY.md) §LGPD.

## FASE 7 — Concursos Públicos *(planejado)*

* `Question`/`QuestionProvider` reais (ver [DATA_MODEL.md](DATA_MODEL.md) e [ARCHITECTURE.md](ARCHITECTURE.md) §Provider Layer).
* Estrutura de Concurso/Cargo/Banca/Disciplina/Assunto.
* Ranking de concursos (geral, por concurso, disciplina, banca, período).

## FASE 8 — Seasons & Leagues *(planejado)*

* Temporadas com início/fim, ranking congelado ao final, recompensas.
* Ligas (Bronze → Lenda) — ver [GAME_RULES.md](GAME_RULES.md).

## FASE 9+ — Social *(futuro, fora de escopo por ora)*

Amigos, desafios entre usuários, eventos. Não iniciar sem pedido explícito e sem as fases anteriores validadas com uso real.

---

Nenhuma fase 5+ tem data ou compromisso — só existem aqui pra Fases 1-4 (já em código) não precisarem de retrabalho estrutural quando essas fases chegarem. Não avançar pra Fase 5 sem aprovação explícita do Ronaldo, mesmo que a arquitetura já esteja pronta pra isso.

## Publicação

Assim que houver primeiro deploy de produção (mesmo incompleto), aplicar o checklist da skill `novo-app-no-ar`: domínio `knowra.rhoneyinc.com`, ícone, registro na tabela `softwares` do hub, rodapé no padrão, link no rodapé do hub — status inicial `em_desenvolvimento`, nunca `disponivel` sem confirmação explícita do Ronaldo.
