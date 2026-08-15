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

## FASE 2 — Knowledge

* Campo "Pergunte qualquer coisa" funcional.
* Resposta da IA (ver [AI_ENGINE.md](AI_ENGINE.md)), com classificação em área/tópico.
* Histórico de perguntas do usuário.
* Categorização (tabela `areas`, ver [DATA_MODEL.md](DATA_MODEL.md)).
* Contexto básico passado à IA (histórico recente do usuário).

**Critério de conclusão**: usuário pergunta algo, recebe resposta contextualizada, e consegue ver essa pergunta depois no histórico.

## FASE 3 — Game

* Geração de desafio a partir da resposta.
* Fluxo de avaliação (resposta livre → nota + feedback da IA).
* Cálculo de XP (fórmula completa, ver [GAME_RULES.md](GAME_RULES.md)).
* Níveis (tabela fixa de XP necessário).
* Badges básicas (as listadas em [GAME_RULES.md](GAME_RULES.md)).

**Critério de conclusão**: Core Loop completo funciona ponta a ponta — pergunta → resposta → desafio → avaliação → XP → badge, quando aplicável.

## FASE 4 — Progression

* Perfil completo (nível, XP, taxa de acerto, áreas em destaque).
* Domínio por área (`progresso_area`, cálculo real a partir de desafios avaliados).
* Streak (contagem de dias consecutivos).
* Missões diárias/semanais simples.
* Mapa de Conhecimento (visualização, ex.: radar chart por área).

**Critério de conclusão**: usuário enxerga sua evolução de forma visual e consegue voltar por causa da streak/missões.

## FASE 5+ — Social (futuro, fora de escopo por ora)

Amigos, rankings, desafios entre usuários, eventos. Não iniciar sem pedido explícito e sem as fases anteriores validadas com uso real.

## Publicação

Assim que houver primeiro deploy de produção (mesmo incompleto), aplicar o checklist da skill `novo-app-no-ar`: domínio `knowra.rhoneyinc.com`, ícone, registro na tabela `softwares` do hub, rodapé no padrão, link no rodapé do hub — status inicial `em_desenvolvimento`, nunca `disponivel` sem confirmação explícita do Ronaldo.
