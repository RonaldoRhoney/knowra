-- KnowRa — KNOWRA_AI, Etapa A: schema da Knowledge Memory (pgvector)
-- Ver docs/foundation/KNOWRA_AI.md §5, §6, §8 e DECISIONS.md 2026-08-15.
--
-- Só schema — nada é populado, nada é lido/escrito por nenhum endpoint
-- ainda. Não substitui respostas_canonicas (cache exato, continua em uso
-- normal em askQuestion.ts) — essa tabela é a evolução pra cache
-- semântico, que só entra em runtime numa etapa futura (B), com aprovação
-- separada.
--
-- Não altera Anthropic, KnowRa Pro, Mercado Pago nem limite de IA.

create extension if not exists vector;

-- Sem "vector(N)" com dimensão fixa de propósito: a dimensão do embedding
-- depende do provedor/modelo escolhido (decisão ainda não tomada — ver
-- KNOWRA_AI.md §11, pergunta 1). Fixar dimensão agora seria comprometer
-- uma escolha que ainda não foi feita. Índice de busca por similaridade
-- (ivfflat/hnsw, que exige dimensão fixa) fica pra quando essa decisão
-- existir e a tabela começar a ser populada de verdade.
create table public.knowledge_record (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  normalized_question text not null,
  embedding vector,
  answer text not null,
  topic text,
  subcategory text,
  source text not null check (source in ('anthropic', 'wikimedia', 'wikidata', 'dados_gov_br', 'ibge', 'manual')),
  source_url text,
  confidence numeric(4, 3) not null default 0 check (confidence between 0 and 1),
  times_used int not null default 0,
  times_helpful int not null default 0,
  status text not null default 'valido' check (status in ('valido', 'requer_revalidacao', 'invalidado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_verified_at timestamptz
);

create table public.knowledge_relation (
  id uuid primary key default gen_random_uuid(),
  record_id_origem uuid not null references public.knowledge_record (id) on delete cascade,
  record_id_relacionado uuid not null references public.knowledge_record (id) on delete cascade,
  tipo_relacao text not null,
  created_at timestamptz not null default now(),
  unique (record_id_origem, record_id_relacionado, tipo_relacao)
);

-- RLS habilitado por padrão do projeto (toda tabela tem, ver SECURITY.md),
-- mas SEM nenhuma policy e SEM nenhum grant pra anon/authenticated —
-- nenhum caminho de acesso existe ainda porque nenhum endpoint lê/escreve
-- aqui. Isso não é o bug "RLS ativo sem policy" já documentado em
-- DECISIONS.md (aquele bug era grant dado sem policy correspondente,
-- causando zero-linhas-silencioso pra um acesso que deveria existir) —
-- aqui não há grant nenhum, então não há acesso esperado a "vazar" ou
-- "sumir". Policies entram na etapa que definir o primeiro caminho de
-- leitura/escrita real (semantic cache em askQuestion.ts, etapa B).
alter table public.knowledge_record enable row level security;
alter table public.knowledge_relation enable row level security;
revoke all on table public.knowledge_record from anon, authenticated;
revoke all on table public.knowledge_relation from anon, authenticated;
