// Destino de los enlaces de email de Supabase (recupero de contraseña, invitación).
// Soporta los dos formatos: ?token_hash&type (template con {{ .TokenHash }}) y
// ?code (PKCE por defecto — funciona si se abre en el mismo navegador que lo pidió).
import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const next = url.searchParams.get("next") ?? "/auth/update-password";
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const code = url.searchParams.get("code");

  const sb = await createClient();
  let ok = false;
  if (tokenHash && type) {
    const { error } = await sb.auth.verifyOtp({ type, token_hash: tokenHash });
    ok = !error;
  } else if (code) {
    const { error } = await sb.auth.exchangeCodeForSession(code);
    ok = !error;
  }

  const dest = url.clone();
  dest.search = "";
  dest.pathname = ok ? next : "/login";
  return NextResponse.redirect(dest);
}
