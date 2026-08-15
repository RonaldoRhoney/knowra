import { Link } from "react-router-dom";
import { Footer } from "../components/Footer";

export function ComoUsar() {
  return (
    <div>
      <div className="px-4 py-8 max-w-lg mx-auto">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-bold">Como usar</h1>
            <p className="text-sm text-knowra-text/60">Do primeiro "por quê" até o seu primeiro nível</p>
          </div>
          <Link to="/" className="text-xs text-knowra-text/60 hover:text-knowra-text">
            Voltar
          </Link>
        </header>

        <div className="space-y-10">
          <Passo
            numero={1}
            titulo="Pergunte qualquer coisa"
            texto="Sem categoria, sem formulário — só digite o que te deixou curioso e clique em Perguntar."
          >
            <div className="bg-knowra-bg rounded-xl p-3 border border-white/10">
              <p className="text-sm text-knowra-text/40">Por que o céu é azul?</p>
            </div>
            <div className="flex justify-end mt-2">
              <span className="rounded-lg bg-knowra-primary px-3 py-1.5 text-xs font-medium">Perguntar</span>
            </div>
          </Passo>

          <Passo
            numero={2}
            titulo="Receba uma resposta de verdade"
            texto="A IA do KnowRa explica de forma clara, sem jargão — do jeito que qualquer pessoa curiosa entende."
          >
            <p className="text-xs text-knowra-text/60 leading-relaxed">
              O céu é azul por causa da dispersão de Rayleigh — a luz solar se espalha mais na cor azul do que
              nas outras cores ao atravessar a atmosfera...
            </p>
          </Passo>

          <Passo
            numero={3}
            titulo="Aceite o desafio"
            texto="Depois da resposta, você pode testar se realmente entendeu — sem obrigação, sem penalidade por errar."
          >
            <span className="inline-block text-[10px] font-mono uppercase tracking-wide px-2 py-0.5 rounded-md text-knowra-accent bg-knowra-accent/10 mb-2">
              Normal
            </span>
            <p className="text-xs text-knowra-text/70">Explique com suas palavras por que o céu não é vermelho.</p>
          </Passo>

          <Passo
            numero={4}
            titulo="Ganhe XP e suba de nível"
            texto="Sua resposta é avaliada de verdade — quanto mais você demonstra que aprendeu, mais XP você ganha."
          >
            <div className="flex items-center gap-3">
              <div
                className="relative w-12 h-12 shrink-0 rounded-full grid place-items-center text-emerald-400"
                style={{ background: "conic-gradient(currentColor 88%, rgba(255,255,255,0.08) 0)" }}
              >
                <span className="w-9 h-9 rounded-full bg-knowra-surface grid place-items-center text-xs font-bold text-knowra-text">
                  88
                </span>
              </div>
              <span className="text-knowra-accent text-sm font-semibold">+31 XP</span>
            </div>
          </Passo>

          <Passo
            numero={5}
            titulo="Acompanhe sua evolução"
            texto="Nível, sequência de dias e conquistas ficam sempre visíveis no topo — e você edita seus dados quando quiser em Perfil."
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-mono uppercase tracking-wide text-knowra-primary bg-knowra-primary/15 px-2 py-0.5 rounded-md">
                Nível 2
              </span>
              <span className="text-xs text-knowra-text/60">Explorador</span>
            </div>
            <div className="h-1.5 rounded-full bg-knowra-bg overflow-hidden">
              <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-knowra-primary to-knowra-accent" />
            </div>
          </Passo>
        </div>

        <div className="mt-10 text-center">
          <Link
            to="/"
            className="inline-block rounded-lg bg-knowra-primary px-5 py-2.5 text-sm font-medium"
          >
            Começar agora
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );
}

function Passo({
  numero,
  titulo,
  texto,
  children,
}: {
  numero: number;
  titulo: string;
  texto: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[auto_1fr] gap-4">
      <div className="w-8 h-8 rounded-full bg-knowra-primary/15 text-knowra-primary grid place-items-center text-sm font-bold shrink-0">
        {numero}
      </div>
      <div>
        <h2 className="font-semibold mb-1">{titulo}</h2>
        <p className="text-sm text-knowra-text/60 mb-3">{texto}</p>
        <div className="bg-knowra-surface rounded-2xl p-4">{children}</div>
      </div>
    </div>
  );
}
