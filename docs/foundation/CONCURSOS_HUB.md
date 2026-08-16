# CONCURSOS_HUB.md — KnowRa

> Discovery/projeto de arquitetura, 2026-08-16 — a partir da proposta do Ronaldo de evoluir a Fase 7 (Concursos Públicos) de "catálogo quase vazio" pra uma Central de Preparação de verdade. **Documento de planejamento — nenhuma linha de código, tabela ou migration foi criada.** Cada etapa do roadmap (§9) exige aprovação explícita separada, mesma regra de `KNOWRA_AI.md` e `AUDIO_ENGINE.md`.

## 1. Objetivo

Transformar `/concursos` de uma lista quase vazia ("nenhum concurso disponível") numa Central de Preparação real: descoberta de concursos, estudo por disciplina, simulados, videoaulas e acompanhamento de desempenho — sem comprometer o que já existe (KnowRa Pro, Mercado Pago, limite de IA) e sem depender de uma fonte externa frágil pra funcionar.

## 2. Escopo

Dentro: reestruturação da navegação de Concursos (Abertos/Andamento/Encerrados + Disciplinas + Simulados + Videoaulas + Meu Desempenho), taxonomia de proveniência de Questão (oficial reutilizável / gerada pelo KnowRa / importada pelo admin — já parcialmente coberta por `questoes.origem`, formalizada aqui), Ingestion Engine pra concursos reais (fontes avaliadas em §4), extensão do schema de `concursos` (datas, vagas, salário, status), YouTube Resource Engine (metadados de vídeo, não o vídeo em si).

Fora (por ora, conforme regra final do Ronaldo): remover/quebrar funcionalidade existente, alterar KnowRa Pro ou Mercado Pago, trocar Anthropic, Ollama, RAG completo pra geração de questão (RAG Retrieval Engine já existe desde a Etapa H do `KNOWRA_AI.md` — conectar isso à geração de Questões é Etapa 7e deste documento, não implementado agora).

## 3. Princípio central

**Não depender de uma única fonte externa pra funcionar.** Mesmo achado já registrado quando avaliei o pedido original de concursos reais (`DECISIONS.md` 2026-08-16, "concursos reais descartado"): não existe API oficial única, gratuita e confiável cobrindo status de concurso em todo o Brasil. Isso não mudou — o que muda aqui é a estratégia: em vez de esperar uma fonte perfeita, o hub funciona com **dado cadastrado manualmente pelo admin desde o dia 1** (mesmo padrão já usado em `gerar_questoes.ts`), com fontes externas entrando como **enriquecimento auxiliar opcional**, nunca como dependência crítica.

**Cadastro admin é a segunda entrada, nunca a estratégia definitiva** (ajuste do Ronaldo, 2026-08-16, antes de autorizar a Etapa 7c.5). A arquitetura-alvo permanece:

```text
FONTES OFICIAIS/PÚBLICAS → INGESTION ENGINE → NORMALIZAÇÃO → VALIDAÇÃO → KNOWRA DATABASE
                                                                              ↑
                                                                        ADMIN MANUAL
                                                                     (segunda entrada,
                                                                      não a única)
```

O Ingestion Engine automatizado **não é implementado nesta etapa** (seria a Etapa 7d, que continua sem data — depende do token pessoal do Ronaldo em `dados.gov.br`, avaliado como fonte auxiliar em §4). O cadastro manual existe pra validar a experiência ponta a ponta com dado real (Etapa 7c.5) — o objetivo de longo prazo é reduzir, não formalizar, a dependência de cadastro manual conforme uma fonte de ingestão automatizada real for viabilizada.

## 4. Fontes externas avaliadas (antes de qualquer integração)

| Fonte | O que é | Veredito |
|---|---|---|
| `dados.gov.br` (Portal Brasileiro de Dados Abertos, CKAN) | API real, documentada (`dados.gov.br/swagger-ui`), padrão CKAN (`package_search` etc.) | **Auxiliar, não crítica.** Exige login gov.br pessoal + token pra endpoints autenticados (mesma fricção manual já vivida com a key do YouTube — precisa da sua conta). Datasets de "concursos públicos" encontrados são cadastros periódicos/pontuais de órgãos específicos, **não um feed ao vivo de status aberto/andamento/encerrado**. Útil como fonte de enriquecimento eventual (ex: confirmar dado de um órgão específico), não como alimentador principal. |
| `gov.br/conecta/catalogo` (Catálogo de APIs governamentais) | Catálogo de dezenas de APIs de interoperabilidade entre órgãos | **Não avaliar em bloco.** Cada API do catálogo precisa ser checada individualmente (autenticação, escopo, se é B2G/interoperabilidade ou realmente pública) antes de qualquer integração — nenhuma delas é especificamente "status de concurso". |
| SIGEPE (`oportunidades.sigepe.gov.br`) | Portal oficial de cargos comissionados federais | **Não serve.** Só cobre cargos comissionados/temporários, não concurso público em geral. Sem API — só HTML. |
| APIs comunitárias (`concursos-api-deno`, `concursosPublicosAPI`) | Scrapers não-oficiais de site comercial de terceiro | **Descartadas** (já registrado em `DECISIONS.md`) — aviso explícito do mantenedor "não usar em produção", risco jurídico de redistribuir dado raspado de site comercial. |
| YouTube Data API v3 | Já integrada (Etapa "Fonte, vídeo e leitura em voz alta") | **Mantém opcional**, conforme princípio do Ronaldo — nunca requisito pro módulo funcionar, só uma via de descoberta a mais quando a key existir/tiver quota. |

**Conclusão**: nenhuma fonte externa é confiável o suficiente pra ser dependência crítica. O Ingestion Engine (§6) é desenhado para funcionar 100% com cadastro manual (admin) desde o início, com conectores externos como plugins opcionais — nunca bloqueantes.

## 5. Target State — nova navegação de Concursos

```text
CONCURSOS (renomeado internamente pra "Central de Preparação", rota /concursos mantida)
│
├── 🔎 Buscar concurso, órgão, cargo...
│
├── [ 🟢 Abertos ] [ 🔵 Em andamento ] [ ⚫ Encerrados ]
│
├── 📚 Estudar por disciplina        (já existe, mantido)
│
├── 🧠 Simulados                     (novo — ver §8)
│   ├── Simulado rápido
│   ├── Simulado por concurso
│   └── Simulado por disciplina
│
├── ▶️ Videoaulas                    (novo — YouTube Resource Engine, §7)
│
└── 📊 Meu desempenho                (novo — agrega progresso_concurso + progresso_disciplina_questoes já existentes)
```

Os três status (§6) resolvem a distinção que o Ronaldo apontou como importante: "inscrição encerrada" ≠ "concurso encerrado" — um concurso `em_andamento` já não aceita inscrição, mas ainda tem etapas (prova, resultado, recursos, homologação) relevantes pra quem já se inscreveu ou quer estudar o histórico.

## 6. Database changes (projeto, não aplicado)

```text
concursos (estendida, aditiva — nenhuma coluna existente removida)
  + status text check (status in ('aberto','andamento','encerrado')) not null default 'aberto'
  + vagas int
  + cadastro_reserva boolean default false
  + salario_min numeric, salario_max numeric
  + escolaridade text
  + localidade text
  + inscricoes_inicio date, inscricoes_fim date
  + data_prova date
  + taxa_inscricao numeric
  + edital_url text
  + pagina_oficial_url text
  + fonte text check (fonte in ('admin_manual','dados_gov_br','outro'))  -- proveniência do CADASTRO do concurso
  + fonte_atualizado_em timestamptz

questoes.origem (já existe, check já extensível) — formaliza 3 categorias:
  'ia_knowra'          -- já existe, sem mudança
  'provider_licensed'  -- já existe (Questão oficial reutilizável, fonte com licença clara)
  'manual'             -- já existe (importada pelo admin)
  -- nenhuma coluna nova: a taxonomia do Ronaldo já cabe no check existente,
  -- só precisa virar prática real (hoje só 'ia_knowra' é usado de fato)

recursos_video (nova — YouTube Resource Engine, metadados só, nunca o vídeo)
  id, video_id, titulo, canal, thumbnail_url, video_url,
  area_id (fk areas), topico text,
  origem text check (origem in ('admin_manual','youtube_api')),
  cadastrado_por uuid (fk profiles, quando admin_manual),
  criado_em timestamptz

fontes_externas (nova — auditoria de proveniência, exigida pela regra final do Ronaldo:
  "toda fonte externa deve possuir origem/URL/status/data de atualização/licença")
  id, nome, url, tipo text, status text check (status in ('ativa','instavel','descontinuada')),
  ultima_consulta_em timestamptz, licenca_uso text, observacoes text
```

> **Atualização 2026-08-16** (`KNOWRA_SCOUT.md`): esta versão de `fontes_externas` foi **consolidada e estendida** (content_hash, ultima_mudanca_em, confidence, concurso_id/area_id opcionais) pra também cobrir o que `documentos_edital` (`CONCURSOS_INTELLIGENCE.md` §4) faria — evita duas tabelas de rastreio de fonte quase idênticas. Ver `KNOWRA_SCOUT.md` §4 pro schema definitivo quando qualquer uma dessas etapas for implementada.

Nenhuma tabela existente (`questoes`, `tentativas_questao`, `progresso_concurso`, `progresso_disciplina_questoes`, `assinaturas`) muda de comportamento — só `concursos` ganha colunas novas, todas nullable/com default, migration puramente aditiva.

## 6a. Modelo de confiabilidade do dado (✅ implementado, migration 0038, 2026-08-16)

Exigência do Ronaldo antes de autorizar a Etapa 7c.5: sem rastro de "quando foi verificado por último", um concurso cadastrado hoje como `aberto` pode ficar desatualizado sem ninguém perceber. `concursos` ganhou `cadastrado_por` (quem inseriu) e `ultima_verificacao_em` (quando alguém confirmou que o dado ainda está correto — distinto de `fonte_atualizado_em`, que marca quando o dado mudou de verdade).

**Confiabilidade é calculada, nunca armazenada** (mesmo princípio do Confidence Engine do `KNOWRA_AI.md`: sem expiração automática por tempo, projeto sem infraestrutura de cron):

```text
🟢 verificado           — ultima_verificacao_em nos últimos 30 dias
🟡 requer_atualizacao   — entre 30 e 90 dias
🔴 desatualizado        — mais de 90 dias
```

`listar_concursos()` calcula isso a cada chamada (`case` sobre a idade de `ultima_verificacao_em`). `confirmar_concurso()` (admin-only) marca "ainda está correto" sem mudar mais nada — reseta a idade sem precisar reeditar o concurso inteiro. Frontend mostra o ícone (🟢🟡🔴) no card e um botão "Reverificar" pro admin quando não está mais 🟢. Testado com dado real (simulação de 100 dias sem verificação → `desatualizado` → `confirmar_concurso()` → `verificado` de novo) antes de aplicar.

## 7. YouTube Resource Engine

Mesma decisão de design do Ronaldo: nunca baixar vídeo, só guardar metadado (`video_id`, `title`, `channel`, `thumbnail`, `url`, `subject`, `topic`) e abrir no YouTube. Duas fontes de entrada, nenhuma delas obrigatória:
1. **Admin cadastra manualmente** (link colado, metadado preenchido à mão ou buscado uma vez via `oEmbed`/API no momento do cadastro) — funciona sem `YOUTUBE_API_KEY`.
2. **Busca automática via YouTube Data API** (já integrada) — usada como conveniência de descoberta, nunca requisito.

## 8. Simulados — o que muda de verdade em RPC

`Simulado por disciplina`/`Simulado rápido` reaproveitam `listar_questoes()` já estendida (Etapa de pontuação por disciplina, `DECISIONS.md` 2026-08-16) — nenhuma RPC nova necessária pro MVP. `Simulado por concurso` já existe via `listar_questoes(p_concurso_id=...)`. `Simulado personalizado` (filtro por dificuldade/múltiplas disciplinas de uma vez) é a única peça genuinamente nova — RPC `gerar_simulado(p_areas uuid[], p_dificuldade text, p_quantidade int)`, agregando `listar_questoes()` por área — baixo risco, mesma superfície de segurança já validada.

## 9. Proveniência de Questão — mudança de UX, não só de dado

Hoje toda tela mostra um aviso genérico ("questões geradas por IA, não são oficiais"). Com a taxonomia formalizada (§6), cada Questão exibe o aviso certo pro seu `origem`:
- `ia_knowra` → "Questão gerada pelo KNOWRA_AI — não representa questão oficial de banca." (texto exato sugerido pelo Ronaldo)
- `provider_licensed` → cita a fonte/licença real
- `manual` → "Questão cadastrada pelo administrador do KnowRa."

Isso é só frontend (ler `questoes.origem`, já existe) + um pequeno dicionário de textos — não precisa de RAG nem de mudança de schema além do que já existe.

## 10. RAG + geração de Questão a partir de edital (Etapa 2 — não desta etapa)

O fluxo `EDITAL → Extração → Conteúdo programático → Knowledge Base → RAG → KNOWRA_AI → Questões → Validação` é a evolução natural de conectar o Retrieval Engine (Etapa H do `KNOWRA_AI.md`, já implementado) à geração de Questões (`gerar_questoes.ts`, hoje sem RAG). **Não faz parte desta etapa** — depende do Ingestion Engine (§11) já ter conteúdo real de edital pra alimentar o RAG, e de decisão separada sobre extração de PDF de edital (OCR/parsing — dependência nova, precisa avaliação de custo/ferramenta antes de aprovar). Registrado aqui como direção arquitetural aprovada, mesmo tratamento já dado a Knowledge Entity (`KNOWRA_AI.md` §11) — sem data agendada.

## 11. API changes (RPCs novas ou estendidas, projeto)

```text
listar_concursos(p_status text default null, p_busca text default null, p_limite int default 20)
  -- substitui a leitura direta de "concursos" que Concursos.tsx faz hoje via catalogo_concursos();
  -- catalogo_concursos() mantido (usado por outra tela?) ou consolidado — avaliar na implementação.

cadastrar_concurso(...)  -- admin-only, security definer + is_admin(), mesmo padrão de revisar_questao()
atualizar_status_concurso(p_concurso_id, p_status)  -- admin-only

cadastrar_recurso_video(...)  -- admin-only
listar_recursos_video(p_area_id default null, p_topico default null)  -- authenticated, leitura

gerar_simulado(p_areas uuid[], p_dificuldade text default null, p_quantidade int default 20)  -- authenticated
```

Todas seguem o padrão de segurança já estabelecido no projeto: escrita admin-only via `security definer` + `is_admin(auth.uid())`, leitura liberada a `authenticated` só quando não há dado sensível (mesma régua de `listar_questoes()`/`catalogo_concursos()` hoje).

## 12. UI changes

`Concursos.tsx` reestruturado com abas (Abertos/Andamento/Encerrados) + seções novas (Simulados, Videoaulas, Meu desempenho) — mesmo componente `Navigation`/`Footer`, sem mudar o resto do app. Card de concurso ganha campos novos (vagas, salário, período de inscrição, dias restantes calculado no frontend a partir de `inscricoes_fim`). Nenhuma rota nova obrigatória no MVP — `/concursos/:id` (já existe) e `/praticar/:id` (já existe) continuam servindo.

**"Concurso cadastrado" ≠ "Concurso preparado para estudo"** (distinção do Ronaldo, registrada, não implementada ainda) — hoje `/concursos/:id` já pula direto pra prática de questão. A visão de página de detalhe por concurso é mais rica:

```text
CONCURSO
  ├── Sobre o concurso     ├── Edital     ├── Cargos
  ├── Conteúdo programático├── Questões   ├── Simulado
  └── Videoaulas           └── Meu desempenho (desse concurso específico)
```

**Não implementado nesta etapa** — fica registrado como próxima extensão natural de `/concursos/:id` (candidata a Etapa 7c.6 ou parte da população de dado real em 7c.5, a decidir quando houver concurso real cadastrado pra testar contra). O módulo **não deve ser considerado "pronto" só porque existem concursos cadastrados** — o objetivo real é o fluxo completo `Concurso → conteúdo → estudo → questões → simulado → desempenho → progressão` funcionando integrado ao resto da plataforma (XP/badges/ranking), não um catálogo estático.

## 13. Security impact

- Nenhuma tabela nova exposta a `anon`. Escrita sempre admin-only (mesmo padrão de `revisar_questao()`/`revisar_conhecimento()`).
- `recursos_video`/`fontes_externas` não têm dado sensível de usuário — RLS habilitado por padrão do projeto, mas sem risco de vazamento pessoal.
- `gerar_simulado()` reaproveita a mesma lógica de gating de `listar_questoes()` (nunca deve permitir simulado misturando questão de concurso Pro-gated pro usuário free — checklist de segurança roda antes de aplicar, mesmo rigor já usado nas Etapas anteriores).
- Nenhuma chave nova exposta no frontend — `dados.gov.br` token (se algum dia usado) fica só no backend, mesmo padrão de `YOUTUBE_API_KEY`.

## 14. Performance impact

Migration só aditiva (colunas nullable) — sem risco de lock longo em tabela pequena (`concursos` tem poucas linhas hoje). `listar_concursos()` com filtro por `status`/busca textual — considerar índice em `concursos.status` se o volume crescer; não necessário no MVP (poucas dezenas de linhas esperadas).

## 15. Cost impact

Zero custo de infraestrutura nova no MVP — cadastro manual (admin) não depende de API paga nenhuma. `dados.gov.br` é gratuito (exige só o token pessoal, sem cobrança). Se a Etapa 2 (RAG + extração de edital) avançar, aí sim entra custo novo a avaliar (ferramenta de parsing de PDF, chamada de IA adicional pra extração) — **não decidido, não incluído nesta etapa**.

## 16. Roadmap (cada etapa exige aprovação separada)

| Etapa | O que é | Depende de infraestrutura/decisão nova? |
|---|---|---|
| 7c.1 | ✅ Schema: `concursos` estendida, `recursos_video`, `fontes_externas` (migration aditiva) | Não |
| 7c.2 | ✅ RPCs de leitura/escrita admin (`listar_concursos`, `cadastrar_concurso`, `atualizar_status_concurso`, `cadastrar_recurso_video`, `listar_recursos_video`) | Não |
| 7c.3 | ✅ `gerar_simulado()` (Simulado personalizado) | Não |
| 7c.4 | ✅ Frontend: `Concursos.tsx` reestruturado (busca, abas de status, Simulados, Videoaulas, Meu desempenho, formulário admin de cadastro) | Não |
| 7c.5 | ✅ Populado MVP: 2 concursos reais (Transpetro 2026, TCE-MA 2026), dado verificado por busca web antes de cadastrar, com fonte oficial (Cesgranrio/Cebraspe) em `edital_url`/`pagina_oficial_url` | Não — trabalho manual de cadastro, não integração |
| 7d | Conector `dados.gov.br` como fonte auxiliar opcional (enriquecimento, nunca crítico) | Sim — token pessoal do Ronaldo, mesmo fluxo manual já feito pro YouTube |
| 7e (futuro) | RAG + extração de edital → Concursos Intelligence Engine, detalhado em [CONCURSOS_INTELLIGENCE.md](CONCURSOS_INTELLIGENCE.md) (7e.1-7e.5) | Sim — ferramenta de extração de PDF, decisão de custo separada |

Etapas 7c.1-7c.5 não dependem de nada externo — podem ser aprovadas e implementadas em sequência sem esperar decisão de infraestrutura. Etapa 7d depende só de você gerar um token gov.br (mesmo processo já feito pro YouTube). Etapa 7e é a mais especulativa — fica registrada como direção, sem data.

## 17. Riscos

- **Cadastro manual não escala sozinho** — é o trade-off consciente de não depender de fonte externa frágil. Mitigação: Etapa 7d (dados.gov.br) e um fluxo de importação em lote pro admin (CSV/planilha) podem reduzir o trabalho manual sem introduzir dependência crítica — não decidido, registrar se vier a ser pedido.
- **Concurso desatualizado** (status errado por falta de atualização manual) — mitigação: `fonte_atualizado_em` exposto no admin, alerta visual de "não atualizado há X dias" (não implementado ainda, ideia registrada).
- **Escopo grande demais numa tarefa só** — por isso o roadmap em 7 etapas pequenas (§16), cada uma aprovável e testável isoladamente, mesmo espírito de todo o resto do KNOWRA_AI.

## 18. Perguntas em aberto pro Product Owner

1. Etapa 7c.5 (popular MVP): você mesmo cadastra os 3-5 concursos reais iniciais (ex: Transpetro), ou prefere que eu monte o formulário admin primeiro e você popula depois?
2. `catalogo_concursos()` (RPC atual) fica substituída por `listar_concursos()` ou as duas convivem (uma pro catálogo público, outra pro admin)? Preciso conferir o call-site exato antes de decidir — vou verificar no código na hora de implementar 7c.2.
3. Renomear a rota/label de "Concursos" pra "Central de Preparação" no menu, ou manter "Concursos" como já está e só a página interna ganhar as seções novas? Mexer no rótulo do menu tem custo de tradução (i18n, 3 idiomas) a considerar.

## 19. Status

Etapas 7c.1-7c.5 implementadas, testadas e publicadas em produção (2026-08-16). `/concursos` já é a Central de Preparação de verdade: busca, status, disciplinas, simulados, videoaulas, meu desempenho, badge 🟢🟡🔴 de confiabilidade, e **dois concursos reais no ar** (Transpetro 2026, TCE-MA 2026 — dado verificado por busca web, fonte oficial linkada). Cadastro admin permanece segunda entrada, não estratégia definitiva (§3). Falta a página de detalhe por concurso (§12) e as etapas 7d (Ingestion Engine/dados.gov.br, token pessoal do Ronaldo) e 7e (RAG + extração de edital, prioridade arquitetural preservada, sem data).
