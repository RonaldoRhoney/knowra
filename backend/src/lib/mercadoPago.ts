/**
 * Integração com Mercado Pago (assinatura recorrente via Preapproval API).
 * Mesmo provedor já usado no MenuFlex (padrão RhoneyInc) — aqui via fetch
 * direto, sem SDK, mesmo estilo do MenuFlex.
 */

// Preço provisório do KnowRa Pro — mesmo espírito do limite diário de IA
// gratuito (5/dia): número inicial pra existir o produto, ajustável quando
// houver dado real de custo/conversão. Ver DECISIONS.md.
export const PRO_PRECO_MENSAL = 19.9;

const MP_API = "https://api.mercadopago.com";

function accessToken(): string {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) throw new Error("MP_ACCESS_TOKEN não configurado.");
  return token;
}

export async function criarPreapproval(params: {
  payerEmail: string;
  externalReference: string;
  backUrl: string;
}): Promise<{ id: string; init_point: string }> {
  const resposta = await fetch(`${MP_API}/preapproval`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      reason: "KnowRa Pro — assinatura mensal",
      external_reference: params.externalReference,
      payer_email: params.payerEmail,
      back_url: params.backUrl,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: PRO_PRECO_MENSAL,
        currency_id: "BRL",
      },
      status: "pending",
    }),
  });

  if (!resposta.ok) {
    const detalhe = await resposta.text();
    throw new Error(`Falha ao criar assinatura no Mercado Pago: ${detalhe}`);
  }

  return resposta.json();
}

export async function buscarPreapproval(mpPreapprovalId: string): Promise<{
  id: string;
  status: string;
  external_reference: string;
}> {
  const resposta = await fetch(`${MP_API}/preapproval/${mpPreapprovalId}`, {
    headers: { Authorization: `Bearer ${accessToken()}` },
  });

  if (!resposta.ok) {
    throw new Error(`Preapproval ${mpPreapprovalId} não encontrado no Mercado Pago.`);
  }

  return resposta.json();
}
