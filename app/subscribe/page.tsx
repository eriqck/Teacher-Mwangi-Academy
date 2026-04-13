import { redirect } from "next/navigation";
import Link from "next/link";
import { SubscriptionCheckoutForm } from "@/components/checkout-forms";
import { SiteHeader } from "@/components/site-header";
import { academyName, schemeOfWorkPrice, teacherMaterialPrice } from "@/lib/business";
import { getCurrentUser } from "@/lib/auth";
import { membershipPlans } from "@/lib/catalog";

export default async function SubscribePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/signup");
  }

  if (user.role === "admin") {
    redirect("/admin");
  }

  return (
    <main>
      <SiteHeader />

      <section className="page-shell section">
        <div className="section-head">
          <div>
            <span className="eyebrow">Subscription checkout</span>
            <h2>Start subscriptions and teacher purchases with M-Pesa.</h2>
          </div>
          <p>
            Signed in as {user.fullName}. {academyName} now saves customer, subscription, and
            payment records before M-Pesa confirmation unlocks access across the right resources.
          </p>
        </div>

        <div className="pricing-grid">
          {membershipPlans.map((plan) => (
            <article key={plan.name} className="pricing-card">
              <h3>{plan.name}</h3>
              <p className="price">
                {plan.price}
                <small>{plan.cadence}</small>
              </p>
              <p className="subtle">{plan.audience}</p>
              <ul className="list">
                {plan.highlights.map((highlight) => (
                  <li key={highlight}>{highlight}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <div className="dashboard-grid">
          <article className="dashboard-card">
            <h3>Monthly subscription checkout</h3>
            <SubscriptionCheckoutForm role={user.role} />
          </article>

          <article className="dashboard-card">
            <h3>Teacher one-time purchases</h3>
            <p className="subtle">
              One-time teacher purchases now have their own dedicated checkout pages for a clearer flow.
            </p>
            {user.role === "teacher" ? (
              <div className="hero-actions">
                <Link href="/dashboard" className="button-secondary">
                  Go to dashboard
                </Link>
                <Link href="/levels/grade-6" className="button">
                  Browse materials to buy
                </Link>
              </div>
            ) : (
              <p className="subtle">
                Create or use a teacher account to buy one-time schemes, notes, and assessments.
              </p>
            )}
          </article>
        </div>
      </section>
    </main>
  );
}
