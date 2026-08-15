import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import type { Profile } from "../types/profile";

export function Admin() {
  const [usuarios, setUsuarios] = useState<Profile[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    supabase.rpc("admin_list_profiles").then(({ data, error }) => {
      if (error) setErro("Não foi possível carregar os usuários.");
      else setUsuarios((data ?? []) as Profile[]);
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

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <MetricaCard label="Usuários" valor={usuarios.length} />
        <MetricaCard label="Perguntas" valor="—" nota="chega na Fase 2" />
        <MetricaCard label="Desafios avaliados" valor="—" nota="chega na Fase 3" />
        <MetricaCard label="XP distribuído" valor="—" nota="chega na Fase 3" />
      </section>

      <section className="bg-knowra-surface rounded-2xl overflow-hidden">
        <h2 className="text-sm font-semibold px-5 pt-5 pb-3 text-knowra-text/80">Usuários</h2>
        {carregando && <p className="px-5 pb-5 text-sm text-knowra-text/50">Carregando...</p>}
        {erro && <p className="px-5 pb-5 text-sm text-red-400">{erro}</p>}
        {!carregando && !erro && usuarios.length === 0 && (
          <p className="px-5 pb-5 text-sm text-knowra-text/50">Nenhum usuário cadastrado ainda.</p>
        )}
        {usuarios.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-knowra-text/40 text-xs uppercase border-t border-white/10">
                <th className="px-5 py-2 font-medium">Nome</th>
                <th className="px-5 py-2 font-medium">Role</th>
                <th className="px-5 py-2 font-medium">Nível</th>
                <th className="px-5 py-2 font-medium">XP</th>
                <th className="px-5 py-2 font-medium">Desde</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id} className="border-t border-white/5">
                  <td className="px-5 py-2.5">{u.nome ?? "—"}</td>
                  <td className="px-5 py-2.5">
                    <span
                      className={
                        u.role === "admin"
                          ? "text-knowra-accent"
                          : "text-knowra-text/60"
                      }
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-5 py-2.5">{u.nivel_global}</td>
                  <td className="px-5 py-2.5">{u.xp_total}</td>
                  <td className="px-5 py-2.5 text-knowra-text/50">
                    {new Date(u.criado_em).toLocaleDateString("pt-BR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function MetricaCard({ label, valor, nota }: { label: string; valor: string | number; nota?: string }) {
  return (
    <div className="bg-knowra-surface rounded-xl p-4">
      <p className="text-xs text-knowra-text/50">{label}</p>
      <p className="text-2xl font-bold mt-1">{valor}</p>
      {nota && <p className="text-[10px] text-knowra-text/30 mt-1">{nota}</p>}
    </div>
  );
}
