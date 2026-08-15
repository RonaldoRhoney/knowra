export interface Profile {
  id: string;
  nome: string | null;
  avatar_url: string | null;
  role: "user" | "admin";
  nivel_global: number;
  xp_total: number;
  streak_atual: number;
  streak_recorde: number;
  criado_em: string;
  faixa_etaria: string | null;
  genero: string | null;
  dados_demograficos_consentidos_em: string | null;
}
