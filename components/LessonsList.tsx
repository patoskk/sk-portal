"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Check, BookOpen, ExternalLink, ArrowRight } from "lucide-react";
import type { Lesson } from "@/lib/data/lessons";
import { EmptyState } from "@/components/ui";

const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
function fmtFecha(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${Number(d)} ${MES[Number(m) - 1]} ${y}`;
}
function esNueva(iso: string): boolean {
  return Date.now() - Date.parse(iso) < 7 * 86400000;
}
// sin tildes y en minúscula: buscar "practico" tiene que encontrar "práctico"
function normalizar(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function LessonsList({ lessons }: { lessons: Lesson[] }) {
  const [q, setQ] = useState("");
  const [soloSinLeer, setSoloSinLeer] = useState(false);

  const leidas = lessons.filter((l) => l.read).length;
  const pct = lessons.length ? Math.round((100 * leidas) / lessons.length) : 0;

  const visibles = useMemo(() => {
    const n = normalizar(q.trim());
    return lessons.filter((l) => {
      if (soloSinLeer && l.read) return false;
      if (!n) return true;
      return normalizar(`${l.title} ${l.summary ?? ""} ${l.why.join(" ")}`).includes(n);
    });
  }, [lessons, q, soloSinLeer]);

  return (
    <>
      <div className="lessons-bar">
        <div className="progress">
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <span className="progress-text">
            {leidas} de {lessons.length} leídas
          </span>
        </div>
        <div className="row">
          <label className="search">
            <Search size={15} strokeWidth={1.9} />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar una lección"
              aria-label="Buscar una lección"
            />
          </label>
          <button
            type="button"
            className={`btn btn-outline btn-sm${soloSinLeer ? " is-on" : ""}`}
            aria-pressed={soloSinLeer}
            onClick={() => setSoloSinLeer((v) => !v)}
          >
            Sin leer
          </button>
        </div>
      </div>

      {visibles.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Search size={20} strokeWidth={1.9} />}
            title={soloSinLeer && !q ? "Estás al día" : "No encontramos nada con eso"}
          >
            {soloSinLeer && !q
              ? "Leíste todas las lecciones publicadas hasta ahora."
              : "Probá con otra palabra, o sacá el filtro de «sin leer»."}
          </EmptyState>
        </div>
      ) : (
        <section className="lessons-list">
          {visibles.map((l) => (
            <LessonRow key={l.id} lesson={l} />
          ))}
        </section>
      )}
    </>
  );
}

function LessonRow({ lesson: l }: { lesson: Lesson }) {
  // Las que tienen cuerpo se leen adentro del portal; un PDF de Storage o un
  // link externo siguen abriendo aparte por la ruta de siempre.
  const href = l.inline ? `/lecciones/${l.id}` : `/api/lessons/${l.id}/view`;
  const externo = !l.inline;
  const contenido = (
    <>
      <span className={`lesson-mark${l.read ? " is-read" : ""}`} aria-hidden="true">
        {l.read ? <Check size={16} strokeWidth={2.6} /> : <BookOpen size={16} strokeWidth={1.9} />}
      </span>
      <div className="lesson-body">
        <h3 className="lesson-title">
          {l.title}
          {esNueva(l.published_at) ? <span className="lesson-new">Nueva</span> : null}
        </h3>
        {l.summary ? <p className="lesson-summary">{l.summary}</p> : null}
        {l.why.length ? (
          <ul className="lesson-why">
            {l.why.map((w, k) => (
              <li key={k}>{w}</li>
            ))}
          </ul>
        ) : null}
        <p className="lesson-meta">
          {fmtFecha(l.published_at)}
          {l.readMinutes ? ` · ${l.readMinutes} min de lectura` : ""}
          {l.read ? " · leída" : ""}
        </p>
      </div>
      <span className="lesson-cta">
        {l.read ? "Releer" : "Leer"}
        {externo ? <ExternalLink size={15} strokeWidth={2} /> : <ArrowRight size={15} strokeWidth={2.2} />}
      </span>
    </>
  );

  return externo ? (
    <a className="lesson-row" href={href} target="_blank" rel="noopener noreferrer">
      {contenido}
    </a>
  ) : (
    <Link className="lesson-row" href={href}>
      {contenido}
    </Link>
  );
}
