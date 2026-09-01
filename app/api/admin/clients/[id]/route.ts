// Editar el contacto del DUEÑO de un cliente (nombre + mail personal).
// Es lo que usa la campaña de avisos de lecciones; no toca la cuenta del portal
// (esa se creó con el mail de la empresa y sigue igual).
import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/api/requireAdmin";
import { getClientUsers } from "@/lib/data/clientData";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { admin, error } = await requireAdmin();
  if (error) return error;
  const { id } = await params;

  const b = (await req.json()) as {
    contact_name?: string;
    contact_email?: string;
    notify_lessons?: boolean;
  };

  const patch: Record<string, string | boolean | null> = {};
  if (typeof b.contact_name === "string") patch.contact_name = b.contact_name.trim() || null;
  if (typeof b.contact_email === "string") {
    const mail = b.contact_email.trim().toLowerCase();
    if (mail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
      return new NextResponse("el mail del dueño no parece válido", { status: 400 });
    }
    patch.contact_email = mail || null;
  }
  if (typeof b.notify_lessons === "boolean") patch.notify_lessons = b.notify_lessons;

  if (!Object.keys(patch).length) return new NextResponse("nada para actualizar", { status: 400 });

  const { error: e } = await admin!.from("clients").update(patch).eq("id", id);
  if (e) return new NextResponse(e.message, { status: 500 });
  return NextResponse.json({ ok: true });
}

/**
 * Baja definitiva de un cliente: dejó de serlo y no tiene que seguir viendo el portal.
 *
 * Todas las tablas cuelgan de `clients(id) on delete cascade`, así que el DELETE se
 * lleva métricas, tools, consultas, actividad, intenciones, conversiones, insights,
 * tool_events, novedades, lecciones propias, la fuente y el mapeo de usuarios.
 * Lo que NO cascadea es la cuenta en `auth.users`: sin borrarla queda un acceso
 * huérfano que sigue pudiendo loguearse (con un JWT sin client_id). Por eso va a mano.
 *
 * No toca la tabla de conversaciones del agente en Supabase: es la memoria cruda,
 * borrarla es irreversible y no hace falta para sacarlo del portal.
 *
 * La confirmación se valida ACÁ, no en el navegador: el nombre exacto del cliente
 * tiene que venir en el body.
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { admin, error } = await requireAdmin();
  if (error) return error;
  const { id } = await params;

  const { data: client } = await admin!.from("clients").select("name").eq("id", id).maybeSingle();
  if (!client) return new NextResponse("cliente no encontrado", { status: 404 });
  const name = (client as { name: string }).name;

  const b = (await req.json().catch(() => ({}))) as { confirm?: string };
  if ((b.confirm ?? "").trim() !== name.trim()) {
    return new NextResponse(`para eliminar hay que escribir el nombre exacto: ${name}`, { status: 400 });
  }

  // Cuentas de acceso. Un admin nunca cuelga de un cliente (add-admin.ts lo mapea
  // con client_id null), pero si alguno quedó mal mapeado no se lo borra igual:
  // perder el acceso de administración por dar de baja a un cliente sería peor.
  const users = await getClientUsers(admin!, id);
  const borrados: string[] = [];
  const conservados: string[] = [];
  for (const u of users) {
    if (u.role === "admin") {
      conservados.push(u.email ?? u.user_id);
      continue;
    }
    const { error: e } = await admin!.auth.admin.deleteUser(u.user_id);
    if (e) return new NextResponse(`borrando la cuenta ${u.email ?? u.user_id}: ${e.message}`, { status: 500 });
    borrados.push(u.email ?? u.user_id);
  }

  const { error: e } = await admin!.from("clients").delete().eq("id", id);
  if (e) return new NextResponse("borrando el cliente: " + e.message, { status: 500 });

  return NextResponse.json({ ok: true, name, cuentas_borradas: borrados, cuentas_conservadas: conservados });
}
