import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export function Home() {
  const { profile, signOut } = useAuth();

  return (
    <div className="min-h-screen px-4 py-8 max-w-lg mx-auto">
      <header className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-xl font-bold">KnowRa</h1>
          <p className="text-sm text-knowra-text/60">
            Olá, {profile?.nome ?? "explorador"}! Nível {profile?.nivel_global ?? 1}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {profile?.role === "admin" && (
            <Link to="/admin" className="text-xs text-knowra-accent hover:underline">
              Painel ADM
            </Link>
          )}
          <button onClick={signOut} className="text-xs text-knowra-text/60 hover:text-knowra-text">
            Sair
          </button>
        </div>
      </header>

      <div className="bg-knowra-surface rounded-2xl p-6 text-center">
        <p className="text-knowra-text/70 mb-1">
          Sua jornada de curiosidade está começando.
        </p>
        <p className="text-sm text-knowra-text/40">
          O campo "Pergunte qualquer coisa" chega na Fase 2 — por enquanto, sua conta e nível já estão prontos.
        </p>
      </div>
    </div>
  );
}
