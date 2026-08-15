import type { SupabaseClient } from "@supabase/supabase-js";
import { anthropic, MODEL } from "../../lib/anthropic.js";
import { verificarLimiteIA } from "../../lib/limiteIA.js";
import { rpcComoUsuario } from "../../lib/dbAdmin.js";

const AVALIAR_TOOL = {
  name: "avaliar_resposta",
  description: "Avalia a resposta do usuário a um desafio de conhecimento.",
  input_schema: {
    type: "object" as const,
    properties: {
      nota: {
        type: "integer",
        description: "Nota de 0 a 100 considerando precisão, compreensão, completude e conceitos fundamentais.",
      },
      feedback: {
        type: "string",
        description: "Feedback construtivo e humano — o que acertou, o que faltou, nunca só a nota.",
      },
    },
    required: ["nota", "feedback"],
  },
};

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

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 512,
    system:
      "Você é o mentor de conhecimento do KnowRa, avaliando se a pessoa demonstrou entender o conceito. " +
      "Seja justo e específico: não dê nota alta pra resposta vaga, mas reconheça acerto parcial. " +
      "Nunca seja punitivo no tom — o objetivo é ensinar, não reprovar.",
    tools: [AVALIAR_TOOL],
    tool_choice: { type: "tool", name: "avaliar_resposta" },
    messages: [
      {
        role: "user",
        content: `Desafio: ${desafio.enunciado}\n\nResposta do usuário: ${respostaUsuario}`,
      },
    ],
  });

  const toolUse = message.content.find((block: { type: string }) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("A IA não retornou uma avaliação estruturada.");
  }

  const { nota, feedback } = toolUse.input as { nota: number; feedback: string };
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
