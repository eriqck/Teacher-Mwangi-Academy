import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PrintSchemeButton } from "@/components/print-scheme-button";
import { requireTeacherUser } from "@/lib/auth";
import { levels } from "@/lib/catalog";
import { readAppData } from "@/lib/repository";
import {
  getSchemeDisplayHeading,
  getSchemeFormatStyle,
  getSchemeNoteValue,
  getSchemeTableHeaders
} from "@/lib/scheme-generator";
import { getSchemeTermLabel } from "@/lib/scheme-terms";

function getLevelTitle(levelId: string) {
  return levels.find((level) => level.id === levelId)?.title ?? levelId;
}

function getSchemeRowFocus(focus: string, fallbackStrand: string, fallbackSubStrand: string) {
  const [strand, subStrand] = focus.split("::");

  return {
    strand: strand || fallbackStrand,
    subStrand: subStrand || fallbackSubStrand
  };
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
  const formatStyle = getSchemeFormatStyle(referenceBook, scheme.subject, scheme.notes);
  const tableHeaders = getSchemeTableHeaders(formatStyle);
  const documentHeading = getSchemeDisplayHeading({
    style: formatStyle,
    year: schemeYear,
    levelTitle,
    subject: scheme.subject,
    termLabel,
    referenceBook
  });

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
            <h3>{documentHeading}</h3>
          </div>
          {formatStyle === "mentor" ? (
            <div className="generated-scheme-meta-strip">
              <span><strong>SCHOOL</strong> {scheme.schoolName || "____________________"}</span>
              <span><strong>TEACHER'S NAME</strong> {user.fullName}</span>
              <span><strong>YEAR</strong> {schemeYear}</span>
            </div>
          ) : (
            <div className="generated-scheme-meta-table-wrap">
              <table className="generated-scheme-meta-table">
                <thead>
                  <tr>
                    <th>SCHOOL</th>
                    <th>GRADE</th>
                    <th>LEARNING AREA</th>
                    <th>TERM</th>
                    <th>YEAR</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{scheme.schoolName || ""}</td>
                    <td>{scheme.className || levelTitle}</td>
                    <td>{scheme.subject}</td>
                    <td>{termLabel.replace("Term ", "")}</td>
                    <td>{schemeYear}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="generated-scheme-table-wrap">
          <table
            className={`mini-table generated-scheme-table ${
              formatStyle === "mentor" ? "generated-scheme-table--mentor" : "generated-scheme-table--rationalized"
            }`}
          >
            <thead>
              <tr>
                {tableHeaders.map((heading) => (
                  <th key={heading}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {scheme.weeklyPlan.map((week, index) => {
                const rowFocus = getSchemeRowFocus(week.focus, scheme.strand, scheme.subStrand);
                const inquiry =
                  week.keyInquiryQuestion ||
                  scheme.keyInquiryQuestions[index % Math.max(scheme.keyInquiryQuestions.length, 1)] ||
                  `How can learners apply ${rowFocus.subStrand.toLowerCase()}?`;
                const previous = index > 0 ? scheme.weeklyPlan[index - 1] : null;
                const previousFocus = previous
                  ? getSchemeRowFocus(previous.focus, scheme.strand, scheme.subStrand)
                  : null;
                const weekLabel = previous?.weekNumber === week.weekNumber ? "" : `${week.weekNumber}`;
                const strandLabel = previousFocus?.strand === rowFocus.strand ? "" : rowFocus.strand;
                const experiencesText = week.learnerActivities.join("\n");
                const resourcesText = week.resources.join("\n");

                return (
                  <tr key={`${week.weekNumber}-${week.lessonRange}-${week.focus}`}>
                    <td>{weekLabel}</td>
                    <td>{week.lessonRange}</td>
                    <td>{strandLabel}</td>
                    <td>{rowFocus.subStrand}</td>
                    <td>{week.learningOutcome}</td>
                    {formatStyle === "mentor" ? (
                      <>
                        <td>{experiencesText}</td>
                        <td>{inquiry}</td>
                      </>
                    ) : (
                      <>
                        <td>{inquiry}</td>
                        <td>{experiencesText}</td>
                      </>
                    )}
                    <td>{resourcesText}</td>
                    <td>{week.assessment}</td>
                    <td>{week.remarks}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
