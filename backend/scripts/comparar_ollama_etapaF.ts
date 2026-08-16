/**
 * KnowRa — KNOWRA_AI Etapa F: avaliação de Ollama offline (experimento, não produção)
 *
 * Gera o mesmo lote de questões com Anthropic (Opus, o que gerar_questoes.ts usa hoje)
 * e com Ollama local (llama3.1:8b), lado a lado, SEM gravar nada no banco. Só imprime
 * pra comparação manual de qualidade — ver DECISIONS.md/KNOWRA_AI.md §9 Etapa F.
 *
 * Pré-requisito: `ollama serve` rodando localmente e `ollama pull llama3.1` já feito.
 *
 * Uso:
 *   npx tsx scripts/comparar_ollama_etapaF.ts --area-nome="Tecnologia" --quantidade=3 --dificuldade=normal
 */
import "dotenv/config";
import { anthropic } from "../src/lib/anthropic.js";

const MODEL_ANTHROPIC = "claude-opus-5";
const MODEL_OLLAMA = "llama3.1:8b";
const OLLAMA_URL = "http://localhost:11434/api/chat";

const SYSTEM_PROMPT =
  "Você é o gerador de banco de questões do KnowRa, um app de aprendizado gamificado. Gere questões de múltipla " +
  "escolha ORIGINAIS (nunca copiadas de prova real), tecnicamente corretas, com exatamente 4 alternativas plausíveis " +
  "(nada de opções obviamente absurdas) e uma explicação didática do gabarito. Nunca atribua a questão a uma banca " +
  "ou concurso real específico no próprio texto — isso é metadado do sistema, não do enunciado.";

interface QuestaoGerada {
  enunciado: string;
  alternativas: { letra: string; texto: string }[];
  gabarito: string;
  explicacao: string;
}

interface Args {
  areaNome: string;
  quantidade: number;
  dificuldade: string;
}

function parseArgs(): Args {
  const raw = Object.fromEntries(
    process.argv.slice(2).map((arg) => {
      const [chave, ...resto] = arg.replace(/^--/, "").split("=");
      return [chave, resto.join("=")];
    }),
  );
  if (!raw["area-nome"]) {
    throw new Error("Use --area-nome=<nome> (ex: Tecnologia).");
  }
  return {
    areaNome: raw["area-nome"],
    quantidade: raw["quantidade"] ? Number(raw["quantidade"]) : 3,
    dificuldade: raw["dificuldade"] ?? "normal",
  };
}

function userPrompt(areaNome: string, quantidade: number, dificuldade: string) {
  return (
    `Gere ${quantidade} questões de múltipla escolha sobre "${areaNome}", dificuldade "${dificuldade}". ` +
    "Varie o subtema dentro da área — não repita o mesmo ponto em questões diferentes."
  );
}

function validarQuestoes(questoes: QuestaoGerada[]) {
  for (const q of questoes) {
    if (!q.alternativas || q.alternativas.length !== 4 || !["A", "B", "C", "D"].includes(q.gabarito)) {
      throw new Error(`Questão fora do formato esperado: ${JSON.stringify(q).slice(0, 200)}`);
    }
  }
}

const ANTHROPIC_TOOL = {
  name: "gerar_questoes",
  description: "Gera um lote de questões de múltipla escolha originais, com gabarito e explicação didática.",
  input_schema: {
    type: "object" as const,
    properties: {
      questoes: {
        type: "array",
        items: {
          type: "object",
          properties: {
            enunciado: { type: "string" },
            alternativas: {
              type: "array",
              items: {
                type: "object",
                properties: { letra: { type: "string", enum: ["A", "B", "C", "D"] }, texto: { type: "string" } },
                required: ["letra", "texto"],
              },
            },
            gabarito: { type: "string", enum: ["A", "B", "C", "D"] },
            explicacao: { type: "string" },
          },
          required: ["enunciado", "alternativas", "gabarito", "explicacao"],
        },
      },
    },
    required: ["questoes"],
  },
};

async function gerarAnthropic(areaNome: string, quantidade: number, dificuldade: string) {
  const inicio = Date.now();
  const message = await anthropic.messages.create({
    model: MODEL_ANTHROPIC,
    max_tokens: Math.max(2000, quantidade * 500),
    system: SYSTEM_PROMPT,
    tools: [ANTHROPIC_TOOL],
    tool_choice: { type: "tool", name: "gerar_questoes" },
    messages: [{ role: "user", content: userPrompt(areaNome, quantidade, dificuldade) }],
  });
  const ms = Date.now() - inicio;

  const toolUse = message.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") throw new Error("Anthropic não retornou tool_use.");
  const { questoes } = toolUse.input as { questoes: QuestaoGerada[] };
  validarQuestoes(questoes);
  return { questoes, ms };
}

// Ollama expõe API compatível com function calling no formato OpenAI (/api/chat, campo "tools").
const OLLAMA_TOOL = {
  type: "function",
  function: {
    name: "gerar_questoes",
    description: "Gera um lote de questões de múltipla escolha originais, com gabarito e explicação didática.",
    parameters: ANTHROPIC_TOOL.input_schema,
  },
};

async function gerarOllama(areaNome: string, quantidade: number, dificuldade: string) {
  const inicio = Date.now();
  const resp = await fetch(OLLAMA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL_OLLAMA,
      stream: false,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt(areaNome, quantidade, dificuldade) },
      ],
      tools: [OLLAMA_TOOL],
    }),
  });
  const ms = Date.now() - inicio;

  if (!resp.ok) {
    throw new Error(`Ollama respondeu ${resp.status}: ${await resp.text()}`);
  }
  const data = (await resp.json()) as {
    message?: { tool_calls?: { function: { name: string; arguments: unknown } }[]; content?: string };
  };

  const toolCall = data.message?.tool_calls?.[0];
  if (!toolCall) {
    throw new Error(
      `Ollama não retornou tool_call estruturado. Conteúdo bruto: ${(data.message?.content ?? "").slice(0, 300)}`,
    );
  }
  const args =
    typeof toolCall.function.arguments === "string"
      ? JSON.parse(toolCall.function.arguments)
      : toolCall.function.arguments;
  const { questoes } = args as { questoes: QuestaoGerada[] };
  validarQuestoes(questoes);
  return { questoes, ms };
}

function imprimirQuestoes(label: string, questoes: QuestaoGerada[], ms: number) {
  console.log(`\n=== ${label} (${ms}ms) ===`);
  questoes.forEach((q, i) => {
    console.log(`\n${i + 1}. ${q.enunciado}`);
    q.alternativas.forEach((a) => console.log(`   ${a.letra}) ${a.texto}${a.letra === q.gabarito ? "  ← gabarito" : ""}`));
    console.log(`   Explicação: ${q.explicacao}`);
  });
}

async function main() {
  const args = parseArgs();
  console.log(`Comparando Anthropic (${MODEL_ANTHROPIC}) x Ollama (${MODEL_OLLAMA}) — "${args.areaNome}", ${args.quantidade} questões, dificuldade ${args.dificuldade}. Nada será gravado no banco.`);

  const resultados: { label: string; ok: boolean; erro?: string }[] = [];

  try {
    const { questoes, ms } = await gerarAnthropic(args.areaNome, args.quantidade, args.dificuldade);
    imprimirQuestoes("ANTHROPIC (Opus)", questoes, ms);
    resultados.push({ label: "Anthropic", ok: true });
  } catch (err) {
    console.error(`\n=== ANTHROPIC falhou ===\n${err instanceof Error ? err.message : err}`);
    resultados.push({ label: "Anthropic", ok: false, erro: String(err) });
  }

  try {
    const { questoes, ms } = await gerarOllama(args.areaNome, args.quantidade, args.dificuldade);
    imprimirQuestoes(`OLLAMA (${MODEL_OLLAMA})`, questoes, ms);
    resultados.push({ label: "Ollama", ok: true });
  } catch (err) {
    console.error(`\n=== OLLAMA falhou ===\n${err instanceof Error ? err.message : err}`);
    resultados.push({ label: "Ollama", ok: false, erro: String(err) });
  }

  console.log("\n=== Resumo ===");
  resultados.forEach((r) => console.log(`${r.label}: ${r.ok ? "OK" : "FALHOU"}`));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
