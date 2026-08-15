import { Router } from "express";
import type { AuthedRequest } from "../middleware/auth.js";
import { requireAuth } from "../middleware/auth.js";
import { avaliarDesafio } from "../services/ai/avaliarDesafio.js";
import { gerarDesafio } from "../services/ai/gerarDesafio.js";
import { LimiteIAError } from "../lib/limiteIA.js";

export const desafiosRouter = Router();

desafiosRouter.post("/perguntas/:perguntaId/desafio", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const desafio = await gerarDesafio(req.supabase!, req.params.perguntaId, req.userId!);
    res.json(desafio);
  } catch (err) {
    if (err instanceof LimiteIAError) {
      res.status(429).json({ error: err.message });
      return;
    }
    console.error("Erro ao gerar desafio:", err);
    res.status(500).json({ error: "Não foi possível gerar o desafio agora. Tente novamente." });
  }
});

desafiosRouter.post("/desafios/:desafioId/avaliar", requireAuth, async (req: AuthedRequest, res) => {
  const respostaUsuario = typeof req.body?.resposta === "string" ? req.body.resposta.trim() : "";

  if (respostaUsuario.length < 2 || respostaUsuario.length > 3000) {
    res.status(400).json({ error: "A resposta precisa ter entre 2 e 3000 caracteres." });
    return;
  }

  try {
    const resultado = await avaliarDesafio(req.supabase!, req.params.desafioId, respostaUsuario, req.userId!);
    res.json(resultado);
  } catch (err) {
    console.error("Erro ao avaliar desafio:", err);
    const mensagem = err instanceof Error ? err.message : "Não foi possível avaliar sua resposta agora.";
    const jaAvaliado = mensagem.includes("já foi avaliado");
    res.status(jaAvaliado ? 409 : 500).json({ error: mensagem });
  }
});
