import type { SupabaseClient } from "@supabase/supabase-js";
import { aiProvider } from "../../lib/providers/anthropicProvider.js";
import { verificarLimiteIA } from "../../lib/limiteIA.js";
import { rpcComoUsuario } from "../../lib/dbAdmin.js";

export interface ResultadoAvaliacao {
  xp_ganho: number;
  xp_total: number;
  nivel_anterior: number;
  nivel_novo: number;
  subiu_de_nivel: boolean;
  streak_atual: number;
  badges_novas: string[];
  nota: number;
  feedback: string;
}

export async function avaliarDesafio(
  supabase: SupabaseClient,
  desafioId: string,
  respostaUsuario: string,
  usuarioId: string,
): Promise<ResultadoAvaliacao> {
  const { data: desafio, error: erroDesafio } = await supabase
    .from("desafios")
    .select("id, enunciado, avaliado_em")
    .eq("id", desafioId)
    .single();

  if (erroDesafio || !desafio) {
    throw new Error("Desafio não encontrado.");
  }
  if (desafio.avaliado_em) {
    throw new Error("Este desafio já foi avaliado.");
  }

  await verificarLimiteIA(supabase);

  const { nota, feedback } = await aiProvider.avaliar(desafio.enunciado, respostaUsuario);
  const notaClamped = Math.max(0, Math.min(100, Math.round(nota)));

  // avaliar_desafio() não é mais alcançável via PostgREST por "authenticated"
  // — nota/feedback só chegam aqui depois de terem vindo de verdade da
  // Anthropic acima, nunca como parâmetro cru de uma chamada do client.
  const resultado = await rpcComoUsuario<Record<string, unknown>>(
    usuarioId,
    "select public.avaliar_desafio($1, $2, $3, $4) as resultado",
    [desafioId, respostaUsuario, notaClamped, feedback],
  );

  if (!resultado?.resultado) {
    throw new Error("Não foi possível registrar a avaliação.");
  }

  return { ...(resultado.resultado as object), nota: notaClamped, feedback } as ResultadoAvaliacao;
}
