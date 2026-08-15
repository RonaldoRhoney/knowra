# SETUP.md — KnowRa

## Rodando localmente

```bash
# Backend
cd backend
npm install
npm run dev        # http://localhost:3001

# Frontend (outro terminal)
cd frontend
npm install
npm run dev         # http://localhost:5173
```

Cada pasta tem `.env.example` — copie para `.env` e preencha com as credenciais do projeto Supabase (`Settings → API` para URL/anon key, `Settings → Database` para a senha, se for rodar migrations).

## Aplicar migrations no Supabase

```bash
PGPASSWORD='<senha-do-banco>' psql "postgresql://postgres@db.<project-ref>.supabase.co:5432/postgres" -f supabase/migrations/000X_arquivo.sql
```

Rode em ordem numérica. Cada migration já inclui `ENABLE ROW LEVEL SECURITY` e os `GRANT`/`REVOKE` corretos — nunca aplicar uma tabela nova sem isso (ver [docs/foundation/SECURITY.md](docs/foundation/SECURITY.md)).

## ✅ Login social com Google — configurado

Provider Google habilitado no Supabase Dashboard (`Authentication → Providers → Google`), usando um Client ID/Secret criado no mesmo projeto Google Cloud do MeuPet (`meupet-501512`, projeto guarda-chuva de OAuth da RhoneyInc — não é um projeto por produto). `Authentication → URL Configuration` tem Site URL `https://knowra.rhoneyinc.com` e Redirect URLs `http://localhost:5173/**` + `https://knowra.rhoneyinc.com/**`. Validado em produção em 2026-08-15 (ver [DECISIONS.md](docs/foundation/DECISIONS.md)).

Se precisar recriar/rotacionar a credencial: `console.cloud.google.com/apis/credentials?project=meupet-501512` → criar novo Client ID "Web application" → redirect URI `https://kgymvpxzbuojxxjpjmos.supabase.co/auth/v1/callback` → colar no Supabase.

## ⚠️ Nota: rate limit de e-mail no cadastro por senha

O projeto Supabase novo usa o serviço de e-mail compartilhado deles por padrão, com limite baixo (poucos e-mails/hora) para envio de confirmação de cadastro. Isso foi confirmado testando o endpoint de signup diretamente (retornou `over_email_send_rate_limit` no segundo teste). Para uso real em produção, será necessário configurar um provedor de SMTP próprio em `Authentication → Settings → SMTP Settings` no Supabase — não bloqueia a Fase 1 (login social e testes pontuais funcionam), mas é um bloqueio real se muitos usuários tentarem criar conta por e-mail/senha ao mesmo tempo.

## Deploy

* **Frontend**: Vercel (`vercel --prod` dentro de `frontend/`), domínio `knowra.rhoneyinc.com`.
* **Backend**: Vercel também, projeto próprio (`vercel --prod` dentro de `backend/`, adaptado como função serverless em `api/index.ts`) — hoje em `knowra-api-eta.vercel.app`, sem domínio customizado (API não é acessada direto por usuário final).
