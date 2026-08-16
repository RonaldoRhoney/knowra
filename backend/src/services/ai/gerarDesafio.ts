import type { SupabaseClient } from "@supabase/supabase-js";
import { aiProvider } from "../../lib/providers/anthropicProvider.js";
import { verificarLimiteIA } from "../../lib/limiteIA.js";
import { rpcComoUsuario } from "../../lib/dbAdmin.js";

export interface Desafio {
  id: string;
  pergunta_id: string;
  enunciado: string;
  dificuldade: string;
  criado_em: string;
}

export async function gerarDesafio(supabase: SupabaseClient, perguntaId: string, usuarioId: string): Promise<Desafio> {
  const { data: pergunta, error: erroPergunta } = await supabase
    .from("perguntas")
    .select("id, texto, resposta_ia")
    .eq("id", perguntaId)
    .single();

  if (erroPergunta || !pergunta) {
    throw new Error("Pergunta não encontrada.");
  }

  await verificarLimiteIA(supabase);

  const { enunciado, dificuldade } = await aiProvider.gerarDesafio(pergunta.texto, pergunta.resposta_ia);

  // criar_desafio() não é mais alcançável via PostgREST por "authenticated"
  // — só o backend grava, com o enunciado/dificuldade que a Anthropic
  // acabou de gerar (nunca o que o client mandaria direto).
  const desafio = await rpcComoUsuario<Desafio>(
    usuarioId,
    "select * from public.criar_desafio($1, $2, $3)",
    [perguntaId, enunciado, dificuldade],
  );

  if (!desafio) {
    throw new Error("Não foi possível criar o desafio.");
  }

  return desafio;
}
