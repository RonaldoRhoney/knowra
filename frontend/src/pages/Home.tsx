import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { BadgesVitrine } from "../components/BadgesVitrine";
import { CompletarCadastroModal } from "../components/CompletarCadastroModal";
import { DesafioCard } from "../components/DesafioCard";
import { Footer } from "../components/Footer";
import { HistoricoPerguntas } from "../components/HistoricoPerguntas";
import { MensagemAcesso } from "../components/MensagemAcesso";
import { MissoesDiarias } from "../components/MissoesDiarias";
import { ProgressoUsuario } from "../components/ProgressoUsuario";
import { SimuladorNivel } from "../components/SimuladorNivel";
import { useAuth } from "../contexts/AuthContext";
import { askQuestion, type AskResponse } from "../lib/api";
import { getNiveis } from "../lib/niveis";

export function Home() {
  const { profile, signOut } = useAuth();
  const [pergunta, setPergunta] = useState("");
  const [resposta, setResposta] = useState<AskResponse | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [historicoVersao, setHistoricoVersao] = useState(0);
  const [badgesVersao, setBadgesVersao] = useState(0);
  const [nivelSimulado, setNivelSimulado] = useState<number | null>(null);
  const [xpSimulado, setXpSimulado] = useState(0);

  useEffect(() => {
    if (nivelSimulado === null) return;
    getNiveis().then((niveis) => {
      const atual = niveis.find((n) => n.nivel === nivelSimulado);
      const proximo = niveis.find((n) => n.nivel === nivelSimulado + 1);
      const base = atual?.xp_necessario ?? 0;
      const alvo = proximo?.xp_necessario ?? base;
      setXpSimulado(proximo ? base + Math.round((alvo - base) * 0.5) : base);
    });
  }, [nivelSimulado]);

  const profileExibido =
    profile && nivelSimulado !== null
      ? { ...profile, nivel_global: nivelSimulado, xp_total: xpSimulado }
      : profile;

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
    <div className="px-4 py-8 max-w-lg mx-auto flex-1 w-full">
      <header className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold">KnowRa</h1>
          <p className="text-sm text-knowra-text/60">Olá, {profile?.nome ?? "explorador"}!</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/como-usar" className="text-xs text-knowra-text/60 hover:text-knowra-text">
            Como usar
          </Link>
          <Link to="/mapa" className="text-xs text-knowra-text/60 hover:text-knowra-text">
            Mapa
          </Link>
          <Link to="/ranking" className="text-xs text-knowra-text/60 hover:text-knowra-text">
            Ranking
          </Link>
          <Link to="/perfil" className="text-xs text-knowra-text/60 hover:text-knowra-text">
            Perfil
          </Link>
          {profile?.role === "admin" && (
            <Link to="/admin" className="text-xs text-knowra-accent hover:underline">
              Painel ADM
            </Link>
          )}
          <button onClick={signOut} className="text-xs text-knowra-text/60 hover:text-knowra-text">
            Sair
          </button>
        </div>
      </header>

      {nivelSimulado !== null && (
        <div className="bg-knowra-primary text-white text-xs font-medium text-center py-1.5 rounded-lg mb-3">
          🔍 MODO PREVIEW — visualizando nível {nivelSimulado}, seu XP real não foi alterado
        </div>
      )}

      {profileExibido && <ProgressoUsuario profile={profileExibido} />}
      <BadgesVitrine atualizarQuando={badgesVersao} />

      <MissoesDiarias atualizarQuando={historicoVersao + badgesVersao} />

      {profile?.role === "admin" && (
        <SimuladorNivel nivelSimulado={nivelSimulado} onChange={setNivelSimulado} />
      )}

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
