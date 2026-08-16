import { supabase } from "./supabaseClient";
import type { Desafio, ResultadoAvaliacao } from "../types/desafio";

const API_URL = import.meta.env.VITE_API_URL;

export interface AskResponse {
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

async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) throw new Error("Sessão expirada. Faça login novamente.");

  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Algo deu errado. Tente novamente.");
  return data as T;
}

export function askQuestion(texto: string): Promise<AskResponse> {
  return apiPost<AskResponse>("/api/ask", { texto });
}

export function gerarDesafio(perguntaId: string): Promise<Desafio> {
  return apiPost<Desafio>(`/api/perguntas/${perguntaId}/desafio`);
}

export function avaliarDesafio(desafioId: string, resposta: string): Promise<ResultadoAvaliacao> {
  return apiPost<ResultadoAvaliacao>(`/api/desafios/${desafioId}/avaliar`, { resposta });
}

export type TipoAcesso = "primeiro_acesso" | "ausencia_longa" | "ausencia_media" | "normal" | null;

export function registrarSessao(): Promise<{ ok: boolean; tipo: TipoAcesso }> {
  return apiPost<{ ok: boolean; tipo: TipoAcesso }>("/api/sessao");
}

export function criarAssinatura(): Promise<{ checkout_url: string }> {
  return apiPost<{ checkout_url: string }>("/api/assinatura/criar");
}
