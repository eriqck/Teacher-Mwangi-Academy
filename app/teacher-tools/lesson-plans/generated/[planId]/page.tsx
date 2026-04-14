import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PrintSchemeButton } from "@/components/print-scheme-button";
import { requireTeacherUser } from "@/lib/auth";
import { levels } from "@/lib/catalog";
import { readAppData } from "@/lib/repository";

function getLevelTitle(levelId: string) {
  return levels.find((level) => level.id === levelId)?.title ?? levelId;
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

  if (!lessonPlan) {
    notFound();
  }

  if (lessonPlan.userId !== user.id && user.role !== "admin") {
    redirect("/teacher-tools/lesson-plans");
  }

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

      <article className="teacher-tools-card generated-scheme-sheet">
        <div className="generated-scheme-header">
          <div>
            <h3>{lessonPlan.title}</h3>
            <p className="subtle">
              {[getLevelTitle(lessonPlan.level), lessonPlan.subject, lessonPlan.unitTitle].join(" · ")}
            </p>
          </div>
          <div className="generated-scheme-meta-grid">
            <div>
              <span className="subtle">Level</span>
              <strong>{getLevelTitle(lessonPlan.level)}</strong>
            </div>
            <div>
              <span className="subtle">Subject</span>
              <strong>{lessonPlan.subject}</strong>
            </div>
            <div>
              <span className="subtle">Unit</span>
              <strong>{lessonPlan.unitTitle}</strong>
            </div>
            <div>
              <span className="subtle">Selected substrands</span>
              <strong>{lessonPlan.selectedCount}</strong>
            </div>
          </div>
        </div>

        <div className="generated-scheme-overview">
          <div>
            <h4>Substrands covered</h4>
            <ul>
              {lessonPlan.subStrands.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4>Learning objectives</h4>
            <ul>
              {lessonPlan.learningObjectives.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4>Key questions</h4>
            <ul>
              {lessonPlan.keyQuestions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="generated-scheme-overview">
          <div>
            <h4>Learner activities</h4>
            <ul>
              {lessonPlan.learnerActivities.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4>Resources</h4>
            <ul>
              {lessonPlan.resources.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4>Assessment methods</h4>
            <ul>
              {lessonPlan.assessmentMethods.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="generated-scheme-overview">
          <div>
            <h4>Reflection</h4>
            <p className="subtle">{lessonPlan.reflection}</p>
          </div>
          <div>
            <h4>Homework</h4>
            <p className="subtle">{lessonPlan.homework}</p>
          </div>
        </div>
      </article>
    </section>
  );
}
