// Shell del portal. Vive en un route group para que /login, /auth/* y /l/[id]
// —tarjetas centradas sin navegación— queden afuera.
//
// Al ser layout, el sidebar NO se re-monta al navegar: los loading.tsx de cada
// página reemplazan solo el contenido y la barra queda quieta.
import { getMe } from "@/lib/data/me";
import { getUnreadLessonCount } from "@/lib/data/lessons";
import { getLatestUpdateAt } from "@/lib/data/updates";
import { Sidebar } from "@/components/Sidebar";

export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  // Las tres en paralelo: ninguna depende de la otra y el layout no debe
  // sumarle latencia en serie a cada navegación.
  const [me, sinLeer, latestUpdateAt] = await Promise.all([
    getMe(),
    getUnreadLessonCount(),
    getLatestUpdateAt(),
  ]);

  return (
    <div className="shell">
      <Sidebar
        isAdmin={me.isAdmin}
        clientName={me.clientName}
        email={me.email}
        unreadLessons={sinLeer}
        latestUpdateAt={latestUpdateAt}
      />
      <div className="shell-main">
        <a href="#contenido" className="skip-link">
          Saltar al contenido
        </a>
        {children}
      </div>
    </div>
  );
}
