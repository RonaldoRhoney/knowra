# ARCHITECTURE.md — KnowRa

> Este documento propõe uma arquitetura inicial. Antes de implementar, o Claude Code deve avaliar: stack atual do ecossistema RhoneyInc, custo, escalabilidade, segurança, facilidade de manutenção, integração com IA, velocidade de desenvolvimento — e justificar a escolha final, sinalizando qualquer divergência ao Ronaldo em vez de decidir silenciosamente.

## Visão geral (blueprint conceitual)

```text
                 KNOWRA
                    │
        ┌───────────┴───────────┐
        │                       │
     WEB APP                MOBILE
        │                       │
        └───────────┬───────────┘
                    ↓
                API Layer
                    ↓
        ┌───────────┼───────────┐
        ↓           ↓           ↓
     Auth       Knowledge      Game
     Engine       Engine       Engine
        │           │           │
        └───────────┼───────────┘
                    ↓
                 AI Engine
                    ↓
              Data Layer
```

Mobile é aspiracional (React Native/Expo, conforme blueprint) — **não faz parte do MVP**. O MVP é web-first.

## Stack recomendada (alinhada ao padrão RhoneyInc)

* **Frontend web**: React + Vite + TypeScript + Tailwind CSS — mesmo padrão já usado em MenuFlex, VoaRadar, VagaLume, VendeFlex. Deliberadamente diferente do "HTML estático" usado em produtos mais antigos (MeuPet, RhoneyInc hub) porque o KnowRa tem estado de UI e interações dinâmicas suficientes para justificar um framework, assim como os produtos mais recentes.
* **Backend**: Node.js + Express (API Gateway + serviços), conforme blueprint — alternativa a avaliar caso surja necessidade concreta de Python (ex.: processamento de IA mais pesado), mas Node é o padrão inicial por simplicidade de stack única com o frontend.
* **Banco de dados**: PostgreSQL via **Supabase** — é o padrão de fato do ecossistema RhoneyInc (MeuPet, VoaRadar, VagaLume, MenuFlex, RhoneyInc hub todos usam Supabase), o que já resolve Auth (incluindo OAuth Google), Row Level Security e API automática (PostgREST) sem reinventar. Diverge do blueprint original (que sugeria "Auth Service" e "Database" como camadas separadas) — a proposta aqui é usar Supabase Auth + Postgres RLS no lugar de um Auth Service customizado com JWT próprio, porque reduz superfície de ataque e tempo de desenvolvimento sem abrir mão de segurança (RLS resolve isolamento por usuário de forma mais robusta que checagem manual em cada endpoint).
* **Cache/fila**: Redis — mencionado no blueprint; só entra quando houver necessidade real medida (ex.: rate limit de chamadas de IA), não desde o dia 1.
* **IA**: Claude (Anthropic) como provedor principal — ver [AI_ENGINE.md](AI_ENGINE.md).
* **Hospedagem**: Vercel — padrão RhoneyInc para frontend e funções serverless.

## Auth (login social Google — obrigatório)

Login social com Google é **padrão RhoneyInc**, não uma opção entre várias — deve estar presente desde a Fase 1, junto com e-mail/senha, seguindo o mesmo modelo já usado em produtos irmãos:

* **Supabase Auth** como provedor de identidade, com o provider **Google OAuth** habilitado no projeto Supabase do KnowRa desde a criação.
* Trigger `handle_new_user()` no Postgres promove automaticamente `rhoneyinc@gmail.com` a admin, independente do método de login usado (e-mail/senha ou Google) — skill `admin-padrao`, ver [SECURITY.md](SECURITY.md).
* Nenhuma decisão de permissão/role pode viver no frontend — sempre imposta via RLS/backend (ver [SECURITY.md](SECURITY.md)).

## Camadas lógicas (dentro do backend)

* **Auth** — delegada ao Supabase Auth (login e-mail/senha + Google), não um serviço customizado.
* **Knowledge Engine** — classificação de perguntas em área/tópico/conceito, cálculo de domínio por área (ver [KNOWLEDGE_MODEL.md](KNOWLEDGE_MODEL.md)).
* **Game Engine** — cálculo de XP, nível, streak, badges (ver [GAME_RULES.md](GAME_RULES.md)).
* **AI Engine** — orquestra as 3 chamadas de IA do Core Loop (responder, desafiar, avaliar) — ver [AI_ENGINE.md](AI_ENGINE.md). Sempre server-side, nunca chamada direta do frontend para o provedor de IA.

## Domínio de produção

`knowra.rhoneyinc.com` — subdomínio do domínio já registrado no Vercel da RhoneyInc, seguindo o padrão dos produtos irmãos (skill `novo-app-no-ar`). Nunca publicar em domínio genérico (`*.vercel.app`) como URL final pública, exceto como preview de desenvolvimento.

## Repositório

Repositório próprio (`github.com/RonaldoRhoney/knowra`), fora do repo raiz do home (que hoje pertence ao MeuPet) — mesmo padrão de AmaVida, MontaMovel, VagaLume, VoaRadar: cada produto RhoneyInc tem seu próprio repositório.

## Estrutura de pastas proposta (Fase 1)

```text
knowra/
├── CLAUDE.md
├── README.md
├── docs/
│   └── foundation/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── features/
│   │   ├── services/
│   │   ├── hooks/
│   │   ├── types/
│   │   └── utils/
│   └── ...
├── backend/
│   ├── src/
│   │   ├── api/
│   │   ├── core/
│   │   ├── services/
│   │   │   ├── auth/
│   │   │   ├── knowledge/
│   │   │   ├── game/
│   │   │   └── ai/
│   │   └── types/
│   └── ...
└── supabase/
    └── migrations/
```

Estrutura pode ser ajustada com justificativa técnica na hora da Fase 1 — não travar decisão de tooling específico (ex.: Next.js vs. Vite+React puro) antes de avaliar necessidade real de SSR.

---

## Engines conceituais (atualização 2026-08-15 — planejado, não implementado)

> Ver [DECISIONS.md](DECISIONS.md). O objetivo é nomear as camadas de forma genérica desde já, pra Concursos Públicos (e outros domínios futuros: ENEM, vestibulares, certificações) serem **consumidores** dessas capacidades em vez de forçar um redesenho. Nada aqui exige mudar o código já escrito das Fases 1-3 — é sobre como as próximas camadas se encaixam por cima.

```text
User
 ↓
Knowledge Engine        (áreas, tópicos, perguntas — já implementado)
 ↓
Question Engine         (Questões estruturadas — planejado, ver KNOWLEDGE_MODEL.md)
 ↓
Assessment Engine       (avaliação — hoje é a lógica dentro de avaliar_desafio(), generalizar quando Questão existir)
 ↓
Progression Engine      (XP, nível, streak, badges — já implementado, hoje dentro das RPCs da Fase 3)
 ↓
Competition Engine      (Rating, Ranking, Seasons, Leagues — planejado)
```

Nomenclatura deliberadamente **não** usa "ConcursoEngine" nem qualquer nome atrelado a um domínio específico — evita que o núcleo fique rígido quando outro domínio (ENEM, certificação) for adicionado. O `Competition Engine` consome resultados do `Assessment`/`Progression Engine`, nunca calcula XP/Rating por conta própria.

## Question Provider Layer (planejado)

```text
KnowRa → Question Engine → Provider Layer → Provider A / Provider B / banco próprio KnowRa / geração por IA
```

Cada provider (fonte de Questões) deve poder ter, quando implementado: configuração, autenticação, limite de requisições, custo, origem, licença, status, estratégia de sincronização, tratamento de erros — mesmo princípio de abstração por adapter já descrito em [AI_ENGINE.md](AI_ENGINE.md) §Provider Abstraction, mas para fontes de conteúdo em vez de modelos de IA. **Não implementar integrações reais agora** — só não acoplar o schema/código a um único fornecedor de questões quando o Question Engine for construído.

## Audio Engine (discovery, ver [AUDIO_ENGINE.md](AUDIO_ENGINE.md) — não implementado)

Camada independente dos engines de domínio acima (não é Knowledge/Assessment/Progression/Competition — é uma camada de apresentação que *escuta* eventos deles):

```text
Application
    │
    ▼
Audio Context / Provider (React Context, global, acima do roteamento)
    │
    ▼
Audio Engine
    ├── Music Manager
    ├── SFX Manager
    ├── Volume Manager
    ├── Track Manager
    ├── Preference Manager
    └── Provider Layer (mesmo princípio do Question Provider Layer acima)
```

Detalhe completo, incluindo por que Music e SFX nunca compartilham estado, em `AUDIO_ENGINE.md` §Arquitetura.

## KNOWRA_AI — Knowledge Memory + AI Engine (discovery, ver [KNOWRA_AI.md](KNOWRA_AI.md) — não implementado)

Camada nova proposta pra reduzir dependência de IA externa em runtime, sem removê-la:

```text
KNOWRA
   │
KNOWRA_AI
   │
   ├── Knowledge Memory (pgvector, cache semântico — viabilidade alta, sem infra nova)
   │
   └── AI Engine (Provider Abstraction — ver §Provider Abstraction em AI_ENGINE.md)
         ├── Anthropic (já existe)
         └── Ollama/local (opcional, viabilidade baixa no deploy serverless atual — ver KNOWRA_AI.md §7)
```

Knowledge Memory é independente da decisão sobre IA local — pode avançar sozinha. Detalhe completo em `KNOWRA_AI.md` e auditoria de dependências em `AI_COST_ZERO.md`.

## Onde o código atual se encaixa

| Hoje (implementado) | Engine conceitual | Observação |
|---|---|---|
| `areas`, `perguntas` | Knowledge Engine | sem mudança necessária |
| `desafios` (Fase 3) | Assessment Engine (caso Knowledge Mode) | fica como está; Competitive Mode ganha tabela própria, ver [KNOWLEDGE_MODEL.md](KNOWLEDGE_MODEL.md) |
| RPCs `avaliar_desafio`/XP/nível/streak/badges | Progression Engine | lógica já centralizada no banco, reaproveitável |
| — | Question Engine, Competition Engine, Provider Layer | não existem ainda, só desenhados aqui |
