import { supabase } from "./supabaseClient";

export interface Nivel {
  nivel: number;
  titulo: string;
  xp_necessario: number;
}

let cache: Nivel[] | null = null;

export async function getNiveis(): Promise<Nivel[]> {
  if (cache) return cache;
  const { data } = await supabase.from("niveis").select("*").order("nivel");
  cache = (data ?? []) as Nivel[];
  return cache;
}
