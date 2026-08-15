import { useState, type FormEvent } from "react";
import { BadgeGrid } from "../components/BadgeGrid";
import { CompletarCadastroModal } from "../components/CompletarCadastroModal";
import { DesafioCard } from "../components/DesafioCard";
import { Footer } from "../components/Footer";
import { HistoricoPerguntas } from "../components/HistoricoPerguntas";
import { MensagemAcesso } from "../components/MensagemAcesso";
import { MissoesDiarias } from "../components/MissoesDiarias";
import { Navigation } from "../components/Navigation";
import { ProgressoUsuario } from "../components/ProgressoUsuario";
import { useAuth } from "../contexts/AuthContext";
import { askQuestion, type AskResponse } from "../lib/api";

export function Home() {
  const { profile } = useAuth();
  const [pergunta, setPergunta] = useState("");
  const [resposta, setResposta] = useState<AskResponse | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [historicoVersao, setHistoricoVersao] = useState(0);
  const [badgesVersao, setBadgesVersao] = useState(0);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (pergunta.trim().length < 3) return;
    setCarregando(true);
    setErro(null);
    setResposta(null);
    try {
      const resultado = await askQuestion(pergunta.trim());
      setResposta(resultado);
      setPergunta("");
      setHistoricoVersao((v) => v + 1);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível processar sua pergunta agora.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
    <Navigation />
    <div className="px-4 py-8 max-w-3xl mx-auto flex-1 w-full">
      <div className="mb-5">
        <h1 className="text-h2">Olá, {profile?.nome ?? "explorador"} 👋</h1>
        <p className="text-sm text-knowra-text-secondary mt-0.5">Continue sua jornada de conhecimento.</p>
      </div>

      {profile && <ProgressoUsuario profile={profile} />}
      <BadgeGrid atualizarQuando={badgesVersao} />

      <MissoesDiarias atualizarQuando={historicoVersao + badgesVersao} />

      <form onSubmit={handleSubmit} className="bg-knowra-surface rounded-2xl p-4 mt-4">
        <textarea
          value={pergunta}
          onChange={(e) => setPergunta(e.target.value)}
          placeholder="Pergunte qualquer coisa..."
          rows={2}
          maxLength={2000}
          className="w-full bg-transparent outline-none text-sm resize-none placeholder:text-knowra-text/40"
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={carregando || pergunta.trim().length < 3}
            className="rounded-lg bg-knowra-primary px-4 py-2 text-sm font-medium disabled:opacity-40"
          >
            {carregando ? "Pensando..." : "Perguntar"}
          </button>
        </div>
      </form>

      {erro && <p className="text-sm text-red-400 mt-3">{erro}</p>}

      {resposta && (
        <div className="bg-knowra-surface rounded-2xl p-5 mt-4">
          <p className="text-sm text-knowra-text/90 whitespace-pre-wrap">{resposta.resposta_ia}</p>
          {resposta.requer_verificacao && (
            <div className="mt-3 pt-3 border-t border-white/10 flex items-start gap-2">
              <span className="text-amber-400 text-sm shrink-0">⚠️</span>
              <p className="text-xs text-knowra-text/50">
                Vale conferir em uma fonte oficial antes de usar essa informação pra algo importante.
                {resposta.observacao_verificacao && ` ${resposta.observacao_verificacao}`}
              </p>
            </div>
          )}
        </div>
      )}

      {resposta && (
        <DesafioCard
          key={resposta.id}
          perguntaId={resposta.id}
          onAvaliado={() => setBadgesVersao((v) => v + 1)}
        />
      )}

      {!resposta && !erro && (
        <div className="bg-knowra-surface/50 rounded-2xl p-6 text-center mt-4">
          <p className="text-knowra-text/50 text-sm">Sua jornada de curiosidade está começando.</p>
        </div>
      )}

      <HistoricoPerguntas atualizarQuando={historicoVersao} />
      <CompletarCadastroModal />
      <MensagemAcesso />
    </div>
    <Footer />
    </div>
  );
}
