import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Footer } from "../components/Footer";
import { Navigation } from "../components/Navigation";
import { supabase } from "../lib/supabaseClient";

const TAMANHO_MAX_MB = 3;

interface Resumo {
  total_perguntas: number;
  total_desafios_avaliados: number;
  taxa_acerto: number;
}

interface AreaDestaque {
  dominio_pct: number;
  areas: { nome: string } | null;
}

const GENEROS = [
  { valor: "feminino", label: "Feminino" },
  { valor: "masculino", label: "Masculino" },
  { valor: "nao_binario", label: "Não-binário" },
  { valor: "prefiro_nao_informar", label: "Prefiro não informar" },
];

export function Perfil() {
  const { profile, session, refreshProfile } = useAuth();
  const [nome, setNome] = useState(profile?.nome ?? "");
  const [cidade, setCidade] = useState(profile?.cidade ?? "");
  const [pais, setPais] = useState(profile?.pais ?? "");
  const [idade, setIdade] = useState(profile?.idade ? String(profile.idade) : "");
  const [genero, setGenero] = useState(profile?.genero ?? "");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);
  const [enviandoAvatar, setEnviandoAvatar] = useState(false);
  const [erroAvatar, setErroAvatar] = useState<string | null>(null);
  const inputAvatarRef = useRef<HTMLInputElement>(null);
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [areasDestaque, setAreasDestaque] = useState<AreaDestaque[]>([]);
  const [nickname, setNickname] = useState(profile?.nickname ?? "");
  const [aparecerNoRanking, setAparecerNoRanking] = useState(profile?.aparecer_no_ranking ?? false);
  const [salvandoRanking, setSalvandoRanking] = useState(false);
  const [erroRanking, setErroRanking] = useState<string | null>(null);
  const [salvoRanking, setSalvoRanking] = useState(false);

  useEffect(() => {
    if (!session) return;
    supabase.rpc("meu_resumo").then(({ data }) => {
      if (data) setResumo(data as Resumo);
    });
    supabase
      .from("progresso_area")
      .select("dominio_pct, areas(nome)")
      .eq("usuario_id", session.user.id)
      .order("dominio_pct", { ascending: false })
      .limit(3)
      .then(({ data }) => {
        setAreasDestaque((data ?? []) as unknown as AreaDestaque[]);
      });
  }, [session]);

  if (!profile) return null;

  async function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !session) return;

    setErroAvatar(null);

    if (!file.type.startsWith("image/")) {
      setErroAvatar("Escolha um arquivo de imagem.");
      return;
    }
    if (file.size > TAMANHO_MAX_MB * 1024 * 1024) {
      setErroAvatar(`A imagem precisa ter até ${TAMANHO_MAX_MB}MB.`);
      return;
    }

    setEnviandoAvatar(true);
    const extensao = file.name.split(".").pop() ?? "jpg";
    const caminho = `${session.user.id}/avatar.${extensao}`;

    const { error: erroUpload } = await supabase.storage
      .from("avatars")
      .upload(caminho, file, { upsert: true, contentType: file.type });

    if (erroUpload) {
      setErroAvatar("Não foi possível enviar a foto agora. Tente novamente.");
      setEnviandoAvatar(false);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(caminho);
    const urlComCacheBust = `${data.publicUrl}?v=${Date.now()}`;

    const { error: erroUpdate } = await supabase
      .from("profiles")
      .update({ avatar_url: urlComCacheBust })
      .eq("id", session.user.id);

    if (erroUpdate) {
      setErroAvatar("Foto enviada, mas não foi possível atualizar o perfil. Tente novamente.");
    } else {
      await refreshProfile();
    }
    setEnviandoAvatar(false);
  }

  async function handleSalvarRanking() {
    if (!session) return;
    if (nickname.trim().length > 0 && nickname.trim().length < 2) {
      setErroRanking("O apelido precisa ter pelo menos 2 caracteres.");
      return;
    }
    setSalvandoRanking(true);
    setErroRanking(null);
    setSalvoRanking(false);
    const { error } = await supabase
      .from("profiles")
      .update({
        nickname: nickname.trim() || null,
        aparecer_no_ranking: aparecerNoRanking,
      })
      .eq("id", session.user.id);
    if (error) {
      setErroRanking("Não foi possível salvar agora. Tente novamente.");
    } else {
      await refreshProfile();
      setSalvoRanking(true);
    }
    setSalvandoRanking(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (nome.trim().length === 0) return;
    setEnviando(true);
    setErro(null);
    setSalvo(false);
    const { error } = await supabase.rpc("completar_cadastro", {
      p_nome: nome,
      p_cidade: cidade || null,
      p_pais: pais || null,
      p_idade: idade ? Number(idade) : null,
      p_genero: genero || null,
    });
    if (error) {
      setErro("Não foi possível salvar agora. Tente novamente.");
    } else {
      await refreshProfile();
      setSalvo(true);
    }
    setEnviando(false);
  }

  return (
    <div>
    <Navigation />
    <div className="px-4 py-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-h2">Perfil</h1>
        <p className="text-sm text-knowra-text-secondary mt-0.5">Gerencie suas informações</p>
      </div>

      <div className="flex items-center gap-3 mb-2">
        <button
          type="button"
          onClick={() => inputAvatarRef.current?.click()}
          disabled={enviandoAvatar}
          className="relative w-14 h-14 shrink-0 rounded-full group"
          title="Trocar foto de perfil"
        >
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-14 h-14 rounded-full object-cover" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-knowra-primary/20 text-knowra-primary grid place-items-center text-xl font-semibold">
              {(profile.nome ?? "?").charAt(0).toUpperCase()}
            </div>
          )}
          <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity grid place-items-center text-[10px]">
            {enviandoAvatar ? "..." : "Trocar"}
          </div>
        </button>
        <input
          ref={inputAvatarRef}
          type="file"
          accept="image/*"
          onChange={handleAvatarChange}
          className="hidden"
        />
        <div>
          <p className="text-sm font-medium">{profile.nome ?? "Sem nome"}</p>
          <p className="text-xs text-knowra-text/40">{session?.user.email}</p>
          <button
            type="button"
            onClick={() => inputAvatarRef.current?.click()}
            className="text-xs text-knowra-accent hover:underline mt-0.5"
          >
            Trocar foto
          </button>
        </div>
      </div>
      <div className="mb-6">{erroAvatar && <p className="text-sm text-red-400">{erroAvatar}</p>}</div>

      <form onSubmit={handleSubmit} className="bg-knowra-surface rounded-2xl p-5 space-y-3">
        <div>
          <label className="text-xs text-knowra-text/50 mb-1 block">Nome</label>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
            className="w-full rounded-lg bg-knowra-bg border border-white/10 px-3 py-2 text-sm outline-none focus:border-knowra-primary"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-knowra-text/50 mb-1 block">Cidade</label>
            <input
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              className="w-full rounded-lg bg-knowra-bg border border-white/10 px-3 py-2 text-sm outline-none focus:border-knowra-primary"
            />
          </div>
          <div>
            <label className="text-xs text-knowra-text/50 mb-1 block">País</label>
            <input
              value={pais}
              onChange={(e) => setPais(e.target.value)}
              className="w-full rounded-lg bg-knowra-bg border border-white/10 px-3 py-2 text-sm outline-none focus:border-knowra-primary"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-knowra-text/50 mb-1 block">Idade</label>
          <input
            value={idade}
            onChange={(e) => setIdade(e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            maxLength={3}
            className="w-full rounded-lg bg-knowra-bg border border-white/10 px-3 py-2 text-sm outline-none focus:border-knowra-primary"
          />
        </div>

        <div>
          <label className="text-xs text-knowra-text/50 mb-1.5 block">Gênero</label>
          <div className="flex flex-wrap gap-1.5">
            {GENEROS.map((g) => (
              <button
                type="button"
                key={g.valor}
                onClick={() => setGenero(g.valor)}
                className={`text-xs px-2.5 py-1 rounded-full border ${
                  genero === g.valor
                    ? "border-knowra-primary bg-knowra-primary/15 text-knowra-primary"
                    : "border-white/10 text-knowra-text/60"
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {erro && <p className="text-sm text-red-400">{erro}</p>}
        {salvo && <p className="text-sm text-emerald-400">Perfil atualizado.</p>}

        <button
          type="submit"
          disabled={enviando || nome.trim().length === 0}
          className="w-full rounded-lg bg-knowra-primary py-2.5 text-sm font-medium disabled:opacity-40"
        >
          {enviando ? "Salvando..." : "Salvar alterações"}
        </button>
      </form>

      <div className="bg-knowra-surface rounded-2xl p-5 mt-4">
        <p className="text-xs text-knowra-text/50 mb-3">Progresso</p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-knowra-text/40 text-xs">Nível</p>
            <p className="font-medium">{profile.nivel_global}</p>
          </div>
          <div>
            <p className="text-knowra-text/40 text-xs">XP total</p>
            <p className="text-knowra-accent font-medium">{profile.xp_total}</p>
          </div>
          <div>
            <p className="text-knowra-text/40 text-xs">Perguntas feitas</p>
            <p className="font-medium">{resumo?.total_perguntas ?? "—"}</p>
          </div>
          <div>
            <p className="text-knowra-text/40 text-xs">Taxa de acerto</p>
            <p className="font-medium">
              {resumo && resumo.total_desafios_avaliados > 0 ? `${resumo.taxa_acerto}%` : "—"}
            </p>
          </div>
        </div>

        {areasDestaque.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <p className="text-knowra-text/40 text-xs mb-2">Áreas em destaque</p>
            <div className="flex flex-wrap gap-1.5">
              {areasDestaque.map((a, i) => (
                <span key={i} className="text-xs bg-white/5 rounded-full px-2.5 py-1">
                  {a.areas?.nome} <span className="text-knowra-accent">{a.dominio_pct}%</span>
                </span>
              ))}
            </div>
          </div>
        )}

        <Link to="/mapa" className="text-xs text-knowra-accent hover:underline mt-4 inline-block">
          Ver Mapa de Conhecimento completo →
        </Link>
      </div>

      <div className="bg-knowra-surface rounded-2xl p-5 mt-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-medium">Ranking</p>
          <Link to="/ranking" className="text-xs text-knowra-accent hover:underline">
            Ver ranking →
          </Link>
        </div>
        <p className="text-xs text-knowra-text/50 mb-4">
          Você escolhe se quer aparecer publicamente. Nunca é obrigatório pra competir — sua
          posição fica visível só pra você mesmo assim.
        </p>

        <div>
          <label className="text-xs text-knowra-text/50 mb-1 block">Apelido no ranking</label>
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Como você quer aparecer publicamente"
            maxLength={24}
            className="w-full rounded-lg bg-knowra-bg border border-white/10 px-3 py-2 text-sm outline-none focus:border-knowra-primary"
          />
        </div>

        <button
          type="button"
          onClick={() => setAparecerNoRanking((v) => !v)}
          className="flex items-center justify-between w-full mt-3"
        >
          <span className="text-sm">Aparecer no ranking público</span>
          <span
            className={`w-10 h-5 rounded-full relative transition-colors ${
              aparecerNoRanking ? "bg-knowra-primary" : "bg-white/10"
            }`}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                aparecerNoRanking ? "left-5" : "left-0.5"
              }`}
            />
          </span>
        </button>

        {erroRanking && <p className="text-sm text-red-400 mt-3">{erroRanking}</p>}
        {salvoRanking && <p className="text-sm text-emerald-400 mt-3">Preferências salvas.</p>}

        <button
          type="button"
          onClick={handleSalvarRanking}
          disabled={salvandoRanking}
          className="w-full rounded-lg bg-knowra-bg border border-white/10 py-2 text-sm font-medium mt-3 disabled:opacity-40"
        >
          {salvandoRanking ? "Salvando..." : "Salvar preferências"}
        </button>
      </div>
    </div>
    <Footer />
    </div>
  );
}
