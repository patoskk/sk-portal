// La lección automática de los lunes (n8n: "SK — Lecciones: …").
//
//  GET  -> qué temas del banco ya se publicaron y en qué estado está la semana (para elegir los 3 temas).
//  POST -> publica la lección que escribió Claude. Con `prueba`, queda en el panel de demostración:
//          ningún cliente la ve y el tema del banco NO se gasta.
//
// El aviso por mail es un paso aparte (./[id]/notify): de noche, n8n publica y espera a las 9 para avisar.
import { NextResponse, type NextRequest } from "next/server";
import { requireAutomation, DEMO_CLIENT_ID } from "@/lib/api/requireAutomation";
import { insertLesson, parseTopic } from "@/lib/lessons/createLesson";
import { docFromHtml } from "@/lib/lessons/docText";
import { lessonUrl } from "@/lib/notify/send";
import { weekStartAR } from "@/lib/automation/week";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { admin, error } = requireAutomation(req);
  if (error) return error;

  const week_start = weekStartAR();
  const [pub, sem] = await Promise.all([
    admin!
      .from("lessons")
      .select("title,source_topic,published_at")
      .is("client_id", null) // las de prueba (panel de demostración) no cuentan
      .order("published_at", { ascending: false }),
    admin!.from("lesson_weeks").select("week_start,status,offered,lesson_id").eq("week_start", week_start).maybeSingle(),
  ]);
  if (pub.error) return NextResponse.json({ error: pub.error.message }, { status: 500 });
  if (sem.error) return NextResponse.json({ error: sem.error.message }, { status: 500 });

  return NextResponse.json({ publicados: pub.data ?? [], semana: sem.data ?? null, week_start });
}

interface Body {
  title?: string;
  html?: string;
  topic?: string;
  source_topic?: string;
  prueba?: boolean;
}

export async function POST(req: NextRequest) {
  const { admin, error } = requireAutomation(req);
  if (error) return error;

  const b = (await req.json()) as Body;
  const prueba = b.prueba === true;
  const title = (b.title ?? "").trim();
  const html = b.html ?? "";
  const sourceTopic = (b.source_topic ?? "").trim() || null;

  if (!title) return NextResponse.json({ error: "falta el título" }, { status: 400 });
  if (!docFromHtml(html)) return NextResponse.json({ error: "el HTML no trae una lección de nutricion-ia (window.DOC)" }, { status: 400 });
  const t = parseTopic(b.topic ?? "");
  if ("error" in t) return NextResponse.json({ error: t.error }, { status: 400 });
  if (!prueba && !sourceTopic) return NextResponse.json({ error: "falta source_topic" }, { status: 400 });

  const ins = await insertLesson(admin!, {
    title,
    summary: null, // lo completa el aviso (./[id]/notify) con el copy que redacta Claude
    url: null,
    body: html,
    client_id: prueba ? DEMO_CLIENT_ID : null,
    topic: t.topic,
    starter_order: null,
    source_topic: prueba ? null : sourceTopic,
  });
  if ("error" in ins) {
    if (ins.conflict) return NextResponse.json({ error: "tema-ya-publicado", source_topic: sourceTopic }, { status: 409 });
    return NextResponse.json({ error: ins.error }, { status: 500 });
  }

  if (!prueba) {
    // la semana queda con su lección: el bot ya no deja elegir otra y el martes no insiste
    await admin!
      .from("lesson_weeks")
      .upsert({ week_start: weekStartAR(), status: "elegida", lesson_id: ins.id, updated_at: new Date().toISOString() });
  }

  return NextResponse.json({ id: ins.id, url: lessonUrl(ins.id), prueba });
}
