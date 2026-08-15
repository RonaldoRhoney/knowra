import type { Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { registrarSessao, type TipoAcesso } from "../lib/api";
import { supabase } from "../lib/supabaseClient";
import type { Profile } from "../types/profile";

const CHAVE_SESSAO_REGISTRADA = "knowra_sessao_registrada";

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  tipoAcesso: TipoAcesso;
  limparTipoAcesso: () => void;
  signInWithGoogle: () => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [tipoAcesso, setTipoAcesso] = useState<TipoAcesso>(null);

  async function loadProfile(userId: string) {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    setProfile(data as Profile | null);
  }

  function registrarSessaoUmaVez() {
    if (sessionStorage.getItem(CHAVE_SESSAO_REGISTRADA)) return;
    sessionStorage.setItem(CHAVE_SESSAO_REGISTRADA, "1");
    registrarSessao()
      .then(({ tipo }) => {
        if (tipo && tipo !== "normal") setTipoAcesso(tipo);
      })
      .catch(() => {
        sessionStorage.removeItem(CHAVE_SESSAO_REGISTRADA);
      });
  }

  function limparTipoAcesso() {
    setTipoAcesso(null);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) {
        loadProfile(data.session.user.id);
        registrarSessaoUmaVez();
      }
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession) {
        loadProfile(newSession.user.id);
        registrarSessaoUmaVez();
      } else {
        setProfile(null);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
  }

  async function signInWithPassword(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? traduzErro(error.message) : null };
  }

  async function signUpWithPassword(email: string, password: string) {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error ? traduzErro(error.message) : null };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function refreshProfile() {
    if (session) await loadProfile(session.user.id);
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        loading,
        tipoAcesso,
        limparTipoAcesso,
        signInWithGoogle,
        signInWithPassword,
        signUpWithPassword,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

function traduzErro(mensagem: string): string {
  if (mensagem.includes("Invalid login credentials")) return "E-mail ou senha incorretos.";
  if (mensagem.includes("User already registered")) return "Este e-mail já está cadastrado.";
  if (mensagem.includes("Password should be at least")) return "A senha precisa ter pelo menos 6 caracteres.";
  return "Não foi possível completar a ação. Tente novamente.";
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de AuthProvider");
  return ctx;
}
