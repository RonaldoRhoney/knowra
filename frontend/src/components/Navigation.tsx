import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const LINKS = [
  { to: "/como-usar", label: "Como usar" },
  { to: "/mapa", label: "Mapa" },
  { to: "/ranking", label: "Ranking" },
  { to: "/concursos", label: "Concursos" },
  { to: "/temporadas", label: "Temporadas" },
  { to: "/perfil", label: "Perfil" },
];

/**
 * Barra de navegação compartilhada por todas as páginas logadas. Substitui os
 * headers duplicados que cada página reimplementava — corrige o overflow em
 * mobile/tablet (nenhum breakpoint existia antes) com um menu hamburger real.
 */
export function Navigation() {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const [menuAberto, setMenuAberto] = useState(false);

  function linkClasse(to: string) {
    const ativo = location.pathname === to;
    return `text-sm transition-colors ${
      ativo ? "text-knowra-text font-medium" : "text-knowra-text-secondary hover:text-knowra-text"
    }`;
  }

  return (
    <header className="border-b border-knowra-border bg-knowra-bg sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
        <Link to="/" className="text-lg font-bold shrink-0 tracking-tight">
          Know<span className="text-knowra-primary">Ra</span>
        </Link>

        <nav className="hidden lg:flex items-center gap-6 flex-1">
          {LINKS.map((l) => (
            <Link key={l.to} to={l.to} className={linkClasse(l.to)}>
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-5 shrink-0">
          {profile && profile.streak_atual > 0 && (
            <span
              className="text-sm text-knowra-text-secondary flex items-center gap-1.5 shrink-0"
              title="Sequência atual"
            >
              <span aria-hidden>🔥</span>
              <span className="font-semibold text-knowra-text">{profile.streak_atual}</span>
            </span>
          )}
          {profile?.role === "admin" && (
            <Link
              to="/admin"
              className="text-xs font-medium px-3 py-1.5 rounded-full bg-knowra-warning/15 text-knowra-warning border border-knowra-warning/30 whitespace-nowrap shrink-0"
            >
              Painel ADM
            </Link>
          )}
          <span className="w-px h-5 bg-knowra-border shrink-0" aria-hidden />
          <button
            onClick={signOut}
            className="text-sm text-knowra-text-secondary hover:text-knowra-text transition-colors shrink-0"
          >
            Sair
          </button>
        </div>

        <button
          type="button"
          onClick={() => setMenuAberto((v) => !v)}
          aria-label={menuAberto ? "Fechar menu" : "Abrir menu"}
          aria-expanded={menuAberto}
          className="lg:hidden w-9 h-9 grid place-items-center rounded-md text-knowra-text hover:bg-white/5 shrink-0"
        >
          {menuAberto ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </div>

      {menuAberto && (
        <nav className="lg:hidden border-t border-knowra-border px-4 py-3 space-y-1">
          {LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setMenuAberto(false)}
              className={`block py-2 ${linkClasse(l.to)}`}
            >
              {l.label}
            </Link>
          ))}
          {profile?.role === "admin" && (
            <Link
              to="/admin"
              onClick={() => setMenuAberto(false)}
              className="block py-2 text-sm font-medium text-knowra-warning"
            >
              Painel ADM
            </Link>
          )}
          <div className="flex items-center justify-between pt-2 mt-2 border-t border-knowra-border">
            {profile && profile.streak_atual > 0 ? (
              <span className="text-sm text-knowra-text-secondary flex items-center gap-1">
                🔥 <span className="font-semibold text-knowra-text">{profile.streak_atual} dias</span>
              </span>
            ) : (
              <span />
            )}
            <button
              onClick={() => {
                setMenuAberto(false);
                signOut();
              }}
              className="text-sm text-knowra-text-secondary hover:text-knowra-text"
            >
              Sair
            </button>
          </div>
        </nav>
      )}
    </header>
  );
}
