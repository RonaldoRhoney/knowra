import { useAuth } from "../contexts/AuthContext";

const CONTEUDO: Record<string, { titulo: string; texto: string; emoji: string }> = {
  primeiro_acesso: {
    emoji: "🎉",
    titulo: "Bem-vindo ao KnowRa!",
    texto: "Pergunte qualquer coisa que te deixou curioso — a gente transforma isso em aprendizado de verdade.",
  },
  ausencia_media: {
    emoji: "👋",
    titulo: "Bem-vindo de volta!",
    texto: "Faz um tempinho que você não aparecia por aqui. Que tal retomar sua sequência de curiosidade hoje?",
  },
  ausencia_longa: {
    emoji: "💜",
    titulo: "Sentimos sua falta!",
    texto: "Já faz mais de uma semana desde a sua última visita. Sua jornada de conhecimento continua esperando por você.",
  },
};

export function MensagemAcesso() {
  const { tipoAcesso, limparTipoAcesso } = useAuth();

  if (!tipoAcesso || tipoAcesso === "normal") return null;
  const conteudo = CONTEUDO[tipoAcesso];
  if (!conteudo) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-knowra-surface rounded-2xl p-6 shadow-xl text-center">
        <p className="text-4xl mb-3">{conteudo.emoji}</p>
        <h2 className="text-lg font-bold mb-2">{conteudo.titulo}</h2>
        <p className="text-sm text-knowra-text/60 mb-6">{conteudo.texto}</p>
        <button
          onClick={limparTipoAcesso}
          className="w-full rounded-lg bg-knowra-primary py-2.5 text-sm font-medium"
        >
          Continuar
        </button>
      </div>
    </div>
  );
}
