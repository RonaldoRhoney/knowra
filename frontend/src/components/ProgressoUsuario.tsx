import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getNiveis, type Nivel } from "../lib/niveis";
import type { Profile } from "../types/profile";

export function ProgressoUsuario({ profile }: { profile: Profile }) {
  const { t } = useTranslation();
  const [niveis, setNiveis] = useState<Nivel[]>([]);

  useEffect(() => {
    getNiveis().then(setNiveis);
  }, []);

  const atual = niveis.find((n) => n.nivel === profile.nivel_global);
  const proximo = niveis.find((n) => n.nivel === profile.nivel_global + 1);

  const xpBase = atual?.xp_necessario ?? 0;
  const xpAlvo = proximo?.xp_necessario ?? xpBase;
  const progresso = proximo
    ? Math.min(100, Math.max(0, ((profile.xp_total - xpBase) / (xpAlvo - xpBase)) * 100))
    : 100;

  const raio = 30;
  const circunferencia = 2 * Math.PI * raio;
  const arco = (progresso / 100) * circunferencia;

  return (
    <div className="bg-knowra-surface rounded-hero p-5">
      <div className="flex items-center gap-4">
        <div className="relative w-20 h-20 shrink-0">
          <svg viewBox="0 0 72 72" className="w-20 h-20 -rotate-90">
            <circle cx="36" cy="36" r={raio} fill="none" stroke="#2A3042" strokeWidth="6" />
            <circle
              cx="36"
              cy="36"
              r={raio}
              fill="none"
              stroke="url(#anel-nivel)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${arco} ${circunferencia}`}
              className="transition-all duration-700 ease-out"
            />
            <defs>
              <linearGradient id="anel-nivel" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#7C3AED" />
                <stop offset="100%" stopColor="#38BDF8" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 grid place-items-center">
            <div className="text-center leading-none">
              <p className="text-[9px] text-knowra-text-terciario uppercase tracking-wide mb-0.5">{t("progresso.nivel")}</p>
              <p className="text-2xl font-bold">{profile.nivel_global}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-h3">{atual?.titulo ?? t("progresso.curioso")}</p>
            {proximo && <span className="text-xs text-knowra-text-terciario">→ {proximo.titulo}</span>}
          </div>
          {profile.streak_atual > 0 && (
            <p className="text-sm text-knowra-text-secondary flex items-center gap-1 mt-1">
              <span aria-hidden>🔥</span>
              <span className="font-semibold text-knowra-text">{profile.streak_atual}</span> {t("progresso.diasSequencia")}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4">
        <div className="h-3 rounded-full bg-knowra-bg overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-knowra-primary to-knowra-accent transition-all duration-700 ease-out"
            style={{ width: `${progresso}%` }}
          />
        </div>
        <p className="text-xs text-knowra-text-secondary mt-2">
          {proximo
            ? t("progresso.faltamXp", { xp: profile.xp_total, faltam: xpAlvo - profile.xp_total, titulo: proximo.titulo })
            : t("progresso.nivelMaximo", { xp: profile.xp_total })}
        </p>
      </div>
    </div>
  );
}
