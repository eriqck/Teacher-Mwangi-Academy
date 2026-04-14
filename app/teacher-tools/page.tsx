import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { readAppData } from "@/lib/repository";
import { getTeacherToolAccess } from "@/lib/teacher-tools";
import { teacherToolAccessPrice } from "@/lib/business";
import { TeacherToolsAccessForm } from "@/components/teacher-tools-access-form";

export default async function TeacherToolsDashboardPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const resolvedSearchParams = await searchParams;
  const paymentState =
    typeof resolvedSearchParams.payment === "string" ? resolvedSearchParams.payment : null;
  const store = await readAppData();
  const access = getTeacherToolAccess(store, user);
  const schemeCount = store.generatedSchemes.filter((entry) => entry.userId === user.id).length;
  const toolPayments = store.payments
    .filter((entry) => entry.userId === user.id && entry.kind === "tool-access")
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  return (
    <section className="teacher-tools-content">
      <div className="teacher-tools-banner">
        <strong>Teacher tools workspace</strong>
        <span>
          Create schemes and lesson plans from one dedicated workspace without relying on the normal
          subscription dashboard.
        </span>
      </div>

      <article className="teacher-tools-card teacher-tools-welcome">
        <div className="teacher-tools-welcome-bar">
          <h1>Welcome, {user.fullName}</h1>
          <span className="teacher-tools-balance">
            {access.hasAccess ? "Bot access active" : `One-time access KSh ${teacherToolAccessPrice}`}
          </span>
        </div>

        <div className="teacher-tools-quick-actions">
          <Link
            href={access.hasAccess ? "/teacher-tools/schemes/new" : "/teacher-tools#unlock"}
            className="teacher-tools-action teacher-tools-action--primary"
          >
            Create Scheme
          </Link>
          <Link
            href={access.hasAccess ? "/teacher-tools/lesson-plans" : "/teacher-tools#unlock"}
            className="teacher-tools-action teacher-tools-action--primary"
          >
            Create Lesson Plan
          </Link>
          <Link href="/teacher-tools/transactions" className="teacher-tools-action teacher-tools-action--success">
            Transactions
          </Link>
          <Link href="/teacher-tools/schemes" className="teacher-tools-action teacher-tools-action--info">
            My Schemes
          </Link>
        </div>

        {paymentState ? (
          <p className={`message ${paymentState === "success" ? "message-success" : "message-error"}`}>
            {paymentState === "success"
              ? "Your payment was confirmed. Teacher tools are ready."
              : paymentState === "failed"
                ? "Payment was not completed. You can try again below."
                : "We could not confirm that payment yet."}
          </p>
        ) : null}

        <div className="teacher-tools-overview">
          <div>
            <h3>Workspace overview</h3>
            <ul>
              <li>{schemeCount} saved generated scheme{schemeCount === 1 ? "" : "s"}</li>
              <li>Lesson plan generator panel ready for the next phase</li>
              <li>One-time teacher bot access keeps this separate from subscriptions</li>
            </ul>
          </div>

          <div id="unlock">
            <h3>{access.hasAccess ? "Access confirmed" : "Unlock the bot workspace"}</h3>
            {access.hasAccess ? (
              <p className="subtle">
                You have already paid the one-time KSh {teacherToolAccessPrice} bot access fee, so
                you can generate schemes and lesson plans anytime.
              </p>
            ) : access.pendingAccess ? (
              <div className="teacher-tools-unlock-box">
                <p className="subtle">
                  Your payment is still marked pending. Once Paystack confirms it, the workspace will
                  unlock automatically.
                </p>
                <TeacherToolsAccessForm />
              </div>
            ) : (
              <div className="teacher-tools-unlock-box">
                <p className="subtle">
                  Pay KSh {teacherToolAccessPrice} once to unlock scheme and lesson-plan generation for
                  this teacher account.
                </p>
                <TeacherToolsAccessForm />
              </div>
            )}
          </div>
        </div>
      </article>

      <div className="teacher-tools-grid">
        <article className="teacher-tools-card">
          <h3>Recent bot access payments</h3>
          {toolPayments.length > 0 ? (
            <table className="mini-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Reference</th>
                </tr>
              </thead>
              <tbody>
                {toolPayments.slice(0, 5).map((payment) => (
                  <tr key={payment.id}>
                    <td>{payment.createdAt.slice(0, 10)}</td>
                    <td>KSh {payment.amount}</td>
                    <td>{payment.status}</td>
                    <td>{payment.accountReference}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="subtle">No teacher-tools payment has been started yet.</p>
          )}
        </article>

        <article className="teacher-tools-card">
          <h3>Saved output</h3>
          <p className="subtle">
            Open your generated schemes, print them to PDF, and keep building your teaching library
            from one place.
          </p>
          <div className="hero-actions">
            <Link href="/teacher-tools/schemes" className="button-secondary">
              Open My Schemes
            </Link>
          </div>
        </article>
      </div>
    </section>
  );
}
