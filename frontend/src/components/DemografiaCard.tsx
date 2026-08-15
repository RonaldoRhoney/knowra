import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabaseClient";

const CHAVE_DISPENSADO = "knowra_demografia_dispensada";

const FAIXAS = ["<18", "18-24", "25-34", "35-44", "45-54", "55+"];
const GENEROS = [
  { valor: "feminino", label: "Feminino" },
  { valor: "masculino", label: "Masculino" },
  { valor: "nao_binario", label: "Não-binário" },
];

export function DemografiaCard() {
  const { profile, refreshProfile } = useAuth();
  const [dispensado, setDispensado] = useState(() => sessionStorage.getItem(CHAVE_DISPENSADO) === "1");
  const [faixaEtaria, setFaixaEtaria] = useState("");
  const [genero, setGenero] = useState("");
  const [enviando, setEnviando] = useState(false);

  if (!profile || profile.dados_demograficos_consentidos_em || dispensado) return null;

  function dispensar() {
    sessionStorage.setItem(CHAVE_DISPENSADO, "1");
    setDispensado(true);
  }

  async function enviar(faixa: string, gen: string) {
    setEnviando(true);
    await supabase.rpc("atualizar_demografia", { p_faixa_etaria: faixa, p_genero: gen });
    await refreshProfile();
    setEnviando(false);
  }

  return (
    <div className="bg-knowra-surface rounded-2xl p-4 mt-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-knowra-text/80">
          Ajude a gente a entender melhor quem usa o KnowRa <span className="text-knowra-text/40">(opcional)</span>
        </p>
        <button onClick={dispensar} className="text-knowra-text/40 hover:text-knowra-text text-xs shrink-0">
          ✕
        </button>
      </div>

      <div>
        <p className="text-xs text-knowra-text/50 mb-1.5">Faixa etária</p>
        <div className="flex flex-wrap gap-1.5">
          {FAIXAS.map((f) => (
            <button
              key={f}
              onClick={() => setFaixaEtaria(f)}
              className={`text-xs px-2.5 py-1 rounded-full border ${
                faixaEtaria === f
                  ? "border-knowra-primary bg-knowra-primary/15 text-knowra-primary"
                  : "border-white/10 text-knowra-text/60"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs text-knowra-text/50 mb-1.5">Gênero</p>
        <div className="flex flex-wrap gap-1.5">
          {GENEROS.map((g) => (
            <button
              key={g.valor}
              onClick={() => setGenero(g.valor)}
              className={`text-xs px-2.5 py-1 rounded-full border ${
                genero === g.valor
                  ? "border-knowra-primary bg-knowra-primary/15 text-knowra-primary"
                  : "border-white/10 text-knowra-text/60"
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={() => enviar(faixaEtaria, genero)}
          disabled={!faixaEtaria || !genero || enviando}
          className="text-xs rounded-lg bg-knowra-primary px-3 py-1.5 font-medium disabled:opacity-40"
        >
          Enviar
        </button>
        <button
          onClick={() => enviar("prefiro_nao_informar", "prefiro_nao_informar")}
          disabled={enviando}
          className="text-xs text-knowra-text/50 hover:text-knowra-text"
        >
          Prefiro não informar
        </button>
      </div>
    </div>
  );
}
