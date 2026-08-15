import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Footer } from "../components/Footer";
import { Navigation } from "../components/Navigation";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabaseClient";

interface Liga {
  ordem: number;
  codigo: string;
  nome: string;
  rating_minimo: number;
}

interface Temporada {
  id: string;
  nome: string;
  inicio: string;
  fim: string;
  status: "planejada" | "ativa" | "encerrada";
  congelada_em: string | null;
}

interface ResultadoTemporada {
  temporada_id: string;
  posicao: number;
  percentil_top: number | null;
  liga_final: string;
  rating_final: number;
}

interface LinhaLeaderboard {
  posicao: number;
  nickname: string;
  avatar_url: string | null;
  rating_final: number;
  liga_final: string;
}

function ligaAtual(rating: number, ligas: Liga[]): Liga | null {
  const elegiveis = ligas.filter((l) => rating >= l.rating_minimo).sort((a, b) => b.rating_minimo - a.rating_minimo);
  return elegiveis[0] ?? ligas[0] ?? null;
}

export function Temporadas() {
  const { profile, session } = useAuth();
  const [ligas, setLigas] = useState<Liga[]>([]);
  const [temporadas, setTemporadas] = useState<Temporada[]>([]);
  const [meusResultados, setMeusResultados] = useState<ResultadoTemporada[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [temporadaAberta, setTemporadaAberta] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<LinhaLeaderboard[]>([]);

  useEffect(() => {
    if (!session) return;
    Promise.all([
      supabase.from("ligas").select("*").order("ordem"),
      supabase.from("temporadas").select("*").order("criado_em", { ascending: false }),
      supabase
        .from("temporada_resultados")
        .select("temporada_id, posicao, percentil_top, liga_final, rating_final")
        .eq("usuario_id", session.user.id),
    ]).then(([ligasRes, temporadasRes, resultadosRes]) => {
      setLigas((ligasRes.data ?? []) as Liga[]);
      setTemporadas((temporadasRes.data ?? []) as Temporada[]);
      setMeusResultados((resultadosRes.data ?? []) as ResultadoTemporada[]);
      setCarregando(false);
    });
  }, [session]);

  function abrirTemporada(id: string) {
    if (temporadaAberta === id) {
      setTemporadaAberta(null);
      return;
    }
    setTemporadaAberta(id);
    supabase.rpc("ranking_temporada", { p_temporada_id: id, p_limite: 50 }).then(({ data }) => {
      setLeaderboard((data ?? []) as LinhaLeaderboard[]);
    });
  }

  const minhaLiga = profile ? ligaAtual(profile.rating, ligas) : null;
  const temporadaAtiva = temporadas.find((t) => t.status === "ativa");

  return (
    <div>
      <Navigation />
      <div className="px-4 py-8 max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-h2">Temporadas</h1>
          <p className="text-sm text-knowra-text-secondary mt-0.5">Ligas e competição por período</p>
        </div>

        {minhaLiga && (
          <section className="bg-knowra-surface rounded-2xl p-5 mb-6">
            <p className="text-xs text-knowra-text/50 mb-1">Sua liga atual</p>
            <p className="text-2xl font-bold text-knowra-accent">{minhaLiga.nome}</p>
            <p className="text-xs text-knowra-text/40 mt-1">
              Rating {profile?.rating} · liga é recalculada automaticamente conforme seu rating muda
            </p>
          </section>
        )}

        {temporadaAtiva && (
          <div className="bg-knowra-accent/10 border border-knowra-accent/20 rounded-xl px-4 py-3 mb-6">
            <p className="text-sm font-medium">🏆 {temporadaAtiva.nome} está em andamento</p>
            <p className="text-xs text-knowra-text/60 mt-0.5">
              De {new Date(temporadaAtiva.inicio).toLocaleDateString("pt-BR")} até{" "}
              {new Date(temporadaAtiva.fim).toLocaleDateString("pt-BR")}. O ranking ao vivo está em{" "}
              <Link to="/ranking" className="text-knowra-accent hover:underline">
                /ranking
              </Link>
              .
            </p>
          </div>
        )}

        {carregando && <p className="text-sm text-knowra-text/40">Carregando...</p>}

        {!carregando && (
          <section>
            <h2 className="text-sm font-semibold text-knowra-text/80 mb-3">Histórico de temporadas</h2>
            {temporadas.filter((t) => t.status === "encerrada").length === 0 ? (
              <div className="bg-knowra-surface/50 rounded-2xl p-6 text-center">
                <p className="text-sm text-knowra-text/50">Nenhuma temporada encerrada ainda.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {temporadas
                  .filter((t) => t.status === "encerrada")
                  .map((t) => {
                    const meuResultado = meusResultados.find((r) => r.temporada_id === t.id);
                    return (
                      <div key={t.id} className="bg-knowra-surface rounded-2xl overflow-hidden">
                        <button
                          type="button"
                          onClick={() => abrirTemporada(t.id)}
                          className="w-full text-left p-4"
                        >
                          <p className="text-sm font-medium">{t.nome}</p>
                          <p className="text-xs text-knowra-text/40 mt-0.5">
                            Encerrada em{" "}
                            {t.congelada_em ? new Date(t.congelada_em).toLocaleDateString("pt-BR") : "—"}
                          </p>
                          {meuResultado && (
                            <p className="text-xs text-knowra-accent mt-1.5">
                              Você: #{meuResultado.posicao} · {meuResultado.liga_final}
                              {meuResultado.percentil_top !== null &&
                                ` · top ${meuResultado.percentil_top}%`}
                            </p>
                          )}
                        </button>

                        {temporadaAberta === t.id && (
                          <div className="border-t border-white/10 px-4 py-3">
                            {leaderboard.length === 0 ? (
                              <p className="text-xs text-knowra-text/40">
                                Ninguém apareceu publicamente nesse ranking.
                              </p>
                            ) : (
                              <ul className="space-y-2">
                                {leaderboard.map((l) => (
                                  <li key={l.posicao} className="flex items-center gap-2 text-xs">
                                    <span className="w-5 text-knowra-text/40 text-right shrink-0">
                                      {l.posicao}
                                    </span>
                                    <span className="flex-1 truncate">{l.nickname}</span>
                                    <span className="text-knowra-text/40 shrink-0">{l.liga_final}</span>
                                    <span className="text-knowra-accent font-medium shrink-0">
                                      {l.rating_final}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </section>
        )}

        {profile?.role === "admin" && (
          <AdminTemporadas temporadaAtiva={temporadaAtiva} onAtualizar={() => window.location.reload()} />
        )}
      </div>
      <Footer />
    </div>
  );
}

function AdminTemporadas({
  temporadaAtiva,
  onAtualizar,
}: {
  temporadaAtiva: Temporada | undefined;
  onAtualizar: () => void;
}) {
  const [nome, setNome] = useState("");
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleIniciar() {
    if (!nome.trim() || !inicio || !fim) return;
    setEnviando(true);
    setErro(null);
    const { error } = await supabase.rpc("iniciar_temporada", { p_nome: nome, p_inicio: inicio, p_fim: fim });
    if (error) {
      setErro(error.message);
      setEnviando(false);
    } else {
      onAtualizar();
    }
  }

  async function handleEncerrar() {
    if (!temporadaAtiva) return;
    if (!confirm(`Encerrar "${temporadaAtiva.nome}"? Isso congela o ranking e distribui as badges de liga.`)) return;
    setEnviando(true);
    setErro(null);
    const { error } = await supabase.rpc("encerrar_temporada", { p_temporada_id: temporadaAtiva.id });
    if (error) {
      setErro(error.message);
      setEnviando(false);
    } else {
      onAtualizar();
    }
  }

  return (
    <section className="bg-knowra-surface rounded-2xl p-5 mt-6 border border-knowra-primary/30">
      <h2 className="text-sm font-semibold text-knowra-text/80 mb-1">Admin — Temporadas</h2>
      <p className="text-xs text-knowra-text/40 mb-4">Visível só pra você.</p>

      {temporadaAtiva ? (
        <div>
          <p className="text-sm mb-3">
            Temporada ativa: <span className="font-medium">{temporadaAtiva.nome}</span>
          </p>
          <button
            type="button"
            onClick={handleEncerrar}
            disabled={enviando}
            className="w-full rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 py-2.5 text-sm font-medium disabled:opacity-40"
          >
            {enviando ? "Encerrando..." : "Encerrar temporada"}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nome da temporada (ex: KnowRa — Temporada 01)"
            className="w-full rounded-lg bg-knowra-bg border border-white/10 px-3 py-2 text-sm outline-none focus:border-knowra-primary"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-knowra-text/50 mb-1 block">Início</label>
              <input
                type="date"
                value={inicio}
                onChange={(e) => setInicio(e.target.value)}
                className="w-full rounded-lg bg-knowra-bg border border-white/10 px-3 py-2 text-sm outline-none focus:border-knowra-primary"
              />
            </div>
            <div>
              <label className="text-xs text-knowra-text/50 mb-1 block">Fim</label>
              <input
                type="date"
                value={fim}
                onChange={(e) => setFim(e.target.value)}
                className="w-full rounded-lg bg-knowra-bg border border-white/10 px-3 py-2 text-sm outline-none focus:border-knowra-primary"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={handleIniciar}
            disabled={enviando || !nome.trim() || !inicio || !fim}
            className="w-full rounded-lg bg-knowra-primary py-2.5 text-sm font-medium disabled:opacity-40"
          >
            {enviando ? "Iniciando..." : "Iniciar temporada"}
          </button>
        </div>
      )}

      {erro && <p className="text-sm text-red-400 mt-3">{erro}</p>}
    </section>
  );
}
