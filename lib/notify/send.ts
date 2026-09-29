// Config del aviso + despacho al workflow de n8n.
//
// n8n es el BRAZO que envía (ahí vive la credencial de Gmail de SK Optimal);
// el portal decide todo lo demás: destinatarios, copy, render y log. n8n recibe
// un array ya listo y lo manda de a uno.
import "server-only";

export interface OutgoingRecipient {
  email: string;
  client_name: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * `lesson_id` es la REFERENCIA del envío: n8n no la interpreta, solo la devuelve en el callback de cada
 * mail. Para un aviso de lección es el uuid de la lección; para el resumen mensual de novedades es
 * `digest:YYYY-MM` (ver digestRef). Así el mismo workflow de Gmail manda los dos sin cambiarle nada, y
 * /api/notify/callback sabe en qué log anotar el resultado.
 */
export interface NotifyPayload {
  lesson_id: string;
  lesson_title: string;
  test: boolean;
  recipients: OutgoingRecipient[];
}

export const DIGEST_REF_PREFIX = "digest:";

export function digestRef(period: string): string {
  return `${DIGEST_REF_PREFIX}${period}`;
}

/** URL pública del portal, sin barra final. */
export function portalUrl(): string {
  const raw = process.env.PORTAL_URL?.trim() || "https://portal.skoptimal.com";
  return raw.replace(/\/+$/, "");
}

/** Link corto y desnudo que va en el mail (sin acortador ni tracking). */
export function lessonUrl(lessonId: string): string {
  return `${portalUrl()}/l/${lessonId}`;
}

/** Con quién firma el mail. */
export function fromName(): string {
  return process.env.NOTIFY_FROM_NAME?.trim() || "Pato";
}

/** Manda el lote al webhook de n8n. Devuelve el error como string, o null. */
export async function dispatchToN8n(payload: NotifyPayload): Promise<string | null> {
  const url = process.env.N8N_NOTIFY_WEBHOOK_URL?.trim();
  const secret = process.env.NOTIFY_SECRET?.trim();
  if (!url) return "falta N8N_NOTIFY_WEBHOOK_URL";
  if (!secret) return "falta NOTIFY_SECRET";

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-portal-secret": secret },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return `n8n respondió ${res.status}: ${(await res.text()).slice(0, 300)}`;
    return null;
  } catch (e) {
    return "no se pudo llamar a n8n: " + (e instanceof Error ? e.message : String(e));
  }
}
