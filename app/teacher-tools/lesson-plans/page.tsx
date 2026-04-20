import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { teacherLessonPlanPrice } from "@/lib/business";
import { getLessonPlanLevels } from "@/lib/lesson-plan-curriculum";
import { readAppData } from "@/lib/repository";

export default async function TeacherToolLessonPlansPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  const resolvedSearchParams = await searchParams;
  const paymentState =
    typeof resolvedSearchParams.payment === "string" ? resolvedSearchParams.payment : null;
  const levels = getLessonPlanLevels();
  const canGenerate = user?.role === "teacher" || user?.role === "admin";
  const store = canGenerate ? await readAppData() : null;
  const generatedLessonPlans = canGenerate && user && store
    ? store.generatedLessonPlans
        .filter((plan) => plan.userId === user.id || user.role === "admin")
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    : [];

  return (
    <section className="teacher-tools-content">
      <nav className="teacher-tools-breadcrumbs" aria-label="Breadcrumb">
        <Link href="/teacher-tools">Home</Link>
        <span>/</span>
        <span>Lesson Plans</span>
      </nav>

      <div className="teacher-tools-section-head">
        <div>
          <span className="eyebrow">Lesson plans</span>
          <h2>Lesson Plans: Select Grade</h2>
        </div>
      </div>

      {paymentState ? (
        <p className={`message ${paymentState === "success" ? "message-success" : "message-error"}`}>
          {paymentState === "success"
            ? "Your payment was confirmed and the lesson plan is now ready."
            : "Payment was not completed. You can start lesson-plan generation again."}
        </p>
      ) : null}

      <article className="teacher-tools-card">
        <p className="subtle">
          Pick a class level first, then choose the subject, strands, and substrands you want.
          The first lesson-plan generation is free, then each lesson plan is charged independently at KSh {teacherLessonPlanPrice}.
        </p>
        {!canGenerate ? (
          <div className="teacher-tools-unlock-box">
            <p className="subtle">
              Visitors can browse the full lesson-plan flow. You will only be asked to sign in or create a
              teacher account when you click generate.
            </p>
          </div>
        ) : null}
      </article>

      <div className="teacher-tools-grade-grid">
        {levels.map((level) => (
          <Link
            key={level.id}
            href={`/teacher-tools/lesson-plans/${level.id}`}
            className="teacher-tools-level-card"
          >
            <div className="teacher-tools-level-icon" aria-hidden="true">
              LP
            </div>
            <div>
              <strong>{level.title}</strong>
              <p>{level.title} Lesson Plans</p>
            </div>
          </Link>
        ))}
      </div>

      {canGenerate ? (
        <article className="teacher-tools-card">
          <div className="teacher-tools-section-head">
            <div>
              <span className="eyebrow">Saved</span>
              <h3>Recent lesson plans</h3>
            </div>
          </div>

          {generatedLessonPlans.length > 0 ? (
            <div className="generated-scheme-list">
              {generatedLessonPlans.slice(0, 8).map((plan) => (
                <article key={plan.id} className="generated-scheme-card">
                  <div className="generated-scheme-meta">
                    <span className="pill">{plan.level}</span>
                    <span className="pill">{plan.subject}</span>
                    <span className="pill">{plan.selectedCount} selected</span>
                  </div>
                  <h4>{plan.title}</h4>
                  <p className="subtle">{plan.unitTitle}</p>
                  <div className="hero-actions">
                    <Link href={`/teacher-tools/lesson-plans/generated/${plan.id}`} className="button-secondary">
                      Open lesson plan
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h4>No generated lesson plans yet</h4>
              <p className="subtle">Your saved lesson-plan outputs will appear here after the first generation.</p>
            </div>
          )}
        </article>
      ) : null}
    </section>
  );
}
