import { supabase } from "./supabaseClient";

const API_URL = import.meta.env.VITE_API_URL;

export interface AskResponse {
  id: string;
  texto: string;
  resposta_ia: string;
  area_id: string | null;
  criado_em: string;
}

export async function askQuestion(texto: string): Promise<AskResponse> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) throw new Error("Sessão expirada. Faça login novamente.");

  const res = await fetch(`${API_URL}/api/ask`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ texto }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Não foi possível processar sua pergunta agora.");
  return data as AskResponse;
}
