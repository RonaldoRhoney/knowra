import { Pool } from "pg";

/**
 * Conexão direta ao Postgres via DATABASE_URL — nunca uma chave service_role
 * do Supabase (decisão registrada em DECISIONS.md). Único uso: o webhook do
 * Mercado Pago, que é chamado pelo próprio Mercado Pago (sem token de
 * usuário pra autenticar via RLS/RPC como nos demais endpoints). Mesma
 * credencial já usada em scripts/gerar_questoes.ts, aqui reaproveitada em
 * runtime (não mais só offline) porque é a única forma de escrever
 * profiles.plano/assinaturas sem introduzir service_role no projeto.
 */
let pool: Pool | null = null;

export function dbAdmin(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL não configurado.");
    pool = new Pool({ connectionString, max: 3 });
  }
  return pool;
}

/**
 * Executa uma query definindo request.jwt.claim.sub pro usuário específico
 * (mesma simulação usada nos testes de RLS via psql), numa transação
 * isolada. Uso: chamar funções security definer que dependem de auth.uid()
 * SEM expor a função via PostgREST/RPC pra authenticated em geral — o
 * usuarioId já foi validado pelo middleware (JWT real via
 * supabase.auth.getUser()) antes de chegar aqui, então isso não é um novo
 * IDOR: só o backend, depois de validar o token de verdade, consegue montar
 * essa sessão simulada. Ver DECISIONS.md 2026-08-15 (correção do achado
 * crítico de avaliar_desafio/criar_desafio aceitando nota/enunciado do
 * cliente sem checar origem).
 *
 * Propositalmente NÃO troca pra "role authenticated" — auth.uid() só lê a
 * configuração de sessão (request.jwt.claim.sub), não depende do role. Ficar
 * como o role de DATABASE_URL (dono das funções) é o que permite chamar
 * exatamente as funções que acabaram de ter o EXECUTE revogado de
 * "authenticated"/"anon" nesta mesma migration — trocar de role aqui
 * reintroduziria o mesmo bloqueio pro próprio backend.
 */
export async function rpcComoUsuario<T = unknown>(usuarioId: string, sql: string, params: unknown[]): Promise<T> {
  const client = await dbAdmin().connect();
  try {
    await client.query("begin");
    await client.query("select set_config('request.jwt.claim.sub', $1, true)", [usuarioId]);
    const { rows } = await client.query(sql, params);
    await client.query("commit");
    return rows[0] as T;
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}
