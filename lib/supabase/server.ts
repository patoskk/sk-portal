// Cliente Supabase para Server Components / Route Handlers. Usa la ANON key y
// las cookies de sesión (httpOnly) vía @supabase/ssr. RLS aplica automáticamente:
// el usuario solo ve las filas de su client_id. NUNCA usar la service key acá.
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

type CookieToSet = { name: string; value: string; options: CookieOptions };

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // setAll desde un Server Component: lo maneja el middleware.
          }
        },
      },
    },
  );
}
