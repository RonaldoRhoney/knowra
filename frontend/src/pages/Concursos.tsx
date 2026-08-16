import { useEffect, useState, type FormEvent } from "react";
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
  status: "aberto" | "andamento" | "encerrado";
  vagas: number | null;
  cadastro_reserva: boolean;
  salario_min: number | null;
  salario_max: number | null;
  escolaridade: string | null;
  localidade: string | null;
  inscricoes_inicio: string | null;
  inscricoes_fim: string | null;
  edital_url: string | null;
  pagina_oficial_url: string | null;
  total_questoes: number;
  questoes_gratis: number;
}

interface Disciplina {
  area_id: string;
  area_nome: string;
  total_questoes: number;
}

interface RecursoVideo {
  id: string;
  video_id: string;
  titulo: string;
  canal: string | null;
  video_url: string;
  topico: string | null;
}

interface ProgressoConcurso {
  concurso_id: string;
  dominio_pct: number;
  concursos: { nome: string } | null;
}

interface ProgressoDisciplina {
  area_id: string;
  dominio_pct: number;
  areas: { nome: string } | null;
}

const STATUS = ["aberto", "andamento", "encerrado"] as const;

export function Concursos() {
  const { t } = useTranslation();
  const { session, profile } = useAuth();
  const [aba, setAba] = useState<(typeof STATUS)[number]>("aberto");
  const [busca, setBusca] = useState("");
  const [concursos, setConcursos] = useState<Concurso[]>([]);
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [recursos, setRecursos] = useState<RecursoVideo[]>([]);
  const [progressoConcursos, setProgressoConcursos] = useState<ProgressoConcurso[]>([]);
  const [progressoDisciplinas, setProgressoDisciplinas] = useState<ProgressoDisciplina[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [mostrarCadastro, setMostrarCadastro] = useState(false);

  function carregarConcursos() {
    return supabase.rpc("listar_concursos", { p_status: aba, p_busca: busca || null, p_limite: 50 }).then(({ data }) => {
      setConcursos((data ?? []) as Concurso[]);
    });
  }

  useEffect(() => {
    if (!session) return;
    setCarregando(true);
    Promise.all([
      carregarConcursos(),
      supabase.rpc("disciplinas_com_pratica").then(({ data }) => setDisciplinas((data ?? []) as Disciplina[])),
      supabase.rpc("listar_recursos_video").then(({ data }) => setRecursos((data ?? []) as RecursoVideo[])),
      supabase
        .from("progresso_concurso")
        .select("concurso_id, dominio_pct, concursos(nome)")
        .eq("usuario_id", session.user.id)
        .then(({ data }) => setProgressoConcursos((data ?? []) as unknown as ProgressoConcurso[])),
      supabase
        .from("progresso_disciplina_questoes")
        .select("area_id, dominio_pct, areas(nome)")
        .eq("usuario_id", session.user.id)
        .then(({ data }) => setProgressoDisciplinas((data ?? []) as unknown as ProgressoDisciplina[])),
    ]).then(() => setCarregando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, aba]);

  function handleBuscar(e: FormEvent) {
    e.preventDefault();
    carregarConcursos();
  }

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

        <form onSubmit={handleBuscar} className="mb-4">
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={t("concursos.placeholderBusca")}
            className="w-full rounded-lg bg-knowra-surface border border-white/10 px-4 py-2.5 text-sm outline-none focus:border-knowra-primary"
          />
        </form>

        <div className="flex gap-2 mb-6">
          {STATUS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setAba(s)}
              className={`text-xs px-3 py-1.5 rounded-full border ${
                aba === s
                  ? "border-knowra-primary bg-knowra-primary/15 text-knowra-primary"
                  : "border-white/10 text-knowra-text/60"
              }`}
            >
              {t(`concursos.status.${s}`)}
            </button>
          ))}
        </div>

        {carregando && <p className="text-sm text-knowra-text/40">{t("common.carregando")}</p>}

        {!carregando && (
          <>
            <section className="mb-6">
              {concursos.length === 0 ? (
                <div className="bg-knowra-surface/50 rounded-2xl p-6 text-center">
                  <p className="text-sm text-knowra-text/50">{t("concursos.semConcursos")}</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {concursos.map((c) => (
                    <div key={c.id} className="bg-knowra-surface rounded-2xl p-4">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium">{c.nome}</p>
                        {c.vagas !== null && (
                          <span className="text-[10px] shrink-0 text-knowra-accent bg-knowra-accent/10 px-2 py-0.5 rounded-full">
                            {t("concursos.vagas", { count: c.vagas })}
                            {c.cadastro_reserva ? " + CR" : ""}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-knowra-text/40 mt-0.5">
                        {[c.orgao, c.banca, c.ano, c.cargo].filter(Boolean).join(" · ") || "—"}
                      </p>
                      {(c.salario_min || c.escolaridade || c.localidade) && (
                        <p className="text-xs text-knowra-text/40 mt-0.5">
                          {[
                            c.salario_min && c.salario_max
                              ? `R$ ${c.salario_min} - R$ ${c.salario_max}`
                              : null,
                            c.escolaridade,
                            c.localidade,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      )}
                      {c.inscricoes_fim && (
                        <p className="text-xs text-knowra-text/40 mt-0.5">
                          {t("concursos.inscricoes")}: {c.inscricoes_inicio} → {c.inscricoes_fim}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        {c.total_questoes > 0 && (
                          <Link to={`/concursos/${c.id}`} className="text-xs text-knowra-accent hover:underline">
                            {c.total_questoes > c.questoes_gratis
                              ? t("concursos.gratisDe", { gratis: c.questoes_gratis, total: c.total_questoes })
                              : t("concursos.questoesDisponiveis", { count: c.total_questoes })}
                          </Link>
                        )}
                        {c.edital_url && (
                          <a
                            href={c.edital_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-knowra-text-secondary hover:text-knowra-text"
                          >
                            {t("concursos.edital")}
                          </a>
                        )}
                        {c.pagina_oficial_url && (
                          <a
                            href={c.pagina_oficial_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-knowra-text-secondary hover:text-knowra-text"
                          >
                            {t("concursos.paginaOficial")}
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="mb-6">
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
                      {d.area_nome} <span className="text-knowra-accent text-xs">({d.total_questoes})</span>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            <section className="mb-6">
              <h2 className="text-sm font-semibold text-knowra-text/80 mb-3">{t("concursos.simulados")}</h2>
              <div className="flex flex-wrap gap-2">
                <Link
                  to="/simulado"
                  className="bg-knowra-surface rounded-full px-4 py-2 text-sm hover:bg-knowra-surface/80 transition-colors"
                >
                  {t("concursos.simuladoRapido")}
                </Link>
                {disciplinas.map((d) => (
                  <Link
                    key={d.area_id}
                    to={`/simulado?area=${d.area_id}`}
                    className="bg-knowra-surface rounded-full px-4 py-2 text-sm hover:bg-knowra-surface/80 transition-colors"
                  >
                    {t("concursos.simuladoDe", { disciplina: d.area_nome })}
                  </Link>
                ))}
              </div>
            </section>

            <section className="mb-6">
              <h2 className="text-sm font-semibold text-knowra-text/80 mb-3">{t("concursos.videoaulas")}</h2>
              {recursos.length === 0 ? (
                <div className="bg-knowra-surface/50 rounded-2xl p-6 text-center">
                  <p className="text-sm text-knowra-text/50">{t("concursos.semVideoaulas")}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recursos.map((r) => (
                    <a
                      key={r.id}
                      href={r.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 bg-knowra-surface rounded-lg px-3 py-2 text-xs text-knowra-text-secondary hover:text-knowra-text transition-colors"
                    >
                      <span aria-hidden>▶️</span>
                      <span className="truncate">{r.titulo}{r.canal ? ` — ${r.canal}` : ""}</span>
                    </a>
                  ))}
                </div>
              )}
            </section>

            {(progressoConcursos.length > 0 || progressoDisciplinas.length > 0) && (
              <section className="mb-6">
                <h2 className="text-sm font-semibold text-knowra-text/80 mb-3">{t("concursos.meuDesempenho")}</h2>
                <div className="bg-knowra-surface rounded-2xl p-4 space-y-2">
                  {progressoConcursos.map((p) => (
                    <div key={p.concurso_id} className="flex items-center justify-between text-xs">
                      <span className="text-knowra-text-secondary truncate">{p.concursos?.nome}</span>
                      <span className="text-knowra-accent font-medium shrink-0">{p.dominio_pct}%</span>
                    </div>
                  ))}
                  {progressoDisciplinas.map((p) => (
                    <div key={p.area_id} className="flex items-center justify-between text-xs">
                      <span className="text-knowra-text-secondary truncate">{p.areas?.nome}</span>
                      <span className="text-knowra-accent font-medium shrink-0">{p.dominio_pct}%</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {profile?.role === "admin" && (
              <section className="mt-6">
                <button
                  type="button"
                  onClick={() => setMostrarCadastro((v) => !v)}
                  className="text-xs text-knowra-text-terciario hover:text-knowra-text-secondary"
                >
                  {mostrarCadastro ? "▾" : "▸"} {t("concursos.adminCadastrar")}
                </button>
                {mostrarCadastro && (
                  <AdminCadastroConcurso onCadastrado={() => carregarConcursos()} />
                )}
              </section>
            )}
          </>
        )}
      </div>
      <Footer />
    </div>
  );
}

function AdminCadastroConcurso({ onCadastrado }: { onCadastrado: () => void }) {
  const { t } = useTranslation();
  const [nome, setNome] = useState("");
  const [orgao, setOrgao] = useState("");
  const [banca, setBanca] = useState("");
  const [cargo, setCargo] = useState("");
  const [status, setStatus] = useState<"aberto" | "andamento" | "encerrado">("aberto");
  const [vagas, setVagas] = useState("");
  const [salarioMin, setSalarioMin] = useState("");
  const [salarioMax, setSalarioMax] = useState("");
  const [escolaridade, setEscolaridade] = useState("");
  const [localidade, setLocalidade] = useState("");
  const [inscricoesInicio, setInscricoesInicio] = useState("");
  const [inscricoesFim, setInscricoesFim] = useState("");
  const [editalUrl, setEditalUrl] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleCadastrar() {
    if (!nome.trim()) return;
    setEnviando(true);
    setErro(null);
    const { error } = await supabase.rpc("cadastrar_concurso", {
      p_nome: nome,
      p_orgao: orgao || null,
      p_banca: banca || null,
      p_cargo: cargo || null,
      p_status: status,
      p_vagas: vagas ? Number(vagas) : null,
      p_salario_min: salarioMin ? Number(salarioMin) : null,
      p_salario_max: salarioMax ? Number(salarioMax) : null,
      p_escolaridade: escolaridade || null,
      p_localidade: localidade || null,
      p_inscricoes_inicio: inscricoesInicio || null,
      p_inscricoes_fim: inscricoesFim || null,
      p_edital_url: editalUrl || null,
    });
    if (error) {
      setErro(error.message);
    } else {
      setNome("");
      setOrgao("");
      setBanca("");
      setCargo("");
      setVagas("");
      setSalarioMin("");
      setSalarioMax("");
      setEscolaridade("");
      setLocalidade("");
      setInscricoesInicio("");
      setInscricoesFim("");
      setEditalUrl("");
      onCadastrado();
    }
    setEnviando(false);
  }

  return (
    <div className="bg-knowra-surface rounded-2xl p-5 mt-3 border border-knowra-primary/30 space-y-3">
      <input
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        placeholder={t("concursos.form.nome")}
        className="w-full rounded-lg bg-knowra-bg border border-white/10 px-3 py-2 text-sm outline-none focus:border-knowra-primary"
      />
      <div className="grid grid-cols-2 gap-3">
        <input
          value={orgao}
          onChange={(e) => setOrgao(e.target.value)}
          placeholder={t("concursos.form.orgao")}
          className="w-full rounded-lg bg-knowra-bg border border-white/10 px-3 py-2 text-sm outline-none focus:border-knowra-primary"
        />
        <input
          value={banca}
          onChange={(e) => setBanca(e.target.value)}
          placeholder={t("concursos.form.banca")}
          className="w-full rounded-lg bg-knowra-bg border border-white/10 px-3 py-2 text-sm outline-none focus:border-knowra-primary"
        />
      </div>
      <input
        value={cargo}
        onChange={(e) => setCargo(e.target.value)}
        placeholder={t("concursos.form.cargo")}
        className="w-full rounded-lg bg-knowra-bg border border-white/10 px-3 py-2 text-sm outline-none focus:border-knowra-primary"
      />
      <div className="flex gap-1.5">
        {STATUS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={`text-xs px-2.5 py-1 rounded-full border ${
              status === s
                ? "border-knowra-primary bg-knowra-primary/15 text-knowra-primary"
                : "border-white/10 text-knowra-text/60"
            }`}
          >
            {t(`concursos.status.${s}`)}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3">
        <input
          value={vagas}
          onChange={(e) => setVagas(e.target.value.replace(/\D/g, ""))}
          placeholder={t("concursos.form.vagas")}
          className="w-full rounded-lg bg-knowra-bg border border-white/10 px-3 py-2 text-sm outline-none focus:border-knowra-primary"
        />
        <input
          value={salarioMin}
          onChange={(e) => setSalarioMin(e.target.value.replace(/[^\d.]/g, ""))}
          placeholder={t("concursos.form.salarioMin")}
          className="w-full rounded-lg bg-knowra-bg border border-white/10 px-3 py-2 text-sm outline-none focus:border-knowra-primary"
        />
        <input
          value={salarioMax}
          onChange={(e) => setSalarioMax(e.target.value.replace(/[^\d.]/g, ""))}
          placeholder={t("concursos.form.salarioMax")}
          className="w-full rounded-lg bg-knowra-bg border border-white/10 px-3 py-2 text-sm outline-none focus:border-knowra-primary"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <input
          value={escolaridade}
          onChange={(e) => setEscolaridade(e.target.value)}
          placeholder={t("concursos.form.escolaridade")}
          className="w-full rounded-lg bg-knowra-bg border border-white/10 px-3 py-2 text-sm outline-none focus:border-knowra-primary"
        />
        <input
          value={localidade}
          onChange={(e) => setLocalidade(e.target.value)}
          placeholder={t("concursos.form.localidade")}
          className="w-full rounded-lg bg-knowra-bg border border-white/10 px-3 py-2 text-sm outline-none focus:border-knowra-primary"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-knowra-text/50 mb-1 block">{t("concursos.form.inscricoesInicio")}</label>
          <input
            type="date"
            value={inscricoesInicio}
            onChange={(e) => setInscricoesInicio(e.target.value)}
            className="w-full rounded-lg bg-knowra-bg border border-white/10 px-3 py-2 text-sm outline-none focus:border-knowra-primary"
          />
        </div>
        <div>
          <label className="text-xs text-knowra-text/50 mb-1 block">{t("concursos.form.inscricoesFim")}</label>
          <input
            type="date"
            value={inscricoesFim}
            onChange={(e) => setInscricoesFim(e.target.value)}
            className="w-full rounded-lg bg-knowra-bg border border-white/10 px-3 py-2 text-sm outline-none focus:border-knowra-primary"
          />
        </div>
      </div>
      <input
        value={editalUrl}
        onChange={(e) => setEditalUrl(e.target.value)}
        placeholder={t("concursos.form.editalUrl")}
        className="w-full rounded-lg bg-knowra-bg border border-white/10 px-3 py-2 text-sm outline-none focus:border-knowra-primary"
      />
      {erro && <p className="text-sm text-red-400">{erro}</p>}
      <button
        type="button"
        onClick={handleCadastrar}
        disabled={enviando || !nome.trim()}
        className="w-full rounded-lg bg-knowra-primary py-2.5 text-sm font-medium disabled:opacity-40"
      >
        {enviando ? t("cadastro.salvando") : t("concursos.form.cadastrar")}
      </button>
    </div>
  );
}
