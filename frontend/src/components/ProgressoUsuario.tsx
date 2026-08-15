import { useEffect, useState } from "react";
import { getNiveis, type Nivel } from "../lib/niveis";
import type { Profile } from "../types/profile";

export function ProgressoUsuario({ profile }: { profile: Profile }) {
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

  return (
    <div className="bg-knowra-surface rounded-2xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono uppercase tracking-wide text-knowra-primary bg-knowra-primary/15 px-2 py-0.5 rounded-md">
            Nível {profile.nivel_global}
          </span>
          <span className="text-sm text-knowra-text/60">{atual?.titulo ?? "Curioso"}</span>
          {proximo && (
            <span className="text-xs text-knowra-text/30 flex items-center gap-1">
              → <span className="text-knowra-accent/70">{proximo.titulo}</span>
            </span>
          )}
        </div>
        {profile.streak_atual > 0 && (
          <span className="text-sm flex items-center gap-1">
            🔥 <span className="font-semibold">{profile.streak_atual}</span>
            <span className="text-knowra-text/40 text-xs">dias</span>
          </span>
        )}
      </div>

      <div className="h-2 rounded-full bg-knowra-bg overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-knowra-primary to-knowra-accent transition-all duration-700 ease-out"
          style={{ width: `${progresso}%` }}
        />
      </div>

      <div className="flex justify-between mt-1.5">
        <span className="text-[11px] text-knowra-text/40">{profile.xp_total} XP</span>
        {proximo && (
          <span className="text-[11px] text-knowra-text/40">
            {xpAlvo - profile.xp_total} XP até {proximo.titulo}
          </span>
        )}
      </div>
    </div>
  );
}
