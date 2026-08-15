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

## Entidades futuras (planejado — Competitive Mode/Concursos, atualização 2026-08-15)

> Ver [DECISIONS.md](DECISIONS.md). Conceitual, não é migration — não criar essas tabelas agora. Listado aqui pra próxima Fase que tocar nisso não precisar redesenhar do zero, e pra deixar claro que nem todo conceito abaixo vira tabela (alguns são agregados/value objects).

| Conceito | Tipo provável | Relação com o que já existe |
|---|---|---|
| `Question` | tabela nova | Item reutilizável e estruturado — ver [KNOWLEDGE_MODEL.md](KNOWLEDGE_MODEL.md) §Pergunta vs Questão vs Desafio. Campos: enunciado, alternativas (quando aplicável), gabarito, explicação, dificuldade, `area_id` (reaproveita `areas`), origem |
| `QuestionProvider` | tabela nova | Fonte de Questões (config, auth, limite, custo, status) — ver [ARCHITECTURE.md](ARCHITECTURE.md) §Provider Layer |
| `QuestionSource` | pode ser colunas em `Question` em vez de tabela separada | origem/fornecedor/licença/concurso/cargo/ano/banca/disciplina/assunto/identificador externo — avaliar na hora se justifica tabela própria ou é metadata de `Question` |
| `ChallengeAttempt` | tabela nova, paralela a `desafios` | tentativa de responder uma `Question` (Competitive Mode) — não reaproveita `desafios` (que fica exclusivo do Knowledge Mode), ver justificativa em [KNOWLEDGE_MODEL.md](KNOWLEDGE_MODEL.md) |
| `Answer` / `Evaluation` | provavelmente colunas em `ChallengeAttempt`, não tabelas — mesmo padrão já usado em `desafios` (resposta_usuario/nota/feedback_ia na mesma linha) | reaproveitar o padrão já validado nas Fases 2-3 |
| `XPTransaction` | avaliar: hoje XP é só um contador (`profiles.xp_total` incrementado por RPC) — um ledger append-only (`XPTransaction`) dá auditabilidade/anti-cheat melhor, mas é mais caro de manter. Decisão adiada — reavaliar quando Rating precisar do mesmo tipo de rastro | hoje: `desafios.xp_ganho` já funciona como um registro histórico por linha, parcialmente cobre a necessidade |
| `Rating` | provavelmente coluna(s) em `profiles` (`rating_geral`) + tabela `rating_por_area`/`rating_por_concurso` no mesmo molde de `progresso_area` | nunca no mesmo campo de `xp_total` — ver [GAME_RULES.md](GAME_RULES.md) §Rating |
| `Leaderboard` / `Ranking` | view/query materializada sobre `Rating`, não tabela própria na maioria dos casos | |
| `Season` | tabela nova | período com início/fim, congela ranking ao final |
| `League` | tabela nova ou enum fixo (Bronze→Lenda) + coluna em `profiles`/rating por temporada | avaliar complexidade real na hora |
| `Contest` / `Exam` | tabela nova | "Concurso" conceitual (federal/estadual/municipal, cargo, banca) |
| `Subject` | provavelmente reaproveita `areas` (mesma hierarquia Área→Subárea→Tópico) em vez de criar conceito paralelo | evitar duplicar a árvore de conhecimento pra "Disciplina de concurso" quando `areas` já modela hierarquia |
| `AIInteraction` | tabela de log/observabilidade, não domínio de negócio | custo/latência por chamada de IA, ver [SECURITY.md](SECURITY.md) §Observabilidade |

**Não assumir que todo conceito acima vira tabela** — vários são agregados, views ou colunas dentro de tabelas já existentes. Essa decisão é tomada na hora de cada Fase futura implementar, com o schema real na frente (skill `verificar-premissas`), não especulativamente agora.

## Regras derivadas do modelo

* `xp_total` e `nivel_global` em `profiles` são **derivados**, recalculados a partir de `desafios.xp_ganho` — não devem ser a fonte de verdade editável diretamente pelo frontend (ver [SECURITY.md](SECURITY.md), risco de manipulação de XP).
* Toda tabela que carrega `usuario_id` precisa de RLS restringindo leitura/escrita ao próprio dono (exceto `admin`, exceto colunas explicitamente públicas como leaderboard, que não existe no MVP) — ver [SECURITY.md](SECURITY.md).
* `areas` é a única tabela sem `usuario_id` — é compartilhada entre todos os usuários (árvore de conhecimento global, não por usuário).
