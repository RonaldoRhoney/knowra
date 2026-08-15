# KnowRa — Instruções para Claude Code

> Documentação de fundação em `docs/foundation/` — leia tudo antes de escrever qualquer código. Este arquivo é o ponto de entrada; os documentos individuais têm o detalhe.

## 1. Identidade do projeto

Você está trabalhando no **KnowRa**, produto da **RhoneyInc**.

KnowRa **não é um chatbot com gamificação**. É uma plataforma de conhecimento interativo orientada por IA, na qual a curiosidade do usuário se transforma em aprendizado, desafios e progressão.

> **Missão**: tornar o aprendizado uma jornada divertida, contínua e significativa para todos.
> **Visão**: ser a principal plataforma de evolução intelectual do mundo.

O núcleo do produto é o Core Loop:

```text
PERGUNTAR → APRENDER → DESAFIAR → DEMONSTRAR → EVOLUIR
```

Ver [docs/foundation/CORE_LOOP.md](docs/foundation/CORE_LOOP.md) — esse conceito é praticamente uma regra arquitetural, não apenas um fluxo de tela.

---

## 2. Regra fundamental

### NÃO CODIFIQUE IMEDIATAMENTE.

Antes de qualquer alteração no projeto:

1. Leia este arquivo.
2. Leia `docs/foundation/PRODUCT.md` e `VISION.md`.
3. Leia `docs/foundation/ARCHITECTURE.md` e `DATA_MODEL.md`.
4. Leia `docs/foundation/ROADMAP.md`.
5. Inspecione a estrutura atual do projeto e o código existente, se houver.
6. Identifique possíveis problemas ou lacunas na documentação.
7. Apresente um plano para a etapa solicitada.
8. Só implemente depois que a etapa estiver claramente definida.

Nunca implemente uma funcionalidade apenas porque parece interessante. Antes de escolher uma tecnologia, avalie suas consequências. Antes de alterar uma arquitetura existente, verifique dependências e impactos. Se identificar uma solução melhor que a especificada, apresente a proposta, explique o motivo e preserve o objetivo original do produto — não troque silenciosamente.

---

## 3. Hierarquia de decisões

Em caso de dúvida, siga esta ordem:

1. Instruções explícitas do usuário.
2. `CLAUDE.md` (este arquivo).
3. `docs/foundation/PRODUCT.md` e `VISION.md`.
4. `docs/foundation/CORE_LOOP.md` e `GAME_RULES.md`.
5. `docs/foundation/ARCHITECTURE.md` e `DATA_MODEL.md`.
6. `docs/foundation/AI_ENGINE.md`, `KNOWLEDGE_MODEL.md`, `UX_PRINCIPLES.md`, `SECURITY.md`.
7. `docs/foundation/ROADMAP.md` e `DECISIONS.md`.
8. Código existente.
9. Boas práticas técnicas e padrões RhoneyInc (`.claude/skills/` em `MyApps/`).

Se houver conflito entre documentos, **não escolha silenciosamente** — informe o conflito e peça orientação.

---

## 4. Princípios de desenvolvimento

> **MVP → validar → medir → melhorar → expandir.**
> Nunca: MVP → 50 funcionalidades → arquitetura complexa → difícil manutenção.

Priorizar: simplicidade, qualidade, manutenção, segurança, acessibilidade, performance, experiência do usuário, arquitetura modular, testes, documentação.

Regra de ouro: antes de implementar uma funcionalidade, entenda o problema que ela resolve. Antes de escolher uma tecnologia, avalie suas consequências. Não implemente funcionalidades apenas porque parecem interessantes.

---

## 5. Papéis

* **Ronaldo (Product Owner)** — define o que o produto deve ser, aprova arquitetura e prioridades.
* **Claude Code (Principal Engineer)** — analisa, questiona tecnicamente, projeta e implementa.
* **Mentor de produto/arquitetura** — revisa propostas, ajuda a estruturar decisões (papel externo ao Claude Code, mas cujas diretrizes vivem em `KnowRaV0.1/v0.1.txt` e na imagem `KnowRa.png`, ambos na raiz do repo como material de referência histórica).

---

## 6. Fases do projeto

```text
FASE 0 — DISCOVERY      → docs/foundation/*.md (sem código)
FASE 1 — FOUNDATION     → projeto, ambiente, design system, auth, banco, API base, observabilidade
FASE 2 — KNOWLEDGE      → pergunta, resposta, histórico, categorização, contexto
FASE 3 — GAME           → desafios, avaliação, XP, níveis, badges
FASE 4 — PROGRESSION    → perfil, áreas, streak, missões, mapa de conhecimento
FASE 5+ — SOCIAL/FUTURO → fora de escopo por enquanto
```

Detalhe de cada fase em [docs/foundation/ROADMAP.md](docs/foundation/ROADMAP.md). **Estamos na Fase 0.** Não avance de fase sem confirmação explícita do Ronaldo.

---

## 7. Padrões RhoneyInc (obrigatórios, não opcionais)

KnowRa é um produto da RhoneyInc e segue a mesma filosofia dos produtos irmãos (MeuPet, FinWise, FitNow, MontaMovel, AmaVida, MenuFlex, VagaLume, VoaRadar):

* **Design**: premium, moderno, elegante, responsivo, mobile-first, hierarquia visual clara, microinterações com propósito, estados de loading/vazio/erro tratados, acessibilidade.
* **UX**: o usuário não precisa entender tecnologia para usar o KnowRa — "simples por fora, sofisticada por dentro".
* **Rodapé**: quando o web app existir, seguir o esqueleto fixo de 4 colunas (Marca / Produto / RhoneyInc / Legal) — skill `footer-padrao` em `MyApps/.claude/skills/`. Não inventar estrutura própria.
* **Admin**: `rhoneyinc@gmail.com` é sempre promovida a admin automaticamente via trigger no banco, assim que o conceito de admin/role existir — skill `admin-padrao`.
* **Login social com Google**: obrigatório desde a Fase 1, no mesmo padrão já usado nos produtos irmãos (Supabase Auth + provider Google OAuth) — ver [docs/foundation/ARCHITECTURE.md](docs/foundation/ARCHITECTURE.md) §Auth e [docs/foundation/DATA_MODEL.md](docs/foundation/DATA_MODEL.md). Não é uma opção entre outras — é o método de entrada padrão do ecossistema, ao lado de e-mail/senha.
* **Segurança**: antes de qualquer deploy, rodar o checklist das 5 falhas de vibe coding (RLS desativado, permissão no front-end, IDOR, chaves expostas, XSS) — skill `vibe-coding-5-falhas`. Ver [docs/foundation/SECURITY.md](docs/foundation/SECURITY.md).
* **Premissas**: antes de executar um brief técnico detalhado, confira as afirmações contra o código/schema real antes de aceitar como verdade — skill `verificar-premissas`.
* **App no ar**: assim que houver deploy de produção, aplicar o checklist do hub (`novo-app-no-ar`) — subdomínio `knowra.rhoneyinc.com`, registro na tabela `softwares`, ícone, rodapé.

---

## 8. O grande cuidado: XP e gamificação

`pergunta = XP` está proibido — quebraria o sistema. XP é função de dificuldade × qualidade da resposta × conhecimento demonstrado × bônus contextual. Badges representam comportamento ou domínio, nunca apenas volume ("fez 10 perguntas" não é uma badge válida). Detalhe completo em [docs/foundation/GAME_RULES.md](docs/foundation/GAME_RULES.md).

---

## 9. IA com contexto, não chatbot genérico

A IA nunca deve responder só com base na pergunta isolada. Contexto mínimo esperado: usuário → nível global → nível da área → histórico → conhecimentos demonstrados → pontos fracos → pergunta atual → objetivo da interação. Isso é o que torna o KnowRa um mentor adaptativo. Ver [docs/foundation/AI_ENGINE.md](docs/foundation/AI_ENGINE.md).

---

## 10. Segurança

Nunca: colocar API keys no código, colocar secrets no Git, armazenar senha em texto puro, expor credenciais no frontend, decidir permissão/role no client, criar endpoint que devolve dado sem checar dono (IDOR). Usar variáveis de ambiente; `.env.example` sempre sem valores reais. Detalhe em [docs/foundation/SECURITY.md](docs/foundation/SECURITY.md).

---

## 11. Melhorias identificadas fora do escopo

Se identificar uma melhoria fora da tarefa atual, **não implementar automaticamente**. Registrar como:

```text
Melhoria futura identificada:
Descrição:
Motivo:
Impacto:
Sugestão:
```

E apresentar ao usuário — não construir ideias não solicitadas (mesmo princípio já aplicado no VoaRadar).

---

## 12. Comunicação

Ao iniciar uma tarefa: **Entendimento**, **Estado atual**, **Plano**, **Riscos**.
Depois da implementação: **Implementado**, **Testado**, **Pendências**, **Próximo passo sugerido**.

---

## 13. Regra final

Antes de qualquer implementação importante, perguntar: isso resolve o problema certo? Está dentro da fase atual? Respeita o Core Loop? Respeita a arquitetura? Melhora a experiência do usuário? Pode ser testado com segurança?

**O objetivo não é escrever o máximo de código possível. É construir o KnowRa corretamente, uma fase de cada vez.**
