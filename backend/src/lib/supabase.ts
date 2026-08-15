import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

/**
 * Cliente por requisição, autenticado como o usuário dono do token —
 * nunca a service_role key (decisão registrada em DECISIONS.md): RLS
 * e as RPCs security definer é que garantem o isolamento por usuário.
 */
export function supabaseForUser(accessToken: string) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false },
  });
}
