/**
 * KNOWRA Scout — Etapa Scout.3 (parcial: só sitemap, sem dados.gov.br
 * ainda, sem token). Ver docs/foundation/KNOWRA_SCOUT.md.
 *
 * Roda manualmente (sem cron, projeto não tem essa infraestrutura — mesmo
 * padrão de scripts/gerar_questoes.ts). Busca o sitemap de uma fonte já
 * cadastrada em fontes_externas, compara o hash de conteúdo com o que já
 * está salvo, e SÓ REPORTA a diferença — nunca insere nada em concursos/
 * knowledge_record sozinho. Validator/Curator (checar se é sobre concurso
 * de verdade, classificar, decidir cadastrar) continuam decisão humana
 * nesta etapa, conforme KNOWRA_SCOUT.md §6/§10.
 *
 * Uso:
 *   npx tsx scripts/scout_sitemap.ts --fonte-id=<uuid>
 */
import "dotenv/config";
import { createHash } from "crypto";
import { Client } from "pg";

interface Fonte {
  id: string;
  nome: string;
  url: string;
  content_hash: string | null;
}

interface EntradaSitemap {
  loc: string;
  lastmod: string | null;
}

function parseArgs(): { fonteId: string } {
  const raw = Object.fromEntries(
    process.argv.slice(2).map((arg) => {
      const [chave, ...resto] = arg.replace(/^--/, "").split("=");
      return [chave, resto.join("=")];
    }),
  );
  if (!raw["fonte-id"]) {
    throw new Error("Use --fonte-id=<uuid> (ver tabela fontes_externas).");
  }
  return { fonteId: raw["fonte-id"] };
}

async function buscarXml(url: string): Promise<string> {
  const resp = await fetch(url, {
    headers: { "User-Agent": "KnowRaScout/1.0 (knowra.rhoneyinc.com; sitemap discovery)" },
    signal: AbortSignal.timeout(10000),
  });
  if (!resp.ok) throw new Error(`Sitemap respondeu HTTP ${resp.status}`);
  return resp.text();
}

// Parsing simples via regex — suficiente pra sitemap.xml (formato rígido,
// gerado por ferramenta, não HTML arbitrário). Cobre tanto sitemap-index
// (<sitemap><loc>) quanto urlset (<url><loc>+<lastmod>).
function extrairEntradas(xml: string): EntradaSitemap[] {
  const entradas: EntradaSitemap[] = [];
  const blocos = xml.match(/<(?:url|sitemap)>[\s\S]*?<\/(?:url|sitemap)>/g) ?? [];
  for (const bloco of blocos) {
    const loc = bloco.match(/<loc>(.*?)<\/loc>/)?.[1];
    const lastmod = bloco.match(/<lastmod>(.*?)<\/lastmod>/)?.[1] ?? null;
    if (loc) entradas.push({ loc, lastmod });
  }
  return entradas;
}

async function main() {
  const { fonteId } = parseArgs();
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const { rows } = await client.query<Fonte>(
      "select id, nome, url, content_hash from fontes_externas where id = $1 and access_method = 'sitemap'",
      [fonteId],
    );
    const fonte = rows[0];
    if (!fonte) throw new Error("Fonte não encontrada ou access_method não é 'sitemap'.");

    console.log(`Consultando ${fonte.nome} (${fonte.url})...`);
    const xml = await buscarXml(fonte.url);
    const hashNovo = createHash("sha256").update(xml).digest("hex");
    const mudou = hashNovo !== fonte.content_hash;

    const entradas = extrairEntradas(xml);
    // Mais recente primeiro — sitemap de posts (Cebraspe tem 1000+ desde
    // 2014) só é útil pra descoberta se mostrar o que mudou agora, não o
    // histórico inteiro.
    const ordenadas = [...entradas].sort((a, b) => (b.lastmod ?? "").localeCompare(a.lastmod ?? ""));
    console.log(`${entradas.length} entrada(s) no sitemap. Mudou desde a última consulta: ${mudou}`);

    if (mudou) {
      console.log("\nEntradas mais recentes (revisão humana necessária antes de qualquer cadastro):");
      ordenadas.slice(0, 30).forEach((e) => console.log(`  - ${e.loc}${e.lastmod ? ` (lastmod: ${e.lastmod})` : ""}`));
      if (entradas.length > 30) console.log(`  ... e mais ${entradas.length - 30} (mais antigas, omitidas).`);
    }

    await client.query(
      `update fontes_externas
         set content_hash = $1, ultima_consulta_em = now(),
             ultima_mudanca_em = case when $2 then now() else ultima_mudanca_em end
       where id = $3`,
      [hashNovo, mudou, fonteId],
    );
    console.log("\nfontes_externas atualizada (content_hash/ultima_consulta_em).");
    console.log(
      "Próximo passo, se relevante, é humano/Claude: revisar as entradas novas e decidir se algum concurso precisa ser cadastrado/atualizado via cadastrar_concurso()/atualizar_status_concurso().",
    );
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
