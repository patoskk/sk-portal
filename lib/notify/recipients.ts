// Quién recibe el aviso de una lección.
//
// UN aviso por CLIENTE, al mail PERSONAL DEL DUEÑO (clients.contact_email) y
// saludándolo por su nombre (clients.contact_name). No se usa el mail con el que
// se creó la cuenta del portal: ese suele ser el de la empresa
// (ventas@..., info@...) y no es a quien le queremos escribir.
//
// Sin contact_email el cliente se SALTEA y aparece el motivo en /admin. Es a
// propósito: preferimos no avisarle a nadie antes que escribirle a la casilla
// de la empresa por descuido.
//
// Espeja la regla de la policy `lessons_sel`: lección con client_id null = todos
// los clientes; con valor = solo ese.
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface Recipient {
  clientId: string;
  email: string;
  /** cómo lo saludamos: el nombre del dueño si lo tenemos, si no el del negocio */
  greetingName: string;
  clientName: string;
}

export interface RecipientResolution {
  recipients: Recipient[];
  /** por qué quedó gente afuera, para mostrarlo en /admin */
  skipped: { clientName: string; reason: string }[];
}

export async function getLessonRecipients(
  admin: SupabaseClient,
  lessonClientId: string | null,
): Promise<RecipientResolution> {
  let q = admin.from("clients").select("id,name,contact_name,contact_email,notify_lessons");
  if (lessonClientId) q = q.eq("id", lessonClientId);
  const { data, error } = await q.order("created_at");
  if (error) throw new Error("leyendo clientes: " + error.message);

  const recipients: Recipient[] = [];
  const skipped: { clientName: string; reason: string }[] = [];

  for (const c of data ?? []) {
    const clientName = (c.name as string) ?? "cliente";
    const email = ((c.contact_email as string | null) ?? "").trim();
    if (!email) {
      skipped.push({ clientName, reason: "falta el mail del dueño" });
      continue;
    }
    if (c.notify_lessons === false) {
      skipped.push({ clientName, reason: "desactivó los avisos" });
      continue;
    }
    recipients.push({
      clientId: c.id as string,
      email,
      greetingName: ((c.contact_name as string | null) ?? "").trim() || clientName,
      clientName,
    });
  }

  return { recipients, skipped };
}
