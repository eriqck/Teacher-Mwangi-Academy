import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PrintSchemeButton } from "@/components/print-scheme-button";
import { requireTeacherUser } from "@/lib/auth";
import { levels } from "@/lib/catalog";
import { readAppData } from "@/lib/repository";

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
  const lessonSteps = lessonPlan.learnerActivities.length > 0
    ? lessonPlan.learnerActivities
    : [`Guide learners through ${subStrand.toLowerCase()} using discussion, practice, and feedback.`];

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
          <h3>Lesson Plan</h3>
        </div>

        <div className="generated-lesson-meta-grid">
          <div><span>School:</span><strong>{metadata?.schoolName || "Not specified"}</strong></div>
          <div><span>Roll:</span><strong>{metadata?.roll || "Not specified"}</strong></div>
          <div><span>Subject:</span><strong>{lessonPlan.subject}</strong></div>
          <div><span>Time:</span><strong>{metadata?.lessonTime || "Not specified"}</strong></div>
          <div><span>Year:</span><strong>{metadata?.year || new Date(lessonPlan.createdAt).getFullYear()}</strong></div>
          <div><span>Grade:</span><strong>{levelTitle}</strong></div>
          <div><span>Term:</span><strong>{metadata?.term || "Not specified"}</strong></div>
          <div><span>Date:</span><strong>{metadata?.lessonDate ? formatDate(metadata.lessonDate) : formatDate(lessonPlan.createdAt)}</strong></div>
          <div><span>Teacher's Name:</span><strong>{metadata?.teacherName || user.fullName}</strong></div>
          <div><span>TSC No:</span><strong>{metadata?.tscNumber || "Not specified"}</strong></div>
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
          <h4>Lesson Learning Outcomes</h4>
          <p>By the end of the lesson, the learner should be able to:</p>
          <ol>
            {lessonPlan.learningObjectives.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </div>

        <div className="generated-lesson-block">
          <h4>KIQ</h4>
          <ol>
            {lessonPlan.keyQuestions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </div>

        <div className="generated-lesson-block">
          <h4>Learning Resources</h4>
          <p>{lessonPlan.resources.join(", ")}</p>
        </div>

        <div className="generated-lesson-block">
          <h4>Introduction (5 mins)</h4>
          <p>{lessonSteps[0]}</p>
        </div>

        <div className="generated-lesson-block">
          <h4>Lesson Development</h4>
          <div className="generated-lesson-steps">
            {lessonSteps.map((item, index) => (
              <div key={`${index}-${item}`}>
                <strong>Step {index + 1}</strong>
                <p>{item}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="generated-lesson-block">
          <h4>Conclusion</h4>
          <p>{lessonPlan.reflection}</p>
        </div>

        <div className="generated-lesson-block">
          <h4>Extended Activities</h4>
          <p>{lessonPlan.homework}</p>
        </div>
      </article>
    </section>
  );
}
