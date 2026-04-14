import Link from "next/link";
import { SchemeGeneratorForm } from "@/components/scheme-generator-form";
import { requireUser } from "@/lib/auth";
import { teacherSchemeGenerationPrice } from "@/lib/business";

export default async function TeacherToolNewSchemePage() {
  await requireUser();

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
          Payment is taken per generated scheme at KSh {teacherSchemeGenerationPrice}.
        </p>
        <SchemeGeneratorForm />
      </article>
    </section>
  );
}
