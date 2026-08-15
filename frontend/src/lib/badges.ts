export const BADGES: Record<string, { nome: string; icone: string }> = {
  primeira_curiosidade: { nome: "Primeira Curiosidade", icone: "🌱" },
  mente_curiosa: { nome: "Mente Curiosa", icone: "🧭" },
  sequencia_conhecimento: { nome: "Sequência de Conhecimento", icone: "🔥" },
  incansavel: { nome: "Incansável", icone: "💪" },
  pensamento_critico: { nome: "Pensamento Crítico", icone: "🎯" },
  // Badges de liga (Fase 8) — faltavam aqui, o que as deixaria invisíveis
  // mesmo depois de conquistadas (BadgesVitrine/DesafioCard ignoram código
  // desconhecido silenciosamente).
  liga_bronze: { nome: "Liga Bronze", icone: "🥉" },
  liga_prata: { nome: "Liga Prata", icone: "🥈" },
  liga_ouro: { nome: "Liga Ouro", icone: "🥇" },
  liga_platina: { nome: "Liga Platina", icone: "💠" },
  liga_diamante: { nome: "Liga Diamante", icone: "💎" },
  liga_mestre: { nome: "Liga Mestre", icone: "🏆" },
  liga_lenda: { nome: "Liga Lenda", icone: "👑" },
};

export const BADGE_ICONE_PADRAO = "🏅";
