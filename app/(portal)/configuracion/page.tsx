// Configuración. Reemplaza al dropdown de dos ítems que colgaba del topbar:
// ahí "Configuración" era tema + cerrar sesión, algo que el cliente abría una
// vez y no volvía a mirar.
import type { Metadata } from "next";
import { Mail, Building2, KeyRound, Palette, BellRing } from "lucide-react";
import { getMe } from "@/lib/data/me";
import { waLink } from "@/lib/contact";
import { Card, CardHeader, Badge, ButtonLink } from "@/components/ui";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PasswordForm } from "@/components/PasswordForm";
import { LogoutButton } from "@/components/LogoutButton";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Configuración" };

export default async function ConfiguracionPage() {
  const me = await getMe();
  const cambio = waLink(
    `¡Hola! Soy ${me.clientName ?? "cliente"} de SK Optimal y quiero cambiar un dato de mi cuenta del portal.`,
  );

  return (
    <main className="page" id="contenido" style={{ maxWidth: 780 }}>
      <div className="page-head">
        <h1 className="page-title">Configuración</h1>
        <p className="page-sub">Tu cuenta, tu acceso y cómo se ve el portal.</p>
      </div>

      <div className="stack">
        <Card>
          <CardHeader
            title={
              <span className="row" style={{ gap: 8 }}>
                <Building2 size={18} strokeWidth={1.9} /> Tu cuenta
              </span>
            }
            hint="Estos datos los administramos nosotros. Si algo está mal, escribinos y lo corregimos."
            right={
              <ButtonLink href={cambio} target="_blank" rel="noopener noreferrer" variant="outline" size="sm">
                Pedir un cambio
              </ButtonLink>
            }
          />
          <dl className="datalist">
            <dt>Negocio</dt>
            <dd>{me.clientName ?? "—"}</dd>
            <dt>Rubro</dt>
            <dd>{me.rubro ?? "—"}</dd>
            <dt>
              <span className="row" style={{ gap: 6 }}>
                <Mail size={14} strokeWidth={1.9} /> Mail de acceso
              </span>
            </dt>
            <dd>{me.email ?? "—"}</dd>
          </dl>
        </Card>

        <Card>
          <CardHeader
            title={
              <span className="row" style={{ gap: 8 }}>
                <KeyRound size={18} strokeWidth={1.9} /> Contraseña
              </span>
            }
            hint="Elegí una nueva. Mínimo 8 caracteres."
          />
          <PasswordForm />
        </Card>

        <Card>
          <CardHeader
            title={
              <span className="row" style={{ gap: 8 }}>
                <Palette size={18} strokeWidth={1.9} /> Apariencia
              </span>
            }
            hint="Se guarda en este navegador."
            right={<ThemeToggle />}
          />
        </Card>

        <Card>
          <CardHeader
            title={
              <span className="row" style={{ gap: 8 }}>
                <BellRing size={18} strokeWidth={1.9} /> Avisos por mail
              </span>
            }
            hint="Te escribimos cuando publicamos una lección nueva. Son parte del servicio, no publicidad."
            right={
              me.notifyLessons ? (
                <Badge tone="accent">Activados</Badge>
              ) : (
                <Badge tone="neutral">Sin avisos</Badge>
              )
            }
          />
          {/* Sin interruptor a propósito: notify_lessons se apaga a mano cuando
              un cliente lo pide (getLessonRecipients lo saltea). Un switch que no
              hace nada es peor que ninguno. */}
          <p className="card-note">
            {me.notifyLessons
              ? "Si preferís no recibirlos, avisanos y los damos de baja."
              : "Están dados de baja. Si querés volver a recibirlos, escribinos."}
          </p>
        </Card>

        <Card>
          <CardHeader title="Cerrar sesión" hint="Vas a volver a la pantalla de ingreso." right={<LogoutButton />} />
        </Card>
      </div>
    </main>
  );
}
