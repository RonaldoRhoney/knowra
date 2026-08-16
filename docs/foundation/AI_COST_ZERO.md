# AI_COST_ZERO.md — KnowRa

> Auditoria de dependências externas e cost-zero/local-first, 2026-08-15. Ver [DECISIONS.md](DECISIONS.md). **Discovery — nenhum código foi alterado nesta etapa.**

## Objetivo

Mapear, de forma completa e verificada no repositório real (não em documentação nem em suposição), toda dependência externa do KnowRa — com foco em identificar o que é crítico, o que é pago, o que é substituível, e o que precisa de infraestrutura própria versus o que já é aditivo em cima do que existe. Ponto de partida pra uma decisão arquitetural futura (ver [KNOWRA_AI.md](KNOWRA_AI.md)), não uma decisão em si.

## Princípio orientador (redação final aprovada pelo Ronaldo)

> "Nenhuma funcionalidade crítica do KnowRa poderá depender de uma API paga, créditos por uso ou fornecedor externo proprietário. Sempre que houver dependência externa, deve existir uma alternativa local, pública, gratuita ou autogerenciada."

Deliberadamente **não** é "toda API tem que ser grátis" — é uma regra de resiliência a mudança de política de fornecedor, não uma regra de custo por si só. E a meta declarada é **cost-efficient + local-first**, não "zero custo a qualquer custo" — trocar custo de token por infraestrutura mal dimensionada (VPS+GPU+RAM+storage+banda rodando 24/7) pode custar mais, não menos, se não for medido.

## 1. Inventário completo de dependências externas

| # | Serviço | Forma de acesso | Onde entra no código |
|---|---|---|---|
| 1 | Anthropic Claude | `@anthropic-ai/sdk` | `backend/src/lib/anthropic.ts` |
| 2 | Mercado Pago | `fetch` direto (REST) | `backend/src/lib/mercadoPago.ts` |
| 3 | ip-api.com | `fetch` direto (REST, sem chave) | `backend/src/lib/geolocalizacao.ts` |
| 4 | Supabase (Postgres + Auth + Storage) | `@supabase/supabase-js` + `pg` (`DATABASE_URL`) | praticamente todo `backend/src` e `frontend/src` |
| 5 | Google OAuth | provider configurado no Supabase Auth, não é chamada de código do KnowRa | `frontend/src/contexts/AuthContext.tsx` |
| 6 | Vercel | plataforma de deploy, não API chamada em runtime | `.vercel/` |

`package.json` de backend (6 deps de produção) e frontend (4 deps de produção) confirmam superfície pequena — nenhum outro SDK, nenhuma outra chamada de rede a domínio externo foi encontrada.

## 2. Mapa atual da arquitetura de IA

```text
Frontend (React)
     │
     ▼
Backend Express (Vercel Serverless)
     │
     ├── askQuestion.ts ────────────┐
     ├── gerarDesafio.ts ───────────┼──► anthropic.messages.create()
     ├── avaliarDesafio.ts ─────────┘     modelo: claude-haiku-4-5
     │
     └── scripts/gerar_questoes.ts (offline, fora do runtime)
              └──► anthropic.messages.create()
                    modelo: claude-opus-5
```

Não existe hoje nenhum RAG, embedding, vector search ou cache semântico — o único reaproveitamento é `respostas_canonicas`, um cache **exato** (texto normalizado por acento/caixa/pontuação/espaço), não por significado.

## 3. Mapa atual das APIs (por ponto de chamada)

| Local | Chama | Quando dispara | Já passa por cache/limite? |
|---|---|---|---|
| `askQuestion.ts:92` | Anthropic (Haiku) | Pergunta nova sem cache exato | Sim — `buscar_resposta_canonica()` + `verificar_limite_ia()` |
| `gerarDesafio.ts:47` | Anthropic (Haiku) | Toda geração de Desafio | Só limite diário |
| `avaliarDesafio.ts:58` | Anthropic (Haiku) | Toda avaliação de resposta a Desafio | Só limite diário |
| `gerar_questoes.ts:112` | Anthropic (Opus) | Manual, offline, em lote | Não aplicável — gera conteúdo reutilizado por todos os usuários, não por request |
| `geolocalizacao.ts:16` | ip-api.com | Todo login (`registrar_sessao`) | Não — mas é *best-effort*, falha nunca bloqueia login |
| `mercadoPago.ts:25,59` | Mercado Pago | Criação/confirmação de assinatura Pro | Não aplicável |

## 4. Matriz de custo

| Serviço | Modelo de cobrança | Situação hoje | Limite atual |
|---|---|---|---|
| Anthropic (Haiku, runtime) | por token, pago | Só em cache miss, sob limite diário (5 free / 30 Pro por usuário) | Rate-limitado pelo próprio KnowRa |
| Anthropic (Opus, offline) | por token, pago | Custo único por lote, não recorrente por usuário | Sem limite automático (processo manual) |
| Mercado Pago | taxa % por cobrança | Só existe se houver assinante Pro pagante | N/A |
| ip-api.com | gratuito, **mas tier grátis proíbe uso comercial** nos termos de serviço | $0, mas com risco de violação de ToS — ver §6 | 45 req/min |
| Supabase | free tier com limites, upgrade pago acima disso | Depende do plano contratado — fora do escopo desta auditoria de IA | Conforme plano |
| Google OAuth | gratuito | $0 | N/A |
| Vercel | free/hobby hoje | $0 até ultrapassar o plano | Conforme plano |

## 5. Matriz de criticidade

| Serviço | Criticidade | Motivo |
|---|---|---|
| Anthropic | 🔴 CRÍTICA | Sem ela, Perguntas/Respostas (Core Loop inteiro) param em cache miss — é o único gerador de conteúdo novo hoje |
| Supabase | 🔴 CRÍTICA | Banco, Auth e Storage — fundação do produto, não é uma questão de IA |
| Mercado Pago | 🟡 IMPORTANTE | Sem ele, KnowRa Pro para de vender — mas o free continua 100% funcional |
| Google OAuth | 🟡 IMPORTANTE | Método de login recomendado do ecossistema, mas e-mail/senha já é alternativa funcional |
| Vercel | 🟡 IMPORTANTE | Trocável, mas dá trabalho migrar — não é questão de custo de IA |
| ip-api.com | 🟢 SUBSTITUÍVEL | Só alimenta métricas demográficas do Painel ADM — nenhuma funcionalidade de usuário final depende disso |

## 6. Riscos identificados

- 🔴 **ip-api.com em uso comercial, sem nenhuma relação com o objetivo desta auditoria, mas achado durante ela**: o tier gratuito proíbe uso comercial nos próprios termos de serviço, e o KnowRa **já tem monetização ativa** (KnowRa Pro, lançado em 2026-08-15). Já estava documentado como "revisar antes de monetizar" (`DECISIONS.md`, 2026-08-15) — a monetização já aconteceu, então isso deixou de ser risco futuro e passou a ser pendência real em produção. Correção sugerida (troca de provedor com licença comercial) é pequena e independente de qualquer decisão sobre Ollama/RAG — não implementado nesta etapa, só sinalizado.
- 🟡 **Custo de infraestrutura substituindo custo de token**: Ollama "grátis por token" ainda exige VPS/CPU-GPU/RAM/storage/banda rodando continuamente — ver [KNOWRA_AI.md](KNOWRA_AI.md) §Viabilidade do Ollama.
- 🟡 **Qualidade do modelo local vs Claude**: nenhum modelo rodável localmente numa VPS modesta hoje compete em qualidade de resposta aberta com Claude Haiku/Opus — risco de degradar experiência se não for calibrado com cuidado (ex: local só pra alta confiança/cache, Claude como fallback).
- 🟢 **Escopo/tempo**: construir Knowledge Memory + RAG + Confidence Engine + Knowledge Graph + Learning Engine é, em volume, comparável a várias Fases já percorridas somadas — deve ser tratado como roadmap de várias etapas aprovadas uma a uma (ver [KNOWRA_AI.md](KNOWRA_AI.md) §Roadmap), nunca como uma "fase" só.

## 7. Dependências substituíveis vs. que não devem ser substituídas agora

**Substituíveis**: Anthropic (é o próprio alvo da proposta — ver KNOWRA_AI.md pra viabilidade real); ip-api.com (troca trivial, independente do resto).

**Não devem ser substituídas agora**: Supabase (trocar é migração de plataforma inteira, ortogonal ao problema de custo de IA); Mercado Pago (padrão do ecossistema RhoneyInc inteiro); Google OAuth (gratuito, sem relação com o problema que esta auditoria tenta resolver).

## 8. Impacto no KnowRa Pro (análise, sem alteração de monetização)

KnowRa Pro tem 3 pilares — só 1 depende de custo de IA em runtime:

| Pilar | Depende de custo de IA? |
|---|---|
| Limite de IA maior (30/dia vs 5/dia) | **Sim** |
| Acesso completo a Concursos | Não — conteúdo pré-gerado offline, pago uma vez |
| "Sem anúncios" (reservado) | Não |

Se o custo de IA em runtime cair (via Ollama), o pilar "limite maior" perde a justificativa de custo original, mas os outros dois pilares continuam de pé — e já seguem a lógica "Pro vende conteúdo/experiência, não acesso bruto à IA". Nenhuma mudança de monetização foi feita nesta etapa.

## Status

Fase 1 (auditoria) e Fase 2 (mapeamento) concluídas. Aguardando aprovação do Product Owner pra prosseguir — próximo documento é [KNOWRA_AI.md](KNOWRA_AI.md) (Fase 4/6 — projeto da arquitetura, ainda sem implementação).
