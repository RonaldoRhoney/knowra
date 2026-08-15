import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Footer } from "../components/Footer";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabaseClient";

interface LinhaGeral {
  posicao: number;
  nickname: string;
  avatar_url: string | null;
  rating: number;
  nivel_global: number;
}

interface LinhaArea {
  posicao: number;
  nickname: string;
  avatar_url: string | null;
  dominio_pct: number;
  total_desafios: number;
}

interface AreaDisponivel {
  area_id: string;
  areas: { nome: string } | null;
}

interface MeuRanking {
  elegivel: boolean;
  rating: number;
  posicao: number;
  total_participantes: number;
  percentil_top: number | null;
  media_rating_plataforma: number | null;
  por_area: {
    area_id: string;
    area_nome: string;
    dominio_pct: number;
    posicao: number;
    total_participantes: number;
  }[];
}

export function Ranking() {
  const { session } = useAuth();
  const [aba, setAba] = useState<string>("geral");
  const [areasDisponiveis, setAreasDisponiveis] = useState<AreaDisponivel[]>([]);
  const [linhasGeral, setLinhasGeral] = useState<LinhaGeral[]>([]);
  const [linhasArea, setLinhasArea] = useState<LinhaArea[]>([]);
  const [meuRanking, setMeuRanking] = useState<MeuRanking | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!session) return;
    Promise.all([
      supabase.rpc("ranking_geral", { p_limite: 50 }),
      supabase.rpc("meu_ranking"),
      supabase
        .from("progresso_area")
        .select("area_id, areas(nome)")
        .eq("usuario_id", session.user.id)
        .order("dominio_pct", { ascending: false }),
    ]).then(([geralRes, meuRes, areasRes]) => {
      setLinhasGeral((geralRes.data ?? []) as LinhaGeral[]);
      if (meuRes.data) setMeuRanking(meuRes.data as MeuRanking);
      setAreasDisponiveis((areasRes.data ?? []) as unknown as AreaDisponivel[]);
      setCarregando(false);
    });
  }, [session]);

  useEffect(() => {
    if (aba === "geral") return;
    supabase.rpc("ranking_por_area", { p_area_id: aba, p_limite: 50 }).then(({ data }) => {
      setLinhasArea((data ?? []) as LinhaArea[]);
    });
  }, [aba]);

  return (
    <div>
      <div className="px-4 py-8 max-w-lg mx-auto">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold">Ranking</h1>
            <p className="text-sm text-knowra-text/60">Como você se compara na plataforma</p>
          </div>
          <Link to="/" className="text-xs text-knowra-text/60 hover:text-knowra-text">
            Voltar
          </Link>
        </header>

        {meuRanking && (
          <section className="bg-knowra-surface rounded-2xl p-5 mb-6">
            {meuRanking.elegivel ? (
              <>
                <p className="text-xs text-knowra-text/50 mb-1">Sua posição</p>
                <p className="text-2xl font-bold text-knowra-accent">
                  #{meuRanking.posicao}{" "}
                  <span className="text-sm font-normal text-knowra-text/60">
                    de {meuRanking.total_participantes}
                  </span>
                </p>
                {meuRanking.percentil_top !== null && (
                  <p className="text-sm text-knowra-text/70 mt-1">
                    Você está entre os {meuRanking.percentil_top}% melhores da plataforma.
                  </p>
                )}
                {meuRanking.media_rating_plataforma !== null && (
                  <p className="text-xs text-knowra-text/40 mt-2">
                    Seu rating: {meuRanking.rating} · média da plataforma:{" "}
                    {meuRanking.media_rating_plataforma}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-knowra-text/60">
                Responda mais desafios pra entrar no ranking (mínimo de 5 avaliados).
              </p>
            )}
          </section>
        )}

        <div className="flex gap-2 overflow-x-auto pb-1 mb-4">
          <button
            onClick={() => setAba("geral")}
            className={`shrink-0 text-xs px-3 py-1.5 rounded-full border ${
              aba === "geral"
                ? "border-knowra-primary bg-knowra-primary/15 text-knowra-primary"
                : "border-white/10 text-knowra-text/60"
            }`}
          >
            Geral
          </button>
          {areasDisponiveis.map((a) => (
            <button
              key={a.area_id}
              onClick={() => setAba(a.area_id)}
              className={`shrink-0 text-xs px-3 py-1.5 rounded-full border ${
                aba === a.area_id
                  ? "border-knowra-primary bg-knowra-primary/15 text-knowra-primary"
                  : "border-white/10 text-knowra-text/60"
              }`}
            >
              {a.areas?.nome ?? "Área"}
            </button>
          ))}
        </div>

        {carregando && <p className="text-sm text-knowra-text/40">Carregando...</p>}

        {!carregando && aba === "geral" && (
          <ListaRanking
            linhas={linhasGeral}
            valorLabel={(l) => `${l.rating} pts`}
            vazio="Ninguém no ranking geral ainda. Ative sua presença no ranking em Perfil pra aparecer aqui."
          />
        )}

        {!carregando && aba !== "geral" && (
          <ListaRanking
            linhas={linhasArea}
            valorLabel={(l) => `${l.dominio_pct}%`}
            vazio="Ninguém no ranking dessa área ainda."
          />
        )}
      </div>
      <Footer />
    </div>
  );
}

function ListaRanking<T extends { posicao: number; nickname: string; avatar_url: string | null }>({
  linhas,
  valorLabel,
  vazio,
}: {
  linhas: T[];
  valorLabel: (linha: T) => string;
  vazio: string;
}) {
  if (linhas.length === 0) {
    return (
      <div className="bg-knowra-surface/50 rounded-2xl p-6 text-center">
        <p className="text-sm text-knowra-text/50">{vazio}</p>
      </div>
    );
  }
  return (
    <div className="bg-knowra-surface rounded-2xl overflow-hidden">
      <ul className="divide-y divide-white/5">
        {linhas.map((l) => (
          <li key={l.posicao} className="flex items-center gap-3 px-5 py-3">
            <span className="w-6 shrink-0 text-sm font-semibold text-knowra-text/40 text-right">
              {l.posicao}
            </span>
            {l.avatar_url ? (
              <img src={l.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-8 h-8 shrink-0 rounded-full bg-knowra-primary/20 text-knowra-primary grid place-items-center text-xs font-semibold">
                {l.nickname.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="flex-1 text-sm font-medium truncate">{l.nickname}</span>
            <span className="text-sm font-semibold text-knowra-accent shrink-0">{valorLabel(l)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
