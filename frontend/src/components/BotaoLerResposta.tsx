import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const IDIOMA_FALA: Record<string, string> = { pt: "pt-BR", en: "en-US", es: "es-ES" };

/**
 * Leitura em voz alta via Web Speech API do navegador (speechSynthesis) —
 * sem chamada de servidor, sem custo, sem API key (KNOWRA_AI/DECISIONS.md,
 * "Fonte, vídeo e leitura em voz alta"). Se o navegador não suportar,
 * o botão simplesmente não aparece — nunca quebra o resto da tela.
 */
export function BotaoLerResposta({ texto }: { texto: string }) {
  const { i18n, t } = useTranslation();
  const [falando, setFalando] = useState(false);
  const suportado = typeof window !== "undefined" && "speechSynthesis" in window;

  useEffect(() => {
    return () => {
      if (suportado) window.speechSynthesis.cancel();
    };
  }, [suportado]);

  if (!suportado) return null;

  function alternar() {
    if (falando) {
      window.speechSynthesis.cancel();
      setFalando(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(texto);
    utterance.lang = IDIOMA_FALA[i18n.language] ?? "pt-BR";
    utterance.onend = () => setFalando(false);
    utterance.onerror = () => setFalando(false);

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setFalando(true);
  }

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={falando ? t("home.pararLeitura") : t("home.ouvirResposta")}
      className="inline-flex items-center gap-1.5 text-xs text-knowra-text-secondary hover:text-knowra-text transition-colors shrink-0"
    >
      <span aria-hidden>{falando ? "⏹" : "🔊"}</span>
      {falando ? t("home.pararLeitura") : t("home.ouvirResposta")}
    </button>
  );
}
