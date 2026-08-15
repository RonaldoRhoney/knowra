import { Router } from "express";
import type { AuthedRequest } from "../middleware/auth.js";
import { requireAuth } from "../middleware/auth.js";
import { criarPreapproval, buscarPreapproval } from "../lib/mercadoPago.js";
import { dbAdmin } from "../lib/dbAdmin.js";

export const assinaturaRouter = Router();

const FRONTEND_URL = process.env.FRONTEND_URL || "https://knowra.rhoneyinc.com";

// Usuário clica em "Assinar Pro": cria a linha pendente (RPC, dono = auth.uid()),
// cria a assinatura no Mercado Pago e devolve a URL de checkout pro frontend redirecionar.
assinaturaRouter.post("/assinatura/criar", requireAuth, async (req: AuthedRequest, res) => {
  if (!req.userEmail) {
    res.status(400).json({ error: "E-mail do usuário não disponível." });
    return;
  }

  try {
    const { data: assinaturaId, error: erroCriar } = await req.supabase!.rpc("criar_assinatura_pendente");
    if (erroCriar || !assinaturaId) {
      throw new Error(erroCriar?.message || "Não foi possível iniciar a assinatura.");
    }

    const preapproval = await criarPreapproval({
      payerEmail: req.userEmail,
      externalReference: assinaturaId as string,
      backUrl: `${FRONTEND_URL}/perfil`,
    });

    const { error: erroRegistrar } = await req.supabase!.rpc("registrar_mp_preapproval", {
      p_assinatura_id: assinaturaId,
      p_mp_preapproval_id: preapproval.id,
    });
    if (erroRegistrar) throw new Error(erroRegistrar.message);

    res.json({ checkout_url: preapproval.init_point });
  } catch (err) {
    console.error("Erro ao criar assinatura:", err);
    res.status(500).json({ error: "Não foi possível iniciar a assinatura agora. Tente novamente." });
  }
});

// Chamado pelo Mercado Pago quando o status de uma preapproval muda. Nunca
// confia no corpo da notificação — sempre confirma o status buscando na
// API do MP antes de gravar qualquer coisa (mesmo princípio do webhook do
// MenuFlex). Sem token de usuário nessa requisição — grava via DATABASE_URL.
assinaturaRouter.post("/assinatura/webhook", async (req, res) => {
  const tipo = req.query.type || req.body?.type || req.body?.topic;
  const mpPreapprovalId = req.query["data.id"] || req.body?.data?.id || req.body?.id;

  if (!mpPreapprovalId || (tipo && tipo !== "preapproval" && tipo !== "subscription_preapproval")) {
    res.status(200).json({ ok: true, ignored: true });
    return;
  }

  try {
    const preapproval = await buscarPreapproval(String(mpPreapprovalId));
    const pool = dbAdmin();

    const statusValido = ["pending", "authorized", "paused", "cancelled"].includes(preapproval.status)
      ? preapproval.status
      : "pending";

    const { rows } = await pool.query(
      `update assinaturas
         set status = $1, atualizado_em = now()
         where mp_preapproval_id = $2
         returning usuario_id`,
      [statusValido, preapproval.id],
    );

    if (rows.length === 0) {
      res.status(200).json({ ok: false, reason: "assinatura_nao_encontrada" });
      return;
    }

    const usuarioId = rows[0].usuario_id as string;
    const plano = statusValido === "authorized" ? "pro" : "free";
    await pool.query(`update profiles set plano = $1 where id = $2`, [plano, usuarioId]);

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Erro no webhook de assinatura:", err);
    // 200 mesmo em erro interno — evita o MP reenviar em loop agressivo por
    // um problema nosso; o log acima é o que importa pra investigar.
    res.status(200).json({ ok: false });
  }
});
