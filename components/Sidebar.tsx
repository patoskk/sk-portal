"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  GraduationCap,
  Sparkles,
  Gift,
  Shield,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X,
} from "lucide-react";
import { NOVEDADES_SEEN_KEY } from "@/components/SeenMarker";

type NavLink = {
  href: string;
  label: string;
  Icon: typeof LayoutDashboard;
  /** contador chico a la derecha (p. ej. lecciones sin leer) */
  badge?: number;
  /** punto de novedad */
  dot?: boolean;
};

export interface SidebarProps {
  isAdmin?: boolean;
  clientName?: string | null;
  email?: string | null;
  unreadLessons?: number;
  /** fecha (ISO) de la novedad más reciente, o null si no hay ninguna */
  latestUpdateAt?: string | null;
}

export function Sidebar({
  isAdmin = false,
  clientName,
  email,
  unreadLessons = 0,
  latestUpdateAt = null,
}: SidebarProps) {
  const path = usePathname();
  const [rail, setRail] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [seenUpdates, setSeenUpdates] = useState<string | null>(null);

  // El estado real lo puso el script inline de app/layout.tsx antes de pintar;
  // acá solo se sincroniza React con lo que ya está en el DOM.
  useEffect(() => {
    setRail(document.documentElement.dataset.sidebar === "rail");
  }, []);

  // Lo que ya vio se guarda en el navegador (ver SeenMarker). Se lee en efecto
  // y no en el render inicial para no romper la hidratación: el servidor no
  // conoce el localStorage y pintaría un punto distinto al del cliente.
  useEffect(() => {
    const leer = () => {
      try {
        setSeenUpdates(localStorage.getItem(NOVEDADES_SEEN_KEY));
      } catch {}
    };
    leer();
    window.addEventListener("novedades-vistas", leer);
    return () => window.removeEventListener("novedades-vistas", leer);
  }, []);

  // el drawer no debe sobrevivir a una navegación
  useEffect(() => {
    setDrawer(false);
  }, [path]);

  useEffect(() => {
    if (!drawer) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setDrawer(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawer]);

  function toggleRail() {
    const next = !rail;
    setRail(next);
    document.documentElement.dataset.sidebar = next ? "rail" : "full";
    try {
      localStorage.setItem("sidebar", next ? "rail" : "full");
    } catch {}
  }

  // Punto de novedad calculado contra la última publicada, no contra una fecha
  // escrita a mano en el código (que había que acordarse de borrar).
  const hayNovedad = Boolean(latestUpdateAt) && seenUpdates !== latestUpdateAt;

  const links: NavLink[] = [
    { href: "/dashboard", label: "Panel", Icon: LayoutDashboard },
    { href: "/lecciones", label: "Lecciones", Icon: GraduationCap, badge: unreadLessons },
    { href: "/novedades", label: "Novedades", Icon: Sparkles, dot: hayNovedad },
    { href: "/beneficios", label: "Beneficios", Icon: Gift },
  ];
  if (isAdmin) links.push({ href: "/admin", label: "Admin", Icon: Shield });

  // startsWith, no igualdad: /lecciones/[id] tiene que dejar "Lecciones" activa
  const isActive = (href: string) => path === href || path.startsWith(href + "/");

  return (
    <>
      {/* barra superior — solo en mobile, donde el sidebar es un drawer */}
      <div className="mobilebar">
        <button
          className="icon-btn"
          onClick={() => setDrawer(true)}
          aria-label="Abrir el menú"
          aria-expanded={drawer}
        >
          <Menu size={20} strokeWidth={1.75} />
        </button>
        <Wordmark />
      </div>

      {drawer ? <div className="drawer-backdrop" onClick={() => setDrawer(false)} /> : null}

      <aside className={`sidebar${drawer ? " is-open" : ""}`} aria-label="Navegación principal">
        <div className="sidebar-head">
          <Link href="/dashboard" className="sidebar-brand" aria-label="SK Optimal — ir al panel">
            <Wordmark rail={rail} />
          </Link>
          <button
            className="icon-btn sidebar-collapse"
            onClick={toggleRail}
            aria-label={rail ? "Expandir el menú" : "Contraer el menú"}
            title={rail ? "Expandir" : "Contraer"}
          >
            {rail ? <PanelLeftOpen size={18} strokeWidth={1.75} /> : <PanelLeftClose size={18} strokeWidth={1.75} />}
          </button>
          <button
            className="icon-btn sidebar-close"
            onClick={() => setDrawer(false)}
            aria-label="Cerrar el menú"
          >
            <X size={20} strokeWidth={1.75} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {links.map((l) => (
            <Item key={l.href} link={l} active={isActive(l.href)} rail={rail} />
          ))}
        </nav>

        <div className="sidebar-foot">
          <Item
            link={{ href: "/configuracion", label: "Configuración", Icon: Settings }}
            active={isActive("/configuracion")}
            rail={rail}
          />
          {rail ? null : (
            <div className="sidebar-me" title={email ?? undefined}>
              {clientName ? <span className="sidebar-me-name">{clientName}</span> : null}
              {email ? <span className="sidebar-me-mail">{email}</span> : null}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

function Wordmark({ rail }: { rail?: boolean }) {
  // en modo rail solo queda "SK": "OPTIMAL" no entra en 76px
  return (
    <span className="wordmark">
      <span className="sk">SK</span>
      {rail ? null : (
        <>
          {" "}
          <span className="op">OPTIMAL</span>
        </>
      )}
    </span>
  );
}

function Item({ link, active, rail }: { link: NavLink; active: boolean; rail: boolean }) {
  const { href, label, Icon, badge, dot } = link;
  return (
    <Link
      href={href}
      className={`nav-item${active ? " is-active" : ""}`}
      aria-current={active ? "page" : undefined}
      title={rail ? label : undefined}
    >
      <Icon size={19} strokeWidth={active ? 2.1 : 1.75} className="nav-item-icon" />
      <span className="nav-item-label">{label}</span>
      {badge ? (
        <span className="nav-item-badge">
          {badge}
          <span className="sr-only"> sin leer</span>
        </span>
      ) : null}
      {/* estando parado en la sección el punto no aporta: solo ensucia */}
      {dot && !active && !badge ? (
        <>
          <span aria-hidden="true" className="nav-item-dot" />
          <span className="sr-only"> (novedad)</span>
        </>
      ) : null}
    </Link>
  );
}
