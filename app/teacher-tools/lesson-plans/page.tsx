import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { readAppData } from "@/lib/repository";
import { getTeacherToolAccess } from "@/lib/teacher-tools";

export default async function TeacherToolLessonPlansPage() {
  const user = await requireUser();
  const store = await readAppData();
  const access = getTeacherToolAccess(store, user);

  if (!access.hasAccess && user.role !== "admin") {
    redirect("/teacher-tools");
  }

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
          The one-time bot access you paid for will also cover lesson-plan generation. The dashboard
          and access flow are ready, and the lesson-plan builder is the next feature to wire in.
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
