import { useEffect, useState } from "react";
import { BADGES } from "../lib/badges";
import { supabase } from "../lib/supabaseClient";

export function BadgesVitrine({ atualizarQuando }: { atualizarQuando: number }) {
  const [codigos, setCodigos] = useState<string[]>([]);

  useEffect(() => {
    supabase
      .from("usuario_badges")
      .select("badges(codigo)")
      .then(({ data }) => {
        const lista = (data ?? []).map((row: any) => row.badges?.codigo).filter(Boolean);
        setCodigos(lista);
      });
  }, [atualizarQuando]);

  if (codigos.length === 0) return null;

  return (
    <div className="flex gap-2 mt-3 flex-wrap">
      {codigos.map((codigo) => {
        const badge = BADGES[codigo];
        if (!badge) return null;
        return (
          <div
            key={codigo}
            title={badge.nome}
            className="flex items-center gap-1.5 bg-knowra-surface rounded-full pl-1.5 pr-3 py-1"
          >
            <span className="text-base">{badge.icone}</span>
            <span className="text-[11px] text-knowra-text/70">{badge.nome}</span>
          </div>
        );
      })}
    </div>
  );
}
