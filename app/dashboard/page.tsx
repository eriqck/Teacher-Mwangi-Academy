import { AdminSubscriptionsTable } from "@/components/admin-subscriptions-table";
import { AdminUserManager } from "@/components/admin-user-manager";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteUpdatesFeed } from "@/components/site-updates-feed";
import { featuredResources, levels } from "@/lib/catalog";
import { requireUser } from "@/lib/auth";
import { subscriptionPlans, teacherMaterialPrice } from "@/lib/business";
import { reconcilePaidPaystackPaymentsForUser } from "@/lib/payments";
import { readAppData } from "@/lib/repository";
import { getSchemeTermLabel } from "@/lib/scheme-terms";
import { getLatestSiteUpdates } from "@/lib/site-updates";

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

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeZone: "Africa/Nairobi"
  }).format(date);
}

function formatTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-KE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Africa/Nairobi"
  }).format(date);
}

export default async function DashboardPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const resolvedSearchParams = await searchParams;

  if (user.role === "teacher") {
    const payment = typeof resolvedSearchParams.payment === "string" ? `?payment=${resolvedSearchParams.payment}` : "";
    redirect(`/teacher-tools${payment}`);
  }

  await reconcilePaidPaystackPaymentsForUser(user.id);
  const latestUpdates = getLatestSiteUpdates(3);

  const store = await readAppData();
  const usersById = new Map(store.users.map((entry) => [entry.id, entry]));
  const subscriptions = store.subscriptions
    .filter((item) => item.userId === user.id)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const payments = (user.role === "admin" ? store.payments : store.payments.filter((item) => item.userId === user.id))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const schemePurchases = store.schemePurchases.filter((item) => item.userId === user.id);
  const resourcePurchases = store.resourcePurchases.filter((item) => item.userId === user.id);
  const resourcesById = new Map(store.resources.map((resource) => [resource.id, resource]));
  const allSubscriptions = store.subscriptions
    .slice()
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const adminSubscriptionRows = allSubscriptions.map((subscription) => {
    const subscriber = usersById.get(subscription.userId);
    const planDetails = getPlanDetails(subscription.plan);

    return {
      id: subscription.id,
      createdAt: subscription.createdAt,
      fullName: subscriber?.fullName ?? subscription.userId,
      email: subscriber?.email ?? "-",
      phoneNumber: subscriber?.phoneNumber ?? "-",
      planName: planDetails?.name ?? subscription.plan ?? "Unknown plan",
      status: subscription.status,
      amountLabel: formatMoney(subscription.amount),
      endDateLabel: subscription.endDate ? subscription.endDate.slice(0, 10) : "Pending payment",
      canGrantAccess: subscription.status === "pending"
    };
  });
  const latestSubscriptionByUserId = new Map<string, (typeof allSubscriptions)[number]>();
  for (const subscription of allSubscriptions) {
    if (!latestSubscriptionByUserId.has(subscription.userId)) {
      latestSubscriptionByUserId.set(subscription.userId, subscription);
    }
  }
  const adminUserRows = store.users
    .slice()
    .sort((left, right) => left.fullName.localeCompare(right.fullName))
    .map((entry) => {
      const latestSubscription = latestSubscriptionByUserId.get(entry.id);
      const latestPlanDetails = getPlanDetails(latestSubscription?.plan);
      const selectedPlan =
        (latestPlanDetails ? latestSubscription?.plan : null) ??
        (entry.role === "teacher" ? "teacher-monthly" : entry.role === "parent" ? "parent-monthly" : null);
      const selectedPlanDetails = getPlanDetails(selectedPlan);

      return {
        id: entry.id,
        fullName: entry.fullName,
        email: entry.email,
        phoneNumber: entry.phoneNumber,
        role: entry.role,
        selectedPlan,
        planLabel: selectedPlanDetails?.name ?? "No membership yet",
        subscriptionStatus: latestSubscription?.status ?? "none",
        accessEnds: latestSubscription?.endDate ? latestSubscription.endDate.slice(0, 10) : "Not granted",
        canManageMembership: entry.role !== "admin"
      };
    });
  const activeSubscription =
    subscriptions.find((item) => item.status === "active") ??
    subscriptions.find((item) => item.status === "pending") ??
    subscriptions[0];
  const activePlan = getPlanDetails(activeSubscription?.plan);
  const accessibleLevels =
    user.role === "admin"
      ? []
      : activePlan?.levelAccessMode === "all"
        ? levels
        : levels.filter((level) => activeSubscription?.levelAccess.includes(level.id));
  const paidPayments = payments.filter((payment) => payment.status === "paid");
  const pendingPayments = payments.filter((payment) => payment.status === "pending");
  const failedPayments = payments.filter((payment) => payment.status === "failed");
  const totalPaidAmount = paidPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const totalPendingAmount = pendingPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const totalFailedAmount = failedPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const paidSubscriptionsAmount = paidPayments
    .filter((payment) => payment.kind === "subscription")
    .reduce((sum, payment) => sum + payment.amount, 0);
  const paidSchemesAmount = paidPayments
    .filter((payment) => payment.kind === "scheme")
    .reduce((sum, payment) => sum + payment.amount, 0);
  const paidResourcesAmount = paidPayments
    .filter((payment) => payment.kind === "resource")
    .reduce((sum, payment) => sum + payment.amount, 0);

  return (
    <main>
      <SiteHeader />

      <section className="page-shell section">
        <div className="section-head">
          <div>
            <span className="eyebrow">Member dashboard</span>
            <h2>Welcome back, {user.fullName}.</h2>
          </div>
          <p>
            Your dashboard now reads saved account, subscription, and payment data from the app.
          </p>
        </div>

        <div className="dashboard-grid">
          <article className="dashboard-card">
            <h3>Subscription status</h3>
            {activeSubscription ? (
              <div className="panel-stack">
                <div className="dashboard-stat">
                  <span className="subtle">Plan</span>
                  <strong>{activePlan?.name ?? activeSubscription.plan ?? "Unknown plan"}</strong>
                </div>
                <div className="dashboard-stat">
                  <span className="subtle">Status</span>
                  <span className="pill">{activeSubscription.status}</span>
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
              <p className="subtle">No subscription yet. Start one below.</p>
            )}
            <div className="hero-actions">
              <Link href="/subscribe" className="button">
                Manage payments
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
            {user.role === "admin" ? (
              <div className="hero-actions">
                <Link href="/admin" className="button-secondary">
                  Open upload admin
                </Link>
              </div>
            ) : null}
          </article>
        </div>

        <article className="dashboard-card dashboard-updates-card">
          <div className="section-head section-head--compact">
            <div>
              <span className="eyebrow">Latest updates</span>
              <h3>What is new on the site</h3>
            </div>
            <p>Members can quickly see newly added content and feature improvements here.</p>
          </div>

          <SiteUpdatesFeed updates={latestUpdates} compact />
        </article>
      </section>

      <section className="page-shell section">
        <div className="section-head">
          <div>
            <span className="eyebrow">Access</span>
            <h2>{user.role === "admin" ? "Admin tools and subscriber extras." : "Levels and teacher extras."}</h2>
          </div>
          <p>
            {user.role === "admin"
              ? "Admin accounts manage uploads. Teacher accounts stay on the subscriber path."
              : "Parents and teachers can unlock all revision levels, while teachers can also buy exact schemes and single materials."}
          </p>
        </div>

        <div className="dashboard-grid">
          <article className="dashboard-card">
            <h3>{user.role === "admin" ? "Admin access" : "Accessible levels"}</h3>
            <div className="tag-row">
              {accessibleLevels.map((level) => (
                <Link key={level.id} href={`/levels/${level.id}`} className="tag">
                  {level.title}
                </Link>
              ))}
            </div>
            <p className="subtle">
              {user.role === "admin"
                ? "Use the admin workspace to upload and manage materials."
                : "Parent subscriptions now unlock all revision levels."}
            </p>
          </article>

          <article className="dashboard-card">
            <h3>Teacher scheme purchases</h3>
            {schemePurchases.length > 0 ? (
              <table className="mini-table">
                <thead>
                  <tr>
                    <th>Scheme</th>
                    <th>Level</th>
                    <th>Term</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {schemePurchases.slice(0, 5).map((purchase) => (
                    <tr key={purchase.id}>
                      <td>
                        {purchase.resourceId
                          ? (resourcesById.get(purchase.resourceId)?.title ?? purchase.subject)
                          : purchase.subject}
                      </td>
                      <td>{purchase.level}</td>
                      <td>{getSchemeTermLabel(purchase.term)}</td>
                      <td>{purchase.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="subtle">
                Scheme purchases are available to teacher accounts only.
              </p>
            )}
          </article>
        </div>

        <div className="dashboard-grid" style={{ marginTop: 18 }}>
          <article className="dashboard-card">
            <h3>Teacher material purchases</h3>
            {resourcePurchases.length > 0 ? (
              <table className="mini-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {resourcePurchases.slice(0, 5).map((purchase) => (
                    <tr key={purchase.id}>
                      <td>{purchase.title}</td>
                      <td>{purchase.section === "assessment" ? "Assessment" : "Notes"}</td>
                      <td>{formatMoney(purchase.amount || teacherMaterialPrice)}</td>
                      <td>{purchase.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="subtle">
                One-time teacher material purchases are available to teacher accounts only.
              </p>
            )}
          </article>
        </div>
      </section>

      {user.role === "admin" ? (
        <section className="page-shell section">
          <div className="section-head">
            <div>
              <span className="eyebrow">Users</span>
              <h2>Search and manage all user accounts.</h2>
            </div>
            <p>
              Search by name, email, phone, or role, then grant access or change membership manually.
            </p>
          </div>

          <AdminUserManager initialUsers={adminUserRows} />
        </section>
      ) : null}

      {user.role === "admin" ? (
        <section className="page-shell section">
          <div className="section-head">
            <div>
              <span className="eyebrow">Payments</span>
              <h2>Payment summary and reporting.</h2>
            </div>
            <p>
              Track successful totals, see pending balances, and export the full payments report anytime.
            </p>
          </div>

          <div className="dashboard-summary-grid">
            <article className="dashboard-card dashboard-summary-card">
              <span className="subtle">Successful payments total</span>
              <strong className="dashboard-summary-value">{formatMoney(totalPaidAmount)}</strong>
              <p className="subtle">
                {paidPayments.length} successful payment{paidPayments.length === 1 ? "" : "s"} saved.
              </p>
            </article>

            <article className="dashboard-card dashboard-summary-card">
              <span className="subtle">Pending payments total</span>
              <strong className="dashboard-summary-value">{formatMoney(totalPendingAmount)}</strong>
              <p className="subtle">
                {pendingPayments.length} pending payment{pendingPayments.length === 1 ? "" : "s"} still open.
              </p>
            </article>

            <article className="dashboard-card dashboard-summary-card">
              <span className="subtle">Failed payments total</span>
              <strong className="dashboard-summary-value">{formatMoney(totalFailedAmount)}</strong>
              <p className="subtle">
                {failedPayments.length} failed payment{failedPayments.length === 1 ? "" : "s"} recorded.
              </p>
            </article>

            <article className="dashboard-card dashboard-summary-card">
              <span className="subtle">Paid subscriptions total</span>
              <strong className="dashboard-summary-value">{formatMoney(paidSubscriptionsAmount)}</strong>
              <p className="subtle">Successful subscription income only.</p>
            </article>

            <article className="dashboard-card dashboard-summary-card">
              <span className="subtle">Paid schemes total</span>
              <strong className="dashboard-summary-value">{formatMoney(paidSchemesAmount)}</strong>
              <p className="subtle">Successful schemes of work income only.</p>
            </article>

            <article className="dashboard-card dashboard-summary-card">
              <span className="subtle">Paid one-time materials total</span>
              <strong className="dashboard-summary-value">{formatMoney(paidResourcesAmount)}</strong>
              <p className="subtle">Successful notes and assessment income only.</p>
            </article>
          </div>

          <article className="dashboard-card" style={{ marginTop: 18 }}>
            <div className="section-head section-head--compact">
              <div>
                <h3>Export payments report</h3>
                <p className="subtle">
                  Download a CSV with both the summary totals and the detailed payment rows.
                </p>
              </div>
              <div className="hero-actions">
                <a href="/api/admin/payments/report" className="button">
                  Download CSV report
                </a>
              </div>
            </div>
          </article>

          <article className="dashboard-card">
            <h3>All payment activity</h3>
            {payments.length > 0 ? (
              <table className="mini-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Time</th>
                    <th>User</th>
                    <th>Phone</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id}>
                      <td>{formatDate(payment.status === "paid" ? payment.updatedAt : payment.createdAt)}</td>
                      <td>{formatTime(payment.status === "paid" ? payment.updatedAt : payment.createdAt)}</td>
                      <td>{usersById.get(payment.userId)?.fullName ?? payment.userId}</td>
                      <td>{payment.phoneNumber || usersById.get(payment.userId)?.phoneNumber || "-"}</td>
                      <td>{payment.kind}</td>
                      <td>{formatMoney(payment.amount)}</td>
                      <td>{payment.status}</td>
                      <td>{payment.accountReference}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="subtle">No payments have been saved yet.</p>
            )}
          </article>
        </section>
      ) : null}

      {user.role === "admin" ? (
        <section className="page-shell section">
          <div className="section-head">
            <div>
              <span className="eyebrow">Subscribers</span>
              <h2>All subscriber records.</h2>
            </div>
            <p>
              Every saved subscription appears here, including pending, active, expired, and failed states.
            </p>
          </div>

          <AdminSubscriptionsTable initialSubscriptions={adminSubscriptionRows} />
        </section>
      ) : null}

      <section className="page-shell section">
        <div className="section-head">
          <div>
            <span className="eyebrow">Library preview</span>
            <h2>Featured resources inside the academy.</h2>
          </div>
          <p>These remain the materials you can market and later protect behind download access.</p>
        </div>

        <div className="resource-grid">
          {featuredResources.map((resource) => (
            <article key={resource.title} className="resource-card">
              <h3>{resource.title}</h3>
              <div className="resource-meta">
                <span>{resource.level}</span>
                <span>{resource.type}</span>
              </div>
              <p className="subtle">{resource.access}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
