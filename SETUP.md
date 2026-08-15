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

## ✅ Cadastro por e-mail/senha sem confirmação de e-mail

O projeto Supabase usa o serviço de e-mail compartilhado deles por padrão, com limite baixo (poucos e-mails/hora) — isso chegou a travar um cadastro real (`ronaldorhoney@hotmail.com`, 2026-08-15): a conta era criada, mas o e-mail de confirmação nunca chegava por causa do rate limit, deixando o usuário sem conseguir logar. Corrigido desativando `Confirm email` em `Authentication → Sign In / Providers` — cadastro por e-mail/senha agora concede sessão na hora, sem depender de e-mail. Google OAuth continua sendo a opção recomendada/principal. Se confirmação de e-mail voltar a ser necessária no futuro (ex: exigência de compliance), configurar SMTP próprio (Resend/SendGrid) em `Authentication → Settings → SMTP Settings` antes de reativar.

## Deploy

* **Frontend**: Vercel (`vercel --prod` dentro de `frontend/`), domínio `knowra.rhoneyinc.com`.
* **Backend**: Vercel também, projeto próprio (`vercel --prod` dentro de `backend/`, adaptado como função serverless em `api/index.ts`) — hoje em `knowra-api-eta.vercel.app`, sem domínio customizado (API não é acessada direto por usuário final).
