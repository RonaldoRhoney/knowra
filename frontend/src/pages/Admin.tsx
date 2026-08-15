import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import type { Profile } from "../types/profile";

interface Item {
  nome: string;
  total: number;
}

interface Stats {
  total_usuarios: number;
  total_perguntas: number;
  total_desafios_avaliados: number;
  xp_distribuido: number;
  total_acessos: number;
  acessos_hoje: number;
  acessos_semana: number;
  acessos_mes: number;
  acessos_ano: number;
  top_areas: Item[];
}

interface Demographics {
  dispositivos: Item[];
  paises: Item[];
  regioes: Item[];
  cidades: Item[];
  faixas_etarias: Item[];
  generos: Item[];
  frequencia_14_dias: { data: string; total: number }[];
}

const LABEL_DISPOSITIVO: Record<string, string> = { mobile: "Celular", tablet: "Tablet", desktop: "Desktop" };
const LABEL_GENERO: Record<string, string> = { feminino: "Feminino", masculino: "Masculino", nao_binario: "Não-binário" };

export function Admin() {
  const [usuarios, setUsuarios] = useState<Profile[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [demografia, setDemografia] = useState<Demographics | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      supabase.rpc("admin_list_profiles"),
      supabase.rpc("admin_stats"),
      supabase.rpc("admin_demographics"),
    ]).then(([usuariosRes, statsRes, demografiaRes]) => {
      if (usuariosRes.error || statsRes.error || demografiaRes.error) {
        setErro("Não foi possível carregar os dados do painel.");
      } else {
        setUsuarios((usuariosRes.data ?? []) as Profile[]);
        setStats(statsRes.data as Stats);
        setDemografia(demografiaRes.data as Demographics);
      }
      setCarregando(false);
    });
  }, []);

  return (
    <div className="min-h-screen px-4 py-8 max-w-3xl mx-auto">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold">Painel ADM</h1>
          <p className="text-sm text-knowra-text/60">KnowRa</p>
        </div>
        <Link to="/" className="text-xs text-knowra-text/60 hover:text-knowra-text">
          Voltar
        </Link>
      </header>

      {erro && <p className="text-sm text-red-400 mb-4">{erro}</p>}

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <MetricaCard icone="👥" label="Usuários" valor={stats?.total_usuarios} carregando={carregando} />
        <MetricaCard icone="❓" label="Perguntas" valor={stats?.total_perguntas} carregando={carregando} />
        <MetricaCard
          icone="🎯"
          label="Desafios avaliados"
          valor={stats?.total_desafios_avaliados}
          carregando={carregando}
        />
        <MetricaCard icone="⚡" label="XP distribuído" valor={stats?.xp_distribuido} carregando={carregando} />
      </section>

      <section className="bg-knowra-surface rounded-2xl p-5 mb-6">
        <h2 className="text-sm font-semibold text-knowra-text/80 mb-4">Acessos</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <MetricaCard icone="🕐" label="Hoje" valor={stats?.acessos_hoje} carregando={carregando} fundo="bg-knowra-bg" />
          <MetricaCard icone="📅" label="Semana" valor={stats?.acessos_semana} carregando={carregando} fundo="bg-knowra-bg" />
          <MetricaCard icone="🗓️" label="Mês" valor={stats?.acessos_mes} carregando={carregando} fundo="bg-knowra-bg" />
          <MetricaCard icone="📆" label="Ano" valor={stats?.acessos_ano} carregando={carregando} fundo="bg-knowra-bg" />
          <MetricaCard icone="📈" label="Total" valor={stats?.total_acessos} carregando={carregando} fundo="bg-knowra-bg" />
        </div>
      </section>

      {demografia && demografia.frequencia_14_dias.some((d) => d.total > 0) && (
        <section className="bg-knowra-surface rounded-2xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-knowra-text/80 mb-4">Frequência de uso (14 dias)</h2>
          <FrequenciaChart dados={demografia.frequencia_14_dias} />
        </section>
      )}

      {stats && stats.top_areas.length > 0 && (
        <section className="bg-knowra-surface rounded-2xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-knowra-text/80 mb-4">Áreas mais exploradas</h2>
          <BarList itens={stats.top_areas} />
        </section>
      )}

      {demografia && (
        <section className="grid sm:grid-cols-2 gap-3 mb-6">
          <PainelBarList titulo="Dispositivos" itens={demografia.dispositivos} labels={LABEL_DISPOSITIVO} />
          <PainelBarList titulo="Países" itens={demografia.paises} />
          <PainelBarList titulo="Regiões" itens={demografia.regioes} />
          <PainelBarList titulo="Cidades" itens={demografia.cidades} />
          <PainelBarList titulo="Faixa etária" itens={demografia.faixas_etarias} />
          <PainelBarList titulo="Gênero" itens={demografia.generos} labels={LABEL_GENERO} />
        </section>
      )}

      <section className="bg-knowra-surface rounded-2xl overflow-hidden">
        <h2 className="text-sm font-semibold px-5 pt-5 pb-3 text-knowra-text/80">Usuários</h2>
        {carregando && <p className="px-5 pb-5 text-sm text-knowra-text/50">Carregando...</p>}
        {!carregando && !erro && usuarios.length === 0 && (
          <p className="px-5 pb-5 text-sm text-knowra-text/50">Nenhum usuário cadastrado ainda.</p>
        )}
        {usuarios.length > 0 && (
          <ul className="divide-y divide-white/5">
            {usuarios.map((u) => (
              <li key={u.id} className="flex items-center gap-3 px-5 py-3">
                <div className="w-9 h-9 shrink-0 rounded-full bg-knowra-primary/20 text-knowra-primary grid place-items-center text-sm font-semibold">
                  {(u.nome ?? "?").charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{u.nome ?? "Sem nome"}</span>
                    {u.role === "admin" && (
                      <span className="text-[10px] uppercase tracking-wide text-knowra-accent bg-knowra-accent/10 px-1.5 py-0.5 rounded">
                        admin
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-knowra-text/40">
                    Nível {u.nivel_global} · Rating {u.rating} · desde{" "}
                    {new Date(u.criado_em).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <span className="text-sm font-semibold text-knowra-accent shrink-0">{u.xp_total} XP</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function PainelBarList({ titulo, itens, labels }: { titulo: string; itens: Item[]; labels?: Record<string, string> }) {
  if (itens.length === 0) {
    return (
      <div className="bg-knowra-surface rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-knowra-text/80 mb-1">{titulo}</h2>
        <p className="text-xs text-knowra-text/40">Sem dado suficiente ainda.</p>
      </div>
    );
  }
  return (
    <div className="bg-knowra-surface rounded-2xl p-5">
      <h2 className="text-sm font-semibold text-knowra-text/80 mb-4">{titulo}</h2>
      <Donut itens={itens} labels={labels} />
    </div>
  );
}

// Paleta categórica fixa (nunca reordenada por valor) — cores já usadas no
// design system do KnowRa, com contraste suficiente sobre knowra-surface.
const PALETA_CATEGORICA = ["#38BDF8", "#7C3AED", "#34D399", "#FBBF24", "#E879F9", "#FB923C"];

function Donut({ itens, labels }: { itens: Item[]; labels?: Record<string, string> }) {
  const total = itens.reduce((soma, i) => soma + i.total, 0);
  const raio = 40;
  const circunferencia = 2 * Math.PI * raio;
  const gapDeg = itens.length > 1 ? 3 : 0;
  let anguloAcumulado = 0;

  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 100 100" className="w-24 h-24 shrink-0 -rotate-90">
        {itens.map((item, i) => {
          const fracao = total > 0 ? item.total / total : 0;
          const arcoDeg = Math.max(fracao * 360 - gapDeg, 0);
          const arcoLen = (arcoDeg / 360) * circunferencia;
          const dashoffset = -((anguloAcumulado / 360) * circunferencia);
          anguloAcumulado += fracao * 360;
          return (
            <circle
              key={item.nome}
              cx="50"
              cy="50"
              r={raio}
              fill="none"
              stroke={PALETA_CATEGORICA[i % PALETA_CATEGORICA.length]}
              strokeWidth="16"
              strokeDasharray={`${arcoLen} ${circunferencia}`}
              strokeDashoffset={dashoffset}
            />
          );
        })}
      </svg>
      <div className="flex-1 min-w-0 space-y-1.5">
        {itens.map((item, i) => (
          <div key={item.nome} className="flex items-center gap-2 text-xs">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: PALETA_CATEGORICA[i % PALETA_CATEGORICA.length] }}
            />
            <span
              className="text-knowra-text/70 truncate flex-1"
              title={labels?.[item.nome] ?? item.nome}
            >
              {labels?.[item.nome] ?? item.nome}
            </span>
            <span className="text-knowra-text/40 shrink-0">
              {total > 0 ? Math.round((item.total / total) * 100) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BarList({ itens, labels }: { itens: Item[]; labels?: Record<string, string> }) {
  const max = Math.max(...itens.map((i) => i.total));
  return (
    <div className="space-y-2.5">
      {itens.map((item) => (
        <div key={item.nome} className="flex items-center gap-3">
          <span className="text-xs text-knowra-text/60 w-28 shrink-0 truncate" title={labels?.[item.nome] ?? item.nome}>
            {labels?.[item.nome] ?? item.nome}
          </span>
          <div className="flex-1 h-2 rounded-full bg-knowra-bg overflow-hidden">
            <div
              className="h-full rounded-full bg-knowra-accent transition-all duration-500"
              style={{ width: `${(item.total / max) * 100}%` }}
            />
          </div>
          <span className="text-xs text-knowra-text/40 w-4 text-right shrink-0">{item.total}</span>
        </div>
      ))}
    </div>
  );
}

function FrequenciaChart({ dados }: { dados: { data: string; total: number }[] }) {
  const max = Math.max(1, ...dados.map((d) => d.total));
  return (
    <div className="flex items-end gap-1.5 h-24">
      {dados.map((d) => (
        <div key={d.data} className="flex-1 flex flex-col items-center gap-1 group relative">
          <div
            className="w-full rounded-t-sm bg-knowra-accent transition-all duration-500 min-h-[2px]"
            style={{ height: `${(d.total / max) * 100}%` }}
            title={`${new Date(d.data + "T00:00:00").toLocaleDateString("pt-BR")}: ${d.total}`}
          />
        </div>
      ))}
    </div>
  );
}

function MetricaCard({
  icone,
  label,
  valor,
  carregando,
  fundo = "bg-knowra-surface",
}: {
  icone: string;
  label: string;
  valor: number | undefined;
  carregando: boolean;
  fundo?: string;
}) {
  return (
    <div className={`${fundo} rounded-xl p-4`}>
      <span className="text-lg">{icone}</span>
      <p className="text-xs text-knowra-text/50 mt-2">{label}</p>
      <p className="text-2xl font-bold mt-0.5">{carregando ? "—" : (valor ?? 0)}</p>
    </div>
  );
}
