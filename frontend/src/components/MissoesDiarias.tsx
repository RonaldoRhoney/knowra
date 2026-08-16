import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../lib/supabaseClient";

interface Missoes {
  pergunta_hoje: boolean;
  desafio_hoje: boolean;
  area_nova_hoje: boolean;
}

const DEFINICOES = [
  { chave: "pergunta_hoje" as const, icone: "❓" },
  { chave: "desafio_hoje" as const, icone: "🎯" },
  { chave: "area_nova_hoje" as const, icone: "🧭" },
];

export function MissoesDiarias({ atualizarQuando }: { atualizarQuando: number }) {
  const { t } = useTranslation();
  const [missoes, setMissoes] = useState<Missoes | null>(null);

  useEffect(() => {
    supabase.rpc("missoes_hoje").then(({ data }) => {
      if (data) setMissoes(data as Missoes);
    });
  }, [atualizarQuando]);

  if (!missoes) return null;

  return (
    <div className="bg-knowra-surface rounded-hero p-5 mt-4">
      <p className="text-sm font-semibold text-knowra-text-secondary mb-3">{t("missoes.titulo")}</p>
      <div className="space-y-2">
        {DEFINICOES.map((m) => {
          const concluida = missoes[m.chave];
          return (
            <div
              key={m.chave}
              className={`flex items-center gap-3 rounded-xl p-3 border transition-colors ${
                concluida ? "bg-knowra-success/10 border-knowra-success/25" : "bg-knowra-bg border-knowra-border"
              }`}
            >
              <span
                className={`w-6 h-6 rounded-full grid place-items-center text-xs shrink-0 ${
                  concluida
                    ? "bg-knowra-success text-white"
                    : "border border-knowra-border text-knowra-text-terciario"
                }`}
                aria-hidden
              >
                {concluida ? "✓" : m.icone}
              </span>
              <span className={`text-sm flex-1 ${concluida ? "text-knowra-text" : "text-knowra-text-secondary"}`}>
                {t(`missoes.${m.chave}`)}
              </span>
              {concluida && (
                <span className="text-xs text-knowra-success font-medium shrink-0">{t("missoes.concluida")}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
