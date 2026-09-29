// Envío del aviso de una lección. Paso explícito: solo corre cuando Pato aprieta
// el botón, con el copy que ya revisó.
//
//  test:true  -> un solo mail, al admin logueado. No toca el log ni notified_at.
//  force:true -> reenvío: borra el log de esa lección y vuelve a encolar a todos.
//
// El envío en sí vive en lib/notify/notifyLesson.ts: lo comparte con la lección
// automática de los lunes (/api/automation/lessons/[id]/notify).
import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/api/requireAdmin";
import { sendLessonNotice } from "@/lib/notify/notifyLesson";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Body {
  subject?: string;
  intro?: string;
  summary?: string;
  why?: string[];
  test?: boolean;
  force?: boolean;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { admin, user, error } = await requireAdmin();
  if (error) return error;
  const { id } = await params;

  const b = (await req.json()) as Body;
  const isTest = b.test === true;
  if (isTest && !user!.email) return new NextResponse("tu usuario no tiene mail", { status: 400 });

  const r = await sendLessonNotice(
    admin!,
    id,
    { subject: b.subject ?? "", intro: b.intro ?? "", summary: b.summary ?? "", why: b.why ?? [] },
    { force: b.force === true, testTo: isTest ? user!.email! : null },
  );
  if (!r.ok) return new NextResponse(r.message, { status: r.status });
  if (r.test) return NextResponse.json({ queued: 1, test: true, to: r.to, skipped: [] });
  return NextResponse.json({ queued: r.queued, skipped: r.skipped });
}
