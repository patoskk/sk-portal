// Primitivas de UI del portal. Antes cada página reinventaba el mismo objeto
// `style={{}}` con números distintos (fontSize 12.5/13.5/14.5, radios 8/9/10/12);
// acá se define una vez y las clases viven en globals.css.
//
// Son server components salvo aclaración: no llevan estado.
import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";

/* ---------------------------------------------------------------- Card */

export function Card({
  children,
  interactive,
  className = "",
  ...rest
}: { children: ReactNode; interactive?: boolean } & ComponentProps<"section">) {
  return (
    <section className={`card${interactive ? " card-interactive" : ""} ${className}`.trim()} {...rest}>
      {children}
    </section>
  );
}

/** Encabezado de tarjeta: título, bajada opcional y un slot a la derecha. */
export function CardHeader({
  title,
  hint,
  right,
  as: Tag = "h2",
}: {
  title: ReactNode;
  hint?: ReactNode;
  right?: ReactNode;
  as?: "h2" | "h3";
}) {
  return (
    <div className="card-head">
      <div style={{ minWidth: 0 }}>
        <Tag className="card-title">{title}</Tag>
        {hint ? <p className="card-hint">{hint}</p> : null}
      </div>
      {right ? <div className="row" style={{ flex: "none" }}>{right}</div> : null}
    </div>
  );
}

/* --------------------------------------------------------------- Badge */

export type BadgeTone = "accent" | "solid" | "gold" | "warn" | "neutral";

export function Badge({ tone = "accent", children }: { tone?: BadgeTone; children: ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

/* -------------------------------------------------------------- Button */

type Variant = "solid" | "outline" | "ghost" | "danger";

function btnClass(variant: Variant, size?: "sm", className?: string) {
  return [`btn`, `btn-${variant}`, size === "sm" ? "btn-sm" : "", className ?? ""]
    .filter(Boolean)
    .join(" ");
}

export function Button({
  variant = "solid",
  size,
  className,
  ...rest
}: { variant?: Variant; size?: "sm" } & ComponentProps<"button">) {
  return <button className={btnClass(variant, size, className)} {...rest} />;
}

/** Mismo aspecto que Button, pero navega (Link de Next: prefetch + client-side). */
export function ButtonLink({
  variant = "solid",
  size,
  className,
  ...rest
}: { variant?: Variant; size?: "sm" } & ComponentProps<typeof Link>) {
  return <Link className={btnClass(variant, size, className)} {...rest} />;
}

/* ---------------------------------------------------------- EmptyState */

export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      {icon ? <div className="empty-icon">{icon}</div> : null}
      <p className="empty-title">{title}</p>
      {children ? <p className="empty-text">{children}</p> : null}
      {action ? <div style={{ marginTop: 6 }}>{action}</div> : null}
    </div>
  );
}

/* --------------------------------------------------------------- Field */

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}
