import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Footer } from "../components/Footer";
import { Navigation } from "../components/Navigation";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabaseClient";

interface Alternativa {
  letra: string;
  texto: string;
}

interface Questao {
  id: string;
  enunciado: string;
  alternativas: Alternativa[];
  dificuldade: string;
  area_id: string;
}

interface Resultado {
  correta: boolean;
  gabarito: string;
  explicacao: string;
  valida_para_progresso: boolean;
  dominio_pct_concurso: number | null;
}

export function ResolverQuestoes({ modo }: { modo: "concurso" | "area" }) {
  const { id } = useParams<{ id: string }>();
  const { session } = useAuth();
  const [titulo, setTitulo] = useState<string>("");
  const [questoes, setQuestoes] = useState<Questao[]>([]);
  const [indice, setIndice] = useState(0);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [respondendo, setRespondendo] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [tally, setTally] = useState({ acertos: 0, total: 0 });
  const [alternativaEscolhida, setAlternativaEscolhida] = useState<string | null>(null);

  useEffect(() => {
    if (!session || !id) return;

    const carregarTitulo =
      modo === "concurso"
        ? supabase.from("concursos").select("nome").eq("id", id).single()
        : supabase.from("areas").select("nome").eq("id", id).single();

    const carregarQuestoes =
      modo === "concurso"
        ? supabase.rpc("listar_questoes", { p_concurso_id: id, p_area_id: null, p_limite: 20 })
        : supabase.rpc("listar_questoes", { p_concurso_id: null, p_area_id: id, p_limite: 20 });

    Promise.all([carregarTitulo, carregarQuestoes]).then(([tituloRes, questoesRes]) => {
      const nome = (tituloRes.data as { nome: string } | null)?.nome;
      if (nome) setTitulo(nome);
      setQuestoes((questoesRes.data ?? []) as Questao[]);
      setCarregando(false);
    });
  }, [session, id, modo]);

  const questaoAtual = questoes[indice];

  async function handleResponder(alternativa: string) {
    if (!questaoAtual || respondendo) return;
    setRespondendo(true);
    setAlternativaEscolhida(alternativa);
    const { data, error } = await supabase.rpc("responder_questao", {
      p_questao_id: questaoAtual.id,
      p_alternativa: alternativa,
    });
    if (!error && data) {
      const res = data as Resultado;
      setResultado(res);
      setTally((t) => ({ acertos: t.acertos + (res.correta ? 1 : 0), total: t.total + 1 }));
    }
    setRespondendo(false);
  }

  function handleProxima() {
    setResultado(null);
    setAlternativaEscolhida(null);
    setIndice((i) => i + 1);
  }

  if (carregando) {
    return <p className="px-4 py-8 text-sm text-knowra-text/40">Carregando...</p>;
  }

  return (
    <div>
      <Navigation />
      <div className="px-4 py-8 max-w-lg mx-auto">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-h2">{titulo || "Questões"}</h1>
            <p className="text-sm text-knowra-text-secondary mt-0.5">
              {modo === "concurso" ? "Treino de concurso" : "Prática livre por disciplina"}
            </p>
          </div>
          <Link to="/concursos" className="text-xs text-knowra-text-secondary hover:text-knowra-text shrink-0">
            ← Catálogo
          </Link>
        </header>

        {questoes.length === 0 && (
          <div className="bg-knowra-surface/50 rounded-2xl p-6 text-center">
            <p className="text-sm text-knowra-text/50">Nenhuma questão disponível aqui ainda.</p>
          </div>
        )}

        {questaoAtual && (
          <div className="bg-knowra-surface rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-knowra-text/40">
                Questão {indice + 1} de {questoes.length}
              </span>
              <span className="text-xs text-knowra-text/40">
                Acertos: {tally.acertos}/{tally.total}
              </span>
            </div>

            <p className="text-sm mb-4">{questaoAtual.enunciado}</p>

            <div className="space-y-2">
              {questaoAtual.alternativas.map((alt) => {
                let estilo = "border-white/10 text-knowra-text/80";
                if (resultado) {
                  if (alt.letra === resultado.gabarito) {
                    estilo = "border-emerald-500 bg-emerald-500/10 text-emerald-400";
                  } else if (alt.letra === alternativaEscolhida) {
                    estilo = "border-red-500 bg-red-500/10 text-red-400";
                  } else {
                    estilo = "border-white/5 text-knowra-text/40";
                  }
                }
                return (
                  <button
                    key={alt.letra}
                    type="button"
                    disabled={!!resultado || respondendo}
                    onClick={() => handleResponder(alt.letra)}
                    className={`w-full text-left rounded-lg border px-3 py-2.5 text-sm transition-colors disabled:cursor-default ${estilo}`}
                  >
                    <span className="font-semibold mr-2">{alt.letra}</span>
                    {alt.texto}
                  </button>
                );
              })}
            </div>

            {resultado && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className={`text-sm font-semibold mb-1 ${resultado.correta ? "text-emerald-400" : "text-red-400"}`}>
                  {resultado.correta ? "Você acertou!" : "Você errou."}
                </p>
                <p className="text-xs text-knowra-text/50 mb-3">
                  Resposta correta: <span className="font-semibold">{resultado.gabarito}</span>
                </p>
                <p className="text-sm text-knowra-text/70">{resultado.explicacao}</p>

                {resultado.dominio_pct_concurso !== null && (
                  <p className="text-xs text-knowra-text/40 mt-3">
                    Seu domínio neste concurso: {resultado.dominio_pct_concurso}%
                  </p>
                )}

                {indice + 1 < questoes.length ? (
                  <button
                    type="button"
                    onClick={handleProxima}
                    className="w-full rounded-lg bg-knowra-primary py-2.5 text-sm font-medium mt-4"
                  >
                    Próxima questão
                  </button>
                ) : (
                  <div className="mt-4 text-center">
                    <p className="text-sm text-knowra-text/70">
                      Fim das questões disponíveis por aqui. Você acertou {tally.acertos} de {tally.total}.
                    </p>
                    <Link
                      to="/concursos"
                      className="text-xs text-knowra-accent hover:underline mt-2 inline-block"
                    >
                      Voltar ao catálogo →
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
