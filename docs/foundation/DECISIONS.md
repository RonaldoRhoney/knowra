# DECISIONS.md — KnowRa

Registro de decisões arquiteturais e de produto — atualizado a cada decisão relevante, para nunca precisar "lembrar de cabeça" o motivo de uma escolha.

## 2026-08-15 — Repositório próprio, fora do home-root

**Decisão**: KnowRa vive em `github.com/RonaldoRhoney/knowra`, repositório próprio, criado e conectado nesta data.
**Motivo**: o repo git na raiz do `/home/rhoney` pertence de fato ao MeuPet (origin aponta pra `MeuPet.git`) — usar esse repo pro KnowRa misturaria histórico de dois produtos. Mesmo padrão já usado por AmaVida, MontaMovel, VagaLume, VoaRadar.

## 2026-08-15 — Stack: React+Vite+TS+Tailwind no frontend, Node/Express no backend, Supabase como banco+auth

**Decisão**: seguir a stack proposta em [ARCHITECTURE.md](ARCHITECTURE.md) — divergindo do blueprint original em um ponto: usar **Supabase Auth** no lugar de um "Auth Service" customizado com JWT próprio que aparecia no diagrama conceitual (`KnowRa.png`).
**Motivo**: Supabase já é o padrão de fato do ecossistema RhoneyInc (MeuPet, VoaRadar, VagaLume, MenuFlex, hub) e resolve Auth (incluindo Google OAuth) + RLS + API automática sem reimplementar nada — menor custo de desenvolvimento e menor superfície de ataque que um Auth Service próprio.
**Impacto**: a camada "Auth Engine" do blueprint conceitual passa a ser "Supabase Auth" na prática — o restante do diagrama (Knowledge Engine, Game Engine, AI Engine) permanece como serviços do backend próprio.
**Status**: proposto em Fase 0, a confirmar com uso real na Fase 1.

## 2026-08-15 — Login social com Google é obrigatório desde a Fase 1

**Decisão**: login com Google (via Supabase Auth OAuth) entra junto com e-mail/senha desde o início da Fase 1, não como item posterior.
**Motivo**: pedido explícito do Ronaldo — padrão RhoneyInc, consistente com os demais produtos do ecossistema.
**Impacto**: `profiles.avatar_url` já nasce previsto no modelo de dados para aproveitar a foto do Google quando disponível.

## 2026-08-15 — Domínio de produção: `knowra.rhoneyinc.com`

**Decisão**: URL final segue o padrão de subdomínio RhoneyInc, não um domínio genérico Vercel.
**Motivo**: pedido explícito do Ronaldo — mesmo padrão já usado em AmaVida, MenuFlex, VagaLume, VoaRadar (skill `novo-app-no-ar`).
**Impacto**: nenhuma ação imediata (produto ainda não tem deploy) — registrar aqui para não esquecer na hora do primeiro deploy.

## 2026-08-15 — Fase 1: Painel ADM entra desde já, métricas reais chegam depois

**Decisão**: em vez de adiar o Painel ADM inteiro para quando houver dado real (Fase 3/4), a Fase 1 já entrega a base — acesso restrito a `role = 'admin'`, listagem de usuários via RPC `admin_list_profiles()` — com os cards de métrica de perguntas/desafios/XP visíveis como "—, chega na Fase X" em vez de dado fake.
**Motivo**: pedido explícito do Ronaldo. Risco identificado e sinalizado antes de implementar: mostrar "todas as métricas" nesse ponto exigiria mockar dado, o que o próprio `CLAUDE.md`/`ARCHITECTURE.md` proíbe (nunca apresentar dado fictício como real).
**Impacto**: `Admin.tsx` já existe com estrutura de cards de métrica prontos para receber dado real nas Fases 2/3, sem retrabalho de layout.

## 2026-08-15 — RPC com `security definer` no lugar de `service_role` key no client/backend

**Decisão**: a listagem de usuários do Painel ADM usa a função Postgres `admin_list_profiles()` (`security definer`, checa `is_admin(auth.uid())` internamente) chamada via `supabase.rpc()` direto do frontend autenticado — não via `SUPABASE_SERVICE_ROLE_KEY` no backend.
**Motivo**: reduz superfície de ataque — não existe chave `service_role` (que bypassa todo RLS) circulando em nenhum `.env` do projeto na Fase 1. A própria autorização já é garantida pelo Postgres, reforçando o princípio de "nenhuma decisão de permissão fora do banco" (ver [SECURITY.md](SECURITY.md)).
**Impacto**: `backend/.env` fica com `SUPABASE_SERVICE_ROLE_KEY` vazio por enquanto — só será preenchido se uma necessidade real de operação administrativa fora do alcance de RLS/RPC aparecer.

## 2026-08-15 — Deploy da Fase 1 é só o frontend

**Decisão**: `vercel --prod` publicado a partir de `frontend/`, domínio `knowra.rhoneyinc.com` já apontado (pedido explícito do Ronaldo). Backend (`backend/`) não tem deploy ainda.
**Motivo**: login, Home e Painel ADM da Fase 1 falam direto com Supabase (Auth + RPC) — nenhuma feature atual depende do backend Node/Express, que existe só como esqueleto pronto para o AI Engine da Fase 2 (chamadas de IA nunca podem ser client-side, ver [AI_ENGINE.md](AI_ENGINE.md)).
**Impacto**: nenhum — quando a Fase 2 precisar do backend rodando, ele será publicado (Vercel serverless, mesmo padrão usado no MeuPet para o backend de push notifications).

## 2026-08-15 — Login social Google: configurado e validado em produção

**Decisão**: o fluxo `signInWithOAuth({ provider: "google" })` já estava implementado no frontend; a ativação (Google Cloud Console + Supabase Dashboard) foi concluída pelo Ronaldo, guiada passo a passo. Reaproveitado o mesmo projeto Google Cloud do MeuPet (`meupet-501512`) — é o projeto "guarda-chuva" de OAuth da RhoneyInc, não um projeto por produto — com um novo Client ID ("KnowRa Supabase") específico para o redirect do Supabase do KnowRa.
**Motivo**: criação de credenciais OAuth no Google Cloud Console não é acessível via código/CLI, exigiu ação manual no navegador.
**Ajuste necessário**: `Authentication → URL Configuration` no Supabase precisou de Site URL (`https://knowra.rhoneyinc.com`) e Redirect URLs (`http://localhost:5173/**`, `https://knowra.rhoneyinc.com/**`) explícitas — sem isso, o OAuth caía no `localhost:3000` padrão do Supabase (conexão recusada).
**Status**: ✅ validado em produção — login com `rhoneyinc@gmail.com` via Google cria a conta, popula nome/avatar do Google e reconhece admin automaticamente.

## Como registrar novas decisões

Formato: data, decisão, motivo, impacto, status. Toda mudança de framework, banco, arquitetura, estrutura de pastas, estratégia de integração, autenticação ou infraestrutura passa por aqui antes de virar código — decisão final é sempre do Ronaldo, o Claude Code propõe e justifica, nunca decide e aplica silenciosamente (ver `CLAUDE.md` §2).
