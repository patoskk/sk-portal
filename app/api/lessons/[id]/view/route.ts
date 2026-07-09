// Sirve una lección: si es HTML (body) la entrega renderizada con el content-type
// correcto; si vive en nuestro Storage redirige con una SIGNED URL (el bucket es
// privado: sin login no hay acceso); si es un link externo, redirige directo.
// RLS aplica en la lectura (solo lecciones que el usuario puede ver).
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const SIGNED_TTL_SEC = 3600; // 1 hora

// path dentro del bucket si la URL apunta a nuestro Storage (formato público o firmado)
function lessonsStoragePath(url: string): string | null {
  const m = url.match(/\/storage\/v1\/object\/(?:public|sign)\/lessons\/([^?]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

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
  if (data.url) {
    const path = lessonsStoragePath(data.url);
    if (path) {
      const admin = createAdminClient();
      const { data: signed, error } = await admin.storage
        .from("lessons")
        .createSignedUrl(path, SIGNED_TTL_SEC);
      if (error || !signed?.signedUrl) {
        return new NextResponse("No se pudo abrir la lección", { status: 500 });
      }
      return NextResponse.redirect(signed.signedUrl);
    }
    return NextResponse.redirect(data.url); // link externo
  }
  return new NextResponse("Sin contenido", { status: 404 });
}
