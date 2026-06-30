"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/dashboard", label: "Panel" },
  { href: "/lecciones", label: "Lecciones" },
];

export function Nav() {
  const path = usePathname();
  return (
    <nav style={{ display: "flex", gap: 4 }}>
      {LINKS.map((l) => {
        const active = path === l.href;
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
          </Link>
        );
      })}
    </nav>
  );
}