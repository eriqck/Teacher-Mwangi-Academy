import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { teacherLessonPlanPrice } from "@/lib/business";

export default async function TeacherToolLessonPlansPage() {
  await requireUser();

  return (
    <section className="teacher-tools-content">
      <div className="teacher-tools-section-head">
        <div>
          <span className="eyebrow">Lesson plans</span>
          <h2>Lesson plan generator is next in line.</h2>
        </div>
      </div>

      <article className="teacher-tools-card">
        <p className="subtle">
          Lesson-plan generation is the next feature to wire in, and it will follow the same model as
          schemes: KSh {teacherLessonPlanPrice} per generated lesson plan, not a one-time unlock.
        </p>

        <div className="hero-actions">
          <Link href="/teacher-tools/schemes/new" className="button">
            Use scheme generator now
          </Link>
          <Link href="/teacher-tools" className="button-secondary">
            Back to dashboard
          </Link>
        </div>
      </article>
    </section>
  );
}
