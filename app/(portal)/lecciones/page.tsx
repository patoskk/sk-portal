import type { Metadata } from "next";
import { GraduationCap } from "lucide-react";
import { getLessons } from "@/lib/data/lessons";
import { LessonsList } from "@/components/LessonsList";
import { EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Lecciones" };

export default async function LeccionesPage() {
  const lessons = await getLessons();

  return (
    <main className="page" id="contenido">
      <div className="page-head">
        <h1 className="page-title">Lecciones de IA</h1>
        <p className="page-sub">
          Material que preparamos para que aproveches al máximo la inteligencia artificial en tu negocio.
        </p>
      </div>

      {lessons.length === 0 ? (
        <div className="card">
          <EmptyState icon={<GraduationCap size={20} strokeWidth={1.9} />} title="Todavía no hay lecciones publicadas">
            Acá vas a ver las lecturas que te vayamos enviando. Te avisamos por mail cuando salga la primera.
          </EmptyState>
        </div>
      ) : (
        <LessonsList lessons={lessons} />
      )}
    </main>
  );
}
