/**
 * Provider Abstraction do AI Engine — ver AI_ENGINE.md §Provider Abstraction
 * e KNOWRA_AI.md Etapa C. Os três serviços de IA do Core Loop (responder,
 * gerar desafio, avaliar) passam a depender só desta interface, nunca da
 * Anthropic diretamente — trocar/adicionar provedor no futuro (Ollama,
 * outro) vira trocar o adapter aqui, sem tocar em askQuestion.ts/
 * gerarDesafio.ts/avaliarDesafio.ts de novo.
 *
 * Hoje só existe um adapter (AnthropicProvider) — não introduz nenhuma
 * lógica de seleção/roteamento por enquanto (over-engineering pro estágio
 * atual, mesmo princípio já registrado em AI_ENGINE.md).
 */

export interface RespostaIA {
  resposta: string;
  area_nome: string;
  area_slug: string;
  requer_verificacao: boolean;
  observacao_verificacao: string | null;
}

export interface DesafioIA {
  enunciado: string;
  dificuldade: string;
}

export interface AvaliacaoIA {
  nota: number;
  feedback: string;
}

export interface AIProvider {
  responder(texto: string, areasExistentes: string): Promise<RespostaIA>;
  gerarDesafio(perguntaTexto: string, respostaDada: string): Promise<DesafioIA>;
  avaliar(enunciado: string, respostaUsuario: string): Promise<AvaliacaoIA>;
}
