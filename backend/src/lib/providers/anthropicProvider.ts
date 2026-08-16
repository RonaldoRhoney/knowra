import { anthropic, MODEL } from "../anthropic.js";
import type { AIProvider, AvaliacaoIA, DesafioIA, RespostaIA } from "../aiProvider.js";

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
      requer_verificacao: {
        type: "boolean",
        description:
          "true se o assunto for complexo, técnico, jurídico, médico, estatístico ou sujeito a mudar com o tempo " +
          "(dados que podem estar desatualizados), e o usuário se beneficiaria de checar uma fonte oficial antes de " +
          "tomar uma decisão com base nisso. false para curiosidades gerais/conceituais sem esse risco.",
      },
      observacao_verificacao: {
        type: "string",
        description:
          "Só quando requer_verificacao=true: uma frase curta indicando QUE TIPO de fonte oficial checar " +
          '(ex: "consulte o site do IBGE para o dado mais recente", "confira a Constituição Federal, art. X"). ' +
          "NUNCA invente uma URL — cite só o nome da instituição/documento, nunca um link específico.",
      },
    },
    required: ["resposta", "area_nome", "area_slug", "requer_verificacao"],
  },
};

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

function extrairToolUse(content: { type: string }[]) {
  const toolUse = content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("A IA não retornou uma resposta estruturada.");
  }
  return toolUse as unknown as { input: Record<string, unknown> };
}

export class AnthropicProvider implements AIProvider {
  async responder(texto: string, areasExistentes: string): Promise<RespostaIA> {
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system:
        "Você é o mentor de conhecimento do KnowRa, uma plataforma que transforma curiosidade em aprendizado real. " +
        "Responda com clareza, sem jargão técnico desnecessário, de forma que qualquer pessoa curiosa entenda. " +
        "Ao classificar a área, reaproveite uma área já existente sempre que fizer sentido, em vez de criar uma nova quase igual. " +
        "Você não tem acesso à internet — nunca cite uma URL específica, mesmo que pareça plausível, porque pode não existir. " +
        `Áreas já existentes: ${areasExistentes}.`,
      tools: [RESPONDER_TOOL],
      tool_choice: { type: "tool", name: "responder_e_classificar" },
      messages: [{ role: "user", content: texto }],
    });

    const { input } = extrairToolUse(message.content);
    const { resposta, area_nome, area_slug, requer_verificacao, observacao_verificacao } = input as {
      resposta: string;
      area_nome: string;
      area_slug: string;
      requer_verificacao?: boolean;
      observacao_verificacao?: string;
    };

    return {
      resposta,
      area_nome,
      area_slug,
      requer_verificacao: requer_verificacao ?? false,
      observacao_verificacao: observacao_verificacao ?? null,
    };
  }

  async gerarDesafio(perguntaTexto: string, respostaDada: string): Promise<DesafioIA> {
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
          content: `Pergunta original: ${perguntaTexto}\n\nResposta dada: ${respostaDada}`,
        },
      ],
    });

    const { input } = extrairToolUse(message.content);
    const { enunciado, dificuldade } = input as { enunciado: string; dificuldade: string };
    return { enunciado, dificuldade };
  }

  async avaliar(enunciado: string, respostaUsuario: string): Promise<AvaliacaoIA> {
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
          content: `Desafio: ${enunciado}\n\nResposta do usuário: ${respostaUsuario}`,
        },
      ],
    });

    const { input } = extrairToolUse(message.content);
    const { nota, feedback } = input as { nota: number; feedback: string };
    return { nota, feedback };
  }
}

export const aiProvider: AIProvider = new AnthropicProvider();
