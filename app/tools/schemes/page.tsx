import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { requireUser } from "@/lib/auth";
import { readAppData } from "@/lib/repository";
import { levels } from "@/lib/catalog";
import { getSchemeTermLabel } from "@/lib/scheme-terms";

function getLevelTitle(levelId: string) {
  return levels.find((level) => level.id === levelId)?.title ?? levelId;
}

export default async function SavedSchemesPage() {
  const user = await requireUser();

  if (user.role !== "teacher" && user.role !== "admin") {
    redirect("/dashboard");
  }

  const store = await readAppData();
  const schemes = store.generatedSchemes
    .filter((scheme) => scheme.userId === user.id || user.role === "admin")
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

  return (
    <main>
      <SiteHeader />

      <section className="page-shell section">
        <div className="section-head">
          <div>
            <span className="eyebrow">Teacher tools</span>
            <h2>Saved generated schemes.</h2>
          </div>
          <p>
            Open any generated scheme to print it, review its weekly plan, or use it as the base for
            your next class.
          </p>
        </div>

        <div className="hero-actions">
          <Link href="/tools/schemes/new" className="button">
            Create new scheme
          </Link>
          <Link href="/dashboard" className="button-secondary">
            Back to dashboard
          </Link>
        </div>
      </section>

      <section className="page-shell section">
        <article className="dashboard-card">
          <h3>Recent scheme outputs</h3>
          {schemes.length > 0 ? (
            <div className="generated-scheme-list">
              {schemes.map((scheme) => (
                <article key={scheme.id} className="generated-scheme-card">
                  <div className="generated-scheme-meta">
                    <span className="pill">{getLevelTitle(scheme.level)}</span>
                    <span className="pill">{getSchemeTermLabel(scheme.term)}</span>
                    <span className="pill">{scheme.subject}</span>
                  </div>
                  <h4>{scheme.title}</h4>
                  <p className="subtle">
                    {scheme.strand} / {scheme.subStrand}
                  </p>
                  <p className="subtle">
                    {scheme.weeksCount} week{scheme.weeksCount === 1 ? "" : "s"} and {scheme.lessonsPerWeek} lesson
                    {scheme.lessonsPerWeek === 1 ? "" : "s"} per week
                  </p>
                  <div className="hero-actions">
                    <Link href={`/tools/schemes/${scheme.id}`} className="button-secondary">
                      Open scheme
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h4>No generated schemes yet</h4>
              <p className="subtle">
                Start with one subject and one term, and the bot will save the generated scheme here.
              </p>
              <Link href="/tools/schemes/new" className="button">
                Create first scheme
              </Link>
            </div>
          )}
        </article>
      </section>
    </main>
  );
}
