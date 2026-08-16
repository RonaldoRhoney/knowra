# CONCURSOS_INTELLIGENCE.md — KnowRa

> Discovery/projeto de arquitetura, 2026-08-16 — a partir da proposta do Ronaldo de elevar `/concursos` de "catálogo com questão gerada às cegas" pra uma camada de inteligência que conhece o edital, entende conteúdo programático e personaliza a preparação por usuário. **Documento de planejamento — nenhuma linha de código, tabela ou migration foi criada.** Explicitamente pedido pelo Ronaldo: "não pediria ainda ao Claude para implementar isso". Cada etapa do roadmap (§9) exige aprovação separada, mesma regra de `KNOWRA_AI.md`/`AUDIO_ENGINE.md`/`CONCURSOS_HUB.md`.

## 1. Objetivo

Sair de "o KnowRa tem uma lista de concursos e gera questão sobre um tema solto" para "o KnowRa conhece o edital de cada concurso, entende do que ele é feito, e usa esse conhecimento pra gerar questão, simulado, dica e recomendação de estudo grounded em conteúdo real — nunca inventado". A peça central é conectar a Knowledge Memory/RAG que **já existe** (`KNOWRA_AI.md`, Etapas A-J) ao domínio de Concursos, que hoje roda **sem nenhuma conexão com ela**.

## 2. Reconciliação com o que já existe (não é greenfield)

Achado importante antes de desenhar algo novo: boa parte da infraestrutura que esse documento precisa **já está implementada**, só nunca foi conectada a Concursos:

| Peça necessária | Já existe? | Onde |
|---|---|---|
| Knowledge Memory (registro de conhecimento + embedding) | ✅ Sim | `knowledge_record` (`KNOWRA_AI.md` Etapa A/B) |
| RAG Retrieval Engine híbrido (vetor + full-text + top-K) | ✅ Sim | `buscar_contexto_rag()` (`KNOWRA_AI.md` Etapa H) |
| Confidence Engine (nunca serve conteúdo de baixa confiança) | ✅ Sim | `confidence`/`status` em `knowledge_record` (Etapa D) |
| Source Provenance (verified/community/ai_generated/unverified/outdated) | ✅ Sim | `provenance` em `knowledge_record` (Etapa I) |
| Knowledge Entity (deduplicação por tema/conceito) | ✅ Sim | `area_id` em `knowledge_record`, reaproveitando `areas` (Etapa J) |
| Geração de questão a partir de tema (sem RAG ainda) | ✅ Sim, mas cega | `gerar_questoes.ts` — recebe só `area_nome`, nunca consulta `knowledge_record` |
| Progresso por disciplina/concurso (base de "perfil de aprendizado") | ✅ Sim | `progresso_concurso`, `progresso_disciplina_questoes` (`DECISIONS.md` 2026-08-16) |
| Pipeline de validação antes de publicar | ✅ Sim | `questoes.review_status` (`generated`→`pending_review`→`approved`→`published`) |
| Extração de conteúdo de edital → Knowledge Memory | ❌ Não existe | **é o que este documento projeta** |
| Ligação `knowledge_record` ↔ `concursos` | ❌ Não existe | **é o que este documento projeta** |
| Cross-concurso (mesma disciplina em concursos diferentes) | ⚠️ Latente, não exposto | já é possível hoje via `area_id` compartilhado — só falta uma RPC de leitura |
| Recomendação adaptativa ("estude X primeiro") | ⚠️ Latente, não exposto | dado já existe em `progresso_disciplina_questoes` (menor `dominio_pct`) — só falta expor |

**Conclusão prática**: o gap real é menor do que parece à primeira vista. Não precisamos reinventar RAG, Confidence Engine ou Knowledge Entity — precisamos (1) ensinar o KnowRa a extrair conteúdo de edital pra dentro da Knowledge Memory que já existe, e (2) conectar `gerar_questoes.ts`/simulado a essa memória via `buscar_contexto_rag()`, que também já existe.

## 3. Arquitetura conceitual

```text
CONCURSOS IMPORTADOS (já existe, Etapa 7c)
        │
        ▼
   EDITAL / DOCUMENTO OFICIAL          ← novo: fonte real, nunca texto inventado
        │
        ▼
   EXTRAÇÃO (parsing de PDF/HTML)      ← novo: Etapa 7e.1
        │
        ▼
   NORMALIZAÇÃO (chunking + classificação por área/tópico)
        │
        ▼
   KNOWLEDGE MEMORY (knowledge_record) ← JÁ EXISTE, só ganha concurso_id
        │
        ▼
   RAG RETRIEVAL ENGINE (buscar_contexto_rag) ← JÁ EXISTE, Etapa H
        │
        ▼
   KNOWRA_AI (AIProvider.gerarQuestoes, estendido) ← Etapa 7e.2
        │
   ┌────┼────┬─────────┬──────────┐
   ▼    ▼    ▼         ▼          ▼
QUESTÃO SIMULADO DICA  ALERTA  PLANO DE ESTUDO
   │    │    │         │          │
   └────┴────┴─────────┴──────────┘
        │
        ▼
   VALIDAÇÃO (review_status, já existe) → PUBLICAÇÃO
        │
        ▼
   USUÁRIO responde → progresso_concurso/progresso_disciplina_questoes (já existe)
        │
        ▼
   RECOMENDAÇÃO ADAPTATIVA (menor domínio → próxima sugestão) — Etapa 7e.4
```

**Regra inegociável, reafirmada** (mesma já aplicada em todo o KNOWRA_AI): `CONCURSO → IA lê → IA inventa` nunca acontece. O caminho é sempre `FONTES → EXTRAÇÃO → NORMALIZAÇÃO → KNOWLEDGE BASE → RAG → GERAÇÃO → VALIDAÇÃO → PUBLICAÇÃO` — a IA só gera em cima de conteúdo que passou pela extração real, nunca "sabe" o edital de memória.

## 4. Data model (projeto, aditivo)

```text
knowledge_record (já existe — extensão aditiva, nenhuma coluna removida)
  + concurso_id uuid references concursos(id) on delete set null  -- null = conhecimento geral (como já é hoje)
  + subtopico text  -- granularidade abaixo de topic/area_id, opcional

  -- origem_documento e source_url JÁ EXISTEM (source, source_url) — reaproveitados,
  -- não duplicados. "verified_at" já existe como last_verified_at.

documentos_edital (novo — rastreia o documento fonte, não o conteúdo extraído)
  id, concurso_id (fk), url, tipo text ('edital'|'retificacao'|'anexo'),
  hash_conteudo text,  -- detecta se o PDF mudou (retificação) sem reprocessar tudo de novo
  processado_em timestamptz, status text check (status in ('pendente','processado','erro')),
  criado_em timestamptz
```

Nenhuma tabela nova de "KnowledgeItem" separada — **reaproveita `knowledge_record`** (mesmo raciocínio já aplicado à Etapa J, "não duplicar Knowledge Memory"). `concurso_id` nullable mantém compatibilidade total com o conhecimento geral que já existe (Knowledge Mode).

## 5. Cross-concurso: já é possível hoje, só falta uma RPC

O insight "Direito Constitucional aparece nos Concursos A e B" não precisa de nada novo no schema — `questoes.area_id`/`knowledge_record.area_id` já são compartilhados entre concursos diferentes (Knowledge Entity, Etapa J). Uma RPC de leitura (`areas_recorrentes_entre_concursos()`, agrupando por `area_id` com `count(distinct concurso_id) > 1`) expõe isso sem migration nenhuma. Registrado aqui como Etapa 7e.3 — a mais barata de todas, porque o dado já existe.

## 6. Recomendação adaptativa: também já é maioritariamente latente

"Seu próximo desafio deveria ser Raciocínio Lógico" não exige IA na primeira versão — é `select area_id from progresso_disciplina_questoes where usuario_id = ... order by dominio_pct asc limit 1`, dado que já existe (Etapa "Questões: pontuação por disciplina", `DECISIONS.md` 2026-08-16). A versão com IA (explicar *por que* e sugerir questão específica) é evolução, não pré-requisito — separar as duas em etapas diferentes evita over-engineering (mesmo princípio já usado em toda a Fase 7).

## 7. Geração de questão grounded em RAG (Etapa 7e.2)

`gerar_questoes.ts` hoje chama a Anthropic só com `area_nome` + `dificuldade`, sem nenhum contexto real. Evolução: antes de gerar, consultar `buscar_contexto_rag()` (já existe, Etapa H) filtrando por `concurso_id`/`area_id`, e passar o resultado como contexto — exatamente o mesmo mecanismo já usado em `askQuestion.ts` desde a Etapa H, aplicado ao script de geração em lote em vez do fluxo de pergunta ao vivo. Isso é uma mudança pequena e cirúrgica: o RAG já existe, só nunca foi chamado por esse script.

## 8. Extração de edital (Etapa 7e.1) — a única peça genuinamente nova

**Dependência nova a avaliar, não decidida ainda**: parsing de PDF (a maioria dos editais é PDF). Opções a avaliar quando essa etapa for aprovada: biblioteca de extração de texto (`pdf-parse` ou similar, JS, sem custo) pra PDFs com texto real; OCR (custo/complexidade maior) só se algum edital for PDF escaneado (imagem, sem camada de texto) — decisão adiada até haver um caso real que exija. Chunking (dividir o texto extraído em pedaços que fazem sentido pra embedding) e classificação por área (reaproveita o mesmo mecanismo de classificação já usado em `askQuestion.ts`, `AIProvider.responder`) — nenhum mecanismo novo de classificação, só aplicado a um texto de origem diferente (edital em vez de pergunta do usuário).

## 9. Roadmap (cada etapa exige aprovação separada)

| Etapa | O que é | Depende de decisão/infra nova? |
|---|---|---|
| 7e.1 | Extração de edital → `knowledge_record` (com `concurso_id`) — parsing de PDF, chunking, classificação por área | Sim — escolha de biblioteca de extração, sem custo esperado (avaliar OCR só se necessário) |
| 7e.2 | `gerar_questoes.ts` grounded em RAG (`buscar_contexto_rag()` filtrado por concurso) | Não — reaproveita Etapa H |
| 7e.3 | `areas_recorrentes_entre_concursos()` — cross-concurso, dado já existe | Não |
| 7e.4 | Recomendação adaptativa básica (menor `dominio_pct` → sugestão), sem IA | Não |
| 7e.5 | Recomendação adaptativa com IA (explicação + questão específica), simulado personalizado automático, plano de estudo gerado | Não em infra, mas escopo de produto a decidir (quanto de "coach automático" o KnowRa deve ser) |

7e.3 e 7e.4 são as mais baratas (dado já existe, só falta RPC de leitura) — candidatas a serem feitas antes de 7e.1/7e.2 se o Ronaldo quiser valor rápido sem esperar a extração de edital funcionar.

## 10. Riscos

- **Qualidade de extração de PDF variável** (edital mal formatado, tabela, coluna dupla) — mitigação: `documentos_edital.status = 'erro'` sinaliza falha, nunca publica conteúdo malformado como se fosse limpo.
- **Volume de embedding gerado por edital** — editais são longos; chunking mal calibrado gera muito ruído na Knowledge Memory. Calibrar com 1-2 editais reais antes de escalar (mesmo princípio de MVP pequeno já usado na Etapa 7c.5).
- **Custo de IA na classificação de cada chunk** — cada chunk extraído precisa de uma classificação de área; volume alto por edital pode custar mais do que o esperado. Medir com edital real antes de assumir barato.

## 11. Custo

Extração de PDF: zero (biblioteca local, sem API paga, dado já mapeado em §8). Embeddings: já resolvido, zero custo (Etapa B, local via `@huggingface/transformers`). Classificação de chunk por área: chamada de IA real (Anthropic) — custo a medir com edital real antes de aprovar 7e.1 em escala; para 1-2 editais de validação, custo desprezível.

## 12. Perguntas em aberto pro Product Owner

1. Ordem de implementação: 7e.3/7e.4 primeiro (baratas, dado já existe) ou 7e.1/7e.2 primeiro (a peça mais nova e mais alinhada com a visão de longo prazo)?
2. Escopo de 7e.5 ("coach automático"): até onde o KnowRa deve decidir por conta própria o que o usuário estuda, vs. só sugerir e deixar o usuário escolher? Tem implicação de produto, não só técnica.
3. Extração de edital: aprovar 7e.1 já pros 4 concursos reais cadastrados (Etapa 7c.5), ou esperar mais volume de concurso cadastrado antes de investir na extração?

## 13. Status

Documento de projeto. Nenhuma implementação autorizada — conforme pedido explícito do Ronaldo. Complementa (não substitui) `CONCURSOS_HUB.md` §10/§16 (Etapa 7e, agora detalhada aqui) e `KNOWRA_AI.md` (RAG/Knowledge Memory/Knowledge Entity, reaproveitados integralmente, não redesenhados).
