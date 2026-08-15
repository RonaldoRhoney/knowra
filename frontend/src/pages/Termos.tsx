import { Link } from "react-router-dom";
import { Footer } from "../components/Footer";

export function Termos() {
  return (
    <div>
      <div className="min-h-screen px-4 py-8 max-w-xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <h1 className="text-xl font-bold">Termos de uso</h1>
          <Link to="/" className="text-xs text-knowra-text/60 hover:text-knowra-text">
            Voltar
          </Link>
        </header>

        <div className="space-y-4 text-sm text-knowra-text/70 leading-relaxed">
          <p>O KnowRa é um produto da RhoneyInc, atualmente em desenvolvimento ativo.</p>
          <p>
            <strong className="text-knowra-text">O que o produto faz</strong>: você pergunta qualquer coisa, recebe
            uma resposta gerada por IA, e pode testar seu entendimento respondendo a um desafio — ganhando XP,
            nível e conquistas conforme demonstra conhecimento real.
          </p>
          <p>
            <strong className="text-knowra-text">Respostas geradas por IA</strong>: são geradas automaticamente e
            podem conter imprecisões. Não trate o KnowRa como fonte definitiva para decisões importantes (médicas,
            legais, financeiras) sem verificar em fontes confiáveis.
          </p>
          <p>
            <strong className="text-knowra-text">Uso justo</strong>: XP, nível e badges representam conhecimento
            demonstrado — tentativas de manipular esses valores (fora do fluxo normal do produto) violam estes
            termos.
          </p>
          <p>
            <strong className="text-knowra-text">Mudanças</strong>: como o produto está em desenvolvimento ativo,
            funcionalidades podem mudar. Mudanças relevantes serão comunicadas na própria plataforma.
          </p>
          <p>
            Dúvidas: escreva para{" "}
            <a href="mailto:rhoneyinc@gmail.com" className="text-knowra-accent hover:underline">
              rhoneyinc@gmail.com
            </a>
            .
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
}
