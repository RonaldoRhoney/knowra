import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Footer } from "../components/Footer";
import { Navigation } from "../components/Navigation";
import { supabase } from "../lib/supabaseClient";

interface Progresso {
  area_id: string;
  dominio_pct: number;
  total_desafios: number;
  areas: { nome: string } | null;
}

export function MapaConhecimento() {
  const { t } = useTranslation();
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
      <Navigation />
      <div className="px-4 py-8 max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-h2">{t("mapa.titulo")}</h1>
          <p className="text-sm text-knowra-text-secondary mt-0.5">{t("mapa.subtitulo")}</p>
        </div>

        {carregando && <p className="text-sm text-knowra-text/40">{t("common.carregando")}</p>}

        {!carregando && progresso.length === 0 && (
          <div className="bg-knowra-surface/50 rounded-2xl p-6 text-center">
            <p className="text-sm text-knowra-text/50">{t("mapa.vazio")}</p>
          </div>
        )}

        {progresso.length > 0 && (
          <div className="bg-knowra-surface rounded-2xl p-5 space-y-4">
            {progresso.map((p) => (
              <div key={p.area_id}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium">{p.areas?.nome ?? t("mapa.area")}</span>
                  <span className="text-xs text-knowra-text/40">
                    {p.dominio_pct}% · {t("mapa.desafios", { count: p.total_desafios })}
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
