import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export function Login() {
  const { session, signInWithGoogle, signInWithPassword, signUpWithPassword } = useAuth();
  const [modo, setModo] = useState<"entrar" | "criar">("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (session) return <Navigate to="/" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    const acao = modo === "entrar" ? signInWithPassword : signUpWithPassword;
    const { error } = await acao(email, senha);
    if (error) setErro(error);
    setEnviando(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-knowra-surface rounded-2xl p-8 shadow-xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">KnowRa</h1>
          <p className="text-sm text-knowra-text/60 mt-2">Transforme sua curiosidade em conhecimento.</p>
        </div>

        <button
          onClick={signInWithGoogle}
          className="w-full rounded-lg bg-knowra-primary py-2.5 text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90"
        >
          Continuar com Google
        </button>

        <div className="flex items-center gap-3 my-5">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-xs text-knowra-text/40">ou</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            required
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg bg-knowra-bg border border-white/10 px-4 py-2.5 text-sm outline-none focus:border-knowra-primary"
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="Senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="w-full rounded-lg bg-knowra-bg border border-white/10 px-4 py-2.5 text-sm outline-none focus:border-knowra-primary"
          />
          {erro && <p className="text-sm text-red-400">{erro}</p>}
          <button
            type="submit"
            disabled={enviando}
            className="w-full rounded-lg border border-white/10 py-2.5 text-sm font-medium disabled:opacity-60 hover:bg-white/5"
          >
            {modo === "entrar" ? "Entrar" : "Criar conta"}
          </button>
        </form>

        <button
          onClick={() => setModo(modo === "entrar" ? "criar" : "entrar")}
          className="w-full text-center text-xs text-knowra-text/60 mt-3 hover:text-knowra-text"
        >
          {modo === "entrar" ? "Não tem conta? Criar conta" : "Já tem conta? Entrar"}
        </button>
      </div>
    </div>
  );
}
