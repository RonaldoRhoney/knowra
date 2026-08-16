import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabaseClient";

const CHAVE_DISPENSADO = "knowra_cadastro_dispensado";

const GENEROS = ["feminino", "masculino", "nao_binario", "prefiro_nao_informar"];

export function CompletarCadastroModal() {
  const { t } = useTranslation();
  const { profile, refreshProfile, tipoAcesso } = useAuth();
  const [dispensado, setDispensado] = useState(() => sessionStorage.getItem(CHAVE_DISPENSADO) === "1");
  const [nome, setNome] = useState(profile?.nome ?? "");
  const [cidade, setCidade] = useState("");
  const [pais, setPais] = useState("");
  const [idade, setIdade] = useState("");
  const [genero, setGenero] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Espera a mensagem de boas-vindas ser fechada primeiro, pra não sobrepor os dois modais.
  if (!profile || profile.dados_demograficos_consentidos_em || dispensado || tipoAcesso === "primeiro_acesso") {
    return null;
  }

  function dispensar() {
    sessionStorage.setItem(CHAVE_DISPENSADO, "1");
    setDispensado(true);
  }

  async function salvar() {
    setEnviando(true);
    setErro(null);
    const { error } = await supabase.rpc("completar_cadastro", {
      p_nome: nome,
      p_cidade: cidade || null,
      p_pais: pais || null,
      p_idade: idade ? Number(idade) : null,
      p_genero: genero || null,
    });
    if (error) {
      setErro(t("cadastro.erroSalvar"));
      setEnviando(false);
      return;
    }
    await refreshProfile();
    setEnviando(false);
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-knowra-surface rounded-2xl p-6 shadow-xl">
        <div className="flex items-start justify-between mb-1">
          <h2 className="text-lg font-bold">{t("cadastro.titulo")}</h2>
          <button onClick={dispensar} className="text-knowra-text/40 hover:text-knowra-text text-sm">
            ✕
          </button>
        </div>
        <p className="text-xs text-knowra-text/50 mb-4">{t("cadastro.explicacao")}</p>

        <div className="space-y-3">
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder={t("cadastro.nome")}
            className="w-full rounded-lg bg-knowra-bg border border-white/10 px-3 py-2 text-sm outline-none focus:border-knowra-primary"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              placeholder={t("cadastro.cidade")}
              className="w-full rounded-lg bg-knowra-bg border border-white/10 px-3 py-2 text-sm outline-none focus:border-knowra-primary"
            />
            <input
              value={pais}
              onChange={(e) => setPais(e.target.value)}
              placeholder={t("cadastro.pais")}
              className="w-full rounded-lg bg-knowra-bg border border-white/10 px-3 py-2 text-sm outline-none focus:border-knowra-primary"
            />
          </div>
          <input
            value={idade}
            onChange={(e) => setIdade(e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            maxLength={3}
            placeholder={t("cadastro.idade")}
            className="w-full rounded-lg bg-knowra-bg border border-white/10 px-3 py-2 text-sm outline-none focus:border-knowra-primary"
          />
          <div>
            <p className="text-xs text-knowra-text/50 mb-1.5">{t("cadastro.genero")}</p>
            <div className="flex flex-wrap gap-1.5">
              {GENEROS.map((g) => (
                <button
                  key={g}
                  onClick={() => setGenero(g)}
                  className={`text-xs px-2.5 py-1 rounded-full border ${
                    genero === g
                      ? "border-knowra-primary bg-knowra-primary/15 text-knowra-primary"
                      : "border-white/10 text-knowra-text/60"
                  }`}
                >
                  {t(`cadastro.generos.${g}`)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {erro && <p className="text-sm text-red-400 mt-3">{erro}</p>}

        <div className="flex items-center gap-3 mt-5">
          <button
            onClick={salvar}
            disabled={enviando || nome.trim().length === 0}
            className="flex-1 rounded-lg bg-knowra-primary py-2.5 text-sm font-medium disabled:opacity-40"
          >
            {enviando ? t("cadastro.salvando") : t("common.salvar")}
          </button>
          <button onClick={dispensar} className="text-xs text-knowra-text/50 hover:text-knowra-text">
            {t("cadastro.agoraNao")}
          </button>
        </div>
      </div>
    </div>
  );
}
