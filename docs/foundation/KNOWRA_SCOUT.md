# KNOWRA_SCOUT.md — KnowRa

> Discovery/projeto de arquitetura, 2026-08-16 — a partir da proposta do Ronaldo de nomear e formalizar o agente de aquisição e curadoria de conhecimento do KnowRa ("KNOWRA Scout"). **Documento de planejamento — nenhuma linha de código, tabela ou migration foi criada.** Restrição explícita do Ronaldo: não escrever código nesta etapa, não criar segunda Knowledge Memory, não criar segundo RAG, não introduzir API paga, não baixar vídeo, não copiar conteúdo protegido sem verificar permissão, não tratar conteúdo encontrado como verdade sem validação, não implementar geração automática de questão nesta fase.

## 1. Nome e responsabilidade

**KNOWRA Scout** — agente de **aquisição e curadoria**, não "agente que aprende". Distinção deliberada, reforçada pelo próprio Ronaldo: Scout encontra e organiza conhecimento; Knowledge Memory (`knowledge_record`, já existe) armazena o que foi validado; RAG (`buscar_contexto_rag()`, já existe) recupera o relevante; `KNOWRA_AI` raciocina/gera em cima disso. Quatro responsabilidades diferentes, quatro componentes diferentes — nunca uma "IA alimentando outra IA" de forma confusa.

```text
KNOWRA SCOUT → encontra e organiza conhecimento
KNOWLEDGE MEMORY → armazena conhecimento validado
RAG → recupera conhecimento relevante
KNOWRA_AI → usa esse conhecimento pra raciocinar, explicar, personalizar
```

## 2. Achado técnico que precisa ser dito antes de qualquer desenho bonito

**"Discovery" (a camada que sai procurando conteúdo na web) não é algo que o backend do KnowRa consegue fazer sozinho hoje.** O backend é uma API Express comum (Vercel Serverless Functions) — não tem navegador embutido, não tem acesso a busca web, e o projeto **não tem infraestrutura de cron** (já documentado em várias decisões anteriores: encerramento de temporada é manual pelo mesmo motivo). Duas rotas reais, sem meio-termo mágico:

1. **Scout v1 (o que dá pra fazer agora, sem infraestrutura nova)**: um processo **conduzido por sessão** — Claude Code (ou o Ronaldo) pesquisa, verifica fonte, e cadastra via RPC já existente (`cadastrar_concurso`, `cadastrar_recurso_video`) ou nova (`cadastrar_conhecimento_scout`, §5). É exatamente o que já aconteceu nesta sessão pra popular os 4 concursos reais (`DECISIONS.md` 2026-08-16) — Scout v1 é **formalizar esse processo manual em schema e regra**, não automatizá-lo ainda.
2. **Scout v2 (automação real, decisão de infraestrutura separada)**: um job agendado de verdade precisaria de (a) infraestrutura de cron que o projeto não tem, e (b) uma API de busca real — a maioria é paga (Google Custom Search, Bing Search API) ou tem quota muito curta pra uso recorrente. Isso violaria "não introduzir API paga" se implementado sem essa decisão explícita. **Não faz parte desta etapa.**

Registrar esse limite agora evita prometer um "robô que sai caçando concurso sozinho todo dia" quando, tecnicamente, o que existe é "um fluxo repetível de pesquisa+validação+cadastro", conduzido por sessão. Isso não é menos valioso — é a mesma disciplina de honestidade já aplicada em todo o KNOWRA_AI (nunca prometer capacidade que não existe).

## 3. Arquitetura conceitual (5 camadas do Ronaldo, mapeadas ao que já existe)

```text
                KNOWRA SCOUT
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
     DISCOVERY               SOURCES
   (sessão conduzida,      (fontes_externas,
    Scout v1 — §2)          já existe conceito
                             em CONCURSOS_HUB.md)
          └──────────┬──────────┘
                     ▼
                VALIDATOR
        (checagem de licença/confiabilidade
         — reaproveita provenance + confiabilidade
         já implementados, não redesenha)
                     ▼
                 CURATOR
        (classificação: concurso/disciplina/
         questão/vídeo/edital/lei/material —
         reaproveita classificação por área já
         usada em askQuestion.ts, mesmo mecanismo)
          ┌──────────┴──────────┐
          ▼                     ▼
     CONCURSOS/RECURSOS   KNOWLEDGE MEMORY (já existe)
     (já existem)                │
                                 ▼
                                RAG (já existe, Etapa H)
                                 │
                                 ▼
                             KNOWRA_AI (já existe)
```

**Nada nessa camada duplica RAG ou Knowledge Memory.** Scout é só o funil de entrada — o que sai do Curator vai pras MESMAS tabelas que já existem (`knowledge_record`, `concursos`, `recursos_video`).

## 4. Memória de coleta — reaproveita `fontes_externas`, não cria terceira tabela

O Ronaldo propôs `source_url`/`content_hash`/`last_checked_at`/`last_changed_at`/`source_type`/`status`/`confidence`. Isso é **quase exatamente** `fontes_externas`, já projetada em `CONCURSOS_HUB.md` §6 (nome/url/tipo/status/ultima_consulta_em/licenca_uso/observacoes) e ainda não implementada. Em vez de criar uma terceira tabela de rastreio (depois de `fontes_externas` e `documentos_edital`, ambas de `CONCURSOS_HUB.md`/`CONCURSOS_INTELLIGENCE.md`, também não implementadas), a recomendação aqui é **consolidar as três em uma só** quando qualquer uma delas for implementada:

```text
fontes_externas (já projetada, estendida aqui — não é tabela nova, é a mesma evoluída)
  id, nome, url, tipo text ('edital'|'concurso_listagem'|'video'|'questao_publica'|'material'|'outro'),
  concurso_id uuid references concursos(id)  -- nullable, quando a fonte é sobre um concurso específico
  area_id uuid references areas(id)          -- nullable, quando já dá pra classificar por disciplina
  content_hash text,        -- detecta se o conteúdo mudou sem reprocessar tudo de novo
  status text check (status in ('ativa','instavel','descontinuada')),  -- já existia
  confidence numeric(4,3),  -- mesma escala de knowledge_record.confidence, não uma nova
  licenca_uso text,         -- já existia
  ultima_consulta_em timestamptz,  -- já existia (renomeia conceitualmente pra "last_checked_at")
  ultima_mudanca_em timestamptz,   -- novo: quando o conteúdo mudou de verdade (distinto de "quando foi checado")
  observacoes text,
  criado_em timestamptz
```

`documentos_edital` (`CONCURSOS_INTELLIGENCE.md` §4) fica **absorvida** por essa versão consolidada — não precisa existir separada. Decisão registrada aqui pra não duplicar quando qualquer uma das três etapas (`7c`, `7e`, Scout) for implementada de fato.

## 5. Detecção de mudança — "já conheço essa fonte?"

```text
KNOWRA SCOUT
      ↓
"content_hash bate com o que já está salvo?"
      │
 ┌────┴────┐
SIM         NÃO
 │           │
 nada muda   atualiza fontes_externas.ultima_mudanca_em
             + reprocessa o conteúdo (Validator → Curator de novo)
```

Aplicação concreta e imediata pro que já existe: **status de concurso** (🟢/🟡/🔴, já implementado — `DECISIONS.md` 2026-08-16, modelo de confiabilidade) já é uma versão simplificada disso, baseada em tempo em vez de hash de conteúdo. Quando Scout v1 rodar de novo sobre um concurso já cadastrado e achar que o status mudou (ex: inscrição encerrou), o fluxo correto é chamar `atualizar_status_concurso()` (já existe) — não sobrescrever tudo, só o que mudou.

## 6. Legal/copyright safeguards

Regra mais importante desta etapa, reforçada pelo Ronaldo: **Scout nunca copia conteúdo protegido sem verificar permissão.** Isso já tem esqueleto pronto — `questoes.origem` (`ia_knowra`/`provider_licensed`/`manual`/`import_licensed`, `check` já existente desde a Fase 7a) e `knowledge_record.provenance` (`verified`/`community`/`ai_generated`/`unverified`/`outdated`, Etapa I) já cobrem exatamente essa distinção. O que falta é **disciplina de uso, não schema novo**:

- **Concurso (metadado)**: nome/órgão/vagas/datas/edital_url — dado factual, não protegido por direito autoral no sentido de "texto criativo". Seguro pra armazenar diretamente (já é o que `cadastrar_concurso()` faz).
- **Questão de terceiro (site comercial, banca)**: **nunca armazenar o texto completo sem confirmar licença**. Sem confirmação, Scout armazena só metadado/referência (`origem = 'import_licensed'` só quando a licença for confirmada; caso contrário, no máximo um link + "esse concurso tem questões disponíveis em X", nunca o enunciado copiado).
- **Edital/conteúdo programático oficial**: documento público governamental — geralmente seguro pra extrair conteúdo (é ato oficial, não obra protegida no sentido comercial), mas o link/fonte sempre é preservado (`source_url`) pra rastreabilidade, nunca apresentado sem proveniência.
- **Vídeo**: nunca baixado (já era regra, `CONCURSOS_HUB.md` §7) — só metadado + link, mesmo com Scout.

**Regra geral**: na dúvida sobre licença, Scout armazena metadado/referência, nunca o conteúdo completo. Confirmação de licença é sempre ação humana (Ronaldo ou admin), nunca inferida automaticamente pela IA.

## 7. Cost zero strategy

- Scout v1 (sessão conduzida): custo zero de infraestrutura — usa as mesmas ferramentas de pesquisa já disponíveis na sessão do Claude Code, sem API paga nova.
- Classificação de conteúdo por área: reaproveita o mesmo mecanismo de classificação já usado em `askQuestion.ts` (chamada Anthropic já paga pelo limite diário de IA existente) — não é custo adicional novo, é o mesmo custo já orçado.
- Embedding: já resolvido, zero custo (local, `@huggingface/transformers`, Etapa B do `KNOWRA_AI.md`).
- Scout v2 (automação real) **não é cost-zero** — exigiria API de busca paga e/ou infraestrutura de cron nova. Não incluído nesta etapa, precisa de decisão de orçamento separada quando/se for proposto.

## 8. O que NÃO fazer nesta etapa (reafirmando a restrição do Ronaldo)

Não escrever código. Não criar `fontes_externas`/`documentos_edital` ainda (ficam projetadas, consolidadas em §4, aguardando aprovação de implementação junto com `7c`/`7e`). Não criar segunda Knowledge Memory. Não criar segundo RAG. Não introduzir API paga. Não baixar vídeo. Não copiar conteúdo protegido sem confirmar licença. Não tratar conteúdo encontrado como verdade sem validação (Validator, §3, é obrigatório antes de qualquer coisa chegar em `knowledge_record`/`concursos`). Não implementar geração automática de questão nesta fase.

## 9. Roadmap (cada etapa exige aprovação separada)

| Etapa | O que é | Depende de decisão/infra nova? |
|---|---|---|
| Scout.1 | Consolidar `fontes_externas` (schema único, §4) — substitui a ideia de `documentos_edital` separado | Não |
| Scout.2 | RPCs `cadastrar_fonte_externa()`/`atualizar_fonte_externa()` (admin-only, mesmo padrão de `cadastrar_concurso()`) | Não |
| Scout.3 | Formalizar o processo Scout v1 (sessão conduzida) como checklist repetível — discovery → validator → curator → cadastro, documentado, não automatizado | Não |
| Scout.4 (futuro) | Scout v2 — automação real (job agendado + API de busca paga) | Sim — decisão de infraestrutura (cron) + orçamento (API de busca), fora do cost-zero |

Scout.1-Scout.3 são baratas (schema aditivo + processo, sem API nova) — mesma régua de risco das Etapas 7c.1-7c.4 já aprovadas e implementadas.

## 10. Perguntas em aberto pro Product Owner

1. Scout.1-Scout.3 valem a pena implementar agora (formalizar o processo que já foi usado manualmente pra cadastrar os 4 concursos), ou o processo manual atual já é suficiente até haver volume real que justifique o schema formal?
2. Scout v2 (automação real) é uma direção que faz sentido perseguir no médio prazo, ou o KnowRa deve permanecer com curadoria conduzida por sessão indefinidamente (mais controle de qualidade, menos escala)?
3. Pra questão de terceiro sem licença confirmada — armazenar só link/referência é suficiente pro produto, ou isso deveria virar uma feature visível ("questões disponíveis em [site oficial]", com link de saída) em vez de só metadado interno sem uso na UI?

## 11. Status

Documento de projeto. Nenhuma implementação autorizada — conforme pedido explícito do Ronaldo. Consolida `fontes_externas`/`documentos_edital` (antes projetadas separadamente em `CONCURSOS_HUB.md`/`CONCURSOS_INTELLIGENCE.md`) numa única fonte de verdade de schema. Reaproveita integralmente `knowledge_record`, `buscar_contexto_rag()`, `questoes.origem`, `knowledge_record.provenance` — nenhum componente do KNOWRA_AI redesenhado.
