# KNOWRA_AI.md — KnowRa

> Discovery/projeto de arquitetura, 2026-08-15 — a partir da proposta do Ronaldo (`APIsFree.txt`), da auditoria em [AI_COST_ZERO.md](AI_COST_ZERO.md) e, nesta revisão, da recomendação do Ronaldo de elevar RAG a componente arquitetural oficial do KNOWRA_AI. **Esta revisão é documentação/projeto, não implementação** — as seções novas (§9-§12) descrevem arquitetura ainda não construída; nada nelas autoriza código, tabela ou migration nova além do que já estava aprovado nas Etapas A-F (ver §13). Cada etapa nova do roadmap (§13) precisa de aprovação explícita separada, mesma regra de todo o resto deste projeto (`CLAUDE.md` §2).

## 1. Objetivo

Transformar o KnowRa de "aplicação que consulta uma IA externa pra responder" em "plataforma de conhecimento com memória e inteligência própria" — sem tornar Ollama/IA local obrigatório por decreto, e sem remover a Anthropic. A arquitetura final é consequência da auditoria e de decisões de infraestrutura explícitas, não uma substituição automática.

**RAG é peça central, não acessório.** O KnowRa não deve "aprender tudo que recebe" indiscriminadamente — deve construir uma **memória de conhecimento validada e recuperável**, onde o modelo de IA continua sendo o motor de raciocínio e a base de conhecimento fornece contexto atualizado e confiável. Isso permite atualizar conhecimento sem retreinar/trocar o modelo, e é o que torna o sistema confiável o suficiente pra alimentar Concursos Públicos e o Core Loop de gamificação com a mesma base.

## 2. Escopo

Dentro: Knowledge Memory (cache semântico), RAG interno **híbrido** (busca vetorial + busca textual + filtros estruturados + reranking), Confidence Engine, Source Provenance (taxonomia de confiança), Knowledge Graph, evolução conceitual pra Knowledge Entity (deduplicação — ver §11), abstração de provedor de IA (`AIProvider`) com Ollama como uma opção — não a única.

Fora (por ora): remover a Anthropic, alterar KnowRa Pro/Mercado Pago/limites de IA, criar infraestrutura para Ollama, criar tabelas de produção além das já aprovadas por etapa, migrar dado de usuário, **implementar qualquer item novo desta revisão (§9-§12) sem aprovação separada**.

## 3. Princípios

- **A busca externa (IA ou API pública) é fonte de aquisição de conhecimento, não o cérebro do produto.** O cérebro é a memória interna + a decisão de quando consultar fora.
- **Nunca "resposta da IA = verdade permanente salva sem checagem"** — isso acumularia erro/alucinação na base ao longo do tempo. Toda entrada na memória carrega confiança, origem, data e possibilidade de invalidação (ver §5, §10).
- **Cost-efficient + local-first, não "zero custo a qualquer custo"** (ver AI_COST_ZERO.md) — infraestrutura mal dimensionada pode custar mais que a API paga que substituiu.
- **Provider Abstraction desde o desenho** — mesmo princípio já registrado em `AI_ENGINE.md` §Provider Abstraction e aplicado ao Audio Engine (`AUDIO_ENGINE.md` DEC-AUDIO-003): nenhuma integração pode acoplar o KnowRa inteiro a um único fornecedor, seja pago (Anthropic) ou local (Ollama).
- **Conhecimento não verificado nunca contamina silenciosamente o que é confiável** (novo, formalizado nesta revisão — ver §10). Uma resposta gerada por IA e ainda sem validação suficiente não pode ser servida com a mesma autoridade de uma fonte oficial (Constituição Federal, dado do IBGE, etc.) — precisa estar marcada e tratada como tal em toda a cadeia (recuperação, exibição, cálculo de confiança).

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
     (RAG Retrieval)             │
             │                   │
        pgvector          ┌──────┴──────┐
     (Supabase, já        │             │
      disponível)      Local AI     External AI
                       (Ollama,     (Anthropic,
                        opcional)    já existe)
```

Diferença chave em relação à proposta original: **Knowledge Memory (pgvector/RAG) e AI Engine (local/externo) são dois eixos independentes.** A primeira frente tem viabilidade alta e nenhuma dependência de infraestrutura nova (§6); a segunda depende de uma decisão de infraestrutura que ainda não existe em nenhum produto RhoneyInc (§7). Elas podem avançar em velocidades diferentes.

Fluxo de ponta a ponta do RAG (parte já implementada, Etapas A-D; parte projetada nesta revisão, §9-§10):

```text
USUÁRIO → PERGUNTA
             │
             ▼
      1. Normalização           (implementado — normalizar_pergunta())
             │
             ▼
      2. Retrieval Engine       (parcial — hoje só vetor top-1; §9 projeta híbrido top-K)
             │
    ┌────────┴────────┐
    │                 │
Encontrou           Não encontrou
(memória)           (cache miss total)
    │                 │
    │                 ▼
    │          Fonte externa (Anthropic e/ou API pública)
    │                 │
    │                 ▼
    │          Geração / Análise
    │                 │
    └────────┬────────┘
             ▼
    3. Validação / Confidence Score   (implementado — Confidence Engine, §8)
             │
             ▼
      RESPOSTA AO USUÁRIO
             │
             ▼
    4. Grava/atualiza Knowledge Memory (implementado — salvar_conhecimento())
             │
             ▼
       PostgreSQL + pgvector
```

## 5. Knowledge Memory (cache semântico) — implementado, Etapa B/D

Evolução do que já existia (`respostas_canonicas`, cache **exato** por texto normalizado) para reconhecimento por **significado**: "quem proclamou a independência do Brasil" e "quem declarou a independência brasileira" casam, mesmo com fraseado diferente.

Cada entrada carrega, no mínimo: origem, confiança, versão/data de atualização, status (válido/precisa revalidação/invalidado), contador de uso. Isso não é um cache "liga/desliga" — é um registro auditável, igual ao já feito para Questões de Concursos (`questoes.review_status`, `generation_model`, `prompt_version`).

**Limitação conhecida do estado atual** (motivo desta revisão): a busca (`buscar_conhecimento_semantico()`) hoje é **só vetorial, top-1, sem filtro estruturado nem reranking**. Funciona bem como cache de pergunta-resposta, mas não é ainda um Retrieval Engine completo — §9 projeta a evolução.

## 6. RAG interno — viabilidade e embeddings (implementado, Etapa A/B)

**Alta, sem infraestrutura nova.** Supabase Postgres já suporta a extensão `pgvector` — não é troca de provedor, é uma extensão a mais no mesmo banco que já existe.

**Geração de embedding local, validada em produção (2026-08-15)**: `@huggingface/transformers` rodando `Xenova/all-MiniLM-L6-v2` (384 dimensões) via deploy real de teste em Vercel Serverless Functions, com duas correções necessárias:
1. `vercel.json` → `functions["api/index.ts"].excludeFiles` excluindo `libonnxruntime_providers_{cuda,tensorrt}.so` — sem isso, o pacote nativo (`onnxruntime-node`) inclui 513MB de binários (240MB só de provider CUDA, GPU que a função serverless nunca tem), passando do limite de tamanho de deploy da Vercel. Excluindo os dois arquivos de GPU, o runtime real cai pra ~38MB.
2. `env.cacheDir = "/tmp/..."` — o caminho padrão de cache do modelo é dentro de `node_modules/`, read-only em produção; só `/tmp` é gravável (efêmero, reseta a cada cold start).

Números reais medidos: **cold start ~2.2s**, **chamada quente: 0ms de carregamento + ~20-30ms de inferência**. Sem custo de infraestrutura nova (roda dentro da própria função serverless que já existe).

## 7. AI Engine local (Ollama) — viabilidade (avaliado, Etapa F)

**Baixa no formato de deploy atual, sem decisão de infraestrutura nova.**

- O backend do KnowRa roda em **Vercel Serverless Functions**: processos efêmeros, sem estado, sem disco garantido entre requisições, timeout curto, sem GPU/RAM dedicada.
- Ollama exige um processo **de vida longa**, modelo carregado em memória, respondendo via HTTP local — incompatível por natureza com o modelo de execução serverless. Rodar Ollama pra todo usuário exigiria um servidor/VPS dedicado, ligado 24/7, que **não existe hoje em nenhum produto RhoneyInc**.
- **Resultado real medido (Etapa F, 2026-08-15)**: `llama3.1:8b` (CPU, sem GPU) comparado contra Opus em `gerar_questoes.ts` — ~22x mais lento (8min vs 22s) e não seguiu o schema da tool call de forma confiável. Não adotado. Ver `DECISIONS.md`.

## 8. Data model implementado (Etapas A-E + extensão de fonte/vídeo)

```text
knowledge_record
  id, question, normalized_question, embedding vector(384),
  answer, topic, subcategory,
  source ('anthropic' | 'wikimedia' | 'wikidata' | 'dados_gov_br' | 'ibge' | 'manual'),
  source_url, source_title, video_url, video_title,
  confidence (numeric 0-1),
  times_used, times_helpful,
  status ('valido' | 'requer_revalidacao' | 'invalidado'),
  created_at, updated_at, last_verified_at

knowledge_relation
  id, record_id_origem, record_id_relacionado, tipo_relacao
  -- CRUD admin-only implementado (Etapa E); leitura (buscar_relacionados())
  -- existe mas não está conectada a nenhum fluxo de resposta ainda.
```

**Confidence Engine (implementado, Etapa D)**:

```text
confidence >= 0.90 → responde pela memória, sem checagem extra
0.70–0.89          → responde pela memória + sinaliza "verificar fonte" (requer_verificacao)
< 0.70              → nunca servida da memória — busca fonte externa (IA ou API pública)
```

Valores calibrados como proposta inicial, não recalibrados ainda com dado real de uso (baixo volume em produção até aqui).

Paralelo direto com o padrão já usado em Questões de Concursos (`origem` extensível via `check`, metadados de geração, `review_status`) — mesma filosofia de proveniência e revisão, aplicada a conhecimento geral em vez de questões objetivas.

---

## 9. RAG Retrieval Engine — híbrido (✅ implementado, Etapa H, 2026-08-15)

> Elevação de RAG a componente arquitetural obrigatório, conforme recomendação do Ronaldo (2026-08-15). Implementado como Etapa H — `buscar_contexto_rag()` (migration `0033_rag_retrieval_engine.sql`), wired em `askQuestion.ts` como contexto real de geração (RAG de verdade, não só cache). Ver `DECISIONS.md` 2026-08-15 "KNOWRA_AI Etapa H".

O estado atual (§5) resolve bem "pergunta parecida com uma pergunta já respondida", mas não é ainda um motor de recuperação completo. A evolução projetada combina três fontes de sinal, não só vetor:

```text
                KNOWRA RETRIEVAL ENGINE

                     PERGUNTA
                        │
          ┌─────────────┼─────────────┐
          ▼             ▼             ▼
       Vector        Full Text     Metadata
       Search         Search        Filter
     (pgvector,     (tsvector/     (topic, source,
      já existe)     to_tsquery,   confidence,
                      PT config)    status, data)
          │             │             │
          └─────────────┼─────────────┘
                        ▼
                   Reranking
             (combina score vetorial +
              score textual + boost por
              confidence/times_helpful)
                        │
                        ▼
                  TOP-K CONTEXTO
              (não mais top-1 — múltiplos
               registros relacionados formam
               o contexto passado à IA)
                        │
                        ▼
                   KNOWRA_AI
```

**Por que top-K e não top-1**: hoje `buscar_conhecimento_semantico()` devolve só o registro mais parecido. Um Retrieval Engine de verdade devolve os N mais relevantes (ex: 3-5) como contexto — permite a IA sintetizar uma resposta nova a partir de múltiplos fragmentos de conhecimento relacionados, em vez de só "achou ou não achou uma resposta pronta".

**Full Text Search**: Postgres já suporta `tsvector`/`to_tsquery` nativamente (configuração `portuguese`), sem extensão nova — zero custo de infraestrutura adicional, mesmo espírito de `pgvector` (§6). Captura correspondência exata de termo técnico/nome próprio que a busca vetorial pode diluir (ex: "art. 5º da Constituição" — número de artigo é um caso onde correspondência textual literal supera similaridade semântica).

**Metadata Filter**: filtros estruturados sobre `topic`, `source`, `confidence`, `status`, `created_at`/`last_verified_at` — necessário sobretudo pro caso de uso de Concursos Públicos citado pelo Ronaldo (ex: restringir contexto a `categoria = 'Direito Constitucional'`, `banca = 'CESPE'`, quando esses metadados existirem em `knowledge_record`/`questoes`).

**Reranking**: combinação de score vetorial + score textual + boost por sinais de qualidade já existentes (`confidence`, `times_helpful`) — não é um modelo de reranking separado (custo/complexidade desnecessários no estágio atual), é uma fórmula de combinação de scores já disponíveis no banco.

## 10. Source Provenance — taxonomia de confiança (✅ implementado, Etapa I, 2026-08-16)

> Implementado como Etapa I — coluna `provenance` em `knowledge_record` (migration `0034_source_provenance.sql`), computada automaticamente em `salvar_conhecimento()` a partir de `source`/`source_url`, promoção manual via `promover_provenance()` (admin-only). Ver `DECISIONS.md` 2026-08-16 "KNOWRA_AI Etapa I".

Hoje `knowledge_record.source` mistura duas coisas diferentes: **origem** (de onde veio — `anthropic`/`wikimedia`/`wikidata`/`ibge`/`manual`) e, implicitamente, **confiabilidade** (a Constituição Federal via Wikidata não tem o mesmo peso epistêmico que uma resposta gerada pela IA sem checagem externa). A recomendação do Ronaldo de separar essas duas dimensões é adotada aqui como projeto:

```text
VERIFIED       — fonte oficial (Constituição, dados IBGE/gov.br, Wikipedia/Wikidata
                 quando o artigo existe e bate)
COMMUNITY      — aprendido de interação de usuário, ainda sem fonte externa confirmando
AI_GENERATED   — resposta gerada pela IA sem fonte externa encontrada
UNVERIFIED     — recém-criado, confidence baixa, ainda não usado o suficiente pra confiar
OUTDATED       — já foi válido, `last_verified_at` antigo demais ou marcado
                 `requer_revalidacao`/`invalidado` (already coberto por `status`,
                 mas OUTDATED explicita o motivo "idade" separado de "correção manual")
```

**Diferença em relação ao `status` (`valido`/`requer_revalidacao`/`invalidado`) que já existe**: `status` é sobre o ciclo de vida/validação de uma entrada (Etapa D, já implementado). A taxonomia de proveniência acima é ortogonal — é sobre **de onde o conhecimento vem e o quanto isso, por si só, já implica confiança**, antes mesmo de qualquer validação de uso acontecer. As duas dimensões juntas (proveniência × status × confidence numérico) formam o quadro completo de confiabilidade — nenhuma sozinha é suficiente.

**Regra de anti-contaminação associada**: uma entrada `AI_GENERATED`/`UNVERIFIED` nunca deve ser promovida a `VERIFIED` automaticamente por volume de uso (`times_used` alto não é evidência de correção, só de popularidade) — promoção de proveniência é sempre uma ação explícita (revisão admin, ou confirmação por fonte externa real, ex: achou artigo correspondente na Wikipedia). Mesmo princípio já usado em Questões de Concursos: `review_status` só avança por ação humana (`revisar_questao()`), nunca automaticamente.

## 11. Knowledge Entity — evolução conceitual de deduplicação (projetado, não implementado, sem data)

**Problema identificado pelo Ronaldo, real**: o modelo atual (`knowledge_record` por pergunta) tende a criar registros redundantes — "O que é a Constituição Federal?" e "Qual é a função da Constituição do Brasil?" são semanticamente próximas o bastante pra bater no cache semântico (Etapa B), mas perguntas um pouco mais distantes sobre o mesmo conceito (ex: "Quando a Constituição de 88 foi promulgada?") criam um registro novo em vez de se conectar ao conhecimento já existente sobre "Constituição Federal".

**Direção proposta**: evoluir de "registro por pergunta-resposta" pra "conceito central com múltiplas facetas", usando a `knowledge_relation` que já existe (Etapa E, hoje só CRUD administrado manualmente, não populada):

```text
                    CONHECIMENTO
                         │
              Constituição Federal  (Knowledge Entity)
                         │
       ┌─────────────────┼─────────────────┐
       │                 │                 │
    Conceito           História          Direito
   (knowledge_record  (knowledge_record  (knowledge_record
    ligado via         ligado via         ligado via
    knowledge_relation) knowledge_relation) knowledge_relation)
       │                 │                 │
       └─────────────────┼─────────────────┘
                         │
                  Perguntas relacionadas
```

**Por que isso não entra no roadmap com data ainda**: diferente de §9/§10 (evolução aditiva sobre o schema existente), isso é uma mudança de modelo conceitual — decidir o que é uma "entidade" (um artigo da Constituição? o documento inteiro? um tema jurídico?) exige dado real de uso pra não desenhar uma taxonomia arbitrária, e a própria inferência de relação automática já foi avaliada e descartada por ora (Etapa E, mesmo motivo: exigiria dado real ou uma chamada de IA nova, contradizendo o objetivo de custo-zero). Fica registrado como direção arquitetural aprovada, não como etapa agendada — mesmo tratamento já dado a RAG v2/Hybrid Search antes desta revisão os formalizar.

**Ganho quando existir**: corrigir uma `Knowledge Entity` (ex: um dado incorreto sobre "Constituição Federal") propaga a correção pra toda pergunta que recupera aquele conceito, em vez de precisar corrigir N registros de pergunta-resposta espalhados — o mesmo problema que motivou o Confidence Engine (Etapa D) e o Source Provenance (§10), levado ao nível de entidade em vez de registro isolado.

## 12. RAG alimentando o Core Loop (projetado, reforça arquitetura já existente)

O Retrieval Engine (§9) não serve só a resposta de pergunta — o mesmo contexto recuperado pode alimentar a geração de Desafio (`gerarDesafio()`, já parte do Core Loop) com conhecimento relacionado, não só a última pergunta/resposta isolada:

```text
Usuário pergunta → RAG → Resposta → "Testar esse conhecimento?" → Desafio → Avaliação → XP → Badge → Ranking
```

Isso não é uma função nova de IA — é o mesmo `AIProvider.gerarDesafio()` (Etapa C, já implementado) recebendo mais contexto de entrada (top-K do Retrieval Engine em vez de só a pergunta+resposta atuais). Sem mudança de arquitetura de Provider, só de quanto contexto é passado — mesmo princípio já registrado em `AI_ENGINE.md` §Contexto mínimo esperado.

**Aplicação a Concursos Públicos** (mesma ideia, aplicada ao domínio de Questões): uma questão nova ("Segundo a Constituição Federal...") pode recuperar via RAG artigo relacionado, questões semelhantes já geradas e explicações anteriores — reduzindo geração redundante e aumentando consistência entre questões do mesmo tema. Não implementado, mesmo status de "direção arquitetural aprovada, sem etapa agendada" de §11.

## 13. Roadmap (cada etapa exige aprovação separada, mesma regra do Audio Engine)

| Etapa | O que é | Depende de infraestrutura nova? |
|---|---|---|
| A | ✅ `pgvector` + `knowledge_record` (schema, sem popular ainda) | Não |
| B | ✅ Cache semântico complementando o cache exato em `askQuestion.ts` | Não |
| C | ✅ `AIProvider` — interface única (`responder`/`avaliar`/`gerarDesafio`) com adapter Anthropic (já existe, só reorganizado) | Não |
| D | ✅ Confidence Engine (parte estrutural) + `requer_revalidacao` | Não |
| E | ✅ Knowledge Graph (parte estrutural — CRUD admin, sem inferência automática nem wiring no fluxo de resposta) | Não |
| F | ✅ Avaliação de Ollama em ambiente offline — resultado desfavorável, não adotado | Não |
| G | Ollama como `AIProvider` adapter em runtime, servindo usuário real | **Sim — servidor/VPS dedicado** |
| H | ✅ RAG Retrieval Engine híbrido (§9) — Full Text Search + Metadata Filter + Reranking, top-K em vez de top-1 | Não — Postgres nativo, mesmo banco |
| I | ✅ Source Provenance (§10) — coluna de taxonomia de confiança em `knowledge_record`, regra de promoção manual | Não |
| J | Knowledge Entity (§11) — deduplicação conceitual via `knowledge_relation` populada | Não, mas exige decisão de modelagem antes de qualquer schema (ver §11) |

Etapas H e I são extensões aditivas do schema já existente (§8) — mesmo perfil de risco/custo das Etapas A-E. Etapa J depende de uma decisão de modelagem que ainda não tem data (§11). Etapa G continua sendo a única que exige decisão de infraestrutura antes de qualquer código.

## 14. Riscos

Ver [AI_COST_ZERO.md](AI_COST_ZERO.md) §6 — reproduzidos aqui os que afetam diretamente o desenho desta arquitetura: custo de infraestrutura substituindo custo de token sem medição prévia; qualidade de modelo local vs. Claude em tarefas abertas; escopo comparável a várias Fases somadas, exigindo aprovação por etapa.

**Risco novo desta revisão**: Full Text Search + Metadata Filter + Reranking (Etapa H) aumentam a superfície de consulta ao banco por pergunta — medir latência real antes de considerar concluído, mesmo padrão de rigor já aplicado à validação de embeddings locais (§6).

## 15. Perguntas em aberto pro Product Owner

**Resolvida (2026-08-15)**: qual provedor de embeddings pra Etapa B — local via `@huggingface/transformers`, validado em deploy real (§6).

**Resolvida (2026-08-15)**: Etapa F (Ollama offline) avaliada com resultado desfavorável — não adotado, Etapa G segue sem justificativa pra avançar.

1. Existe apetite/orçamento pra um VPS dedicado (etapa G), ou a intenção é manter Ollama só como ambiente de desenvolvimento por enquanto?
2. O pilar "limite de IA maior" do KnowRa Pro deve começar a ser repensado em paralelo, ou aguarda a Knowledge Memory reduzir volume de chamada primeiro pra decidir com dado real?
3. Etapa H (RAG híbrido) antes ou depois de popular a base com volume real de uso? Full Text Search e Reranking são mais fáceis de calibrar com dado real do que com base ainda pequena — vale esperar mais uso orgânico primeiro, ou seguir agora e recalibrar depois?
4. Etapa J (Knowledge Entity) precisa de uma decisão de modelagem antes de virar etapa com data — qual é a granularidade certa de "entidade" pro KnowRa (um artigo de lei? um tema? um documento inteiro)? Vale esperar Concursos Públicos ter volume real de questões pra essa decisão ficar mais informada?

## 16. Decisões

Ver `DECISIONS.md` 2026-08-15 — entradas "KNOWRA_AI: discovery aprovado, Fase 1/2 da auditoria concluídas", Etapas A-F, e "RAG como componente arquitetural oficial" (esta revisão).

## Status

Documento de projeto. Etapas A-F, H e I implementadas e em produção. Etapa G (Ollama runtime) e J (Knowledge Entity) são projeto/arquitetura aprovada para **documentação**, não para código — próximo passo depende de resposta às perguntas do §15 e aprovação explícita, etapa por etapa, antes de qualquer implementação.
