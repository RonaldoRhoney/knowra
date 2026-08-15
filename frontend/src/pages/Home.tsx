import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { BadgesVitrine } from "../components/BadgesVitrine";
import { DesafioCard } from "../components/DesafioCard";
import { HistoricoPerguntas } from "../components/HistoricoPerguntas";
import { ProgressoUsuario } from "../components/ProgressoUsuario";
import { useAuth } from "../contexts/AuthContext";
import { askQuestion, type AskResponse } from "../lib/api";

export function Home() {
  const { profile, signOut } = useAuth();
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
    <div className="min-h-screen px-4 py-8 max-w-lg mx-auto">
      <header className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold">KnowRa</h1>
          <p className="text-sm text-knowra-text/60">Olá, {profile?.nome ?? "explorador"}!</p>
        </div>
        <div className="flex items-center gap-3">
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

      {profile && <ProgressoUsuario profile={profile} />}
      <BadgesVitrine atualizarQuando={badgesVersao} />

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
    </div>
  );
}
