// Refresca la sesión de Supabase en cada request y protege rutas privadas.
// Sin sesión -> redirige a /login (excepto la propia /login y assets).
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options: CookieOptions };

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;
  const isPublic = pathname.startsWith("/login") || pathname.startsWith("/auth");
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    // recordamos a dónde iba: el link del mail a una lección tiene que sobrevivir
    // el login (antes caía siempre en /dashboard y había que buscarla a mano)
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  // todo menos assets estáticos y las rutas con su propio secret
  // (api/cron = Vercel Cron, api/notify = callback de n8n,
  //  api/ingest = los workflows reportando el uso de herramientas).
  // Si una ruta con secreto propio NO se excluye acá, el middleware la manda a
  // /login con un 307 y el que llama cree que salió todo bien: falla muda.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/cron|api/notify|api/ingest).*)"],
};
