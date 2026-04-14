import Link from "next/link";
import { redirect } from "next/navigation";
import { SchemeGeneratorForm } from "@/components/scheme-generator-form";
import { requireUser } from "@/lib/auth";
import { readAppData } from "@/lib/repository";
import { getTeacherToolAccess } from "@/lib/teacher-tools";

export default async function TeacherToolNewSchemePage() {
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
          <span className="eyebrow">Create scheme</span>
          <h2>Generate a structured scheme of work</h2>
        </div>
        <div className="hero-actions">
          <Link href="/teacher-tools/schemes" className="button-secondary">
            View saved schemes
          </Link>
        </div>
      </div>

      <article className="teacher-tools-card scheme-generator-card">
        <p className="subtle">
          Use curriculum inputs to generate a clean weekly scheme you can review, save, and print.
        </p>
        <SchemeGeneratorForm />
      </article>
    </section>
  );
}
