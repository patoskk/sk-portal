// Lectura de una lección DENTRO del portal. Antes toda lección abría en una
// pestaña pelada, sin marca ni forma de volver: el cliente salía del portal
// para leer lo que el portal le mandó.
//
// El cuerpo es un documento HTML completo con su propio <style> (los genera la
// skill nutricion-ia), así que va en un <iframe srcDoc>: es el aislamiento
// correcto — inyectarlo con dangerouslySetInnerHTML le dejaría pisar los
// estilos del portal.
//
// Sobre el sandbox: esos documentos se DIBUJAN con JS (`window.DOC = {…}` y una
// función que arma el DOM), así que allow-scripts es obligatorio o la lección
// sale en blanco. Va SIN allow-same-origin a propósito: con los dos juntos el
// iframe puede sacarse el sandbox solo y llegar a las cookies de sesión. Sin
// allow-same-origin queda en un origen opaco — corre su JS y no toca nada más.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";
import { getLesson, getLessons, markLessonRead } from "@/lib/data/lessons";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const l = await getLesson(id);
  return { title: l?.title ?? "Lección" };
}

const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
function fmtFecha(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${Number(d)} ${MES[Number(m) - 1]} ${y}`;
}

export default async function LeccionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [lesson, todas] = await Promise.all([getLesson(id), getLessons()]);
  if (!lesson) notFound();
  // sin body no hay nada que mostrar acá: la lista manda esas a /api/lessons/[id]/view
  if (!lesson.body) notFound();

  await markLessonRead(id);

  // la lista viene de más nueva a más vieja
  const i = todas.findIndex((l) => l.id === id);
  const masNueva = i > 0 ? todas[i - 1] : null;
  const masVieja = i >= 0 && i < todas.length - 1 ? todas[i + 1] : null;

  return (
    <main className="page reader" id="contenido">
      <Link href="/lecciones" className="back-link">
        <ArrowLeft size={16} strokeWidth={2} /> Todas las lecciones
      </Link>

      <div className="page-head">
        <h1 className="page-title" style={{ fontSize: "var(--fs-2xl)" }}>{lesson.title}</h1>
        <p className="page-sub row" style={{ gap: 6, fontSize: "var(--fs-md)" }}>
          {fmtFecha(lesson.published_at)}
          {lesson.readMinutes ? (
            <>
              <span aria-hidden="true">·</span>
              <Clock size={14} strokeWidth={1.9} /> {lesson.readMinutes} min de lectura
            </>
          ) : null}
        </p>
      </div>

      <iframe
        className="reader-frame"
        title={lesson.title}
        srcDoc={lesson.body}
        sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
        loading="eager"
      />

      <nav className="reader-nav" aria-label="Otras lecciones">
        {masVieja ? (
          <Link href={`/lecciones/${masVieja.id}`} className="reader-nav-item">
            <span className="reader-nav-dir">
              <ArrowLeft size={14} strokeWidth={2} /> Anterior
            </span>
            <span className="reader-nav-title">{masVieja.title}</span>
          </Link>
        ) : (
          <span />
        )}
        {masNueva ? (
          <Link href={`/lecciones/${masNueva.id}`} className="reader-nav-item reader-nav-next">
            <span className="reader-nav-dir">
              Siguiente <ArrowRight size={14} strokeWidth={2} />
            </span>
            <span className="reader-nav-title">{masNueva.title}</span>
          </Link>
        ) : null}
      </nav>
    </main>
  );
}
