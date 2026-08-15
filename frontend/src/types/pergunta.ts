export interface Pergunta {
  id: string;
  texto: string;
  resposta_ia: string | null;
  criado_em: string;
  areas: { nome: string } | null;
  requer_verificacao: boolean;
  observacao_verificacao: string | null;
}
