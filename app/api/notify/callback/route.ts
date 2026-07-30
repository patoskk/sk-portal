// n8n avisa acá el resultado de cada mail: queued -> sent | error.
// Protegida por NOTIFY_SECRET (Bearer), igual que /api/cron/*. Esta ruta está
// EXCLUIDA del middleware; si no, el POST de n8n se come un 307 al login.
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
  const lessonId = (b.lesson_id ?? "").trim();
  const email = (b.email ?? "").trim();
  if (!lessonId || !email) return new NextResponse("faltan lesson_id o email", { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin
    .from("lesson_notifications")
    .update({
      status: b.ok ? "sent" : "error",
      provider_id: b.provider_id ?? null,
      error: b.ok ? null : (b.error ?? "error sin detalle").slice(0, 500),
      sent_at: b.ok ? new Date().toISOString() : null,
    })
    .eq("lesson_id", lessonId)
    .eq("email", email);

  if (error) return new NextResponse(error.message, { status: 500 });
  return NextResponse.json({ ok: true });
}
