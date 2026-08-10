// Publica una novedad (solo admins). Mismo patrón que /api/admin/lessons:
// se valida el rol con la sesión y se escribe con service role.
import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/api/requireAdmin";
import { isUpdateKind } from "@/lib/updateKinds";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { admin: adminOrNull, error: gate } = await requireAdmin();
  if (gate) return gate;
  const admin = adminOrNull!;

  const fd = await req.formData();
  const title = String(fd.get("title") ?? "").trim();
  const body = String(fd.get("body") ?? "").trim() || null;
  const kind = String(fd.get("kind") ?? "mejora");
  // "" = novedad global (la ven todos los clientes)
  const clientId = String(fd.get("client_id") ?? "").trim() || null;
  const publishedAt = String(fd.get("published_at") ?? "").trim() || null;

  if (!title) return new NextResponse("falta el título", { status: 400 });
  if (!isUpdateKind(kind)) return new NextResponse("tipo inválido", { status: 400 });

  const ins = await admin
    .from("updates")
    .insert({
      title,
      body,
      kind,
      client_id: clientId,
      ...(publishedAt ? { published_at: publishedAt } : {}),
    })
    .select("id")
    .single();
  if (ins.error) return new NextResponse("guardando: " + ins.error.message, { status: 500 });

  return NextResponse.json({ ok: true, id: ins.data.id });
}
