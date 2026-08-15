import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Footer } from "../components/Footer";
import { supabase } from "../lib/supabaseClient";

interface Progresso {
  area_id: string;
  dominio_pct: number;
  total_desafios: number;
  areas: { nome: string } | null;
}

export function MapaConhecimento() {
  const [progresso, setProgresso] = useState<Progresso[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      supabase
        .from("progresso_area")
        .select("area_id, dominio_pct, total_desafios, areas(nome)")
        .eq("usuario_id", session.user.id)
        .order("dominio_pct", { ascending: false })
        .then(({ data }) => {
          setProgresso((data ?? []) as unknown as Progresso[]);
          setCarregando(false);
        });
    });
  }, []);

  return (
    <div>
      <div className="px-4 py-8 max-w-lg mx-auto">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-bold">Mapa de Conhecimento</h1>
            <p className="text-sm text-knowra-text/60">Seu domínio por área, baseado nos desafios avaliados</p>
          </div>
          <Link to="/" className="text-xs text-knowra-text/60 hover:text-knowra-text">
            Voltar
          </Link>
        </header>

        {carregando && <p className="text-sm text-knowra-text/40">Carregando...</p>}

        {!carregando && progresso.length === 0 && (
          <div className="bg-knowra-surface/50 rounded-2xl p-6 text-center">
            <p className="text-sm text-knowra-text/50">
              Responda alguns desafios pra começar a ver seu domínio por área aqui.
            </p>
          </div>
        )}

        {progresso.length > 0 && (
          <div className="bg-knowra-surface rounded-2xl p-5 space-y-4">
            {progresso.map((p) => (
              <div key={p.area_id}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium">{p.areas?.nome ?? "Área"}</span>
                  <span className="text-xs text-knowra-text/40">
                    {p.dominio_pct}% · {p.total_desafios} desafio{p.total_desafios !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-knowra-bg overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-knowra-primary to-knowra-accent transition-all duration-500"
                    style={{ width: `${p.dominio_pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
