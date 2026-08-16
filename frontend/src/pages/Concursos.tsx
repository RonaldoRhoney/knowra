import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Footer } from "../components/Footer";
import { Navigation } from "../components/Navigation";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabaseClient";

interface Concurso {
  id: string;
  nome: string;
  orgao: string | null;
  banca: string | null;
  ano: number | null;
  cargo: string | null;
  total_questoes: number;
  questoes_gratis: number;
}

interface Disciplina {
  area_id: string;
  area_nome: string;
  total_questoes: number;
}

export function Concursos() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const [concursos, setConcursos] = useState<Concurso[]>([]);
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!session) return;
    Promise.all([supabase.rpc("catalogo_concursos"), supabase.rpc("disciplinas_com_pratica")]).then(
      ([concursosRes, disciplinasRes]) => {
        setConcursos((concursosRes.data ?? []) as Concurso[]);
        setDisciplinas((disciplinasRes.data ?? []) as Disciplina[]);
        setCarregando(false);
      },
    );
  }, [session]);

  return (
    <div>
      <Navigation />
      <div className="px-4 py-8 max-w-3xl mx-auto">
        <div className="mb-4">
          <h1 className="text-h2">{t("nav.concursos")}</h1>
          <p className="text-sm text-knowra-text-secondary mt-0.5">{t("concursos.subtitulo")}</p>
        </div>

        <div className="bg-knowra-accent/10 border border-knowra-accent/20 rounded-xl px-4 py-3 mb-6">
          <p className="text-xs text-knowra-text/70">📝 {t("concursos.avisoIA")}</p>
        </div>

        {carregando && <p className="text-sm text-knowra-text/40">{t("common.carregando")}</p>}

        {!carregando && (
          <>
            <section className="mb-6">
              <h2 className="text-sm font-semibold text-knowra-text/80 mb-3">{t("nav.concursos")}</h2>
              {concursos.length === 0 ? (
                <div className="bg-knowra-surface/50 rounded-2xl p-6 text-center">
                  <p className="text-sm text-knowra-text/50">{t("concursos.semConcursos")}</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {concursos.map((c) => (
                    <Link
                      key={c.id}
                      to={`/concursos/${c.id}`}
                      className="block bg-knowra-surface rounded-2xl p-4 hover:bg-knowra-surface/80 transition-colors"
                    >
                      <p className="text-sm font-medium">{c.nome}</p>
                      <p className="text-xs text-knowra-text/40 mt-0.5">
                        {[c.orgao, c.banca, c.ano, c.cargo].filter(Boolean).join(" · ") || "—"}
                      </p>
                      <p className="text-xs text-knowra-accent mt-1.5">
                        {c.total_questoes > c.questoes_gratis
                          ? t("concursos.gratisDe", { gratis: c.questoes_gratis, total: c.total_questoes })
                          : t("concursos.questoesDisponiveis", { count: c.total_questoes })}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="text-sm font-semibold text-knowra-text/80 mb-3">{t("concursos.praticarPorDisciplina")}</h2>
              {disciplinas.length === 0 ? (
                <div className="bg-knowra-surface/50 rounded-2xl p-6 text-center">
                  <p className="text-sm text-knowra-text/50">{t("concursos.semDisciplinas")}</p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {disciplinas.map((d) => (
                    <Link
                      key={d.area_id}
                      to={`/praticar/${d.area_id}`}
                      className="bg-knowra-surface rounded-full px-4 py-2 text-sm hover:bg-knowra-surface/80 transition-colors"
                    >
                      {d.area_nome}{" "}
                      <span className="text-knowra-accent text-xs">({d.total_questoes})</span>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
      <Footer />
    </div>
  );
}
