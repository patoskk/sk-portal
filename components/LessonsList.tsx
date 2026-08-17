"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Check, BookOpen, ExternalLink, ArrowRight, Route } from "lucide-react";
import type { Lesson } from "@/lib/data/lessons";
import { LESSON_TOPICS, TOPIC_SIN, TOPIC_SIN_LABEL, topicLabel } from "@/lib/lessonTopics";
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
// las lecciones sin categoría caen todas en el mismo balde ("Otras")
function topicDe(l: Lesson): string {
  return l.topic ?? TOPIC_SIN;
}
/** Con cuerpo se lee adentro del portal; un PDF de Storage o un link abre aparte. */
function hrefDe(l: Lesson): string {
  return l.inline ? `/lecciones/${l.id}` : `/api/lessons/${l.id}/view`;
}

export function LessonsList({ lessons }: { lessons: Lesson[] }) {
  const [q, setQ] = useState("");
  const [soloSinLeer, setSoloSinLeer] = useState(false);
  const [topic, setTopic] = useState<string | null>(null); // null = todas

  const leidas = lessons.filter((l) => l.read).length;
  const pct = lessons.length ? Math.round((100 * leidas) / lessons.length) : 0;

  // Un chip por categoría CON lecciones, en el orden canónico y "Otras" al final:
  // categorías vacías no se muestran (con 8 lecciones, un chip vacío es ruido).
  const chips = useMemo(() => {
    const cuenta = new Map<string, number>();
    for (const l of lessons) cuenta.set(topicDe(l), (cuenta.get(topicDe(l)) ?? 0) + 1);
    const orden = [...LESSON_TOPICS.map((t) => t.key), TOPIC_SIN];
    return orden
      .filter((k) => cuenta.has(k))
      .map((k) => ({ key: k, label: k === TOPIC_SIN ? TOPIC_SIN_LABEL : topicLabel(k), n: cuenta.get(k)! }));
  }, [lessons]);

  // La ruta de arranque. Desaparece cuando ya la completó (cumplió su función)
  // y mientras hay filtro o búsqueda activa, donde sería ruido.
  const ruta = useMemo(
    () =>
      lessons
        .filter((l) => l.starterOrder != null)
        .sort((a, b) => (a.starterOrder ?? 0) - (b.starterOrder ?? 0)),
    [lessons],
  );
  const mostrarRuta = ruta.length > 0 && ruta.some((l) => !l.read) && !q.trim() && !topic && !soloSinLeer;

  const visibles = useMemo(() => {
    const n = normalizar(q.trim());
    return lessons.filter((l) => {
      if (soloSinLeer && l.read) return false;
      if (topic && topicDe(l) !== topic) return false;
      if (!n) return true;
      return normalizar(`${l.title} ${l.summary ?? ""} ${l.why.join(" ")}`).includes(n);
    });
  }, [lessons, q, soloSinLeer, topic]);

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

      {chips.length > 1 ? (
        <div className="chips" role="group" aria-label="Filtrar por tema">
          <button
            type="button"
            className={`btn btn-outline btn-sm${topic === null ? " is-on" : ""}`}
            aria-pressed={topic === null}
            onClick={() => setTopic(null)}
          >
            Todas <span className="chip-count">{lessons.length}</span>
          </button>
          {chips.map((c) => (
            <button
              key={c.key}
              type="button"
              className={`btn btn-outline btn-sm${topic === c.key ? " is-on" : ""}`}
              aria-pressed={topic === c.key}
              onClick={() => setTopic(topic === c.key ? null : c.key)}
            >
              {c.label} <span className="chip-count">{c.n}</span>
            </button>
          ))}
        </div>
      ) : null}

      {mostrarRuta ? <Ruta lessons={ruta} /> : null}

      {visibles.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Search size={20} strokeWidth={1.9} />}
            title={soloSinLeer && !q && !topic ? "Estás al día" : "No encontramos nada con eso"}
          >
            {soloSinLeer && !q && !topic
              ? "Leíste todas las lecciones publicadas hasta ahora."
              : "Probá con otra palabra, otro tema, o sacá el filtro de «sin leer»."}
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

/**
 * "Empezá por acá": un índice compacto, no tarjetas. Es a propósito — las mismas
 * lecciones aparecen abajo en la lista, y si acá se vieran igual de grandes
 * parecerían duplicadas en vez de un camino sugerido.
 */
function Ruta({ lessons }: { lessons: Lesson[] }) {
  return (
    <section className="card starter">
      <div className="starter-head">
        <span className="starter-icon" aria-hidden="true">
          <Route size={17} strokeWidth={1.9} />
        </span>
        <div>
          <h2 className="starter-title">Empezá por acá</h2>
          <p className="starter-sub">
            Si estás arrancando, estas tres en este orden. Después seguí por el tema que más te sirva.
          </p>
        </div>
      </div>
      <ol className="starter-list">
        {lessons.map((l, i) => (
          <li key={l.id}>
            <StarterRow lesson={l} n={i + 1} />
          </li>
        ))}
      </ol>
    </section>
  );
}

function StarterRow({ lesson: l, n }: { lesson: Lesson; n: number }) {
  const contenido = (
    <>
      <span className={`starter-num${l.read ? " is-read" : ""}`} aria-hidden="true">
        {l.read ? <Check size={14} strokeWidth={2.6} /> : n}
      </span>
      <span className="starter-name">{l.title}</span>
      <span className="starter-meta">
        {l.read ? "leída" : l.readMinutes ? `${l.readMinutes} min` : ""}
      </span>
    </>
  );
  return l.inline ? (
    <Link className="starter-row" href={hrefDe(l)}>
      {contenido}
    </Link>
  ) : (
    <a className="starter-row" href={hrefDe(l)} target="_blank" rel="noopener noreferrer">
      {contenido}
    </a>
  );
}

function LessonRow({ lesson: l }: { lesson: Lesson }) {
  const href = hrefDe(l);
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
          {/* solo si tiene tema: mostrarle "Otras" al cliente no le dice nada */}
          {l.topic ? (
            <>
              <span className="lesson-topic">{topicLabel(l.topic)}</span>
              {" · "}
            </>
          ) : null}
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
