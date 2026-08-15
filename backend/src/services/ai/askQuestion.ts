import type { SupabaseClient } from "@supabase/supabase-js";
import { anthropic, MODEL } from "../../lib/anthropic.js";

const RESPONDER_TOOL = {
  name: "responder_e_classificar",
  description:
    "Responde a pergunta do usuário de forma clara e contextualizada, e classifica o assunto em uma área de conhecimento.",
  input_schema: {
    type: "object" as const,
    properties: {
      resposta: {
        type: "string",
        description: "Resposta clara, correta e contextualizada à pergunta. Sem jargão técnico desnecessário.",
      },
      area_nome: {
        type: "string",
        description: 'Nome legível da área/tópico mais específico da pergunta, ex: "Python", "História do Brasil".',
      },
      area_slug: {
        type: "string",
        description: "Versão em slug (minúsculo, sem acento, palavras separadas por hífen) de area_nome.",
      },
    },
    required: ["resposta", "area_nome", "area_slug"],
  },
};

export interface AskResult {
  id: string;
  texto: string;
  resposta_ia: string;
  area_id: string | null;
  criado_em: string;
}

export async function askQuestion(supabase: SupabaseClient, texto: string): Promise<AskResult> {
  const { data: areasExistentes } = await supabase
    .from("areas")
    .select("nome, slug")
    .order("criado_em", { ascending: false })
    .limit(50);

  const listaAreas = (areasExistentes ?? []).map((a) => `${a.nome} (${a.slug})`).join(", ") || "nenhuma ainda";

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system:
      "Você é o mentor de conhecimento do KnowRa, uma plataforma que transforma curiosidade em aprendizado real. " +
      "Responda com clareza, sem jargão técnico desnecessário, de forma que qualquer pessoa curiosa entenda. " +
      "Ao classificar a área, reaproveite uma área já existente sempre que fizer sentido, em vez de criar uma nova quase igual. " +
      `Áreas já existentes: ${listaAreas}.`,
    tools: [RESPONDER_TOOL],
    tool_choice: { type: "tool", name: "responder_e_classificar" },
    messages: [{ role: "user", content: texto }],
  });

  const toolUse = message.content.find((block: { type: string }) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("A IA não retornou uma resposta estruturada.");
  }

  const { resposta, area_nome, area_slug } = toolUse.input as {
    resposta: string;
    area_nome: string;
    area_slug: string;
  };

  const { data: pergunta, error } = await supabase
    .rpc("registrar_pergunta", {
      p_texto: texto,
      p_resposta_ia: resposta,
      p_area_nome: area_nome,
      p_area_slug: area_slug,
    })
    .single();

  if (error || !pergunta) {
    throw new Error(error?.message ?? "Não foi possível salvar a pergunta.");
  }

  return pergunta as AskResult;
}
