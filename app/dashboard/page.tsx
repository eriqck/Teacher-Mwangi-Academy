import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { featuredResources, levels } from "@/lib/catalog";
import { requireUser } from "@/lib/auth";
import { subscriptionPlans, teacherMaterialPrice } from "@/lib/business";
import { readAppData } from "@/lib/repository";
import { getSchemeTermLabel } from "@/lib/scheme-terms";

function formatMoney(amount: number) {
  return `KSh ${amount}`;
}

export default async function DashboardPage() {
  const user = await requireUser();
  const store = await readAppData();
  const subscriptions = store.subscriptions.filter((item) => item.userId === user.id);
  const payments = store.payments
    .filter((item) => item.userId === user.id)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 6);
  const schemePurchases = store.schemePurchases.filter((item) => item.userId === user.id);
  const resourcePurchases = store.resourcePurchases.filter((item) => item.userId === user.id);
  const resourcesById = new Map(store.resources.map((resource) => [resource.id, resource]));
  const activeSubscription = subscriptions.find((item) => item.status === "active") ?? subscriptions[0];
  const activePlan = activeSubscription ? subscriptionPlans[activeSubscription.plan] : null;
  const accessibleLevels =
    user.role === "teacher"
      ? levels
      : user.role === "admin"
        ? []
        : activePlan?.levelAccessMode === "all"
          ? levels
          : levels.filter((level) => activeSubscription?.levelAccess.includes(level.id));

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
                  <strong>{subscriptionPlans[activeSubscription.plan].name}</strong>
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
                : user.role === "teacher"
                ? "Teacher subscriptions unlock all revision levels."
                : "Parent subscriptions now unlock all revision levels."}
            </p>
          </article>

          <article className="dashboard-card">
            <h3>Teacher scheme purchases</h3>
            {user.role === "teacher" && schemePurchases.length > 0 ? (
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
                {user.role === "teacher"
                  ? "No scheme purchases yet."
                  : "Scheme purchases are available to teacher accounts only."}
              </p>
            )}
          </article>
        </div>

        <div className="dashboard-grid" style={{ marginTop: 18 }}>
          <article className="dashboard-card">
            <h3>Teacher material purchases</h3>
            {user.role === "teacher" && resourcePurchases.length > 0 ? (
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
                {user.role === "teacher"
                  ? "No one-time note or assessment purchases yet."
                  : "One-time teacher material purchases are available to teacher accounts only."}
              </p>
            )}
          </article>
        </div>
      </section>

      <section className="page-shell section">
        <div className="section-head">
          <div>
            <span className="eyebrow">Payments</span>
            <h2>Recent payment activity.</h2>
          </div>
          <p>
            These records are saved when checkout starts and updated when the M-Pesa callback
            completes.
          </p>
        </div>

        <article className="dashboard-card">
          {payments.length > 0 ? (
            <table className="mini-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Reference</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td>{payment.createdAt.slice(0, 10)}</td>
                    <td>{payment.kind}</td>
                    <td>{formatMoney(payment.amount)}</td>
                    <td>{payment.status}</td>
                    <td>{payment.accountReference}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="subtle">No payments saved yet. Start with a subscription or scheme purchase.</p>
          )}
        </article>
      </section>

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
