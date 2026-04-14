import Link from "next/link";
import { SchemeGeneratorForm } from "@/components/scheme-generator-form";
import { getCurrentUser } from "@/lib/auth";
import { teacherSchemeGenerationPrice } from "@/lib/business";

export default async function TeacherToolNewSchemePage() {
  const user = await getCurrentUser();
  const canGenerate = user?.role === "teacher" || user?.role === "admin";

  return (
    <section className="teacher-tools-content">
      <nav className="teacher-tools-breadcrumbs" aria-label="Breadcrumb">
        <Link href="/teacher-tools">Home</Link>
        <span>/</span>
        <Link href="/teacher-tools/schemes">Schemes</Link>
        <span>/</span>
        <span>Create Scheme</span>
      </nav>

      <div className="teacher-tools-section-head">
        <div>
          <span className="eyebrow">Create scheme</span>
          <h2>Create a Scheme of Work</h2>
        </div>
        <div className="hero-actions">
          <Link href="/teacher-tools/schemes" className="button-secondary">
            View saved schemes
          </Link>
        </div>
      </div>

      <article className="teacher-tools-card scheme-generator-card">
        <p className="subtle">
          Complete each step below, then continue to M-Pesa. Every generated scheme is charged
          independently at KSh {teacherSchemeGenerationPrice}.
        </p>
        <SchemeGeneratorForm
          canGenerate={canGenerate}
          authRedirectPath="/teacher-tools/schemes/new"
        />
      </article>
    </section>
  );
}
