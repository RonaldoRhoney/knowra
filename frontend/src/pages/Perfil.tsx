import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabaseClient";

const GENEROS = [
  { valor: "feminino", label: "Feminino" },
  { valor: "masculino", label: "Masculino" },
  { valor: "nao_binario", label: "Não-binário" },
  { valor: "prefiro_nao_informar", label: "Prefiro não informar" },
];

export function Perfil() {
  const { profile, session, refreshProfile } = useAuth();
  const [nome, setNome] = useState(profile?.nome ?? "");
  const [cidade, setCidade] = useState(profile?.cidade ?? "");
  const [pais, setPais] = useState(profile?.pais ?? "");
  const [idade, setIdade] = useState(profile?.idade ? String(profile.idade) : "");
  const [genero, setGenero] = useState(profile?.genero ?? "");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  if (!profile) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (nome.trim().length === 0) return;
    setEnviando(true);
    setErro(null);
    setSalvo(false);
    const { error } = await supabase.rpc("completar_cadastro", {
      p_nome: nome,
      p_cidade: cidade || null,
      p_pais: pais || null,
      p_idade: idade ? Number(idade) : null,
      p_genero: genero || null,
    });
    if (error) {
      setErro("Não foi possível salvar agora. Tente novamente.");
    } else {
      await refreshProfile();
      setSalvo(true);
    }
    setEnviando(false);
  }

  return (
    <div className="min-h-screen px-4 py-8 max-w-md mx-auto">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold">Perfil</h1>
          <p className="text-sm text-knowra-text/60">Gerencie suas informações</p>
        </div>
        <Link to="/" className="text-xs text-knowra-text/60 hover:text-knowra-text">
          Voltar
        </Link>
      </header>

      <div className="flex items-center gap-3 mb-6">
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt="" className="w-14 h-14 rounded-full object-cover" />
        ) : (
          <div className="w-14 h-14 rounded-full bg-knowra-primary/20 text-knowra-primary grid place-items-center text-xl font-semibold">
            {(profile.nome ?? "?").charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <p className="text-sm font-medium">{profile.nome ?? "Sem nome"}</p>
          <p className="text-xs text-knowra-text/40">{session?.user.email}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-knowra-surface rounded-2xl p-5 space-y-3">
        <div>
          <label className="text-xs text-knowra-text/50 mb-1 block">Nome</label>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
            className="w-full rounded-lg bg-knowra-bg border border-white/10 px-3 py-2 text-sm outline-none focus:border-knowra-primary"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-knowra-text/50 mb-1 block">Cidade</label>
            <input
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              className="w-full rounded-lg bg-knowra-bg border border-white/10 px-3 py-2 text-sm outline-none focus:border-knowra-primary"
            />
          </div>
          <div>
            <label className="text-xs text-knowra-text/50 mb-1 block">País</label>
            <input
              value={pais}
              onChange={(e) => setPais(e.target.value)}
              className="w-full rounded-lg bg-knowra-bg border border-white/10 px-3 py-2 text-sm outline-none focus:border-knowra-primary"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-knowra-text/50 mb-1 block">Idade</label>
          <input
            value={idade}
            onChange={(e) => setIdade(e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            maxLength={3}
            className="w-full rounded-lg bg-knowra-bg border border-white/10 px-3 py-2 text-sm outline-none focus:border-knowra-primary"
          />
        </div>

        <div>
          <label className="text-xs text-knowra-text/50 mb-1.5 block">Gênero</label>
          <div className="flex flex-wrap gap-1.5">
            {GENEROS.map((g) => (
              <button
                type="button"
                key={g.valor}
                onClick={() => setGenero(g.valor)}
                className={`text-xs px-2.5 py-1 rounded-full border ${
                  genero === g.valor
                    ? "border-knowra-primary bg-knowra-primary/15 text-knowra-primary"
                    : "border-white/10 text-knowra-text/60"
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {erro && <p className="text-sm text-red-400">{erro}</p>}
        {salvo && <p className="text-sm text-emerald-400">Perfil atualizado.</p>}

        <button
          type="submit"
          disabled={enviando || nome.trim().length === 0}
          className="w-full rounded-lg bg-knowra-primary py-2.5 text-sm font-medium disabled:opacity-40"
        >
          {enviando ? "Salvando..." : "Salvar alterações"}
        </button>
      </form>

      <div className="bg-knowra-surface rounded-2xl p-5 mt-4">
        <p className="text-xs text-knowra-text/50 mb-2">Progresso</p>
        <div className="flex justify-between text-sm">
          <span className="text-knowra-text/70">Nível {profile.nivel_global}</span>
          <span className="text-knowra-accent font-medium">{profile.xp_total} XP</span>
        </div>
      </div>
    </div>
  );
}
