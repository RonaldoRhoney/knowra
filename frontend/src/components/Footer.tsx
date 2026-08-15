import { Link } from "react-router-dom";

// Rodapé padrão RhoneyInc (skill footer-padrao): 4 colunas fixas —
// Marca / Produto / RhoneyInc / Legal — só cor/logo/texto mudam por produto.
export function Footer() {
  return (
    <footer className="bg-knowra-surface mt-16 pt-14 pb-7">
      <div className="max-w-3xl mx-auto px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr] gap-8 pb-9 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-3.5">
              <div
                className="w-7 h-7 rounded-full"
                style={{ background: "radial-gradient(circle at 35% 35%, #7C3AED, rgba(124,58,237,0))" }}
              />
              <span className="font-semibold">KnowRa</span>
            </div>
            <p className="text-sm text-knowra-text/60 max-w-[260px] mb-4">
              Transforme sua curiosidade em conhecimento — feito pela RhoneyInc.
            </p>
            <span className="font-mono text-[11px] tracking-wide bg-knowra-primary/15 text-knowra-primary px-3 py-1.5 rounded-lg inline-block">
              Uma conta. Todos os softwares.
            </span>
            <div className="flex gap-2.5 mt-4">
              <a
                href="https://github.com/RonaldoRhoney"
                target="_blank"
                rel="noopener"
                aria-label="GitHub"
                className="w-8 h-8 rounded-full bg-white/5 grid place-items-center text-sm hover:bg-white/10"
              >
                💻
              </a>
              <a
                href="https://www.instagram.com/ronaldorhoney"
                target="_blank"
                rel="noopener"
                aria-label="Instagram"
                className="w-8 h-8 rounded-full bg-white/5 grid place-items-center text-sm hover:bg-white/10"
              >
                📷
              </a>
              <a
                href="https://www.linkedin.com/in/ronaldomartinsrhoney/"
                target="_blank"
                rel="noopener"
                aria-label="LinkedIn"
                className="w-8 h-8 rounded-full bg-white/5 grid place-items-center text-sm hover:bg-white/10"
              >
                💼
              </a>
            </div>
          </div>

          <div>
            <h5 className="font-mono text-xs uppercase tracking-wide text-knowra-primary mb-3.5">Produto</h5>
            <Link to="/" className="block text-sm text-knowra-text/60 hover:text-knowra-text mb-2.5">
              Início
            </Link>
            <Link to="/como-usar" className="block text-sm text-knowra-text/60 hover:text-knowra-text mb-2.5">
              Como usar
            </Link>
            <Link to="/mapa" className="block text-sm text-knowra-text/60 hover:text-knowra-text mb-2.5">
              Mapa de Conhecimento
            </Link>
            <Link to="/perfil" className="block text-sm text-knowra-text/60 hover:text-knowra-text mb-2.5">
              Perfil
            </Link>
          </div>

          <div>
            <h5 className="font-mono text-xs uppercase tracking-wide text-knowra-primary mb-3.5">RhoneyInc</h5>
            <a href="https://meupet-zeta.vercel.app" className="block text-sm text-knowra-text/60 hover:text-knowra-text mb-2.5">
              MeuPet
            </a>
            <a href="https://finwise.rhoneyinc.com" className="block text-sm text-knowra-text/60 hover:text-knowra-text mb-2.5">
              FinWise
            </a>
            <a href="https://fitnow.rhoneyinc.com" className="block text-sm text-knowra-text/60 hover:text-knowra-text mb-2.5">
              FitNow
            </a>
            <a href="https://menuflex.rhoneyinc.com" className="block text-sm text-knowra-text/60 hover:text-knowra-text mb-2.5">
              MenuFlex
            </a>
            <a href="https://rhoneyinc.com" className="block text-sm text-knowra-text/60 hover:text-knowra-text mb-2.5">
              Sobre nós
            </a>
          </div>

          <div>
            <h5 className="font-mono text-xs uppercase tracking-wide text-knowra-primary mb-3.5">Legal</h5>
            <Link to="/privacidade" className="block text-sm text-knowra-text/60 hover:text-knowra-text mb-2.5">
              Privacidade (LGPD)
            </Link>
            <Link to="/termos" className="block text-sm text-knowra-text/60 hover:text-knowra-text mb-2.5">
              Termos de uso
            </Link>
            <a href="mailto:rhoneyinc@gmail.com" className="block text-sm text-knowra-text/60 hover:text-knowra-text mb-2.5">
              Contato
            </a>
          </div>
        </div>

        <div className="flex justify-between items-center flex-wrap gap-3 pt-5 text-xs text-knowra-text/40">
          <span>© {new Date().getFullYear()} KnowRa — um produto RhoneyInc. Todos os direitos reservados.</span>
          <span className="font-mono">knowra.rhoneyinc.com</span>
        </div>
      </div>
    </footer>
  );
}
