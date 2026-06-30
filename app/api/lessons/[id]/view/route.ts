// Sirve una lección: si es HTML (body) la entrega renderizada con el content-type
// correcto; si es PDF/link (url) redirige. RLS aplica (solo lecciones que el usuario puede ver).
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await createClient();
  const { data } = await sb.from("lessons").select("body,url").eq("id", id).maybeSingle();
  if (!data) return new NextResponse("Lección no encontrada", { status: 404 });
  if (data.body) {
    return new NextResponse(data.body, {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
  if (data.url) return NextResponse.redirect(data.url);
  return new NextResponse("Sin contenido", { status: 404 });
}
