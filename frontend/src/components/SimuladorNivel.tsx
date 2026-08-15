import { useEffect, useState } from "react";
import { getNiveis, type Nivel } from "../lib/niveis";
import type { Profile } from "../types/profile";
import { ProgressoUsuario } from "./ProgressoUsuario";

/**
 * Ferramenta de desenvolvimento — pré-visualiza o LevelCard em qualquer
 * nível, com dado 100% fictício (nunca escreve no banco, nunca afeta
 * nenhuma conta real). Vive só no Painel ADM, fora do fluxo normal do
 * usuário (antes ficava dentro da Home, mesmo que gated por role).
 */
export function SimuladorNivel() {
  const [niveis, setNiveis] = useState<Nivel[]>([]);
  const [nivelSelecionado, setNivelSelecionado] = useState(1);

  useEffect(() => {
    getNiveis().then(setNiveis);
  }, []);

  const atual = niveis.find((n) => n.nivel === nivelSelecionado);
  const proximo = niveis.find((n) => n.nivel === nivelSelecionado + 1);
  const base = atual?.xp_necessario ?? 0;
  const alvo = proximo?.xp_necessario ?? base;
  const xpPreview = proximo ? base + Math.round((alvo - base) * 0.5) : base;

  const perfilFicticio: Profile = {
    id: "preview",
    nome: "Preview",
    avatar_url: null,
    role: "user",
    nivel_global: nivelSelecionado,
    xp_total: xpPreview,
    streak_atual: 3,
    streak_recorde: 3,
    rating: 1200,
    criado_em: new Date().toISOString(),
    cidade: null,
    pais: null,
    idade: null,
    genero: null,
    dados_demograficos_consentidos_em: null,
    nickname: null,
    aparecer_no_ranking: false,
  };

  return (
    <div className="bg-knowra-bg border border-dashed border-knowra-primary/30 rounded-2xl p-4">
      <p className="text-xs font-mono uppercase tracking-wide text-knowra-primary mb-1">
        🔍 Preview de nível (ferramenta de desenvolvimento)
      </p>
      <p className="text-xs text-knowra-text-terciario mb-3">
        Dado fictício, só pra visualizar o card em qualquer estágio — nunca afeta uma conta real.
      </p>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {niveis.map((n) => (
          <button
            key={n.nivel}
            onClick={() => setNivelSelecionado(n.nivel)}
            className={`text-xs px-2.5 py-1 rounded-full border ${
              nivelSelecionado === n.nivel
                ? "border-knowra-primary bg-knowra-primary/15 text-knowra-primary"
                : "border-knowra-border text-knowra-text-secondary"
            }`}
          >
            {n.nivel} · {n.titulo}
          </button>
        ))}
      </div>
      {niveis.length > 0 && <ProgressoUsuario profile={perfilFicticio} />}
    </div>
  );
}
