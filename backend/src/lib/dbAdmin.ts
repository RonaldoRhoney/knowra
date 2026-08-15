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
