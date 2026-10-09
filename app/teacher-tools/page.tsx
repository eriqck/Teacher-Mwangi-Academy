import { Suspense } from "react";
import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { getCurrentUser } from "@/lib/auth";
import { teacherLessonPlanPrice } from "@/lib/business";

export default async function TeacherToolsDashboardPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  const resolvedSearchParams = await searchParams;
  const paymentState =
    typeof resolvedSearchParams.payment === "string" ? resolvedSearchParams.payment : null;
  const isTeacherWorkspaceUser = user?.role === "teacher" || user?.role === "admin";

  if (!isTeacherWorkspaceUser) {
    return (
      <section className="teacher-tools-content">
        <div className="teacher-tools-banner">
          <strong>Teacher tools</strong>
          <span>Create lesson plans from one place. You can start first, then sign in when you are ready to generate.</span>
        </div>

        <div className="teacher-tools-grid">
          <article className="teacher-tools-card teacher-tools-public-card">
            <span className="eyebrow">For teachers</span>
            <h1>Create lesson plans easily.</h1>
            <p className="subtle">
              Choose the lesson-plan workflow, fill in the details, and continue to payment when you are ready.
              If you are not signed in yet, the system will ask you at the final generate step.
            </p>

            <div className="teacher-tools-quick-actions teacher-tools-quick-actions--guest">
              <Link href="/teacher-tools/lesson-plans" className="teacher-tools-action teacher-tools-action--success">
                Start a Lesson Plan
              </Link>
            </div>

            <div className="teacher-tools-overview">
              <div>
                <h3>What you can do here</h3>
                <ul>
                  <li>Generate a lesson plan at KSh {teacherLessonPlanPrice} each</li>
                  <li>Save your generated work in your teacher account</li>
                </ul>
              </div>
              <div>
                <h3>New here?</h3>
                <div className="teacher-tools-unlock-box">
                  <p className="subtle">
                    You can create a teacher account now, or start filling the lesson-plan form first and sign in
                    when you click generate.
                  </p>
                  <div className="hero-actions">
                    <Link href="/signup?next=%2Fteacher-tools" className="button">
                      Create account
                    </Link>
                    <Link href="/login?next=%2Fteacher-tools" className="button-secondary">
                      Sign in
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </article>

          <article className="teacher-tools-card teacher-tools-auth-card">
            <div className="teacher-tools-section-head">
              <div>
                <span className="eyebrow">Already have an account?</span>
                <h2>Sign in and continue</h2>
              </div>
            </div>
            <p className="subtle">
              If you already have a teacher account, sign in here. If not, you can still start with the buttons on the
              left and sign in later.
            </p>
            <Suspense fallback={<p className="subtle">Loading sign-in form...</p>}>
              <AuthForm mode="login" />
            </Suspense>
          </article>
        </div>
      </section>
    );
  }

  return (
    <section className="teacher-tools-content">
      <div className="teacher-tools-banner">
        <strong>Teacher tools workspace</strong>
        <span>
          Create lesson plans from one dedicated workspace while still keeping your normal subscription dashboard for
          notes, assessments, and materials.
        </span>
      </div>

      <article className="teacher-tools-card teacher-tools-welcome">
        <div className="teacher-tools-welcome-bar">
          <h1>Welcome, {user.fullName}</h1>
          <span className="teacher-tools-balance">KSh {teacherLessonPlanPrice} per lesson plan</span>
        </div>

        <div className="teacher-tools-quick-actions">
          <Link href="/teacher-tools/lesson-plans" className="teacher-tools-action teacher-tools-action--primary">
            Create Lesson Plan
          </Link>
          <Link href="/dashboard" className="teacher-tools-action teacher-tools-action--success">
            Member Dashboard
          </Link>
        </div>

        {paymentState ? (
          <p className={`message ${paymentState === "success" ? "message-success" : "message-error"}`}>
            {paymentState === "success"
              ? "Your payment was confirmed."
              : paymentState === "failed"
                ? "Payment was not completed. You can start again."
                : "We could not confirm that payment yet."}
          </p>
        ) : null}

        <div className="teacher-tools-overview">
          <div>
            <h3>Workspace overview</h3>
            <ul>
              <li>First lesson-plan generation is free, then KSh {teacherLessonPlanPrice} per lesson plan</li>
              <li>Generated work stays inside your teacher account</li>
            </ul>
          </div>

          <div>
            <h3>How payment works</h3>
            <div className="teacher-tools-unlock-box">
              <p className="subtle">
                The tools workspace is billed separately from subscriptions. Your first lesson-plan generation is free;
                after that, the app takes you to checkout for each exact generation.
              </p>
              <p className="subtle">
                Your normal teacher subscription still stays on the main dashboard for notes, assessments,
                and material access.
              </p>
            </div>
          </div>
        </div>
      </article>

      <div className="teacher-tools-grid">
        <article className="teacher-tools-card">
          <h3>Lesson-plan generation</h3>
          <p className="subtle">Choose a grade, subject, and strand, then generate a printable lesson plan.</p>
          <div className="hero-actions">
            <Link href="/teacher-tools/lesson-plans" className="button">
              Start lesson-plan generation
            </Link>
          </div>
        </article>

        <article className="teacher-tools-card">
          <h3>Normal member access</h3>
          <p className="subtle">
            Teachers can still use the main member dashboard for subscriptions, notes, assessments,
            and normal learning-material access.
          </p>
          <div className="hero-actions">
            <Link href="/dashboard" className="button-secondary">
              Open member dashboard
            </Link>
            <Link href="/subscribe" className="button-secondary">
              Open subscription page
            </Link>
          </div>
        </article>
      </div>
    </section>
  );
}
