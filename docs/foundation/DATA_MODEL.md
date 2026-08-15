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

## Regras derivadas do modelo

* `xp_total` e `nivel_global` em `profiles` são **derivados**, recalculados a partir de `desafios.xp_ganho` — não devem ser a fonte de verdade editável diretamente pelo frontend (ver [SECURITY.md](SECURITY.md), risco de manipulação de XP).
* Toda tabela que carrega `usuario_id` precisa de RLS restringindo leitura/escrita ao próprio dono (exceto `admin`, exceto colunas explicitamente públicas como leaderboard, que não existe no MVP) — ver [SECURITY.md](SECURITY.md).
* `areas` é a única tabela sem `usuario_id` — é compartilhada entre todos os usuários (árvore de conhecimento global, não por usuário).
