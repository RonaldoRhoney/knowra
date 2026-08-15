import { useEffect, useState } from "react";
import { BADGES } from "../lib/badges";
import { getNiveis, type Nivel } from "../lib/niveis";

export function SimuladorNivel({
  nivelSimulado,
  onChange,
}: {
  nivelSimulado: number | null;
  onChange: (nivel: number | null) => void;
}) {
  const [niveis, setNiveis] = useState<Nivel[]>([]);

  useEffect(() => {
    getNiveis().then(setNiveis);
  }, []);

  return (
    <div className="bg-knowra-surface/50 border border-dashed border-knowra-primary/30 rounded-2xl p-4 mt-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-mono uppercase tracking-wide text-knowra-primary">
          🔍 Modo ADM · Visualizar nível
        </p>
        {nivelSimulado !== null && (
          <button onClick={() => onChange(null)} className="text-xs text-knowra-text/50 hover:text-knowra-text">
            Sair da simulação
          </button>
        )}
      </div>
      <p className="text-xs text-knowra-text/40 mb-3">
        Veja como a tela fica em qualquer nível — não altera seu XP real, é só visualização.
      </p>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {niveis.map((n) => (
          <button
            key={n.nivel}
            onClick={() => onChange(n.nivel)}
            className={`text-xs px-2.5 py-1 rounded-full border ${
              nivelSimulado === n.nivel
                ? "border-knowra-primary bg-knowra-primary/15 text-knowra-primary"
                : "border-white/10 text-knowra-text/60"
            }`}
          >
            {n.nivel} · {n.titulo}
          </button>
        ))}
      </div>
      <div>
        <p className="text-xs text-knowra-text/50 mb-1.5">Catálogo de badges</p>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(BADGES).map(([codigo, b]) => (
            <span key={codigo} title={b.nome} className="text-sm bg-white/5 rounded-full px-2 py-1">
              {b.icone} <span className="text-[11px] text-knowra-text/60">{b.nome}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
