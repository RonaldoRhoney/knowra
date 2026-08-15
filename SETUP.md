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

## ⚠️ Login social com Google — configuração manual pendente

O código já está pronto (`signInWithOAuth({ provider: "google" })` em `frontend/src/contexts/AuthContext.tsx`), mas **falta uma etapa manual que só pode ser feita no navegador**, fora do alcance do Claude Code:

1. No [Google Cloud Console](https://console.cloud.google.com/), criar (ou reaproveitar, se já existir um projeto OAuth da RhoneyInc) um **OAuth Client ID** do tipo "Web application".
2. Nas **Authorized redirect URIs**, adicionar a URL de callback do Supabase — está em `Supabase Dashboard → Authentication → Providers → Google` (o próprio Supabase mostra a URL exata a copiar, formato `https://<project-ref>.supabase.co/auth/v1/callback`).
3. Copiar o **Client ID** e o **Client Secret** gerados no Google Cloud.
4. No Supabase Dashboard do projeto KnowRa: `Authentication → Providers → Google` → habilitar → colar Client ID e Client Secret → salvar.
5. Em **Authentication → URL Configuration**, garantir que `https://knowra.rhoneyinc.com` (e `http://localhost:5173` para dev) estão na lista de **Redirect URLs** permitidas.

Até essa etapa ser feita, o botão "Continuar com Google" aparece na tela de login mas retorna erro do Supabase (provider não habilitado). O login por e-mail/senha já funciona sem essa configuração.

## ⚠️ Nota: rate limit de e-mail no cadastro por senha

O projeto Supabase novo usa o serviço de e-mail compartilhado deles por padrão, com limite baixo (poucos e-mails/hora) para envio de confirmação de cadastro. Isso foi confirmado testando o endpoint de signup diretamente (retornou `over_email_send_rate_limit` no segundo teste). Para uso real em produção, será necessário configurar um provedor de SMTP próprio em `Authentication → Settings → SMTP Settings` no Supabase — não bloqueia a Fase 1 (login social e testes pontuais funcionam), mas é um bloqueio real se muitos usuários tentarem criar conta por e-mail/senha ao mesmo tempo.

## Deploy

Frontend publicado via Vercel (`vercel --prod` dentro de `frontend/`), domínio `knowra.rhoneyinc.com` já configurado. Backend ainda não tem deploy — nenhuma funcionalidade da Fase 1 depende dele em produção (login/Home/Admin falam direto com Supabase); ele existe pronto para a Fase 2, quando o AI Engine precisar rodar server-side.
