import { useState } from "react";
import { useTranslation } from "react-i18next";
import { IDIOMAS } from "../i18n";

/**
 * Bandeira do idioma atual + dropdown pra trocar. Sem biblioteca de ícone —
 * emoji de bandeira já cobre os 3 idiomas sem asset novo (custo zero).
 */
export function SeletorIdioma() {
  const { i18n } = useTranslation();
  const [aberto, setAberto] = useState(false);
  const atual = IDIOMAS.find((i) => i.codigo === i18n.language) ?? IDIOMAS[0];

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-label={atual.nome}
        aria-expanded={aberto}
        className="w-8 h-8 grid place-items-center rounded-full text-base hover:bg-white/5 transition-colors"
      >
        <span aria-hidden>{atual.bandeira}</span>
      </button>

      {aberto && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setAberto(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 bg-knowra-surface border border-knowra-border rounded-xl py-1 min-w-[9rem] shadow-lg">
            {IDIOMAS.map((idioma) => (
              <button
                key={idioma.codigo}
                type="button"
                onClick={() => {
                  i18n.changeLanguage(idioma.codigo);
                  setAberto(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-white/5 transition-colors ${
                  idioma.codigo === atual.codigo ? "text-knowra-text font-medium" : "text-knowra-text-secondary"
                }`}
              >
                <span aria-hidden>{idioma.bandeira}</span>
                {idioma.nome}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
