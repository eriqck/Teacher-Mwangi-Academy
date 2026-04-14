import { Suspense } from "react";
import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { getCurrentUser } from "@/lib/auth";
import { readAppData } from "@/lib/repository";
import { teacherLessonPlanPrice, teacherSchemeGenerationPrice } from "@/lib/business";

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
  const store = isTeacherWorkspaceUser ? await readAppData() : null;
  const schemeCount = isTeacherWorkspaceUser && user
    ? store?.generatedSchemes.filter((entry) => entry.userId === user.id).length ?? 0
    : 0;

  if (!isTeacherWorkspaceUser) {
    return (
      <section className="teacher-tools-content">
        <div className="teacher-tools-banner">
          <strong>Teacher tools workspace</strong>
          <span>
            Open the bot first, then sign in here to generate schemes and lesson plans from the same workspace.
          </span>
        </div>

        <div className="teacher-tools-grid">
          <article className="teacher-tools-card teacher-tools-public-card">
            <span className="eyebrow">Teacher bot</span>
            <h1>Generate schemes and lesson plans from one workspace.</h1>
            <p className="subtle">
              Teachers can come straight here from the homepage, sign in inside the bot, and then continue to generate.
            </p>

            <div className="teacher-tools-overview">
              <div>
                <h3>What you can do here</h3>
                <ul>
                  <li>Create schemes of work and pay per generated scheme</li>
                  <li>Generate lesson plans at KSh {teacherLessonPlanPrice} each</li>
                  <li>Keep saved outputs inside the teacher workspace</li>
                </ul>
              </div>
              <div>
                <h3>Need a teacher account?</h3>
                <div className="teacher-tools-unlock-box">
                  <p className="subtle">
                    New teachers can create an account first, then return here to start generating.
                  </p>
                  <div className="hero-actions">
                    <Link href="/signup" className="button">
                      Create teacher account
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </article>

          <article className="teacher-tools-card teacher-tools-auth-card">
            <div className="teacher-tools-section-head">
              <div>
                <span className="eyebrow">Teacher sign in</span>
                <h2>Sign in to generate</h2>
              </div>
            </div>
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
          Create schemes and lesson plans from one dedicated workspace while still keeping your normal
          subscription dashboard for notes, assessments, and materials.
        </span>
      </div>

      <article className="teacher-tools-card teacher-tools-welcome">
        <div className="teacher-tools-welcome-bar">
          <h1>Welcome, {user.fullName}</h1>
          <span className="teacher-tools-balance">KSh {teacherSchemeGenerationPrice} per scheme</span>
        </div>

        <div className="teacher-tools-quick-actions">
          <Link href="/teacher-tools/schemes/new" className="teacher-tools-action teacher-tools-action--primary">
            Create Scheme
          </Link>
          <Link href="/teacher-tools/lesson-plans" className="teacher-tools-action teacher-tools-action--primary">
            Create Lesson Plan
          </Link>
          <Link href="/dashboard" className="teacher-tools-action teacher-tools-action--success">
            Member Dashboard
          </Link>
          <Link href="/teacher-tools/schemes" className="teacher-tools-action teacher-tools-action--info">
            My Schemes
          </Link>
        </div>

        {paymentState ? (
          <p className={`message ${paymentState === "success" ? "message-success" : "message-error"}`}>
            {paymentState === "success"
              ? "Your payment was confirmed and the scheme has been generated."
              : paymentState === "failed"
                ? "Payment was not completed. You can start the generation again."
                : "We could not confirm that payment yet."}
          </p>
        ) : null}

        <div className="teacher-tools-overview">
          <div>
            <h3>Workspace overview</h3>
            <ul>
              <li>{schemeCount} saved generated scheme{schemeCount === 1 ? "" : "s"}</li>
              <li>Each generated scheme is charged at KSh {teacherSchemeGenerationPrice}</li>
              <li>Each lesson plan will be charged at KSh {teacherLessonPlanPrice}</li>
            </ul>
          </div>

          <div>
            <h3>How payment works now</h3>
            <div className="teacher-tools-unlock-box">
              <p className="subtle">
                The bot workspace is billed separately from subscriptions. When you create a scheme,
                the app takes you to checkout for that exact generation instead of unlocking everything.
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
          <h3>Scheme generation</h3>
          <p className="subtle">
            Fill in the curriculum inputs, go through checkout, and the scheme is generated after payment
            confirmation.
          </p>
          <div className="hero-actions">
            <Link href="/teacher-tools/schemes/new" className="button">
              Start scheme generation
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
