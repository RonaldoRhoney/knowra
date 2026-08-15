import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { avaliarDesafio, gerarDesafio } from "../lib/api";
import { BADGES } from "../lib/badges";
import type { Desafio, ResultadoAvaliacao } from "../types/desafio";

const DIFICULDADE: Record<string, { label: string; cor: string }> = {
  facil: { label: "Fácil", cor: "text-emerald-400 bg-emerald-400/10" },
  normal: { label: "Normal", cor: "text-knowra-accent bg-knowra-accent/10" },
  dificil: { label: "Difícil", cor: "text-amber-400 bg-amber-400/10" },
  avancado: { label: "Avançado", cor: "text-orange-400 bg-orange-400/10" },
  mestre: { label: "Mestre", cor: "text-fuchsia-400 bg-fuchsia-400/10" },
};

export function DesafioCard({ perguntaId, onAvaliado }: { perguntaId: string; onAvaliado?: () => void }) {
  const { refreshProfile } = useAuth();
  const [desafio, setDesafio] = useState<Desafio | null>(null);
  const [resposta, setResposta] = useState("");
  const [resultado, setResultado] = useState<ResultadoAvaliacao | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function aceitarDesafio() {
    setCarregando(true);
    setErro(null);
    try {
      setDesafio(await gerarDesafio(perguntaId));
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível gerar o desafio agora.");
    } finally {
      setCarregando(false);
    }
  }

  async function enviarResposta() {
    if (!desafio || resposta.trim().length < 2) return;
    setCarregando(true);
    setErro(null);
    try {
      const r = await avaliarDesafio(desafio.id, resposta.trim());
      setResultado(r);
      await refreshProfile();
      onAvaliado?.();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível avaliar sua resposta agora.");
    } finally {
      setCarregando(false);
    }
  }

  if (resultado) {
    const corNota =
      resultado.nota >= 80 ? "text-emerald-400" : resultado.nota >= 50 ? "text-knowra-accent" : "text-amber-400";

    return (
      <div className="mt-3 space-y-3">
        {resultado.subiu_de_nivel && (
          <div className="bg-gradient-to-r from-knowra-primary to-knowra-accent rounded-2xl p-4 text-center animate-[pulse_1.6s_ease-in-out_1]">
            <p className="font-bold">🎉 Você subiu para o nível {resultado.nivel_novo}!</p>
          </div>
        )}

        <div className="bg-knowra-surface rounded-2xl p-5">
          <div className="flex items-center gap-4">
            <div
              className={`relative w-16 h-16 shrink-0 rounded-full grid place-items-center border-4 border-knowra-bg ${corNota}`}
              style={{
                background: `conic-gradient(currentColor ${resultado.nota}%, rgba(255,255,255,0.08) 0)`,
              }}
            >
              <span className="w-11 h-11 rounded-full bg-knowra-surface grid place-items-center text-sm font-bold text-knowra-text">
                {resultado.nota}
              </span>
            </div>
            <div>
              <p className="text-xs text-knowra-text/50 uppercase tracking-wide">Conhecimento demonstrado</p>
              <p className="text-knowra-accent font-semibold mt-0.5">+{resultado.xp_ganho} XP</p>
            </div>
          </div>
          <p className="text-sm text-knowra-text/80 mt-4">{resultado.feedback}</p>
        </div>

        {resultado.badges_novas.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {resultado.badges_novas.map((codigo) => {
              const badge = BADGES[codigo];
              return (
                <div
                  key={codigo}
                  className="flex items-center gap-2 bg-knowra-primary/15 border border-knowra-primary/30 rounded-full pl-2 pr-3 py-1.5"
                >
                  <span className="text-lg">{badge?.icone ?? "🏅"}</span>
                  <span className="text-xs font-medium">Nova conquista: {badge?.nome ?? codigo}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  if (desafio) {
    const dificuldade = DIFICULDADE[desafio.dificuldade] ?? DIFICULDADE.normal;
    return (
      <div className="bg-knowra-surface rounded-2xl p-5 mt-3 space-y-3">
        <span className={`inline-block text-[10px] font-mono uppercase tracking-wide px-2 py-0.5 rounded-md ${dificuldade.cor}`}>
          {dificuldade.label}
        </span>
        <p className="text-sm font-medium">{desafio.enunciado}</p>
        <textarea
          value={resposta}
          onChange={(e) => setResposta(e.target.value)}
          placeholder="Explique com suas próprias palavras..."
          rows={3}
          maxLength={3000}
          className="w-full bg-knowra-bg rounded-lg p-3 text-sm outline-none resize-none placeholder:text-knowra-text/40"
        />
        {erro && <p className="text-sm text-red-400">{erro}</p>}
        <button
          onClick={enviarResposta}
          disabled={carregando || resposta.trim().length < 2}
          className="rounded-lg bg-knowra-primary px-4 py-2 text-sm font-medium disabled:opacity-40"
        >
          {carregando ? "Avaliando..." : "Enviar resposta"}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3">
      {erro && <p className="text-sm text-red-400 mb-2">{erro}</p>}
      <button
        onClick={aceitarDesafio}
        disabled={carregando}
        className="text-sm text-knowra-accent hover:underline disabled:opacity-40"
      >
        {carregando ? "Gerando desafio..." : "Você acabou de aprender algo novo. Quer testar seu conhecimento?"}
      </button>
    </div>
  );
}
