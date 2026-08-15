import type { SupabaseClient } from "@supabase/supabase-js";

/** Lançado quando o usuário atingiu o limite diário de interações de IA. */
export class LimiteIAError extends Error {}

interface ResultadoLimite {
  permitido: boolean;
  usadas_hoje: number;
  limite: number;
  ilimitado: boolean;
}

/**
 * Checa e consome uma unidade do limite diário de IA do usuário — deve ser
 * chamada logo ANTES de cada chamada real à Anthropic (nunca em cache hit,
 * que não tem custo de IA e por isso não conta contra a cota).
 */
export async function verificarLimiteIA(supabase: SupabaseClient): Promise<void> {
  const { data, error } = await supabase.rpc("verificar_limite_ia");
  if (error) {
    throw new Error("Não foi possível verificar seu limite de uso agora. Tente novamente.");
  }

  const resultado = data as ResultadoLimite;
  if (!resultado.permitido) {
    throw new LimiteIAError(
      `Você atingiu o limite diário de ${resultado.limite} interações com a IA. Volte amanhã pra continuar aprendendo!`,
    );
  }
}
