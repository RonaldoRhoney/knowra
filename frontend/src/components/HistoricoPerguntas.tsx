import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { Pergunta } from "../types/pergunta";

export function HistoricoPerguntas({ atualizarQuando }: { atualizarQuando: number }) {
  const [perguntas, setPerguntas] = useState<Pergunta[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      // Filtro explícito: admin também vê perguntas de outros via RLS (intencional
      // pro Painel ADM), então o histórico pessoal precisa restringir ao próprio usuário.
      supabase
        .from("perguntas")
        .select("id, texto, resposta_ia, criado_em, areas(nome), requer_verificacao, observacao_verificacao")
        .eq("usuario_id", session.user.id)
        .order("criado_em", { ascending: false })
        .then(({ data }) => {
          setPerguntas((data ?? []) as unknown as Pergunta[]);
          setCarregando(false);
        });
    });
  }, [atualizarQuando]);

  if (carregando) return <p className="text-sm text-knowra-text/40 mt-6">Carregando histórico...</p>;

  if (perguntas.length === 0) {
    return (
      <p className="text-sm text-knowra-text/40 mt-6 text-center">
        Suas perguntas anteriores vão aparecer aqui.
      </p>
    );
  }

  return (
    <div className="mt-8 space-y-3">
      <h2 className="text-sm font-semibold text-knowra-text/70">Histórico</h2>
      {perguntas.map((p) => (
        <details key={p.id} className="bg-knowra-surface rounded-xl p-4">
          <summary className="cursor-pointer text-sm flex items-center justify-between gap-2">
            <span className="line-clamp-1 flex items-center gap-1.5">
              {p.requer_verificacao && <span title="Vale conferir em fonte oficial">⚠️</span>}
              {p.texto}
            </span>
            {p.areas?.nome && (
              <span className="text-[10px] shrink-0 text-knowra-accent bg-knowra-accent/10 px-2 py-0.5 rounded-full">
                {p.areas.nome}
              </span>
            )}
          </summary>
          <p className="text-sm text-knowra-text/60 mt-3">{p.resposta_ia}</p>
          {p.requer_verificacao && (
            <p className="text-xs text-knowra-text/40 mt-2">
              ⚠️ Vale conferir em fonte oficial.{p.observacao_verificacao && ` ${p.observacao_verificacao}`}
            </p>
          )}
        </details>
      ))}
    </div>
  );
}
