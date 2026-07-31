"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavLink = { href: string; label: string; newUntil?: string };

// `newUntil`: punto teal de novedad hasta esa fecha, para empujar la primera
// visita a una pestaña recién creada. Se apaga solo — cuando pase, borrar el
// campo (la fecha va en UTC explícito para que servidor y cliente coincidan).
const BASE: NavLink[] = [
  { href: "/dashboard", label: "Panel" },
  { href: "/lecciones", label: "Lecciones" },
  { href: "/beneficios", label: "Beneficios", newUntil: "2026-09-15T00:00:00Z" },
];

export function Nav({ isAdmin = false }: { isAdmin?: boolean }) {
  const path = usePathname();
  const links: NavLink[] = isAdmin ? [...BASE, { href: "/admin", label: "Admin" }] : BASE;
  return (
    <nav style={{ display: "flex", gap: 4 }}>
      {links.map((l) => {
        const active = path === l.href;
        // estando parado en la pestaña el punto no aporta: solo ensucia
        const nuevo = !active && !!l.newUntil && Date.now() < Date.parse(l.newUntil);
        return (
          <Link
            key={l.href}
            href={l.href}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              fontSize: 13.5,
              fontWeight: active ? 700 : 500,
              color: active ? "var(--accent-dark)" : "var(--ink-soft)",
              background: active ? "var(--tint)" : "transparent",
              textDecoration: "none",
            }}
          >
            {l.label}
            {nuevo ? (
              <>
                <span
                  aria-hidden="true"
                  style={{
                    display: "inline-block",
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "var(--accent)",
                    marginLeft: 6,
                    verticalAlign: "middle",
                  }}
                />
                <span className="sr-only"> (novedad)</span>
              </>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}