# KNOWRA_AI.md — KnowRa

> Discovery/projeto de arquitetura, 2026-08-15 — a partir da proposta do Ronaldo (`APIsFree.txt`) e da auditoria em [AI_COST_ZERO.md](AI_COST_ZERO.md). **Nenhuma linha de código, tabela, dependência ou infraestrutura foi criada.** Cada etapa do roadmap (§9) precisa de aprovação explícita separada antes de virar implementação — mesma regra de todo o resto deste projeto (`CLAUDE.md` §2).

## 1. Objetivo

Transformar o KnowRa de "aplicação que consulta uma IA externa pra responder" em "plataforma de conhecimento com memória e inteligência própria" — sem tornar Ollama/IA local obrigatório por decreto, e sem remover a Anthropic. A arquitetura final é consequência da auditoria e de decisões de infraestrutura explícitas, não uma substituição automática.

## 2. Escopo

Dentro: Knowledge Memory (cache semântico), RAG interno (embeddings + busca vetorial), Confidence Engine, Knowledge Graph, abstração de provedor de IA (`AIProvider`) com Ollama como uma opção — não a única.
Fora (por ora): remover a Anthropic, alterar KnowRa Pro/Mercado Pago/limites de IA, criar infraestrutura para Ollama, criar tabelas de produção, migrar dado de usuário.

## 3. Princípios

- **A busca externa (IA ou API pública) é fonte de aquisição de conhecimento, não o cérebro do produto.** O cérebro é a memória interna + a decisão de quando consultar fora.
- **Nunca "resposta da IA = verdade permanente salva sem checagem"** — isso acumularia erro/alucinação na base ao longo do tempo. Toda entrada na memória carrega confiança, origem, data e possibilidade de invalidação (ver §5).
- **Cost-efficient + local-first, não "zero custo a qualquer custo"** (ver AI_COST_ZERO.md) — infraestrutura mal dimensionada pode custar mais que a API paga que substituiu.
- **Provider Abstraction desde o desenho** — mesmo princípio já registrado em `AI_ENGINE.md` §Provider Abstraction e aplicado ao Audio Engine (`AUDIO_ENGINE.md` DEC-AUDIO-003): nenhuma integração pode acoplar o KnowRa inteiro a um único fornecedor, seja pago (Anthropic) ou local (Ollama).

## 4. Arquitetura conceitual

```text
                    KNOWRA
                       │
                  KNOWRA_AI
                       │
             ┌─────────┴─────────┐
             │                   │
        Knowledge              AI
        Memory                 Engine
             │                   │
        pgvector          ┌──────┴──────┐
     (Supabase, já        │             │
      disponível)      Local AI     External AI
                       (Ollama,     (Anthropic,
                        opcional)    já existe)
```

Diferença chave em relação à proposta original: **Knowledge Memory (pgvector) e AI Engine (local/externo) são dois eixos independentes.** A primeira frente tem viabilidade alta e nenhuma dependência de infraestrutura nova (§6); a segunda depende de uma decisão de infraestrutura que ainda não existe em nenhum produto RhoneyInc (§7). Elas podem avançar em velocidades diferentes.

## 5. Knowledge Memory (cache semântico)

Evolução do que já existe (`respostas_canonicas`, cache **exato** por texto normalizado) para reconhecimento por **significado**: "quem proclamou a independência do Brasil" e "quem declarou a independência brasileira" devem casar, mesmo com fraseado diferente.

Fluxo conceitual:

```text
Pergunta nova
     ↓
Embedding
     ↓
Busca por similaridade (pgvector)
     ↓
Encontrou conhecimento com confiança suficiente?
     │
     ├── SIM → responde pela memória (sem custo de IA)
     │
     └── NÃO → consulta externa (Anthropic e/ou fonte pública)
              → valida
              → grava na memória com metadados de confiança
              → resposta futura mais rápida
```

Cada entrada carrega, no mínimo: origem, confiança, versão/data de atualização, status (válido/precisa revalidação/invalidado), contador de uso. Isso não é um cache "liga/desliga" — é um registro auditável, igual ao já feito para Questões de Concursos (`questoes.review_status`, `generation_model`, `prompt_version`).

## 6. RAG interno — viabilidade

**Alta, sem infraestrutura nova.** Supabase Postgres já suporta a extensão `pgvector` (`create extension vector;`) — não é troca de provedor, é uma extensão a mais no mesmo banco que já existe. O schema atual já tem o embrião certo (`respostas_canonicas.pergunta_normalizada` separado de `pergunta_original`) — a evolução pra "pergunta com embedding" é aditiva, não uma reescrita do que já existe.

Essa frente **não depende** da decisão sobre Ollama — pode avançar de forma independente e já reduz chamada à Anthropic (mais cache = menos consulta externa) mesmo mantendo a Anthropic como provedor de IA.

**Geração de embedding local, validada em produção (2026-08-15)** — decisão da pergunta 1 do §11, resolvida: `@huggingface/transformers` rodando `Xenova/all-MiniLM-L6-v2` (384 dimensões) via deploy real de teste (não só local) em Vercel Serverless Functions, com duas correções necessárias:
1. `vercel.json` → `functions["api/index.ts"].excludeFiles` excluindo `libonnxruntime_providers_{cuda,tensorrt}.so` — sem isso, o pacote nativo (`onnxruntime-node`) inclui 513MB de binários (240MB só de provider CUDA, GPU que a função serverless nunca tem), passando do limite de tamanho de deploy da Vercel. Excluindo só os dois arquivos de GPU, o runtime real cai pra ~38MB.
2. `env.cacheDir = "/tmp/..."` — o caminho padrão de cache do modelo é dentro de `node_modules/`, que é read-only em produção (`/var/task`); só `/tmp` é gravável (efêmero, reseta a cada cold start).

Números reais medidos no deploy de teste: **cold start ~2.2s** (inclui baixar o modelo de 87MB da primeira vez no container), **chamada quente: 0ms de carregamento + ~20-30ms de inferência**. Concluído: viável tecnicamente, sem custo de infraestrutura nova (não precisa de VPS — roda dentro da própria função serverless que já existe). Dependência (`@huggingface/transformers`) e configuração (`vercel.json`) já estão no repositório, prontas — **ainda não integradas em nenhum fluxo real** (Etapa B, wiring em `askQuestion.ts`, continua exigindo aprovação separada).

## 7. AI Engine local (Ollama) — viabilidade

**Baixa no formato de deploy atual, sem decisão de infraestrutura nova — este é o ponto central que trava a proposta de "Ollama obrigatório".**

- O backend do KnowRa roda em **Vercel Serverless Functions**: processos efêmeros, sem estado, sem disco garantido entre requisições, timeout curto, sem GPU/RAM dedicada.
- Ollama exige um processo **de vida longa**, modelo carregado em memória (GBs, dependendo do modelo), respondendo via HTTP local (`localhost:11434`).
- **Esses dois modelos de execução são incompatíveis por natureza.** Rodar Ollama pra todo usuário do KnowRa exigiria um servidor/VPS dedicado, ligado 24/7 — peça de infraestrutura que **não existe hoje em nenhum produto RhoneyInc**.
- Onde Ollama já é viável sem essa fricção: ambiente de desenvolvimento local; ou tarefas em lote que já rodam offline hoje (`gerar_questoes.ts` já não depende de servidor sempre-ligado — trocar Opus por um modelo local *nesse script específico* é uma mudança bem menor que trocar o runtime inteiro).

## 8. Data model conceitual (nenhuma tabela criada)

```text
knowledge_record
  id, question, normalized_question, embedding (vector),
  answer, topic, subcategory,
  source ('anthropic' | 'wikimedia' | 'wikidata' | 'manual' | ...),
  source_url, confidence (numeric),
  times_used, times_helpful,
  status ('valido' | 'requer_revalidacao' | 'invalidado'),
  created_at, updated_at, last_verified_at

knowledge_relation
  id, record_id_origem, record_id_relacionado, tipo_relacao
```

Paralelo direto com o padrão já usado em Questões de Concursos (`origem` extensível via `check`, metadados de geração, `review_status`) — mesma filosofia de proveniência e revisão, aplicada a conhecimento geral em vez de questões objetivas.

**Confidence Engine (conceitual)**:

```text
confidence >= 0.90 → responde pela memória, sem checagem extra
0.70–0.89          → responde pela memória + sinaliza "verificar fonte" (mesmo padrão de requer_verificacao já implementado)
< 0.70              → busca fonte externa (IA ou API pública), não confia na memória
```

Valores acima são só uma proposta inicial — precisam ser calibrados com dado real de uso, não fixados a priori.

## 9. Roadmap proposto (cada etapa exige aprovação separada, mesma regra do Audio Engine)

| Etapa | O que é | Depende de infraestrutura nova? |
|---|---|---|
| A | ✅ `pgvector` + `knowledge_record` (schema, sem popular ainda) | Não |
| B | ✅ Cache semântico complementando o cache exato em `askQuestion.ts` | Não |
| C | ✅ `AIProvider` — interface única (`responder`/`avaliar`/`gerarDesafio`) com adapter Anthropic (já existe, só reorganizado) | Não |
| D | Confidence Engine + `requer_revalidacao` | Não |
| E | Knowledge Graph (`knowledge_relation`) | Não |
| F | Avaliação de Ollama em ambiente offline (trocar Opus por modelo local em `gerar_questoes.ts`) | Não — reaproveita infra existente do script |
| G | Ollama como `AIProvider` adapter em runtime, servindo usuário real | **Sim — servidor/VPS dedicado, decisão de infraestrutura explícita** |

Etapas A-F não dependem de infraestrutura nova e podem, cada uma, ser proposta e aprovada independentemente. A etapa G é a única que exige a decisão de "onde roda" antes de qualquer linha de código.

## 10. Riscos

Ver [AI_COST_ZERO.md](AI_COST_ZERO.md) §6 — reproduzidos aqui os que afetam diretamente o desenho desta arquitetura: custo de infraestrutura substituindo custo de token sem medição prévia; qualidade de modelo local vs. Claude em tarefas abertas; escopo comparável a várias Fases somadas, exigindo aprovação por etapa.

## 11. Perguntas em aberto pro Product Owner

**Resolvida (2026-08-15)**: qual provedor de embeddings pra Etapa B — local via `@huggingface/transformers` (`Xenova/all-MiniLM-L6-v2`), validado em deploy real de teste na Vercel (ver §6). Escolhido em vez de Voyage AI (pago) depois de confirmar viabilidade técnica de verdade, não só em teoria.

1. A etapa F (Ollama offline, substituindo Opus em `gerar_questoes.ts`) é um bom primeiro experimento de baixo risco antes de cogitar a etapa G? Ou prefere validar Knowledge Memory (A-E) primeiro e só depois avaliar IA local?
2. Existe apetite/orçamento pra um VPS dedicado (etapa G), ou a intenção é manter Ollama só como ambiente de desenvolvimento por enquanto?
3. O pilar "limite de IA maior" do KnowRa Pro deve começar a ser repensado em paralelo (ex: rumo a "prioridade/modelo avançado" em vez de "mais chamadas"), ou aguarda a Knowledge Memory reduzir volume de chamada primeiro pra decidir com dado real?

## 12. Decisões

Ver `DECISIONS.md` 2026-08-15 — entrada "KNOWRA_AI: discovery aprovado, Fase 1/2 da auditoria concluídas".

## Status

Documento de projeto (Fase 4 + Fase 6 do pedido original) — nenhuma implementação autorizada. Próximo passo depende de resposta às perguntas do §11.
