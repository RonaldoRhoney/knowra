import type { SupabaseClient } from "@supabase/supabase-js";
import { aiProvider } from "../../lib/providers/anthropicProvider.js";
import { verificarLimiteIA } from "../../lib/limiteIA.js";
import { dbAdmin, rpcComoUsuario } from "../../lib/dbAdmin.js";
import { embeddingParaLiteral, gerarEmbedding } from "../../lib/embeddings.js";
import { buscarFonteWikipedia } from "../../lib/wikipedia.js";
import { buscarVideoCC } from "../../lib/youtube.js";

export interface AskResult {
  id: string;
  texto: string;
  resposta_ia: string;
  area_id: string | null;
  requer_verificacao: boolean;
  observacao_verificacao: string | null;
  fonte_url: string | null;
  fonte_titulo: string | null;
  video_url: string | null;
  video_titulo: string | null;
  criado_em: string;
}

interface RespostaEstruturada {
  resposta: string;
  area_nome: string | null;
  area_slug: string | null;
  requer_verificacao: boolean;
  observacao_verificacao: string | null;
  fonte_url: string | null;
  fonte_titulo: string | null;
  video_url: string | null;
  video_titulo: string | null;
}

interface ConhecimentoSemantico {
  id: string;
  answer: string;
  topic: string | null;
  requer_verificacao: boolean;
  fonte_url: string | null;
  fonte_titulo: string | null;
  video_url: string | null;
  video_titulo: string | null;
}

interface ContextoRag {
  answer: string;
}

async function buscarConhecimentoSemantico(texto: string): Promise<ConhecimentoSemantico | undefined> {
  const embedding = await gerarEmbedding(texto);
  const { rows } = await dbAdmin().query<ConhecimentoSemantico>(
    "select * from public.buscar_conhecimento_semantico($1)",
    [embeddingParaLiteral(embedding)],
  );
  return rows[0];
}

// RAG Retrieval Engine (KNOWRA_AI.md §9, Etapa H) — diferente de
// buscarConhecimentoSemantico (que serve UMA resposta pronta direto da
// memória), esta busca TOP-K registros relacionados pra alimentar uma nova
// geração da IA como contexto. Híbrido (vetor + full text), nunca serve
// conteúdo abaixo do piso de confiança (mesma regra do Confidence Engine).
async function buscarContextoRag(texto: string, embedding: number[]): Promise<string[]> {
  const { rows } = await dbAdmin().query<ContextoRag>(
    "select answer from public.buscar_contexto_rag($1, $2)",
    [embeddingParaLiteral(embedding), texto],
  );
  return rows.map((r) => r.answer);
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

  // Embedding calculado uma vez só, reaproveitado pra buscar contexto RAG
  // agora e pra gravar em knowledge_record mais abaixo (evita gerar embedding
  // duas vezes pra mesma pergunta).
  const embedding = await gerarEmbedding(texto);
  const contexto = await buscarContextoRag(texto, embedding);

  const respostaIA = await aiProvider.responder(texto, listaAreas, contexto);

  // Fonte (Wikipedia) e vídeo (YouTube, licença CC) são resultado de busca
  // real, nunca da IA — se a busca não achar nada, ficam null (nunca link
  // inventado). Termos de busca diferentes por motivo testado ao vivo, não
  // suposição: a Wikipedia (opensearch, casamento por título) funciona bem
  // com um termo limpo tipo a área classificada ("Fotossíntese"), mas o
  // YouTube funciona melhor com a pergunta inteira em linguagem natural —
  // usar a área pra vídeo gerou um achado real em produção (pergunta "que
  // dia é hoje?" classificada como área genérica "Informações Gerais"
  // trouxe vídeo aleatório sobre deputados de Minas Gerais, só por
  // coincidência de palavra). Ver DECISIONS.md. Buscas em paralelo, cada
  // uma já protegida contra timeout/erro dentro do próprio cliente — nunca
  // podem derrubar a resposta principal.
  const temaFonte = respostaIA.area_nome ?? texto;
  const [fonte, video] = await Promise.all([buscarFonteWikipedia(temaFonte), buscarVideoCC(texto)]);

  const resultado: RespostaEstruturada = {
    ...respostaIA,
    fonte_url: fonte?.url ?? null,
    fonte_titulo: fonte?.titulo ?? null,
    video_url: video?.url ?? null,
    video_titulo: video?.titulo ?? null,
  };

  // Popula os dois caches pra próxima pergunta (igual ou parecida) não
  // precisar chamar a IA nem a busca de fonte/vídeo de novo. Só o backend
  // grava (funções não expostas a "authenticated"/"anon" via PostgREST —
  // ver DECISIONS.md) pra ninguém envenenar o cache compartilhado com
  // conteúdo que nunca passou pela Anthropic.
  await dbAdmin().query(
    "select public.salvar_resposta_canonica($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
    [
      texto,
      resultado.resposta,
      resultado.area_nome,
      resultado.area_slug,
      resultado.requer_verificacao,
      resultado.observacao_verificacao,
      resultado.fonte_url,
      resultado.fonte_titulo,
      resultado.video_url,
      resultado.video_titulo,
    ],
  );

  await dbAdmin().query(
    "select public.salvar_conhecimento($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)",
    [
      texto,
      texto,
      embeddingParaLiteral(embedding),
      resultado.resposta,
      resultado.area_nome,
      null,
      "anthropic",
      0.95,
      resultado.fonte_url,
      resultado.fonte_titulo,
      resultado.video_url,
      resultado.video_titulo,
      // Knowledge Entity (KNOWRA_AI.md §11, Etapa J): mesma área que
      // registrar_pergunta() vai resolver mais abaixo — upsert_area() no
      // banco garante que os dois caminhos apontam pra mesma linha de
      // `areas`, deduplicando por conceito em vez de texto livre solto.
      resultado.area_slug,
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
      fonte_url: cache.fonte_url ?? null,
      fonte_titulo: cache.fonte_titulo ?? null,
      video_url: cache.video_url ?? null,
      video_titulo: cache.video_titulo ?? null,
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
        // Confidence Engine (KNOWRA_AI.md §8, Etapa D): a função já decide
        // isso no banco (confidence < 0.90 ou status='requer_revalidacao')
        // — aqui só repassa pro mesmo mecanismo de sinalização que já existe
        // desde a Fase 4 (respostas geradas por IA também usam esse campo).
        requer_verificacao: semantico.requer_verificacao,
        observacao_verificacao: semantico.requer_verificacao
          ? "Resposta vinda da memória interna do KnowRa — pode estar desatualizada, considere verificar numa fonte oficial."
          : null,
        fonte_url: semantico.fonte_url ?? null,
        fonte_titulo: semantico.fonte_titulo ?? null,
        video_url: semantico.video_url ?? null,
        video_titulo: semantico.video_titulo ?? null,
      };
    } else {
      resultado = await responderComAnthropic(supabase, texto);
    }
  }

  const {
    resposta,
    area_nome,
    area_slug,
    requer_verificacao,
    observacao_verificacao,
    fonte_url,
    fonte_titulo,
    video_url,
    video_titulo,
  } = resultado;

  // Mesmo motivo: registrar_pergunta() não é mais alcançável via PostgREST
  // por "authenticated"/"anon" — só o backend grava, depois de a resposta
  // ter vindo de verdade da IA (ou do cache) logo acima. 10 parâmetros
  // (versão em uso real — fonte_url/fonte_titulo/video_url/video_titulo
  // existem desde 0032_fonte_video_resposta.sql).
  const pergunta = await rpcComoUsuario<AskResult>(
    usuarioId,
    "select * from public.registrar_pergunta($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
    [
      texto,
      resposta,
      area_nome,
      area_slug,
      requer_verificacao ?? false,
      observacao_verificacao ?? null,
      fonte_url ?? null,
      fonte_titulo ?? null,
      video_url ?? null,
      video_titulo ?? null,
    ],
  );

  if (!pergunta) {
    throw new Error("Não foi possível salvar a pergunta.");
  }

  return pergunta;
}
