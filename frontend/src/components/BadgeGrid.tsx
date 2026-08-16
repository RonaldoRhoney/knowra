import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { BADGES, BADGE_ICONE_PADRAO } from "../lib/badges";
import { supabase } from "../lib/supabaseClient";

interface BadgeCatalogo {
  codigo: string;
  nome: string;
  descricao: string;
}

/**
 * Grade de conquistas — conquistadas e bloqueadas, visíveis pro usuário comum
 * (antes, o catálogo completo só existia dentro do simulador admin-only).
 * Nome/descrição vêm do banco (fonte única de verdade), não de uma cópia
 * local — evita o tipo de drift que deixou as badges de liga invisíveis.
 */
export function BadgeGrid({ atualizarQuando }: { atualizarQuando: number }) {
  const { t } = useTranslation();
  const [catalogo, setCatalogo] = useState<BadgeCatalogo[]>([]);
  const [conquistados, setConquistados] = useState<Set<string>>(new Set());
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      Promise.all([
        supabase.from("badges").select("codigo, nome, descricao").order("codigo"),
        supabase.from("usuario_badges").select("badges(codigo)").eq("usuario_id", session.user.id),
      ]).then(([catalogoRes, conquistadosRes]) => {
        setCatalogo((catalogoRes.data ?? []) as BadgeCatalogo[]);
        const codigos = ((conquistadosRes.data ?? []) as unknown as { badges: { codigo: string } | null }[])
          .map((r) => r.badges?.codigo)
          .filter((c): c is string => Boolean(c));
        setConquistados(new Set(codigos));
        setCarregando(false);
      });
    });
  }, [atualizarQuando]);

  if (carregando || catalogo.length === 0) return null;

  return (
    <div className="bg-knowra-surface rounded-hero p-5 mt-4">
      <h2 className="text-sm font-semibold text-knowra-text-secondary mb-3">
        {t("progresso.conquistas")} <span className="text-knowra-text-terciario">({conquistados.size}/{catalogo.length})</span>
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {catalogo.map((b) => {
          const conquistado = conquistados.has(b.codigo);
          const icone = BADGES[b.codigo]?.icone ?? BADGE_ICONE_PADRAO;
          return (
            <div
              key={b.codigo}
              title={b.descricao}
              className={`rounded-xl p-3 border ${
                conquistado
                  ? "bg-knowra-primary/10 border-knowra-primary/30"
                  : "bg-knowra-bg border-knowra-border"
              }`}
            >
              <span className={`text-2xl block mb-1.5 ${conquistado ? "" : "grayscale opacity-40"}`}>{icone}</span>
              <p className={`text-xs font-medium ${conquistado ? "text-knowra-text" : "text-knowra-text-terciario"}`}>
                {b.nome}
              </p>
              <p className="text-[11px] text-knowra-text-terciario mt-0.5 line-clamp-2">{b.descricao}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
