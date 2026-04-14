import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PrintSchemeButton } from "@/components/print-scheme-button";
import { SiteHeader } from "@/components/site-header";
import { requireUser } from "@/lib/auth";
import { levels } from "@/lib/catalog";
import { readAppData } from "@/lib/repository";
import { getSchemeTermLabel } from "@/lib/scheme-terms";

function getLevelTitle(levelId: string) {
  return levels.find((level) => level.id === levelId)?.title ?? levelId;
}

export default async function GeneratedSchemeDetailPage({
  params
}: {
  params: Promise<{ schemeId: string }>;
}) {
  const { schemeId } = await params;
  const user = await requireUser();

  if (user.role !== "teacher" && user.role !== "admin") {
    redirect("/dashboard");
  }

  const store = await readAppData();
  const scheme = store.generatedSchemes.find((entry) => entry.id === schemeId);

  if (!scheme) {
    notFound();
  }

  if (scheme.userId !== user.id && user.role !== "admin") {
    redirect("/tools/schemes");
  }

  return (
    <main>
      <SiteHeader />

      <section className="page-shell section print-hidden">
        <div className="section-head">
          <div>
            <span className="eyebrow">Generated scheme</span>
            <h2>{scheme.title}</h2>
          </div>
          <p>
            Review the generated weekly structure, then print or save it to PDF for classroom use.
          </p>
        </div>

        <div className="hero-actions">
          <Link href="/tools/schemes" className="button-secondary">
            Back to saved schemes
          </Link>
          <Link href="/tools/schemes/new" className="button-secondary">
            Create another
          </Link>
          <PrintSchemeButton />
        </div>
      </section>

      <section className="page-shell section scheme-print-shell">
        <article className="dashboard-card generated-scheme-sheet">
          <div className="generated-scheme-header">
            <div>
              <h3>{scheme.title}</h3>
              <p className="subtle">
                {getLevelTitle(scheme.level)} · {scheme.subject} · {getSchemeTermLabel(scheme.term)}
              </p>
            </div>
            <div className="generated-scheme-meta-grid">
              <div>
                <span className="subtle">School</span>
                <strong>{scheme.schoolName || "Not specified"}</strong>
              </div>
              <div>
                <span className="subtle">Class</span>
                <strong>{scheme.className || "Not specified"}</strong>
              </div>
              <div>
                <span className="subtle">Strand</span>
                <strong>{scheme.strand}</strong>
              </div>
              <div>
                <span className="subtle">Sub-strand</span>
                <strong>{scheme.subStrand}</strong>
              </div>
            </div>
          </div>

          <div className="generated-scheme-overview">
            <div>
              <h4>Learning outcomes</h4>
              <ul>
                {scheme.learningOutcomes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div>
              <h4>Key inquiry questions</h4>
              <ul>
                {scheme.keyInquiryQuestions.length > 0 ? (
                  scheme.keyInquiryQuestions.map((item) => <li key={item}>{item}</li>)
                ) : (
                  <li>Use guided discussion questions during delivery.</li>
                )}
              </ul>
            </div>

            <div>
              <h4>Competencies, values, and issues</h4>
              <ul>
                {[...scheme.coreCompetencies, ...scheme.values, ...scheme.pertinentIssues].map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="generated-scheme-table-wrap">
            <table className="mini-table generated-scheme-table">
              <thead>
                <tr>
                  <th>Week</th>
                  <th>Lessons</th>
                  <th>Focus</th>
                  <th>Learning outcome</th>
                  <th>Learner activities</th>
                  <th>Resources</th>
                  <th>Assessment</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {scheme.weeklyPlan.map((week) => (
                  <tr key={week.weekNumber}>
                    <td>Week {week.weekNumber}</td>
                    <td>{week.lessonRange}</td>
                    <td>{week.focus}</td>
                    <td>{week.learningOutcome}</td>
                    <td>
                      <ul className="generated-scheme-list-inline">
                        {week.learnerActivities.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </td>
                    <td>
                      <ul className="generated-scheme-list-inline">
                        {week.resources.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </td>
                    <td>{week.assessment}</td>
                    <td>{week.remarks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </main>
  );
}
