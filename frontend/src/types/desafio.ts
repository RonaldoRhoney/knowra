export interface Desafio {
  id: string;
  pergunta_id: string;
  enunciado: string;
  dificuldade: string;
  criado_em: string;
}

export interface ResultadoAvaliacao {
  xp_ganho: number;
  xp_total: number;
  nivel_anterior: number;
  nivel_novo: number;
  subiu_de_nivel: boolean;
  streak_atual: number;
  badges_novas: string[];
  nota: number;
  feedback: string;
}
