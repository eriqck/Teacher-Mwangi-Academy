import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getLessonPlanSubjects, getLessonPlanLevels } from "@/lib/lesson-plan-curriculum";

function encodeSubject(subject: string) {
  return encodeURIComponent(subject);
}

export default async function TeacherToolLessonPlanSubjectsPage({
  params
}: {
  params: Promise<{ levelId: string }>;
}) {
  await requireUser();
  const { levelId } = await params;
  const level = getLessonPlanLevels().find((entry) => entry.id === levelId);

  if (!level) {
    notFound();
  }

  const subjects = getLessonPlanSubjects(levelId);

  return (
    <section className="teacher-tools-content">
      <nav className="teacher-tools-breadcrumbs" aria-label="Breadcrumb">
        <Link href="/teacher-tools">Home</Link>
        <span>/</span>
        <Link href="/teacher-tools/lesson-plans">Lesson Plans</Link>
        <span>/</span>
        <span>{level.title}</span>
      </nav>

      <div className="teacher-tools-section-head">
        <div>
          <span className="eyebrow">Lesson plans</span>
          <h2>{level.title} Lesson Plans</h2>
        </div>
        <div className="hero-actions">
          <Link href="/teacher-tools/lesson-plans" className="teacher-tools-action teacher-tools-action--warning">
            ← Back
          </Link>
        </div>
      </div>

      <div className="teacher-tools-grade-grid">
        {subjects.map((subject) => (
          <Link
            key={subject}
            href={`/teacher-tools/lesson-plans/${levelId}/${encodeSubject(subject)}`}
            className="teacher-tools-level-card teacher-tools-level-card--subject"
          >
            <div className="teacher-tools-level-icon teacher-tools-level-icon--green" aria-hidden="true">
              LP
            </div>
            <div>
              <strong>{subject}</strong>
              <p>{level.title} Lesson Plans</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
