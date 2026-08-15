import type { SupabaseClient } from "@supabase/supabase-js";
import { anthropic, MODEL } from "../../lib/anthropic.js";

const GERAR_DESAFIO_TOOL = {
  name: "gerar_desafio",
  description: "Gera uma pergunta de verificação sobre o que acabou de ser explicado, calibrada por dificuldade.",
  input_schema: {
    type: "object" as const,
    properties: {
      enunciado: {
        type: "string",
        description: "Pergunta de verificação clara, que exige explicar o conceito com as próprias palavras.",
      },
      dificuldade: {
        type: "string",
        enum: ["facil", "normal", "dificil", "avancado", "mestre"],
        description: "Dificuldade calibrada pela complexidade do assunto da pergunta/resposta original.",
      },
    },
    required: ["enunciado", "dificuldade"],
  },
};

export interface Desafio {
  id: string;
  pergunta_id: string;
  enunciado: string;
  dificuldade: string;
  criado_em: string;
}

export async function gerarDesafio(supabase: SupabaseClient, perguntaId: string): Promise<Desafio> {
  const { data: pergunta, error: erroPergunta } = await supabase
    .from("perguntas")
    .select("id, texto, resposta_ia")
    .eq("id", perguntaId)
    .single();

  if (erroPergunta || !pergunta) {
    throw new Error("Pergunta não encontrada.");
  }

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 512,
    system:
      "Você é o mentor de conhecimento do KnowRa. Gere um desafio pra verificar se a pessoa realmente entendeu a explicação — " +
      "não peça pra decorar/repetir, peça pra explicar com as próprias palavras ou aplicar o conceito. " +
      "Calibre a dificuldade pela complexidade real do assunto: normal é o padrão, difícil/avançado só se o tema exigir, fácil se for algo simples.",
    tools: [GERAR_DESAFIO_TOOL],
    tool_choice: { type: "tool", name: "gerar_desafio" },
    messages: [
      {
        role: "user",
        content: `Pergunta original: ${pergunta.texto}\n\nResposta dada: ${pergunta.resposta_ia}`,
      },
    ],
  });

  const toolUse = message.content.find((block: { type: string }) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("A IA não retornou um desafio estruturado.");
  }

  const { enunciado, dificuldade } = toolUse.input as { enunciado: string; dificuldade: string };

  const { data: desafio, error } = await supabase
    .rpc("criar_desafio", {
      p_pergunta_id: perguntaId,
      p_enunciado: enunciado,
      p_dificuldade: dificuldade,
    })
    .single();

  if (error || !desafio) {
    throw new Error(error?.message ?? "Não foi possível criar o desafio.");
  }

  return desafio as Desafio;
}
