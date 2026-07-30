// El cliente prende/apaga los avisos de lecciones nuevas desde ⚙ Configuración.
// La preferencia vive en `clients` (el aviso es UNO por cliente, al mail del
// dueño), no por usuario del portal. Se escribe con service role porque clients
// no tiene policy de UPDATE para authenticated; la sesión se valida acá antes.
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// client_id + rol del usuario logueado (la policy "own mapping" limita a su fila)
async function miCliente() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("user_clients")
    .select("client_id,role")
    .eq("user_id", user.id)
    .maybeSingle();
  return { admin, clientId: (data?.client_id as string | null) ?? null, role: (data?.role as string | null) ?? null };
}

export async function GET() {
  const me = await miCliente();
  if (!me) return new NextResponse("no autenticado", { status: 401 });
  if (!me.clientId) return NextResponse.json({ role: me.role, notify_lessons: null });

  const { data } = await me.admin
    .from("clients")
    .select("notify_lessons")
    .eq("id", me.clientId)
    .maybeSingle();

  return NextResponse.json({ role: me.role, notify_lessons: data?.notify_lessons ?? true });
}

export async function POST(req: NextRequest) {
  const me = await miCliente();
  if (!me) return new NextResponse("no autenticado", { status: 401 });
  if (!me.clientId) return new NextResponse("tu usuario no está asociado a un cliente", { status: 400 });

  const b = (await req.json()) as { notify_lessons?: boolean };
  if (typeof b.notify_lessons !== "boolean") {
    return new NextResponse("falta notify_lessons", { status: 400 });
  }

  const { error } = await me.admin
    .from("clients")
    .update({ notify_lessons: b.notify_lessons })
    .eq("id", me.clientId);
  if (error) return new NextResponse(error.message, { status: 500 });

  return NextResponse.json({ ok: true, notify_lessons: b.notify_lessons });
}
