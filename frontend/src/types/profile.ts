export interface Profile {
  id: string;
  nome: string | null;
  avatar_url: string | null;
  role: "user" | "admin";
  nivel_global: number;
  xp_total: number;
  streak_atual: number;
  streak_recorde: number;
  rating: number;
  criado_em: string;
  cidade: string | null;
  pais: string | null;
  idade: number | null;
  genero: string | null;
  dados_demograficos_consentidos_em: string | null;
  nickname: string | null;
  aparecer_no_ranking: boolean;
}
