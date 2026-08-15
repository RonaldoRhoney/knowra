import { Link } from "react-router-dom";
import { Footer } from "../components/Footer";

export function Privacidade() {
  return (
    <div>
      <div className="min-h-screen px-4 py-8 max-w-xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <h1 className="text-xl font-bold">Privacidade</h1>
          <Link to="/" className="text-xs text-knowra-text/60 hover:text-knowra-text">
            Voltar
          </Link>
        </header>

        <div className="space-y-4 text-sm text-knowra-text/70 leading-relaxed">
          <p>
            O KnowRa é um produto da RhoneyInc. Levamos a privacidade dos seus dados a sério — este resumo explica
            o que coletamos e por quê.
          </p>
          <p>
            <strong className="text-knowra-text">Conta</strong>: e-mail e, se você escolher login com Google, nome e
            foto do seu perfil Google.
          </p>
          <p>
            <strong className="text-knowra-text">Uso do produto</strong>: perguntas, respostas, desafios e avaliações
            geram seu progresso (XP, nível, badges) — esse histórico é seu e só você (e administradores, para suporte)
            pode ver.
          </p>
          <p>
            <strong className="text-knowra-text">Dados demográficos (cidade, país, idade, gênero)</strong>: sempre
            opcionais, nunca bloqueiam o uso do produto, e só ficam salvos se você preencher e enviar
            explicitamente. Você pode editar ou apagar essas informações a qualquer momento em{" "}
            <Link to="/perfil" className="text-knowra-accent hover:underline">
              Perfil
            </Link>
            .
          </p>
          <p>
            <strong className="text-knowra-text">Dispositivo, país e região de acesso</strong>: coletados de forma
            agregada a cada login, para entendermos como o produto é usado. Nunca guardamos o endereço IP em si, só
            o resultado da localização aproximada.
          </p>
          <p>
            <strong className="text-knowra-text">Exclusão</strong>: quer apagar sua conta e todos os dados
            associados? Escreva para{" "}
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
