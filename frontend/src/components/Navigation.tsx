import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import { SeletorIdioma } from "./SeletorIdioma";

function useLinks() {
  const { t } = useTranslation();
  return [
    { to: "/como-usar", label: t("nav.comoUsar") },
    { to: "/mapa", label: t("nav.mapa") },
    { to: "/ranking", label: t("nav.ranking") },
    { to: "/concursos", label: t("nav.concursos") },
    { to: "/temporadas", label: t("nav.temporadas") },
    { to: "/perfil", label: t("nav.perfil") },
  ];
}

/**
 * Barra de navegação compartilhada por todas as páginas logadas. Substitui os
 * headers duplicados que cada página reimplementava — corrige o overflow em
 * mobile/tablet (nenhum breakpoint existia antes) com um menu hamburger real.
 */
export function Navigation() {
  const { profile, signOut } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();
  const [menuAberto, setMenuAberto] = useState(false);
  const LINKS = useLinks();

  function linkClasse(to: string) {
    const ativo = location.pathname === to;
    return `text-sm transition-colors ${
      ativo ? "text-knowra-text font-medium" : "text-knowra-text-secondary hover:text-knowra-text"
    }`;
  }

  return (
    <header className="border-b border-knowra-border bg-knowra-bg sticky top-0 z-40">
      <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between lg:justify-start gap-2 lg:gap-6">
        <Link to="/" className="text-lg font-bold shrink-0 tracking-tight leading-none">
          Know<span className="text-knowra-primary">Ra</span>
        </Link>

        {/* Nav e ações ficam colados entre si e à logo — sem flex-1/ml-auto
            "esticando" o bloco, que criava um vão vazio (seja antes do nav,
            seja entre Perfil e o ícone de sequência) proporcional à largura
            sobrando na tela. O bloco fica com respiração fixa e consistente,
            sem tentar preencher a largura do header. */}
        <div className="hidden lg:flex items-center gap-5 min-w-0">
          <nav className="flex items-center gap-4 shrink-0">
            {LINKS.map((l) => (
              <Link key={l.to} to={l.to} className={linkClasse(l.to)}>
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            {profile && profile.streak_atual > 0 && (
              <span
                className="text-sm text-knowra-text-secondary flex items-center gap-1.5 shrink-0"
                title={t("nav.sequencia")}
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
                {t("nav.painelAdm")}
              </Link>
            )}
            <span className="w-px h-5 bg-knowra-border shrink-0" aria-hidden />
            {profile && (
              <span className="text-sm text-knowra-text-secondary truncate max-w-[8rem] shrink-0" title={profile.nome ?? undefined}>
                {profile.nome ?? "—"}
              </span>
            )}
            <SeletorIdioma />
            <button
              onClick={signOut}
              className="text-sm text-knowra-text-secondary hover:text-knowra-text transition-colors shrink-0"
            >
              {t("nav.sair")}
            </button>
          </div>
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
              {t("nav.painelAdm")}
            </Link>
          )}
          <div className="flex items-center justify-between pt-2 mt-2 border-t border-knowra-border">
            {profile && profile.streak_atual > 0 ? (
              <span className="text-sm text-knowra-text-secondary flex items-center gap-1">
                🔥{" "}
                <span className="font-semibold text-knowra-text">
                  {profile.streak_atual} {t("nav.dias")}
                </span>
              </span>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2">
              {profile && <span className="text-sm text-knowra-text-secondary">{profile.nome ?? "—"}</span>}
              <SeletorIdioma />
            </div>
          </div>
          <button
            onClick={() => {
              setMenuAberto(false);
              signOut();
            }}
            className="block w-full text-left py-2 text-sm text-knowra-text-secondary hover:text-knowra-text"
          >
            {t("nav.sair")}
          </button>
        </nav>
      )}
    </header>
  );
}
