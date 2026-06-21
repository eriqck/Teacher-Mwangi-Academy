import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { requireUser } from "@/lib/auth";
import { levels } from "@/lib/catalog";
import { subscriptionPlans } from "@/lib/business";
import { listPaymentsForUser, listSubscriptionsForUser } from "@/lib/repository";
import { getCurrentSubscription, getEffectiveSubscriptionStatus } from "@/lib/subscriptions";

function formatMoney(amount: number) {
  return `KSh ${amount}`;
}

function getPlanDetails(plan: string | null | undefined) {
  if (!plan) {
    return null;
  }

  return plan in subscriptionPlans
    ? subscriptionPlans[plan as keyof typeof subscriptionPlans]
    : null;
}

export default async function DashboardPage() {
  const user = await requireUser();
  let subscriptions = [] as Awaited<ReturnType<typeof listSubscriptionsForUser>>;
  let payments = [] as Awaited<ReturnType<typeof listPaymentsForUser>>;
  let dataUnavailable = false;

  try {
    [subscriptions, payments] = await Promise.all([
      listSubscriptionsForUser(user.id),
      listPaymentsForUser(user.id)
    ]);
  } catch {
    dataUnavailable = true;
  }

  const sortedSubscriptions = subscriptions
    .slice()
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const activeSubscription = getCurrentSubscription(sortedSubscriptions);
  const activeSubscriptionStatus = activeSubscription
    ? getEffectiveSubscriptionStatus(activeSubscription)
    : null;
  const activePlan = getPlanDetails(activeSubscription?.plan);

  const accessibleLevels =
    user.role === "admin"
      ? levels
      : activeSubscriptionStatus === "active" && activePlan?.levelAccessMode === "all"
        ? levels
        : activeSubscriptionStatus === "active"
          ? levels.filter((level) => activeSubscription?.levelAccess.includes(level.id))
          : [];

  const paidPayments = payments.filter((payment) => payment.status === "paid");
  const pendingPayments = payments.filter((payment) => payment.status === "pending");
  const latestPayment = payments
    .slice()
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];

  return (
    <main>
      <SiteHeader user={user} />

      <section className="page-shell section">
        <div className="section-head">
          <div>
            <span className="eyebrow">Member dashboard</span>
            <h2>Welcome back, {user.fullName}.</h2>
          </div>
          <p>Your account, subscription, and next steps are ready below.</p>
        </div>

        {dataUnavailable ? (
          <article className="dashboard-card">
            <h3>Dashboard is temporarily unavailable</h3>
            <p className="subtle">
              We could not load your latest account records right now, but your sign-in is still active.
            </p>
            <div className="hero-actions">
              <Link href="/subscribe" className="button-secondary">
                Open payments
              </Link>
              {(user.role === "teacher" || user.role === "admin") ? (
                <Link href="/teacher-tools" className="button">
                  Open teacher tools
                </Link>
              ) : null}
            </div>
          </article>
        ) : null}

        <div className="dashboard-grid">
          <article className="dashboard-card">
            <h3>Subscription status</h3>
            {activeSubscription ? (
              <div className="panel-stack">
                <div className="dashboard-stat">
                  <span className="subtle">Plan</span>
                  <strong>{activePlan?.name ?? activeSubscription.plan}</strong>
                </div>
                <div className="dashboard-stat">
                  <span className="subtle">Status</span>
                  <span className="pill">{activeSubscriptionStatus ?? activeSubscription.status}</span>
                </div>
                <div className="dashboard-stat">
                  <span className="subtle">Amount</span>
                  <strong>{formatMoney(activeSubscription.amount)}</strong>
                </div>
                <div className="dashboard-stat">
                  <span className="subtle">Access ends</span>
                  <strong>{activeSubscription.endDate ? activeSubscription.endDate.slice(0, 10) : "Pending payment"}</strong>
                </div>
              </div>
            ) : (
              <p className="subtle">No subscription has been activated yet.</p>
            )}
            <div className="hero-actions">
              <Link href="/subscribe" className="button">
                Manage subscription
              </Link>
            </div>
          </article>

          <article className="dashboard-card">
            <h3>Account overview</h3>
            <div className="panel-stack">
              <div className="dashboard-stat">
                <span className="subtle">Role</span>
                <strong style={{ textTransform: "capitalize" }}>
                  {user.role === "admin" ? "admin" : user.role}
                </strong>
              </div>
              <div className="dashboard-stat">
                <span className="subtle">Email</span>
                <strong>{user.email}</strong>
              </div>
              <div className="dashboard-stat">
                <span className="subtle">Phone</span>
                <strong>{user.phoneNumber}</strong>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="page-shell section">
        <div className="section-head">
          <div>
            <span className="eyebrow">Access</span>
            <h2>Available learning levels</h2>
          </div>
          <p>
            {accessibleLevels.length > 0
              ? "Open the levels below to access available materials."
              : "Your current subscription does not unlock learning materials right now."}
          </p>
        </div>

        <article className="dashboard-card">
          {accessibleLevels.length > 0 ? (
            <div className="tag-row">
              {accessibleLevels.map((level) => (
                <Link key={level.id} href={`/levels/${level.id}`} className="tag">
                  {level.title}
                </Link>
              ))}
            </div>
          ) : (
            <p className="subtle">
              Start or renew a subscription to unlock the revision materials for your account.
            </p>
          )}

          <div className="hero-actions">
            <Link href="/subscribe" className="button-secondary">
              Open payments
            </Link>
            {user.role === "teacher" || user.role === "admin" ? (
              <Link href="/teacher-tools" className="button">
                Open teacher tools
              </Link>
            ) : null}
          </div>
        </article>
      </section>

      <section className="page-shell section">
        <div className="section-head">
          <div>
            <span className="eyebrow">Payments</span>
            <h2>Recent payment summary</h2>
          </div>
          <p>Quick payment visibility without loading the full admin-style reporting view.</p>
        </div>

        <div className="dashboard-grid">
          <article className="dashboard-card">
            <h3>Payment totals</h3>
            <div className="panel-stack">
              <div className="dashboard-stat">
                <span className="subtle">Successful payments</span>
                <strong>{paidPayments.length}</strong>
              </div>
              <div className="dashboard-stat">
                <span className="subtle">Pending payments</span>
                <strong>{pendingPayments.length}</strong>
              </div>
              <div className="dashboard-stat">
                <span className="subtle">Latest amount</span>
                <strong>{latestPayment ? formatMoney(latestPayment.amount) : "-"}</strong>
              </div>
            </div>
          </article>

          <article className="dashboard-card">
            <h3>Next step</h3>
            <p className="subtle">
              Use the subscription page to renew or update your membership.
            </p>
            <div className="hero-actions">
              <Link href="/subscribe" className="button">
                Continue to payments
              </Link>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
