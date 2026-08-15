import { Router } from "express";
import { detectarDispositivo } from "../lib/dispositivo.js";
import { extrairIpCliente, geolocalizarIp } from "../lib/geolocalizacao.js";
import type { AuthedRequest } from "../middleware/auth.js";
import { requireAuth } from "../middleware/auth.js";

export const sessaoRouter = Router();

sessaoRouter.post("/sessao", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const dispositivo = detectarDispositivo(req.headers["user-agent"] ?? "");
    const ip = extrairIpCliente(req.headers["x-forwarded-for"]);
    const { pais, regiao } = await geolocalizarIp(ip);

    const { error } = await req.supabase!.rpc("registrar_sessao", {
      p_dispositivo: dispositivo,
      p_pais: pais,
      p_regiao: regiao,
    });

    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    // Observabilidade nunca deve quebrar a experiência do usuário — falha aqui é só logada.
    console.error("Erro ao registrar sessão:", err);
    res.status(200).json({ ok: false });
  }
});
