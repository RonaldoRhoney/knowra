import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";

const EMOJI: Record<string, string> = {
  primeiro_acesso: "🎉",
  ausencia_media: "👋",
  ausencia_longa: "💜",
};

export function MensagemAcesso() {
  const { t } = useTranslation();
  const { tipoAcesso, limparTipoAcesso } = useAuth();

  if (!tipoAcesso || tipoAcesso === "normal") return null;
  const emoji = EMOJI[tipoAcesso];
  if (!emoji) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-knowra-surface rounded-2xl p-6 shadow-xl text-center">
        <p className="text-4xl mb-3">{emoji}</p>
        <h2 className="text-lg font-bold mb-2">{t(`mensagemAcesso.${tipoAcesso}.titulo`)}</h2>
        <p className="text-sm text-knowra-text/60 mb-6">{t(`mensagemAcesso.${tipoAcesso}.texto`)}</p>
        <button
          onClick={limparTipoAcesso}
          className="w-full rounded-lg bg-knowra-primary py-2.5 text-sm font-medium"
        >
          {t("common.continuar")}
        </button>
      </div>
    </div>
  );
}
