// URL corta que va en el mail de aviso: portal.skoptimal.com/l/<id>
// Es una PÁGINA (no una ruta de API) a propósito: así el middleware la protege
// como cualquier otra y el flujo de login con ?next la puede recuperar. Desde
// acá redirige a la ruta que resuelve el contenido (signed URL o HTML).
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AbrirLeccion({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/api/lessons/${id}/view`);
}
