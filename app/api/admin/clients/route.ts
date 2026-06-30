// Alta de un cliente desde el panel Admin: crea cliente + fuente + usuario del dueño,
// y corre el primer cómputo. Todas las tablas viven en el mismo proyecto (SOURCE_DEFAULT_*).
import { NextResponse, type NextRequest } from "next/server";
import { randomUUID, randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeClient } from "@/lib/metrics/runCompute";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return new NextResponse("no autenticado", { status: 401 });
  const admin = createAdminClient();
  const { data: me } = await admin.from("user_clients").select("role").eq("user_id", user.id).maybeSingle();
  if (me?.role !== "admin") return new NextResponse("requiere rol admin", { status: 403 });

  const b = (await req.json()) as {
    name?: string; rubro?: string; table?: string; email?: string; label?: string; utc?: number;
  };
  const name = (b.name ?? "").trim();
  const table = (b.table ?? "").trim();
  const email = (b.email ?? "").trim().toLowerCase();
  const conversionLabel = (b.label ?? "").trim() || null;
  if (!name || !table) return new NextResponse("faltan nombre o tabla", { status: 400 });

  const sourceUrl = process.env.SOURCE_DEFAULT_URL?.trim();
  const sourceKey = process.env.SOURCE_DEFAULT_KEY?.trim();
  if (!sourceUrl || !sourceKey) return new NextResponse("falta SOURCE_DEFAULT_URL/KEY", { status: 500 });

  const clientId = randomUUID();
  const utc = typeof b.utc === "number" ? b.utc : -3;

  const c = await admin.from("clients").insert({ id: clientId, name, rubro: b.rubro ?? "", utc_offset: utc, conversion_label: conversionLabel });
  if (c.error) return new NextResponse("creando cliente: " + c.error.message, { status: 500 });
  const s = await admin.from("client_sources").insert({ client_id: clientId, supabase_url: sourceUrl, table_name: table });
  if (s.error) return new NextResponse("creando fuente: " + s.error.message, { status: 500 });

  // usuario del dueño (opcional)
  let password: string | null = null;
  if (email) {
    const list = await admin.auth.admin.listUsers();
    let owner = list.data.users.find((u) => u.email === email);
    if (!owner) {
      password = `Cliente-${randomBytes(4).toString("hex")}!`;
      const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
      if (created.error) return new NextResponse("creando usuario: " + created.error.message, { status: 500 });
      owner = created.data.user;
    }
    await admin.from("user_clients").upsert({ user_id: owner!.id, client_id: clientId, role: "viewer" });
  }

  // primer cómputo
  let days = 0;
  try {
    const r = await computeClient(admin, { client_id: clientId, supabase_url: sourceUrl, table_name: table, utc_offset: utc, key: sourceKey });
    days = r.days;
  } catch (e) {
    return NextResponse.json({ ok: true, client_id: clientId, password, warning: "cliente creado, pero el cómputo falló: " + (e instanceof Error ? e.message : String(e)) });
  }

  return NextResponse.json({ ok: true, client_id: clientId, password, days });
}
