/**
 * Busca de vídeo relacionado via YouTube Data API v3, filtrado por licença
 * Creative Commons (reuso liberado) — ver DECISIONS.md, "Fonte, vídeo e
 * leitura em voz alta". Gratuita até 10000 unidades/dia (~100 buscas).
 *
 * Sem YOUTUBE_API_KEY configurada, no-op silencioso (retorna null) — não
 * bloqueia a implementação do resto da feature enquanto a chave não existe.
 */
export interface VideoYoutube {
  url: string;
  titulo: string;
}

const SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";

export async function buscarVideoCC(tema: string): Promise<VideoYoutube | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey || !tema?.trim()) return null;

  const params = new URLSearchParams({
    part: "snippet",
    q: tema,
    type: "video",
    videoLicense: "creativeCommon",
    maxResults: "1",
    relevanceLanguage: "pt",
    safeSearch: "strict",
    key: apiKey,
  });

  try {
    const resp = await fetch(`${SEARCH_URL}?${params}`, { signal: AbortSignal.timeout(4000) });
    if (!resp.ok) return null;

    const data = (await resp.json()) as { items?: { id?: { videoId?: string }; snippet?: { title?: string } }[] };
    const item = data.items?.[0];
    const videoId = item?.id?.videoId;
    if (!videoId) return null;

    return { url: `https://www.youtube.com/watch?v=${videoId}`, titulo: item?.snippet?.title ?? tema };
  } catch {
    // Timeout, quota estourada, rede fora — vídeo é um complemento, nunca
    // pode derrubar a resposta principal da pergunta.
    return null;
  }
}
