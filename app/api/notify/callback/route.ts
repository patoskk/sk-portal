// n8n avisa acá el resultado de cada mail: queued -> sent | error.
// Protegida por NOTIFY_SECRET (Bearer), igual que /api/cron/*. Esta ruta está
// EXCLUIDA del middleware; si no, el POST de n8n se come un 307 al login.
//
// El mismo workflow de Gmail manda los avisos de lección y el resumen de novedades (cada dos semanas). Lo que
// distingue uno de otro es la referencia que viaja en `lesson_id` (ver lib/notify/send.ts):
// un uuid = lesson_notifications; `digest:YYYY-MM-DD` = update_digests.
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DIGEST_REF_PREFIX } from "@/lib/notify/send";

export const runtime = "nodejs";

interface Body {
  lesson_id?: string;
  email?: string;
  ok?: boolean;
  provider_id?: string;
  error?: string;
}

export async function POST(req: NextRequest) {
  const secret = process.env.NOTIFY_SECRET?.trim();
  if (!secret) return new NextResponse("falta NOTIFY_SECRET", { status: 500 });
  if (req.headers.get("authorization")?.trim() !== `Bearer ${secret}`) {
    return new NextResponse("no autorizado", { status: 401 });
  }

  const b = (await req.json()) as Body;
  const ref = (b.lesson_id ?? "").trim();
  const email = (b.email ?? "").trim();
  if (!ref || !email) return new NextResponse("faltan lesson_id o email", { status: 400 });

  const resultado = {
    status: b.ok ? "sent" : "error",
    provider_id: b.provider_id ?? null,
    error: b.ok ? null : (b.error ?? "error sin detalle").slice(0, 500),
    sent_at: b.ok ? new Date().toISOString() : null,
  };

  const admin = createAdminClient();
  const { error } = ref.startsWith(DIGEST_REF_PREFIX)
    ? await admin.from("update_digests").update(resultado).eq("period", ref.slice(DIGEST_REF_PREFIX.length)).eq("email", email)
    : await admin.from("lesson_notifications").update(resultado).eq("lesson_id", ref).eq("email", email);

  if (error) return new NextResponse(error.message, { status: 500 });
  return NextResponse.json({ ok: true });
}
