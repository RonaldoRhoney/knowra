export interface Localizacao {
  pais: string | null;
  regiao: string | null;
}

/**
 * Geolocalização best-effort a partir do IP — nunca lança erro nem guarda o IP,
 * só devolve país/região (ou null/null se falhar). Ver DECISIONS.md.
 */
export async function geolocalizarIp(ip: string): Promise<Localizacao> {
  if (!ip || ip === "127.0.0.1" || ip === "::1") return { pais: null, regiao: null };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,regionName`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return { pais: null, regiao: null };
    const data = await res.json();
    if (data.status !== "success") return { pais: null, regiao: null };
    return {
      pais: typeof data.country === "string" ? data.country : null,
      regiao: typeof data.regionName === "string" ? data.regionName : null,
    };
  } catch {
    return { pais: null, regiao: null };
  }
}

export function extrairIpCliente(headerForwardedFor: string | string[] | undefined): string {
  const valor = Array.isArray(headerForwardedFor) ? headerForwardedFor[0] : headerForwardedFor;
  return valor?.split(",")[0]?.trim() ?? "";
}
