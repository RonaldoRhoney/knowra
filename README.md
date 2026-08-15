# KnowRa

Plataforma de conhecimento interativo orientada por IA, na qual a curiosidade do usuário se transforma em aprendizado, desafios e progressão. Produto da **RhoneyInc**.

> KnowRa não é um chatbot com gamificação. É um sistema que fecha o ciclo entre curiosidade e aprendizado real, testando e medindo o que o usuário efetivamente aprendeu.

**Core Loop**: `PERGUNTAR → APRENDER → DESAFIAR → DEMONSTRAR → EVOLUIR`

## Status

🚧 **Fase 0 — Discovery.** Ainda não há código de produto — a documentação de fundação está em [`docs/foundation/`](docs/foundation/).

## Documentação

Comece por [`CLAUDE.md`](CLAUDE.md) — é o ponto de entrada para entender o projeto antes de qualquer implementação. Os documentos de fundação:

| Documento | Conteúdo |
|---|---|
| [PRODUCT.md](docs/foundation/PRODUCT.md) | O que é, problema, usuário, diferencial |
| [VISION.md](docs/foundation/VISION.md) | Missão, visão, princípios |
| [CORE_LOOP.md](docs/foundation/CORE_LOOP.md) | O ciclo central do produto |
| [GAME_RULES.md](docs/foundation/GAME_RULES.md) | XP, níveis, badges |
| [KNOWLEDGE_MODEL.md](docs/foundation/KNOWLEDGE_MODEL.md) | Árvore de áreas, domínio por área |
| [AI_ENGINE.md](docs/foundation/AI_ENGINE.md) | Como a IA responde, desafia e avalia |
| [UX_PRINCIPLES.md](docs/foundation/UX_PRINCIPLES.md) | Fluxos, telas, padrão visual |
| [ARCHITECTURE.md](docs/foundation/ARCHITECTURE.md) | Stack, camadas, auth |
| [DATA_MODEL.md](docs/foundation/DATA_MODEL.md) | Entidades e relações |
| [SECURITY.md](docs/foundation/SECURITY.md) | Checklist de segurança |
| [ROADMAP.md](docs/foundation/ROADMAP.md) | Fases 0-5 |
| [DECISIONS.md](docs/foundation/DECISIONS.md) | Decisões arquiteturais registradas |

Material de referência histórica (briefing original e blueprint visual): [`KnowRaV0.1/v0.1.txt`](KnowRaV0.1/v0.1.txt) e `KnowRa.png`.

## Stack (proposta, ver ARCHITECTURE.md)

React + Vite + TypeScript + Tailwind CSS (frontend) · Node.js + Express (backend) · Supabase/PostgreSQL (banco + auth, incluindo login social Google) · Claude (Anthropic) para IA · Vercel (hospedagem).

---

Produto da [RhoneyInc](https://rhoneyinc.com).
