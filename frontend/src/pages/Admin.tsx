import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import type { Profile } from "../types/profile";

interface Stats {
  total_usuarios: number;
  total_perguntas: number;
  total_desafios_avaliados: number;
  xp_distribuido: number;
  top_areas: { nome: string; total: number }[];
}

export function Admin() {
  const [usuarios, setUsuarios] = useState<Profile[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([supabase.rpc("admin_list_profiles"), supabase.rpc("admin_stats")]).then(
      ([usuariosRes, statsRes]) => {
        if (usuariosRes.error || statsRes.error) setErro("Não foi possível carregar os dados do painel.");
        else {
          setUsuarios((usuariosRes.data ?? []) as Profile[]);
          setStats(statsRes.data as Stats);
        }
        setCarregando(false);
      },
    );
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

      {stats && stats.top_areas.length > 0 && (
        <section className="bg-knowra-surface rounded-2xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-knowra-text/80 mb-4">Áreas mais exploradas</h2>
          <TopAreas areas={stats.top_areas} />
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
                    Nível {u.nivel_global} · desde {new Date(u.criado_em).toLocaleDateString("pt-BR")}
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

function TopAreas({ areas }: { areas: { nome: string; total: number }[] }) {
  const max = Math.max(...areas.map((a) => a.total));
  return (
    <div className="space-y-2.5">
      {areas.map((a) => (
        <div key={a.nome} className="flex items-center gap-3">
          <span className="text-xs text-knowra-text/60 w-36 shrink-0 truncate" title={a.nome}>
            {a.nome}
          </span>
          <div className="flex-1 h-2 rounded-full bg-knowra-bg overflow-hidden">
            <div
              className="h-full rounded-full bg-knowra-accent transition-all duration-500"
              style={{ width: `${(a.total / max) * 100}%` }}
            />
          </div>
          <span className="text-xs text-knowra-text/40 w-4 text-right shrink-0">{a.total}</span>
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
}: {
  icone: string;
  label: string;
  valor: number | undefined;
  carregando: boolean;
}) {
  return (
    <div className="bg-knowra-surface rounded-xl p-4">
      <span className="text-lg">{icone}</span>
      <p className="text-xs text-knowra-text/50 mt-2">{label}</p>
      <p className="text-2xl font-bold mt-0.5">{carregando ? "—" : (valor ?? 0)}</p>
    </div>
  );
}
