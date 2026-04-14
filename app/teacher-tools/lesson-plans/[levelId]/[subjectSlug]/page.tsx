import Link from "next/link";
import { notFound } from "next/navigation";
import { LessonPlanGeneratorForm } from "@/components/lesson-plan-generator-form";
import { requireTeacherUser } from "@/lib/auth";
import { getLessonPlanLevels, getLessonPlanSubjects, getLessonPlanUnits } from "@/lib/lesson-plan-curriculum";

export default async function TeacherToolLessonPlanSubjectDetailPage({
  params
}: {
  params: Promise<{ levelId: string; subjectSlug: string }>;
}) {
  await requireTeacherUser();
  const { levelId, subjectSlug } = await params;
  const level = getLessonPlanLevels().find((entry) => entry.id === levelId);

  if (!level) {
    notFound();
  }

  const subject = getLessonPlanSubjects(levelId).find(
    (entry) => entry.toLowerCase() === decodeURIComponent(subjectSlug).toLowerCase()
  );

  if (!subject) {
    notFound();
  }

  const units = getLessonPlanUnits(levelId, subject);

  return (
    <section className="teacher-tools-content">
      <nav className="teacher-tools-breadcrumbs" aria-label="Breadcrumb">
        <Link href="/teacher-tools">Home</Link>
        <span>/</span>
        <Link href="/teacher-tools/lesson-plans">Lesson Plans</Link>
        <span>/</span>
        <span>Generate</span>
      </nav>

      <div className="hero-actions">
        <Link href={`/teacher-tools/lesson-plans/${levelId}`} className="teacher-tools-action teacher-tools-action--warning">
          ← Back
        </Link>
      </div>

      <LessonPlanGeneratorForm
        levelId={levelId}
        levelTitle={level.title}
        subject={subject}
        units={units}
      />
    </section>
  );
}
