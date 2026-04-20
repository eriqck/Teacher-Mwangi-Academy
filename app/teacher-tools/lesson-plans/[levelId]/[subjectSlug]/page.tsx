import Link from "next/link";
import { notFound } from "next/navigation";
import { LessonPlanGeneratorForm } from "@/components/lesson-plan-generator-form";
import { getCurrentUser } from "@/lib/auth";
import { getLessonPlanLevels, getLessonPlanSubjects, getLessonPlanUnits } from "@/lib/lesson-plan-curriculum";
import { readAppData } from "@/lib/repository";
import { schemeTerms } from "@/lib/scheme-terms";

export default async function TeacherToolLessonPlanSubjectDetailPage({
  params
}: {
  params: Promise<{ levelId: string; subjectSlug: string }>;
}) {
  const user = await getCurrentUser();
  const canGenerate = user?.role === "teacher" || user?.role === "admin";
  const isAdmin = user?.role === "admin";
  const { levelId, subjectSlug } = await params;
  const store = await readAppData();
  const firstGenerationFree = Boolean(
    user &&
      user.role === "teacher" &&
      !store.generatedLessonPlans.some((plan) => plan.userId === user.id)
  );
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

  const unitsByTerm = Object.fromEntries(
    schemeTerms.map((term) => [term.id, getLessonPlanUnits(levelId, subject, term.id, store.resources)])
  );

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
        unitsByTerm={unitsByTerm}
        canGenerate={canGenerate}
        isAdmin={isAdmin}
        firstGenerationFree={firstGenerationFree}
        authRedirectPath={`/teacher-tools/lesson-plans/${levelId}/${encodeURIComponent(subject)}`}
      />
    </section>
  );
}
