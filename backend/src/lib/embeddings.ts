/**
 * Geração de embedding local (Xenova/all-MiniLM-L6-v2, 384 dimensões) via
 * @huggingface/transformers — validado em deploy real na Vercel (ver
 * DECISIONS.md 2026-08-15). Duas configurações obrigatórias, sem elas
 * quebra em produção:
 *   - vercel.json exclui os arquivos de GPU do onnxruntime-node (nunca
 *     usados numa função serverless, mas inflam o pacote em ~240MB).
 *   - cacheDir aponta pra /tmp — node_modules é read-only em produção.
 */
import { env } from "@huggingface/transformers";

env.cacheDir = "/tmp/knowra-embeddings-cache";

type Extrator = (texto: string, opts: { pooling: "mean"; normalize: boolean }) => Promise<{ data: Float32Array }>;

let extractorPromise: Promise<Extrator> | null = null;

async function carregarExtractor(): Promise<Extrator> {
  if (!extractorPromise) {
    const { pipeline } = await import("@huggingface/transformers");
    extractorPromise = pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2") as unknown as Promise<Extrator>;
  }
  return extractorPromise;
}

export async function gerarEmbedding(texto: string): Promise<number[]> {
  const extractor = await carregarExtractor();
  const output = await extractor(texto, { pooling: "mean", normalize: true });
  return Array.from(output.data);
}

// pgvector espera o literal "[0.1,0.2,...]" — node-postgres não converte
// array JS pra esse formato sozinho.
export function embeddingParaLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}
