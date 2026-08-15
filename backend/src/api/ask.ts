import { Router } from "express";
import type { AuthedRequest } from "../middleware/auth.js";
import { requireAuth } from "../middleware/auth.js";
import { askQuestion } from "../services/ai/askQuestion.js";
import { LimiteIAError } from "../lib/limiteIA.js";

export const askRouter = Router();

askRouter.post("/ask", requireAuth, async (req: AuthedRequest, res) => {
  const texto = typeof req.body?.texto === "string" ? req.body.texto.trim() : "";

  if (texto.length < 3 || texto.length > 2000) {
    res.status(400).json({ error: "A pergunta precisa ter entre 3 e 2000 caracteres." });
    return;
  }

  try {
    const resultado = await askQuestion(req.supabase!, texto, req.userId!);
    res.json(resultado);
  } catch (err) {
    if (err instanceof LimiteIAError) {
      res.status(429).json({ error: err.message });
      return;
    }
    console.error("Erro em /api/ask:", err);
    res.status(500).json({ error: "Não foi possível processar sua pergunta agora. Tente novamente." });
  }
});
