import { AdminUploadForm } from "@/components/admin-upload-form";
import { AdminResourceManager } from "@/components/admin-resource-manager";
import { AdminSubscriptionsTable } from "@/components/admin-subscriptions-table";
import { AdminUserManager } from "@/components/admin-user-manager";
import { SiteHeader } from "@/components/site-header";
import { schemeOfWorkPrice, subscriptionPlans } from "@/lib/business";
import { requireAdmin } from "@/lib/auth";
import { readAppData } from "@/lib/repository";
import { getEffectiveSubscriptionStatus } from "@/lib/subscriptions";

function formatMoney(amount: number) {
  return `KSh ${amount}`;
}

function formatDateLabel(value: string | null) {
  if (!value) {
    return "Not granted";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeZone: "Africa/Nairobi"
  }).format(date);
}

export default async function AdminPage() {
  const user = await requireAdmin();

  const store = await readAppData();
  const usersById = new Map(store.users.map((entry) => [entry.id, entry]));
  const uploads = store.resources
    .filter((resource) => resource.uploadedByUserId === user.id)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const latestSubscriptionByUserId = new Map(
    store.subscriptions
      .slice()
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .map((subscription) => [subscription.userId, subscription] as const)
  );
  const adminUsers = store.users
    .slice()
    .sort((left, right) => left.fullName.localeCompare(right.fullName))
    .map((entry) => {
      const latestSubscription = latestSubscriptionByUserId.get(entry.id) ?? null;
      const effectiveStatus = latestSubscription
        ? getEffectiveSubscriptionStatus(latestSubscription)
        : "none";

      return {
        id: entry.id,
        fullName: entry.fullName,
        email: entry.email,
        phoneNumber: entry.phoneNumber,
        role: entry.role,
        selectedPlan:
          latestSubscription?.plan === "teacher-monthly" || latestSubscription?.plan === "parent-monthly"
            ? latestSubscription.plan
            : entry.role === "teacher"
              ? "teacher-monthly"
              : entry.role === "parent"
                ? "parent-monthly"
                : null,
        planLabel: latestSubscription
          ? subscriptionPlans[latestSubscription.plan]?.name ?? latestSubscription.plan
          : "None",
        subscriptionStatus: effectiveStatus,
        accessEnds: formatDateLabel(latestSubscription?.endDate ?? null),
        canManageMembership: entry.role !== "admin"
      };
    });
  const adminSubscriptions = store.subscriptions
    .slice()
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .map((subscription) => {
      const member = usersById.get(subscription.userId);
      const effectiveStatus = getEffectiveSubscriptionStatus(subscription);

      return {
        id: subscription.id,
        createdAt: subscription.createdAt,
        fullName: member?.fullName ?? subscription.userId,
        email: member?.email ?? "",
        phoneNumber: member?.phoneNumber ?? "",
        planName: subscriptionPlans[subscription.plan]?.name ?? subscription.plan,
        status: effectiveStatus,
        amountLabel: formatMoney(subscription.amount),
        endDateLabel: formatDateLabel(subscription.endDate),
        canGrantAccess: effectiveStatus !== "active"
      };
    });
  const payments = store.payments
    .slice()
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const paidPayments = payments.filter((payment) => payment.status === "paid");
  const pendingPayments = payments.filter((payment) => payment.status === "pending");
  const paidTotal = paidPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const pendingTotal = pendingPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const recentPayments = payments.slice(0, 12);

  return (
    <main>
      <SiteHeader user={user} />

      <section className="page-shell section">
        <div className="section-head">
          <div>
            <span className="eyebrow">Admin overview</span>
            <h2>Users, subscriptions, and payments.</h2>
          </div>
          <p>Track member activity, confirm access, and review payment progress from one place.</p>
        </div>

        <div className="dashboard-grid">
          <article className="dashboard-card">
            <h3>Total users</h3>
            <div className="dashboard-stat">
              <span className="subtle">Accounts saved</span>
              <strong>{store.users.length}</strong>
            </div>
          </article>

          <article className="dashboard-card">
            <h3>Active subscriptions</h3>
            <div className="dashboard-stat">
              <span className="subtle">Currently active</span>
              <strong>{adminSubscriptions.filter((subscription) => subscription.status === "active").length}</strong>
            </div>
          </article>

          <article className="dashboard-card">
            <h3>Paid total</h3>
            <div className="dashboard-stat">
              <span className="subtle">Successful payments</span>
              <strong>{formatMoney(paidTotal)}</strong>
            </div>
          </article>

          <article className="dashboard-card">
            <h3>Pending total</h3>
            <div className="dashboard-stat">
              <span className="subtle">Awaiting confirmation</span>
              <strong>{formatMoney(pendingTotal)}</strong>
            </div>
          </article>
        </div>
      </section>

      <section className="page-shell section">
        <div className="section-head">
          <div>
            <span className="eyebrow">Members</span>
            <h2>Search users and manage access.</h2>
          </div>
          <p>Find members by name, email, or phone, then update the plan or grant access manually.</p>
        </div>

        <AdminUserManager initialUsers={adminUsers} />
      </section>

      <section className="page-shell section">
        <div className="section-head">
          <div>
            <span className="eyebrow">Subscriptions</span>
            <h2>Membership activity.</h2>
          </div>
          <p>See who is active, pending, or expired and grant access when a payment was made offline.</p>
        </div>

        <AdminSubscriptionsTable initialSubscriptions={adminSubscriptions} />
      </section>

      <section className="page-shell section">
        <div className="section-head">
          <div>
            <span className="eyebrow">Payments</span>
            <h2>Payment dashboard and totals.</h2>
          </div>
          <p>Review recent payments and download the full CSV report whenever needed.</p>
        </div>

        <div className="dashboard-grid">
          <article className="dashboard-card">
            <h3>Payment summary</h3>
            <div className="panel-stack">
              <div className="dashboard-stat">
                <span className="subtle">Paid count</span>
                <strong>{paidPayments.length}</strong>
              </div>
              <div className="dashboard-stat">
                <span className="subtle">Pending count</span>
                <strong>{pendingPayments.length}</strong>
              </div>
              <div className="dashboard-stat">
                <span className="subtle">Total amount paid</span>
                <strong>{formatMoney(paidTotal)}</strong>
              </div>
            </div>
            <div className="hero-actions">
              <a href="/api/admin/payments/report" className="button">
                Download payments report
              </a>
            </div>
          </article>

          <article className="dashboard-card admin-panel-card">
            <h3>Recent payments</h3>
            {recentPayments.length > 0 ? (
              <div className="admin-table-wrap">
                <table className="mini-table admin-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>User</th>
                      <th>Type</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentPayments.map((payment) => (
                      <tr key={payment.id}>
                        <td>{formatDateLabel(payment.status === "paid" ? payment.updatedAt : payment.createdAt)}</td>
                        <td>{usersById.get(payment.userId)?.fullName ?? payment.userId}</td>
                        <td>{payment.kind}</td>
                        <td>{formatMoney(payment.amount)}</td>
                        <td>
                          <span className={`pill admin-status-pill admin-status-pill--${payment.status}`}>
                            {payment.status}
                          </span>
                        </td>
                        <td>{payment.accountReference}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="subtle">No payments have been saved yet.</p>
            )}
          </article>
        </div>
      </section>

      <section className="page-shell section">
        <div className="section-head">
          <div>
            <span className="eyebrow">Admin workspace</span>
            <h2>Upload revision materials and schemes from the browser.</h2>
          </div>
          <p>
            Uploaded files are saved through the configured storage provider, and every upload is
            registered in the app store so you can manage what is available to members.
          </p>
        </div>

        <div className="dashboard-grid">
          <article className="dashboard-card">
            <h3>Upload revision material</h3>
            <p className="subtle">
              Use this for subscriber resources such as topical packs, exams, answer keys, and
              teacher notes.
            </p>
            <AdminUploadForm variant="revision-material" />
          </article>

          <article className="dashboard-card">
            <h3>Upload scheme of work</h3>
            <p className="subtle">
              Teacher schemes are stored as paid one-time resources priced at KSh {schemeOfWorkPrice}.
            </p>
            <AdminUploadForm variant="scheme-of-work" />
          </article>
        </div>
      </section>

      <section className="page-shell section">
        <div className="section-head">
          <div>
            <span className="eyebrow">Uploads</span>
            <h2>Your latest uploaded files.</h2>
          </div>
          <p>
            Open, edit, or remove uploaded materials here whenever you need to refine the catalog.
          </p>
        </div>

        <AdminResourceManager initialResources={uploads} />
      </section>
    </main>
  );
}
