import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

interface Missoes {
  pergunta_hoje: boolean;
  desafio_hoje: boolean;
  area_nova_hoje: boolean;
}

const DEFINICOES = [
  { chave: "pergunta_hoje" as const, texto: "Faça uma pergunta hoje" },
  { chave: "desafio_hoje" as const, texto: "Responda um desafio hoje" },
  { chave: "area_nova_hoje" as const, texto: "Explore uma área diferente" },
];

export function MissoesDiarias({ atualizarQuando }: { atualizarQuando: number }) {
  const [missoes, setMissoes] = useState<Missoes | null>(null);

  useEffect(() => {
    supabase.rpc("missoes_hoje").then(({ data }) => {
      if (data) setMissoes(data as Missoes);
    });
  }, [atualizarQuando]);

  if (!missoes) return null;

  return (
    <div className="bg-knowra-surface rounded-2xl p-4 mt-4">
      <p className="text-xs font-semibold text-knowra-text/70 mb-2.5">Missões de hoje</p>
      <div className="space-y-1.5">
        {DEFINICOES.map((m) => {
          const concluida = missoes[m.chave];
          return (
            <div key={m.chave} className="flex items-center gap-2">
              <span
                className={`w-4 h-4 rounded-full grid place-items-center text-[10px] shrink-0 ${
                  concluida ? "bg-knowra-primary text-white" : "border border-white/20"
                }`}
              >
                {concluida && "✓"}
              </span>
              <span className={`text-xs ${concluida ? "text-knowra-text/40 line-through" : "text-knowra-text/70"}`}>
                {m.texto}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
