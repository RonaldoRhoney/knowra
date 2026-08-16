# KNOWRA_SCOUT.md — KnowRa

> Discovery/projeto de arquitetura, 2026-08-16 — a partir da proposta do Ronaldo de nomear e formalizar o agente de aquisição e curadoria de conhecimento do KnowRa ("KNOWRA Scout"), revisada no mesmo dia com correção de direção: **descoberta automatizada não exige API de busca paga** — existem fontes públicas estruturadas (REST, RSS, sitemap) que resolvem boa parte do problema sem custo. **Documento de planejamento — nenhuma linha de código, tabela ou migration foi criada.** Restrições explícitas do Ronaldo: não escrever código nesta etapa, não criar segunda Knowledge Memory, não criar segundo RAG, não introduzir API paga, não baixar vídeo, não copiar conteúdo protegido sem verificar permissão, não tratar conteúdo encontrado como verdade sem validação, não implementar geração automática de questão nesta fase.

## 1. Nome e responsabilidade

**KNOWRA Scout** — agente de **aquisição e curadoria**, não "agente que aprende". Distinção deliberada: Scout encontra e organiza conhecimento; Knowledge Memory (`knowledge_record`, já existe) armazena o que foi validado; RAG (`buscar_contexto_rag()`, já existe) recupera o relevante; `KNOWRA_AI` raciocina/gera em cima disso. Quatro responsabilidades diferentes, quatro componentes diferentes — nunca uma "IA alimentando outra IA" de forma confusa.

```text
KNOWRA SCOUT → encontra e organiza conhecimento
KNOWLEDGE MEMORY → armazena conhecimento validado
RAG → recupera conhecimento relevante
KNOWRA_AI → usa esse conhecimento pra raciocinar, explicar, personalizar
```

**Consequência importante**: `KNOWRA_AI` nunca precisa "sair na internet" — ele consulta Knowledge Memory → RAG → perfil do usuário → resposta. Quando a informação está desatualizada, é o Scout que atualiza a memória, não o `KNOWRA_AI` buscando ao vivo.

## 2. Correção de direção: Scout não é um scraper genérico — é orientado a fontes

A primeira versão deste documento concluiu que automação exigiria API de busca paga. **Investigação real (não suposição) mostrou que isso está errado como conclusão geral, embora certo em alguns casos específicos.** Testei 4 fontes candidatas de verdade antes de escrever qualquer arquitetura:

| Fonte | Testado como | Resultado real |
|---|---|---|
| `dados.gov.br` (API CKAN) | `curl` direto em `package_search`/`package_list` | **HTTP 401, `www-authenticate: Bearer`** — exige token pessoal do Ronaldo pra **qualquer** chamada, até leitura simples. Mais restrito do que a documentação geral de CKAN sugere. |
| Portal do Servidor — painel de concursos autorizados | `curl`/fetch da página real | **200 OK, mas só HTML com iframe do Power BI embutido.** Sem JSON, sem CSV, sem endpoint de dado. Não automatizável sem raspar internamente o Power BI (frágil, não recomendado). |
| YouTube Data API v3 | Já integrada em produção | **10.000 unidades/dia, `search.list` = 100 unidades → ~100 buscas grátis/dia**, sem custo monetário, reseta à meia-noite (horário do Pacífico). Real, gratuita, mas com quota — nunca pode virar dependência crítica. |
| Sitemap/RSS de banca (testado: Cebraspe) | `curl` no `robots.txt` e `sitemap.xml` reais | **Existe de verdade, funcionando, atualizado no dia anterior ao teste** (`sitemap_index.xml`, WordPress/Yoast — `post-sitemap.xml` lista posts recentes, que incluem anúncio de concurso novo). Zero autenticação, zero quota, HTTP GET simples. |

**Conclusão corrigida**: automação real é possível **sem** API paga, mas não é uniforme — cada fonte tem seu próprio método de acesso e sua própria fricção. Isso é exatamente o motivo de formalizar um **Source Registry** (§3) em vez de um mecanismo único.

## 3. Source Registry — catálogo de fontes confiáveis, não "buscar qualquer coisa"

```text
SOURCE REGISTRY
│
├── GOVERNMENT (prioridade 🔴 1)
│     ├── dados.gov.br          — REST/CKAN, requer token pessoal
│     ├── sitemap/RSS de bancas — HTTP GET simples, sem auth (Cebraspe confirmado)
│     └── Portal do Servidor    — só referência manual (Power BI, sem API)
│
├── DATA (prioridade 🟡 2)
│     ├── Wikidata/Wikipedia    — já integrada (fonte de resposta, KNOWRA_AI)
│     └── IBGE                  — avaliar quando houver caso de uso real
│
├── EDUCATIONAL (prioridade 🟢 3)
│     └── YouTube Data API v3   — já integrada, quota controlada, nunca crítica
│
└── OUTRAS (prioridade ⚪ 4)     — só com justificativa e verificação de termos de uso
```

Cada fonte no registro carrega:

```text
source, type, base_url, access_method ('rest'|'rss'|'sitemap'|'manual'),
enabled, priority, trust_level, rate_limit, license_policy, last_checked
```

Isso é exatamente a proposta do Ronaldo — mapeada aos campos já cobertos pela consolidação de `fontes_externas` (§4). Adicionar uma fonte nova significa **inserir uma linha no registro**, nunca reescrever o Scout.

## 4. Memória de coleta — reaproveita `fontes_externas`, não cria terceira tabela

`source_url`/`content_hash`/`last_checked_at`/`last_changed_at`/`source_type`/`status`/`confidence` é **quase exatamente** `fontes_externas`, já projetada em `CONCURSOS_HUB.md` §6 e ainda não implementada. Em vez de criar uma terceira tabela de rastreio (depois de `fontes_externas` e `documentos_edital`, de `CONCURSOS_HUB.md`/`CONCURSOS_INTELLIGENCE.md`, também não implementadas), a recomendação é **consolidar as três em uma só**, agora também servindo como o Source Registry (§3):

```text
fontes_externas (já projetada, estendida aqui — não é tabela nova, é a mesma evoluída)
  id, nome, url, tipo text ('edital'|'concurso_listagem'|'video'|'questao_publica'|'material'|'outro'),
  access_method text check (access_method in ('rest','rss','sitemap','manual')),  -- novo
  enabled boolean not null default true,               -- novo — liga/desliga fonte sem apagar histórico
  priority int not null default 4,                     -- novo — 1 (governo) a 4 (outras), §3
  rate_limit text,                                      -- novo — texto livre, ex: "100 buscas/dia" (YouTube)
  concurso_id uuid references concursos(id)  -- nullable, quando a fonte é sobre um concurso específico
  area_id uuid references areas(id)          -- nullable, quando já dá pra classificar por disciplina
  content_hash text,        -- detecta se o conteúdo mudou sem reprocessar tudo de novo
  status text check (status in ('ativa','instavel','descontinuada')),  -- já existia
  confidence numeric(4,3),  -- mesma escala de knowledge_record.confidence, não uma nova
  licenca_uso text,         -- já existia
  ultima_consulta_em timestamptz,  -- já existia ("last_checked_at")
  ultima_mudanca_em timestamptz,   -- "last_changed_at"
  observacoes text,
  criado_em timestamptz
```

`documentos_edital` (`CONCURSOS_INTELLIGENCE.md` §4) fica **absorvida** por essa versão consolidada.

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

Aplicação concreta já existente: **status de concurso** (🟢/🟡/🔴, `DECISIONS.md` 2026-08-16) já é uma versão simplificada disso, baseada em tempo em vez de hash de conteúdo. Quando Scout roda de novo sobre um concurso já cadastrado e acha que o status mudou (ex: inscrição encerrou), o fluxo correto é `atualizar_status_concurso()` (já existe) — nunca sobrescrever tudo, só o que mudou.

## 6. Investigação de fontes gratuitas (pedido explícito do Ronaldo, 13 pontos)

**1. Fontes gratuitas possíveis**: `dados.gov.br` (REST/CKAN), sitemap/RSS de bancas e órgãos (WordPress é comum, gera sitemap por padrão), YouTube Data API v3, Wikidata (já integrada como fonte de resposta geral).

**2. Método de acesso de cada fonte**:
- `dados.gov.br` → REST, `Authorization: Bearer <token>` obrigatório em toda chamada.
- Sitemap/RSS → HTTP GET simples, XML, sem autenticação.
- YouTube → REST com API key (já integrada), quota por unidade.
- Portal do Servidor → **não automatizável** — só link de referência manual.

**3. Limitações**:
- `dados.gov.br`: exige token pessoal (fricção manual, mesma do YouTube); datasets de concurso são cadastros pontuais de órgão específico, não status ao vivo.
- Sitemap/RSS: cobertura depende de cada site individualmente publicar (nem toda banca roda WordPress); um sitemap lista URLs, não classifica conteúdo — ainda precisa de Validator/Curator pra separar "post sobre concurso novo" de "post institucional qualquer".
- YouTube: 100 buscas/dia é pouco pra escala, mas suficiente pro volume atual do KnowRa.

**4. Frequência sugerida de atualização**: diária pra sitemap/RSS de fonte prioridade 1 (leve, sem custo de quota); semanal pra `dados.gov.br` (fricção de token, menor prioridade); YouTube só sob demanda (quando um concurso novo é cadastrado, não em varredura constante — preserva quota).

**5. Estratégia de cache**: tudo que o Scout descobre e valida vai pra `knowledge_record`/`concursos`/`recursos_video` — o usuário **nunca** consulta a fonte externa diretamente, sempre a cópia local já validada (mesmo princípio já usado no cache de respostas canônicas desde a Fase 2).

**6. Estratégia de fallback**: se uma fonte estiver indisponível, fora de quota, alterada ou bloqueada, o Scout simplesmente não atualiza aquela fonte nesse ciclo — `fontes_externas.status = 'instavel'` registra o problema, mas **nunca** deixa o módulo Concursos ou o `KNOWRA_AI` fora do ar (Knowledge Memory já populada continua servindo normalmente). Ver §8, regra de resiliência.

**7. Estratégia de deduplicação**: por `content_hash` (§5) pra fonte já conhecida, e por correspondência de nome/órgão/ano pra concurso "quase igual" achado em fontes diferentes (mesmo princípio de "reaproveitar área existente" já usado em `areas`/Knowledge Entity, Etapa J).

**8. Estratégia de validação**: Validator (§3 da versão anterior deste doc) checa fonte/URL/data/consistência antes de qualquer coisa virar `knowledge_record`/`concursos` — nunca "achei, então é verdade".

**9. Estratégia de copyright/licença**: ver §7 abaixo (inalterada da versão anterior, já cobria isso corretamente).

**10. Custo estimado**: **R$ 0 em APIs**, com uma ressalva honesta — "gratuito" não é "ilimitado". `dados.gov.br` é gratuito mas de fricção manual (token pessoal); YouTube é gratuito mas com quota (100 buscas/dia); sitemap/RSS é gratuito e praticamente sem limite prático (é só HTTP GET). Nenhuma das quatro exige cartão de crédito ou cobrança por uso.

**11. Fontes automatizáveis agora** (sem esperar nenhuma decisão nova): sitemap/RSS de fontes que já publiquem (confirmar caso a caso, como fiz com a Cebraspe) — mecanismo real, zero fricção.

**12. Fontes que dependem de credenciais**: `dados.gov.br` (token pessoal do Ronaldo, mesmo processo já feito pro YouTube), YouTube (já resolvido, key já existe).

**13. Fontes que devem permanecer manuais**: Portal do Servidor (só Power BI, sem API — cadastro manual usando o painel como referência visual, como já foi feito pra popular os 4 concursos reais); qualquer fonte comercial de questão sem licença clara verificada.

## 7. Legal/copyright safeguards

Regra mais importante desta etapa: **Scout nunca copia conteúdo protegido sem verificar permissão.** Já tem esqueleto pronto — `questoes.origem` (`ia_knowra`/`provider_licensed`/`manual`/`import_licensed`, `check` já existente desde a Fase 7a) e `knowledge_record.provenance` (Etapa I) já cobrem essa distinção. Falta **disciplina de uso, não schema novo**:

- **Concurso (metadado)**: nome/órgão/vagas/datas/edital_url — dado factual, seguro pra armazenar diretamente.
- **Questão de terceiro (site comercial, banca)**: **nunca armazenar o texto completo sem confirmar licença.** Sem confirmação, Scout armazena só metadado/referência — link + "questões disponíveis em X", nunca o enunciado copiado.
- **Edital/conteúdo programático oficial**: documento público governamental, geralmente seguro pra extrair — `source_url` sempre preservada pra rastreabilidade.
- **Vídeo**: nunca baixado — só metadado + link.

**Regra geral**: na dúvida sobre licença, Scout armazena metadado/referência, nunca o conteúdo completo. Confirmação de licença é sempre ação humana, nunca inferida pela IA.

## 8. Regra de resiliência

**A indisponibilidade de uma fonte externa nunca derruba o módulo Concursos nem o `KNOWRA_AI`.** Se uma fonte estiver indisponível, fora de quota, alterada, removida ou bloqueada, o sistema continua funcionando normalmente usando a Knowledge Memory que já existe — o pior cenário é "essa fonte específica não atualiza nesse ciclo", nunca "o produto para". Isso já é uma consequência natural de Scout ser uma camada de **alimentação**, separada de RAG/`KNOWRA_AI` (§1) — nenhum dos dois depende de uma fonte externa estar no ar no momento da pergunta do usuário.

## 9. Cost zero strategy

- Sitemap/RSS: custo zero, sem fricção de credencial.
- `dados.gov.br`: custo zero, fricção de token pessoal (mesmo padrão já aceito pro YouTube).
- YouTube: já resolvido, quota gratuita controlada, nunca dependência crítica.
- Classificação de conteúdo por área: reaproveita o mesmo mecanismo já usado em `askQuestion.ts` (custo já orçado no limite diário de IA existente, não é custo novo).
- Embedding: já resolvido, zero custo (Etapa B do `KNOWRA_AI.md`).
- **Nunca** planejado nesta etapa: API de busca genérica paga (Google Custom Search, Bing Search API) — não é mais necessária pra automação real, como a investigação em §2 comprovou.

## 10. O que NÃO fazer nesta etapa

Não escrever código. Não criar `fontes_externas` ainda (fica projetada, consolidada em §4, aguardando aprovação junto com `7c`/`7e`). Não criar segunda Knowledge Memory. Não criar segundo RAG. Não introduzir API paga. Não baixar vídeo. Não copiar conteúdo protegido sem confirmar licença. Não tratar conteúdo encontrado como verdade sem validação. Não implementar geração automática de questão nesta fase.

## 11. Roadmap (cada etapa exige aprovação separada)

| Etapa | O que é | Depende de decisão/infra nova? |
|---|---|---|
| Scout.1 | Consolidar `fontes_externas` como Source Registry (schema único, §3+§4) | Não |
| Scout.2 | RPCs `cadastrar_fonte_externa()`/`atualizar_fonte_externa()` (admin-only) | Não |
| Scout.3 | Ingestion Engine de fontes REST/sitemap (`dados.gov.br` + sitemap de bancas confirmadas) — Discovery real, não mais só sessão conduzida | Sim, parcial — token pessoal do Ronaldo pra `dados.gov.br`; sitemap não depende de nada |
| Scout.4 | YouTube Discovery controlado — busca só por consulta relevante já definida (não a cada acesso de usuário), cache local, dedup | Não — reaproveita integração já existente |
| Scout.5 (futuro) | Expansão do Source Registry pra novas fontes (IBGE, outras bancas com sitemap confirmado) | Caso a caso — cada fonte nova exige a mesma verificação real feita em §2, nunca assumida |

Diferente da versão anterior deste documento, **não existe mais um "Scout v2 = API paga" como única evolução possível** — Scout.3/Scout.4 são automação real, sem API de busca paga, dentro do cost-zero.

## 12. Perguntas em aberto pro Product Owner

1. Scout.1-Scout.2 (schema) valem a pena agora, ou esperar até Scout.3 estar aprovado pra implementar os dois juntos?
2. Vale eu (nesta ou numa próxima sessão) verificar sitemap/RSS das outras bancas dos 4 concursos já cadastrados (Cesgranrio, Fundação Ajuri) antes de aprovar Scout.3, pra saber quantas fontes prioridade 1 realmente têm essa opção disponível?
3. Confirmar: você mesmo geraria o token pessoal do `dados.gov.br` quando Scout.3 for aprovado (mesmo processo já feito pro YouTube)?

## 13. Status

Documento de projeto, revisado com investigação real (não suposição) no mesmo dia da primeira versão. Nenhuma implementação autorizada. Consolida `fontes_externas`/`documentos_edital` numa única fonte de verdade de schema, agora também Source Registry. Reaproveita integralmente `knowledge_record`, `buscar_contexto_rag()`, `questoes.origem`, `knowledge_record.provenance` — nenhum componente do KNOWRA_AI redesenhado.
