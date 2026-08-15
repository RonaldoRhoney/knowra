/**
 * KnowRa — Fase 7b: geração de questões em lote (offline, fora do runtime)
 *
 * Roda manualmente pelo desenvolvedor/admin, NUNCA como parte da API deployada
 * (não é uma rota Express, não roda no Vercel). Conecta direto no Postgres via
 * DATABASE_URL — mesma credencial já usada nas migrations, nunca uma chave
 * service_role do Supabase (decisão registrada em DECISIONS.md: "não existe
 * service_role key em nenhum .env do projeto" — este script não muda isso).
 *
 * Toda questão nasce com review_status = 'pending_review' — nada é publicado
 * automaticamente. Publicação é manual via RPC revisar_questao() (admin-only).
 *
 * Uso:
 *   npx tsx scripts/gerar_questoes.ts --area-slug=tecnologia --quantidade=5 --dificuldade=normal
 *   npx tsx scripts/gerar_questoes.ts --area-slug=direito --quantidade=10 \
 *     --concurso-nome="Concurso Exemplo" --concurso-orgao="Órgão X" --concurso-banca="Banca Y" --concurso-ano=2026
 *
 * Sem --concurso-nome, as questões nascem "genéricas" (concurso_id = null) —
 * pra pré-visualização de disciplina antes de decidir a que concurso amarrar.
 */
import "dotenv/config";
import { Client } from "pg";
import { anthropic } from "../src/lib/anthropic.js";

// Geração de conteúdo reutilizado por muitos usuários vale um modelo mais
// forte que o usado no runtime do Knowledge Mode (Haiku) — custo pago uma vez,
// qualidade herdada por toda tentativa futura. Ver DECISIONS.md.
const MODEL_GERACAO = "claude-opus-5";
const PROMPT_VERSION = "v1";

interface Args {
  areaSlug: string;
  quantidade: number;
  dificuldade: string;
  concursoNome?: string;
  concursoOrgao?: string;
  concursoBanca?: string;
  concursoAno?: number;
  concursoCargo?: string;
}

function parseArgs(): Args {
  const raw = Object.fromEntries(
    process.argv.slice(2).map((arg) => {
      const [chave, ...resto] = arg.replace(/^--/, "").split("=");
      return [chave, resto.join("=")];
    }),
  );

  if (!raw["area-slug"]) {
    throw new Error("Use --area-slug=<slug> (ver tabela areas).");
  }

  return {
    areaSlug: raw["area-slug"],
    quantidade: raw["quantidade"] ? Number(raw["quantidade"]) : 5,
    dificuldade: raw["dificuldade"] ?? "normal",
    concursoNome: raw["concurso-nome"],
    concursoOrgao: raw["concurso-orgao"],
    concursoBanca: raw["concurso-banca"],
    concursoAno: raw["concurso-ano"] ? Number(raw["concurso-ano"]) : undefined,
    concursoCargo: raw["concurso-cargo"],
  };
}

const GERAR_QUESTOES_TOOL = {
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
            enunciado: { type: "string", description: "Enunciado claro e autocontido da questão." },
            alternativas: {
              type: "array",
              description: "Exatamente 4 alternativas, letras A a D.",
              items: {
                type: "object",
                properties: {
                  letra: { type: "string", enum: ["A", "B", "C", "D"] },
                  texto: { type: "string" },
                },
                required: ["letra", "texto"],
              },
            },
            gabarito: { type: "string", enum: ["A", "B", "C", "D"], description: "Letra da alternativa correta." },
            explicacao: {
              type: "string",
              description: "Por que a alternativa correta está certa e, quando útil, por que as outras estão erradas.",
            },
          },
          required: ["enunciado", "alternativas", "gabarito", "explicacao"],
        },
      },
    },
    required: ["questoes"],
  },
};

interface QuestaoGerada {
  enunciado: string;
  alternativas: { letra: string; texto: string }[];
  gabarito: string;
  explicacao: string;
}

async function gerarQuestoes(areaNome: string, quantidade: number, dificuldade: string): Promise<QuestaoGerada[]> {
  const message = await anthropic.messages.create({
    model: MODEL_GERACAO,
    max_tokens: Math.max(2000, quantidade * 500),
    system:
      "Você é o gerador de banco de questões do KnowRa, um app de aprendizado gamificado. Gere questões de múltipla " +
      "escolha ORIGINAIS (nunca copiadas de prova real), tecnicamente corretas, com exatamente 4 alternativas plausíveis " +
      "(nada de opções obviamente absurdas) e uma explicação didática do gabarito. Nunca atribua a questão a uma banca " +
      "ou concurso real específico no próprio texto — isso é metadado do sistema, não do enunciado.",
    tools: [GERAR_QUESTOES_TOOL],
    tool_choice: { type: "tool", name: "gerar_questoes" },
    messages: [
      {
        role: "user",
        content:
          `Gere ${quantidade} questões de múltipla escolha sobre "${areaNome}", dificuldade "${dificuldade}". ` +
          "Varie o subtema dentro da área — não repita o mesmo ponto em questões diferentes.",
      },
    ],
  });

  const toolUse = message.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("A IA não retornou questões estruturadas.");
  }

  const { questoes } = toolUse.input as { questoes: QuestaoGerada[] };
  for (const q of questoes) {
    if (q.alternativas.length !== 4 || !["A", "B", "C", "D"].includes(q.gabarito)) {
      throw new Error(`Questão gerada fora do formato esperado: ${JSON.stringify(q).slice(0, 200)}`);
    }
  }
  return questoes;
}

async function main() {
  const args = parseArgs();
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const { rows: areaRows } = await client.query("select id, nome from areas where slug = $1", [args.areaSlug]);
    if (areaRows.length === 0) {
      throw new Error(`Área com slug "${args.areaSlug}" não encontrada.`);
    }
    const area = areaRows[0];

    let concursoId: string | null = null;
    if (args.concursoNome) {
      const { rows: existente } = await client.query("select id from concursos where nome = $1", [args.concursoNome]);
      if (existente.length > 0) {
        concursoId = existente[0].id;
      } else {
        const { rows: novo } = await client.query(
          "insert into concursos (nome, orgao, banca, ano, cargo) values ($1, $2, $3, $4, $5) returning id",
          [args.concursoNome, args.concursoOrgao ?? null, args.concursoBanca ?? null, args.concursoAno ?? null, args.concursoCargo ?? null],
        );
        concursoId = novo[0].id;
        console.log(`Concurso criado: ${args.concursoNome} (${concursoId})`);
      }
    }

    console.log(`Gerando ${args.quantidade} questões de "${area.nome}" (dificuldade: ${args.dificuldade})...`);
    const questoes = await gerarQuestoes(area.nome, args.quantidade, args.dificuldade);

    const idsInseridos: string[] = [];
    for (const q of questoes) {
      const { rows } = await client.query(
        `insert into questoes
          (concurso_id, area_id, enunciado, alternativas, gabarito, explicacao, dificuldade,
           origem, generation_model, prompt_version, generated_at, review_status)
         values ($1, $2, $3, $4, $5, $6, $7, 'ia_knowra', $8, $9, now(), 'pending_review')
         returning id`,
        [
          concursoId,
          area.id,
          q.enunciado,
          JSON.stringify(q.alternativas),
          q.gabarito,
          q.explicacao,
          args.dificuldade,
          MODEL_GERACAO,
          PROMPT_VERSION,
        ],
      );
      idsInseridos.push(rows[0].id);
    }

    console.log(`${idsInseridos.length} questões inseridas como 'pending_review':`);
    idsInseridos.forEach((id) => console.log(`  - ${id}`));
    console.log(
      "\nRevise o conteúdo (select enunciado, alternativas, gabarito, explicacao from questoes where id = '<id>';) " +
        "e publique via revisar_questao() autenticado como admin — no psql, simule a sessão do admin antes de chamar:\n" +
        "  set local role authenticated;\n" +
        "  set local request.jwt.claim.sub = '<uuid do rhoneyinc@gmail.com>';\n" +
        "  select revisar_questao('<id>', 'published');",
    );
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
