import { useState } from "react";
import { Link } from "react-router-dom";
import { Footer } from "../components/Footer";

const PASSOS = [
  {
    titulo: "Pergunte qualquer coisa",
    texto: "Sem categoria, sem formulário — só digite o que te deixou curioso e clique em Perguntar.",
    tela: (
      <div className="bg-knowra-bg rounded-2xl p-4 border border-white/10">
        <p className="text-sm text-knowra-text/40 mb-4">Por que o céu é azul?</p>
        <div className="flex justify-end">
          <span className="rounded-lg bg-knowra-primary px-4 py-2 text-sm font-medium">Perguntar</span>
        </div>
      </div>
    ),
  },
  {
    titulo: "Receba uma resposta de verdade",
    texto: "A IA do KnowRa explica de forma clara, sem jargão — do jeito que qualquer pessoa curiosa entende.",
    tela: (
      <div className="bg-knowra-bg rounded-2xl p-5 border border-white/10">
        <p className="text-sm text-knowra-text/70 leading-relaxed">
          O céu é azul por causa da dispersão de Rayleigh — a luz solar se espalha mais na cor azul do que nas
          outras cores ao atravessar a atmosfera. É por isso que o céu não parece roxo ou verde, mesmo essas
          cores estando presentes na luz do sol.
        </p>
      </div>
    ),
  },
  {
    titulo: "Aceite o desafio",
    texto: "Depois da resposta, você pode testar se realmente entendeu — sem obrigação, sem penalidade por errar.",
    tela: (
      <div className="bg-knowra-bg rounded-2xl p-5 border border-white/10">
        <span className="inline-block text-[10px] font-mono uppercase tracking-wide px-2 py-0.5 rounded-md text-knowra-accent bg-knowra-accent/10 mb-3">
          Normal
        </span>
        <p className="text-sm text-knowra-text/80 mb-4">
          Explique com suas palavras por que o céu não é vermelho.
        </p>
        <div className="rounded-lg bg-knowra-surface border border-white/10 h-10" />
      </div>
    ),
  },
  {
    titulo: "Ganhe XP e suba de nível",
    texto: "Sua resposta é avaliada de verdade — quanto mais você demonstra que aprendeu, mais XP você ganha.",
    tela: (
      <div className="bg-knowra-bg rounded-2xl p-5 border border-white/10 flex items-center gap-4">
        <div
          className="relative w-16 h-16 shrink-0 rounded-full grid place-items-center text-emerald-400"
          style={{ background: "conic-gradient(currentColor 88%, rgba(255,255,255,0.08) 0)" }}
        >
          <span className="w-12 h-12 rounded-full bg-knowra-bg grid place-items-center text-sm font-bold text-knowra-text">
            88
          </span>
        </div>
        <div>
          <p className="text-xs text-knowra-text/40 uppercase tracking-wide">Conhecimento demonstrado</p>
          <p className="text-knowra-accent font-semibold text-lg">+31 XP</p>
        </div>
      </div>
    ),
  },
  {
    titulo: "Acompanhe sua evolução",
    texto:
      "Nível, sequência de dias e conquistas ficam sempre visíveis. Edite seus dados quando quiser em Perfil, e veja seu domínio por área no Mapa de Conhecimento.",
    tela: (
      <div className="bg-knowra-bg rounded-2xl p-5 border border-white/10">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] font-mono uppercase tracking-wide text-knowra-primary bg-knowra-primary/15 px-2 py-0.5 rounded-md">
            Nível 2
          </span>
          <span className="text-xs text-knowra-text/60">Explorador</span>
          <span className="text-xs ml-auto">🔥 3 dias</span>
        </div>
        <div className="h-1.5 rounded-full bg-knowra-surface overflow-hidden">
          <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-knowra-primary to-knowra-accent" />
        </div>
      </div>
    ),
  },
];

export function ComoUsar() {
  const [passo, setPasso] = useState(0);
  const ultimo = passo === PASSOS.length - 1;
  const atual = PASSOS[passo];

  return (
    <div>
      <div className="px-4 py-8 max-w-sm mx-auto min-h-[80vh] flex flex-col">
        <header className="flex items-center justify-between mb-8">
          <h1 className="text-lg font-bold">Como usar</h1>
          <Link to="/" className="text-xs text-knowra-text/60 hover:text-knowra-text">
            Pular
          </Link>
        </header>

        <div className="flex-1 flex flex-col justify-center">
          <div className="flex justify-center gap-1.5 mb-8">
            {PASSOS.map((_, i) => (
              <button
                key={i}
                onClick={() => setPasso(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === passo ? "w-6 bg-knowra-primary" : "w-1.5 bg-white/15"
                }`}
                aria-label={`Ir para o passo ${i + 1}`}
              />
            ))}
          </div>

          <div className="w-8 h-8 rounded-full bg-knowra-primary/15 text-knowra-primary grid place-items-center text-sm font-bold mx-auto mb-4">
            {passo + 1}
          </div>

          <h2 className="text-xl font-bold text-center mb-2">{atual.titulo}</h2>
          <p className="text-sm text-knowra-text/60 text-center mb-6 px-2">{atual.texto}</p>

          <div className="bg-knowra-surface rounded-2xl p-3">{atual.tela}</div>
        </div>

        <div className="flex items-center gap-3 mt-8">
          {passo > 0 && (
            <button
              onClick={() => setPasso((p) => p - 1)}
              className="rounded-lg border border-white/10 px-4 py-2.5 text-sm font-medium hover:bg-white/5"
            >
              Anterior
            </button>
          )}
          {ultimo ? (
            <Link
              to="/"
              className="flex-1 text-center rounded-lg bg-knowra-primary py-2.5 text-sm font-medium"
            >
              Começar agora
            </Link>
          ) : (
            <button
              onClick={() => setPasso((p) => p + 1)}
              className="flex-1 rounded-lg bg-knowra-primary py-2.5 text-sm font-medium"
            >
              Próximo
            </button>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
