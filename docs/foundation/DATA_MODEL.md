# DATA_MODEL.md — KnowRa

> Modelo inicial (Fase 0/1) — conceitual, não é a migration final. Detalhe de colunas/constraints é decidido na Fase 1, contra o schema real do Supabase (seguir skill `verificar-premissas` antes de assumir qualquer coisa já existe).

## Entidades principais

### `profiles`

Estende `auth.users` do Supabase (que já cobre e-mail/senha e Google OAuth via Supabase Auth — ver [ARCHITECTURE.md](ARCHITECTURE.md)).

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | uuid (FK → `auth.users.id`) | PK |
| `nome` | text | |
| `avatar_url` | text | populado automaticamente quando login é via Google |
| `role` | text | `user` \| `admin` — trigger promove `rhoneyinc@gmail.com` automaticamente (skill `admin-padrao`) |
| `nivel_global` | int | derivado de `xp_total`, ver [GAME_RULES.md](GAME_RULES.md) |
| `xp_total` | int | soma de todo XP ganho |
| `streak_atual` | int | dias consecutivos |
| `streak_recorde` | int | |
| `criado_em` | timestamptz | |

### `areas`

Árvore de conhecimento (ver [KNOWLEDGE_MODEL.md](KNOWLEDGE_MODEL.md)).

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | uuid | PK |
| `nome` | text | ex.: "Python" |
| `slug` | text | único, normalizado |
| `parent_id` | uuid (FK → `areas.id`, nullable) | permite Área → Subárea → Tópico |
| `criado_por_ia` | boolean | nós propostos automaticamente pela IA |

### `perguntas`

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | uuid | PK |
| `usuario_id` | uuid (FK → `profiles.id`) | dono |
| `area_id` | uuid (FK → `areas.id`, nullable) | classificação pela IA |
| `texto` | text | pergunta do usuário |
| `resposta_ia` | text | |
| `criado_em` | timestamptz | |

### `desafios`

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | uuid | PK |
| `pergunta_id` | uuid (FK → `perguntas.id`) | origem do desafio |
| `usuario_id` | uuid (FK → `profiles.id`) | dono (redundante com `perguntas.usuario_id`, mantido para checagem de posse direta e RLS mais simples) |
| `enunciado` | text | pergunta gerada pela IA |
| `dificuldade` | text | `facil` \| `normal` \| `dificil` \| `avancado` \| `mestre` |
| `resposta_usuario` | text | nullable até ser respondido |
| `nota` | int | 0-100, nullable até avaliado |
| `feedback_ia` | text | |
| `xp_ganho` | int | calculado, ver [GAME_RULES.md](GAME_RULES.md) |
| `criado_em` | timestamptz | |
| `avaliado_em` | timestamptz | nullable |

### `progresso_area`

Domínio por `(usuário, área)` — alimenta o Mapa de Conhecimento.

| Coluna | Tipo | Notas |
|---|---|---|
| `usuario_id` | uuid (FK → `profiles.id`) | PK composta |
| `area_id` | uuid (FK → `areas.id`) | PK composta |
| `dominio_pct` | numeric(5,2) | 0-100, calculado a partir dos desafios avaliados na área |
| `nivel_area` | int | |
| `atualizado_em` | timestamptz | |

### `badges` / `usuario_badges`

| Tabela | Colunas principais |
|---|---|
| `badges` | `id`, `codigo` (ex.: `primeira_curiosidade`), `nome`, `descricao`, `criterio` (texto legível, não lógica executável) |
| `usuario_badges` | `usuario_id` (FK), `badge_id` (FK), `conquistado_em` |

## Relações-chave

```text
profiles 1─N perguntas 1─1 desafios
profiles 1─N progresso_area N─1 areas
profiles N─N badges (via usuario_badges)
areas 1─N areas (auto-relação, parent_id)
```

---

## Concursos Públicos (implementado — Fase 7a, 2026-08-15)

> Ver [DECISIONS.md](DECISIONS.md) e [KNOWLEDGE_MODEL.md](KNOWLEDGE_MODEL.md) §Pergunta vs Questão vs Desafio. `Question`/`ChallengeAttempt`/`Contest`/`Subject`, antes listados como "futuros" abaixo, agora existem como schema real.

| Conceito | Tabela real | Notas |
|---|---|---|
| `Contest` | `concursos` | `nome`, `orgao`, `banca`, `ano`, `cargo` (atributo simples — vira entidade própria só quando houver necessidade real de reutilização/filtro) |
| `Subject` | reaproveita `areas` | `questoes.area_id` referencia a mesma árvore de conhecimento — nenhuma tabela `disciplinas` criada |
| `Question` | `questoes` | enunciado, alternativas (jsonb), gabarito, explicação, dificuldade, `origem` (`text` com `CHECK` já extensível pra `ia_knowra`/`provider_licensed`/`manual`/`import_licensed`), `review_status` (`generated`→`pending_review`→`approved`→`published`), metadados de auditoria (`generation_model`, `prompt_version`, `generated_at`) |
| `ChallengeAttempt` | `tentativas_questao` | paralela a `desafios`, nunca reaproveita — toda tentativa é gravada, `valida_para_progresso` marca só a primeira por questão/usuário |
| `Answer` / `Evaluation` | colunas em `tentativas_questao` (`alternativa_escolhida`, `correta`) | mesmo padrão já validado em `desafios` |
| — | `progresso_concurso` | mesmo molde de `progresso_area`, fonte de dado separada — só `responder_questao()` escreve aqui |

`QuestionProvider` (integração real com fonte externa) **ainda não existe** — MVP usa só `ia_knowra` como origem, schema já preparado pra não exigir redesenho quando um provider real for integrado (ver [ARCHITECTURE.md](ARCHITECTURE.md) §Provider Layer).

## Entidades futuras (planejado — Competitive Mode, atualização 2026-08-15)

> Ver [DECISIONS.md](DECISIONS.md). Conceitual, não é migration — não criar essas tabelas agora.

| Conceito | Tipo provável | Relação com o que já existe |
|---|---|---|
| `QuestionProvider` | tabela nova | Fonte de Questões (config, auth, limite, custo, status) — ver [ARCHITECTURE.md](ARCHITECTURE.md) §Provider Layer |
| `XPTransaction` | avaliar: hoje XP é só um contador (`profiles.xp_total` incrementado por RPC) — um ledger append-only (`XPTransaction`) dá auditabilidade/anti-cheat melhor, mas é mais caro de manter. Decisão adiada — reavaliar quando Rating precisar do mesmo tipo de rastro | hoje: `desafios.xp_ganho` já funciona como um registro histórico por linha, parcialmente cobre a necessidade |
| `Rating` | `profiles.rating` (Fase 5) já implementado pro Knowledge Mode; `rating_por_area`/`rating_por_concurso` dedicados ainda não existem | ranking hoje (Fase 6/7a) usa `dominio_pct`/rating diretamente, não um Rating dedicado por escopo — ver [GAME_RULES.md](GAME_RULES.md) §Rating |
| `Leaderboard` / `Ranking` | RPCs (`ranking_geral`/`ranking_por_area`/`ranking_por_concurso`) já implementadas — não é view/tabela própria | |
| `Season` | tabela nova | período com início/fim, congela ranking ao final |
| `League` | tabela nova ou enum fixo (Bronze→Lenda) + coluna em `profiles`/rating por temporada | avaliar complexidade real na hora |
| `AIInteraction` | tabela de log/observabilidade, não domínio de negócio | custo/latência por chamada de IA, ver [SECURITY.md](SECURITY.md) §Observabilidade |

**Não assumir que todo conceito acima vira tabela** — vários são agregados, views ou colunas dentro de tabelas já existentes. Essa decisão é tomada na hora de cada Fase futura implementar, com o schema real na frente (skill `verificar-premissas`), não especulativamente agora.

---

## Analytics/demografia (implementado 2026-08-15)

### `profiles` — colunas adicionais

| Coluna | Tipo | Notas |
|---|---|---|
| `idade` | int, nullable | opcional, 1-120. Substituiu o campo de faixa etária fixa (`<18`/`18-24`/...) — o Painel ADM calcula o bucket a partir da idade exata, não pede mais a faixa diretamente |
| `cidade` / `pais` | text, nullable | autodeclarados pelo usuário no cadastro — distintos de `sessoes.pais`/`sessoes.regiao`, que são inferidos por geolocalização de IP a cada login |
| `genero` | text, nullable | opcional, com `prefiro_nao_informar` como opção explícita — nunca obrigatório |
| `dados_demograficos_consentidos_em` | timestamptz, nullable | marca quando o usuário completou o cadastro (RPC `completar_cadastro`) — usado pra nunca perguntar de novo |

### `sessoes`

Um evento por sessão de login, usado só para observabilidade agregada (dispositivo/país/região) — nunca exposto por linha individual ao client, só via `admin_demographics()`.

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | uuid | PK |
| `usuario_id` | uuid (FK → `profiles.id`) | |
| `dispositivo` | text | `mobile` \| `tablet` \| `desktop`, derivado de User-Agent no backend |
| `pais` / `regiao` | text, nullable | geolocalização best-effort por IP, calculada no backend — **o IP bruto nunca é persistido**, só o resultado da geolocalização |
| `criado_em` | timestamptz | |

## Storage — avatares (implementado 2026-08-15)

Bucket `avatars` no Supabase Storage, público para leitura (avatar é imagem de perfil, precisa ser visível), com escrita restrita: cada usuário só pode subir/atualizar/apagar dentro da própria pasta (`{user_id}/avatar.{ext}`), via política de RLS em `storage.objects` checando `(storage.foldername(name))[1] = auth.uid()::text`. Limite de 3MB, só tipos de imagem comuns (`png`/`jpeg`/`webp`/`gif`). `profiles.avatar_url` já tinha grant de `UPDATE` direto pra `authenticated` desde a Fase 1 (skill de admin-padrão não se aplica aqui, é ajuste de perfil comum) — upload não precisou de RPC nova.

## Regras derivadas do modelo

* `xp_total` e `nivel_global` em `profiles` são **derivados**, recalculados a partir de `desafios.xp_ganho` — não devem ser a fonte de verdade editável diretamente pelo frontend (ver [SECURITY.md](SECURITY.md), risco de manipulação de XP).
* Toda tabela que carrega `usuario_id` precisa de RLS restringindo leitura/escrita ao próprio dono (exceto `admin`, exceto colunas explicitamente públicas como leaderboard, que não existe no MVP) — ver [SECURITY.md](SECURITY.md).
* `areas` é a única tabela sem `usuario_id` — é compartilhada entre todos os usuários (árvore de conhecimento global, não por usuário).
