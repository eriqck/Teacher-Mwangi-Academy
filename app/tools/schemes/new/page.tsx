import Link from "next/link";
import { redirect } from "next/navigation";
import { SchemeGeneratorForm } from "@/components/scheme-generator-form";
import { SiteHeader } from "@/components/site-header";
import { requireUser } from "@/lib/auth";

export default async function NewSchemePage() {
  const user = await requireUser();

  if (user.role !== "teacher" && user.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <main>
      <SiteHeader />

      <section className="page-shell section">
        <div className="section-head">
          <div>
            <span className="eyebrow">Scheme generator bot</span>
            <h2>Create a structured scheme of work in minutes.</h2>
          </div>
          <p>
            Fill in the curriculum details once, then the bot builds a clean week-by-week scheme you
            can print, save, and revisit from your dashboard.
          </p>
        </div>

        <article className="dashboard-card scheme-generator-card">
          <div className="section-head section-head--compact">
            <div>
              <h3>Generate new scheme</h3>
              <p className="subtle">
                This first version uses guided curriculum inputs so the output stays practical and
                consistent for teachers.
              </p>
            </div>
            <div className="hero-actions">
              <Link href="/tools/schemes" className="button-secondary">
                View saved schemes
              </Link>
            </div>
          </div>

          <SchemeGeneratorForm />
        </article>
      </section>
    </main>
  );
}
