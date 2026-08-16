import type { SupabaseClient } from "@supabase/supabase-js";
import { anthropic, MODEL } from "../../lib/anthropic.js";
import { verificarLimiteIA } from "../../lib/limiteIA.js";
import { dbAdmin, rpcComoUsuario } from "../../lib/dbAdmin.js";
import { embeddingParaLiteral, gerarEmbedding } from "../../lib/embeddings.js";

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

export interface AskResult {
  id: string;
  texto: string;
  resposta_ia: string;
  area_id: string | null;
  requer_verificacao: boolean;
  observacao_verificacao: string | null;
  criado_em: string;
}

interface RespostaEstruturada {
  resposta: string;
  area_nome: string | null;
  area_slug: string | null;
  requer_verificacao: boolean;
  observacao_verificacao: string | null;
}

interface ConhecimentoSemantico {
  id: string;
  answer: string;
  topic: string | null;
}

async function buscarConhecimentoSemantico(texto: string): Promise<ConhecimentoSemantico | undefined> {
  const embedding = await gerarEmbedding(texto);
  const { rows } = await dbAdmin().query<ConhecimentoSemantico>(
    "select * from public.buscar_conhecimento_semantico($1)",
    [embeddingParaLiteral(embedding)],
  );
  return rows[0];
}

async function responderComAnthropic(supabase: SupabaseClient, texto: string): Promise<RespostaEstruturada> {
  // Cache exato e semântico deram miss: chamada real de IA — conta contra
  // o limite diário do usuário.
  await verificarLimiteIA(supabase);

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
      "Você não tem acesso à internet — nunca cite uma URL específica, mesmo que pareça plausível, porque pode não existir. " +
      `Áreas já existentes: ${listaAreas}.`,
    tools: [RESPONDER_TOOL],
    tool_choice: { type: "tool", name: "responder_e_classificar" },
    messages: [{ role: "user", content: texto }],
  });

  const toolUse = message.content.find((block: { type: string }) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("A IA não retornou uma resposta estruturada.");
  }

  const { resposta, area_nome, area_slug, requer_verificacao, observacao_verificacao } = toolUse.input as {
    resposta: string;
    area_nome: string;
    area_slug: string;
    requer_verificacao?: boolean;
    observacao_verificacao?: string;
  };

  const resultado: RespostaEstruturada = {
    resposta,
    area_nome,
    area_slug,
    requer_verificacao: requer_verificacao ?? false,
    observacao_verificacao: observacao_verificacao ?? null,
  };

  // Popula os dois caches pra próxima pergunta (igual ou parecida) não
  // precisar chamar a IA de novo. Só o backend grava (funções não expostas
  // a "authenticated"/"anon" via PostgREST — ver DECISIONS.md) pra ninguém
  // envenenar o cache compartilhado com conteúdo que nunca passou pela
  // Anthropic.
  await dbAdmin().query("select public.salvar_resposta_canonica($1, $2, $3, $4, $5, $6)", [
    texto,
    resultado.resposta,
    resultado.area_nome,
    resultado.area_slug,
    resultado.requer_verificacao,
    resultado.observacao_verificacao,
  ]);

  const embedding = await gerarEmbedding(texto);
  await dbAdmin().query(
    "select public.salvar_conhecimento($1, $2, $3, $4, $5, $6, $7, $8)",
    [
      texto,
      texto,
      embeddingParaLiteral(embedding),
      resultado.resposta,
      resultado.area_nome,
      null,
      "anthropic",
      0.95,
    ],
  );

  return resultado;
}

export async function askQuestion(supabase: SupabaseClient, texto: string, usuarioId: string): Promise<AskResult> {
  // Cache de respostas canônicas: pergunta com o mesmo texto normalizado
  // (acento/caixa/pontuação/espaço) reaproveita a resposta já gerada, sem
  // nova chamada à Anthropic. Ver DECISIONS.md — prioridade #1 de custo.
  const { data: cacheRows } = await supabase.rpc("buscar_resposta_canonica", { p_pergunta: texto });
  const cache = cacheRows?.[0];

  let resultado: RespostaEstruturada;

  if (cache?.encontrado) {
    resultado = {
      resposta: cache.resposta_ia,
      area_nome: cache.area_nome,
      area_slug: cache.area_slug,
      requer_verificacao: cache.requer_verificacao ?? false,
      observacao_verificacao: cache.observacao_verificacao,
    };
  } else {
    // Cache exato deu miss — antes de chamar a IA, tenta o cache semântico
    // (Knowledge Memory, KNOWRA_AI.md Etapa B): pergunta com o mesmo
    // SENTIDO mas fraseado diferente ("o que é fotossíntese" vs. "explica
    // fotossíntese pra mim") pode bater aqui mesmo sem bater no cache exato.
    // Limiar conservador (0.90, default da função) — só usa a memória
    // quando a correspondência é muito forte.
    const semantico = await buscarConhecimentoSemantico(texto);

    if (semantico) {
      await dbAdmin().query("select public.registrar_uso_conhecimento($1)", [semantico.id]);
      resultado = {
        resposta: semantico.answer,
        area_nome: semantico.topic,
        area_slug: semantico.topic,
        requer_verificacao: false,
        observacao_verificacao: null,
      };
    } else {
      resultado = await responderComAnthropic(supabase, texto);
    }
  }

  const { resposta, area_nome, area_slug, requer_verificacao, observacao_verificacao } = resultado;

  // Mesmo motivo: registrar_pergunta() não é mais alcançável via PostgREST
  // por "authenticated"/"anon" — só o backend grava, depois de a resposta
  // ter vindo de verdade da IA (ou do cache) logo acima. 6 parâmetros
  // (versão em uso real — requer_verificacao/observacao_verificacao
  // existem desde 0014_verificacao_resposta.sql).
  const pergunta = await rpcComoUsuario<AskResult>(
    usuarioId,
    "select * from public.registrar_pergunta($1, $2, $3, $4, $5, $6)",
    [texto, resposta, area_nome, area_slug, requer_verificacao ?? false, observacao_verificacao ?? null],
  );

  if (!pergunta) {
    throw new Error("Não foi possível salvar a pergunta.");
  }

  return pergunta;
}
