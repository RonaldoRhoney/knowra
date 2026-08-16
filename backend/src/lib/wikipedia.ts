/**
 * Busca de fonte real via Wikipedia em português — API pública, sem chave,
 * sem custo. Nunca retorna link inventado: se a busca não achar artigo
 * correspondente, devolve null (ver DECISIONS.md, "Fonte, vídeo e leitura
 * em voz alta").
 */
export interface FonteWikipedia {
  url: string;
  titulo: string;
}

const OPENSEARCH_URL = "https://pt.wikipedia.org/w/api.php";

export async function buscarFonteWikipedia(tema: string): Promise<FonteWikipedia | null> {
  if (!tema?.trim()) return null;

  const params = new URLSearchParams({
    action: "opensearch",
    search: tema,
    limit: "1",
    namespace: "0",
    format: "json",
  });

  try {
    const resp = await fetch(`${OPENSEARCH_URL}?${params}`, {
      headers: { "User-Agent": "KnowRa/1.0 (knowra.rhoneyinc.com)" },
      signal: AbortSignal.timeout(4000),
    });
    if (!resp.ok) return null;

    const data = (await resp.json()) as [string, string[], string[], string[]];
    const [, titulos, , urls] = data;
    if (!titulos?.[0] || !urls?.[0]) return null;

    return { url: urls[0], titulo: titulos[0] };
  } catch {
    // Timeout, rede fora, etc. — fonte é um complemento, nunca pode
    // derrubar a resposta principal da pergunta.
    return null;
  }
}
