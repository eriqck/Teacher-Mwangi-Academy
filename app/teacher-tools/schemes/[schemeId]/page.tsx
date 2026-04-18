import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PrintSchemeButton } from "@/components/print-scheme-button";
import { requireTeacherUser } from "@/lib/auth";
import { levels } from "@/lib/catalog";
import { readAppData } from "@/lib/repository";
import { getSchemeTermLabel } from "@/lib/scheme-terms";

function getLevelTitle(levelId: string) {
  return levels.find((level) => level.id === levelId)?.title ?? levelId;
}

function getSchemeNoteValue(notes: string, label: string) {
  const line = notes
    .split(/\r?\n/)
    .find((entry) => entry.toLowerCase().startsWith(`${label.toLowerCase()}:`));

  return line?.split(":").slice(1).join(":").trim() || "";
}

export default async function TeacherToolGeneratedSchemeDetailPage({
  params
}: {
  params: Promise<{ schemeId: string }>;
}) {
  const { schemeId } = await params;
  const user = await requireTeacherUser();
  const store = await readAppData();

  const scheme = store.generatedSchemes.find((entry) => entry.id === schemeId);

  if (!scheme) {
    notFound();
  }

  if (scheme.userId !== user.id && user.role !== "admin") {
    redirect("/teacher-tools/schemes");
  }

  const schemeYear = getSchemeNoteValue(scheme.notes, "Academic year") || `${new Date(scheme.createdAt).getFullYear()}`;
  const referenceBook = getSchemeNoteValue(scheme.notes, "Reference book") || "Course book / teacher guide";
  const termLabel = getSchemeTermLabel(scheme.term);
  const levelTitle = getLevelTitle(scheme.level);

  return (
    <section className="teacher-tools-content">
      <div className="teacher-tools-section-head print-hidden">
        <div>
          <span className="eyebrow">Generated scheme</span>
          <h2>{scheme.title}</h2>
        </div>
        <div className="hero-actions">
          <Link href="/teacher-tools/schemes" className="button-secondary">
            Back to My Schemes
          </Link>
          <PrintSchemeButton />
        </div>
      </div>

      <article className="teacher-tools-card generated-scheme-sheet">
        <div className="generated-scheme-header">
          <div>
            <h3>{schemeYear} {levelTitle} {scheme.subject} Schemes of Work - {termLabel}</h3>
            <p className="subtle">
              {[levelTitle, scheme.subject, termLabel].join(" - ")}
            </p>
          </div>

          <div className="generated-scheme-meta-grid">
            <div>
              <span className="subtle">School</span>
              <strong>{scheme.schoolName || "Not specified"}</strong>
            </div>
            <div>
              <span className="subtle">Teacher's name</span>
              <strong>{user.fullName}</strong>
            </div>
            <div>
              <span className="subtle">Year</span>
              <strong>{schemeYear}</strong>
            </div>
            <div>
              <span className="subtle">Grade/Class</span>
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
            <div>
              <span className="subtle">Reference book</span>
              <strong>{referenceBook}</strong>
            </div>
          </div>
        </div>

        <div className="generated-scheme-table-wrap">
          <table className="mini-table generated-scheme-table generated-scheme-table--mentor">
            <thead>
              <tr>
                <th>Week</th>
                <th>Lesson</th>
                <th>Strand</th>
                <th>Sub Strand</th>
                <th>Specific Learning Outcomes</th>
                <th>Learning Experiences</th>
                <th>Key Inquiry Questions</th>
                <th>Learning Resources</th>
                <th>Assessment Methods</th>
                <th>Reflection</th>
              </tr>
            </thead>
            <tbody>
              {scheme.weeklyPlan.map((week) => (
                <tr key={`${week.weekNumber}-${week.lessonRange}-${week.focus}`}>
                  <td>{week.weekNumber}</td>
                  <td>{week.lessonRange}</td>
                  <td>{scheme.strand}</td>
                  <td>{scheme.subStrand}</td>
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
                      {(scheme.keyInquiryQuestions.length > 0
                        ? scheme.keyInquiryQuestions.slice(0, 2)
                        : [`How can learners apply ${scheme.subStrand.toLowerCase()}?`]
                      ).map((item) => (
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
  );
}
