import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PrintSchemeButton } from "@/components/print-scheme-button";
import { requireTeacherUser } from "@/lib/auth";
import { levels } from "@/lib/catalog";
import {
  getLessonPlanCompetencyBundle,
  getLessonPlanConclusion,
  getLessonPlanIntroduction
} from "@/lib/lesson-plan-generator";
import { readAppData } from "@/lib/repository";
import { schemeTerms } from "@/lib/scheme-terms";

function getLevelTitle(levelId: string) {
  return levels.find((level) => level.id === levelId)?.title ?? levelId;
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not specified";
  }

  return new Intl.DateTimeFormat("en-KE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Africa/Nairobi"
  }).format(date);
}

function formatTerm(value: string | undefined) {
  if (!value) {
    return "Not specified";
  }

  return schemeTerms.find((term) => term.id === value || term.label === value)?.label ?? value;
}

function sanitizeNumber(value: string | undefined, fallback: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

export default async function TeacherToolGeneratedLessonPlanDetailPage({
  params
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;
  const user = await requireTeacherUser();
  const store = await readAppData();

  const lessonPlan = store.generatedLessonPlans.find((entry) => entry.id === planId);
  const sourceRequest = store.generatedLessonPlanRequests.find(
    (request) => request.generatedLessonPlanId === planId
  );

  if (!lessonPlan) {
    notFound();
  }

  if (lessonPlan.userId !== user.id && user.role !== "admin") {
    redirect("/teacher-tools/lesson-plans");
  }

  const levelTitle = getLevelTitle(lessonPlan.level);
  const metadata = sourceRequest?.payload;
  const subStrand = lessonPlan.subStrands[0] ?? lessonPlan.unitTitle;
  const weekNumber = sanitizeNumber(metadata?.weekNumber, "1");
  const lessonNumber = sanitizeNumber(metadata?.lessonNumber, "1");
  const lessonSteps =
    lessonPlan.learnerActivities.length > 0
      ? lessonPlan.learnerActivities
      : [`Guide learners through ${subStrand.toLowerCase()} using discussion, practice, and feedback.`];
  const competencyBundle = getLessonPlanCompetencyBundle(lessonPlan.subject, subStrand);
  const introduction = getLessonPlanIntroduction(
    lessonPlan.subject,
    lessonPlan.unitTitle,
    subStrand,
    lessonPlan.learningObjectives[0] ?? `understand ${subStrand}`
  );
  const conclusion = getLessonPlanConclusion(
    lessonPlan.subject,
    subStrand,
    lessonPlan.learningObjectives,
    lessonPlan.assessmentMethods
  );
  const learningArea = lessonPlan.subject;
  const schoolName = metadata?.schoolName || "........................";
  const roll = metadata?.roll || "........................";
  const lessonTime = metadata?.lessonTime || "........................";
  const lessonDate = metadata?.lessonDate ? formatDate(metadata.lessonDate) : "........................";
  const yearValue = metadata?.year || new Date(lessonPlan.createdAt).getFullYear().toString();
  const teacherName = metadata?.teacherName || user.fullName || "........................";
  const tscNumber = metadata?.tscNumber || "........................";
  const planHeading = `${levelTitle.toUpperCase()} ${lessonPlan.subject.toUpperCase()} LESSON PLAN: Week ${weekNumber}, Lesson ${lessonNumber}`;

  return (
    <section className="teacher-tools-content">
      <div className="teacher-tools-section-head print-hidden">
        <div>
          <span className="eyebrow">Generated lesson plan</span>
          <h2>{lessonPlan.title}</h2>
        </div>
        <div className="hero-actions">
          <Link href="/teacher-tools/lesson-plans" className="button-secondary">
            Back to Lesson Plans
          </Link>
          <PrintSchemeButton />
        </div>
      </div>

      <article className="teacher-tools-card generated-scheme-sheet generated-lesson-plan-sheet">
        <div className="generated-lesson-title">
          <h3>{planHeading}</h3>
        </div>

        <div className="generated-lesson-meta-banner">
          <p>{`${levelTitle} ${lessonPlan.subject}`}</p>
          <strong>{`WEEK ${weekNumber}: LESSON ${lessonNumber}`}</strong>
        </div>

        <div className="generated-scheme-meta-table-wrap">
          <table className="generated-scheme-meta-table generated-lesson-meta-table">
            <thead>
              <tr>
                <th>SCHOOL</th>
                <th>LEVEL</th>
                <th>LEARNING AREA</th>
                <th>DATE</th>
                <th>TIME</th>
                <th>ROLL</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{schoolName}</td>
                <td>{levelTitle}</td>
                <td>{learningArea}</td>
                <td>{lessonDate}</td>
                <td>{lessonTime}</td>
                <td>{roll}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="generated-scheme-meta-strip generated-lesson-meta-strip">
          <span><strong>Year:</strong> {yearValue}</span>
          <span><strong>Term:</strong> {formatTerm(metadata?.term)}</span>
          <span><strong>Teacher&apos;s Name:</strong> {teacherName}</span>
          <span><strong>TSC No:</strong> {tscNumber}</span>
        </div>

        <div className="generated-lesson-block">
          <h4>Strand</h4>
          <p>{lessonPlan.unitTitle}</p>
        </div>

        <div className="generated-lesson-block">
          <h4>Sub-Strand</h4>
          <p>{subStrand}</p>
        </div>

        <div className="generated-lesson-block">
          <h4>Specific Learning Outcomes</h4>
          <p>By the end of the lesson, the learner should be able to:</p>
          <ol>
            {lessonPlan.learningObjectives.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </div>

        <div className="generated-lesson-block">
          <h4>Key Inquiry Question(s)</h4>
          <ol>
            {lessonPlan.keyQuestions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </div>

        <div className="generated-lesson-block">
          <h4>Core Competencies, Values, and PCIs</h4>
          <div className="generated-scheme-meta-table-wrap">
            <table className="generated-scheme-meta-table generated-lesson-cvpi-table">
              <thead>
                <tr>
                  <th>Core Competencies</th>
                  <th>Values</th>
                  <th>PCIs</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({
                  length: Math.max(
                    competencyBundle.coreCompetencies.length,
                    competencyBundle.values.length,
                    competencyBundle.pcis.length
                  )
                }).map((_, index) => (
                  <tr key={`cvpi-${index}`}>
                    <td>{competencyBundle.coreCompetencies[index] ?? ""}</td>
                    <td>{competencyBundle.values[index] ?? ""}</td>
                    <td>{competencyBundle.pcis[index] ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="generated-lesson-block">
          <h4>Learning Resources</h4>
          <p>{lessonPlan.resources.join(", ")}</p>
        </div>

        <div className="generated-lesson-block">
          <h4>Organization of Learning</h4>
          <div className="generated-lesson-organization">
            <div className="generated-lesson-stage">
              <h5>Introduction (5 minutes)</h5>
              <p>{introduction}</p>
            </div>

            <div className="generated-lesson-stage">
              <h5>Lesson Development (25 minutes)</h5>
              <div className="generated-lesson-steps">
                {lessonSteps.map((item, index) => (
                  <div key={`${index}-${item}`}>
                    <strong>Step {index + 1}:</strong>
                    <p>{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="generated-lesson-stage">
              <h5>Conclusion (10 minutes)</h5>
              <p>{conclusion}</p>
            </div>
          </div>
        </div>

        <div className="generated-lesson-block">
          <h4>Assessment Methods</h4>
          <div className="generated-lesson-steps">
            {lessonPlan.assessmentMethods.map((item, index) => (
              <div key={`${index}-${item}`}>
                <strong>Method {index + 1}:</strong>
                <p>{item}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="generated-lesson-block">
          <h4>Extended Activities</h4>
          <p>{lessonPlan.homework}</p>
        </div>

        <div className="generated-lesson-block">
          <h4>Teacher Self-Evaluation</h4>
          <p>{lessonPlan.reflection}</p>
        </div>
      </article>
    </section>
  );
}
