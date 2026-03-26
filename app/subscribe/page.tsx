import { redirect } from "next/navigation";
import { ResourceCheckoutForm, SchemeCheckoutForm, SubscriptionCheckoutForm } from "@/components/checkout-forms";
import { SiteHeader } from "@/components/site-header";
import { academyName, schemeOfWorkPrice, teacherMaterialPrice } from "@/lib/business";
import { getCurrentUser } from "@/lib/auth";
import { membershipPlans } from "@/lib/catalog";
import { readAppData } from "@/lib/repository";

export default async function SubscribePage({
  searchParams
}: {
  searchParams: Promise<{ resourceId?: string }>;
}) {
  const user = await getCurrentUser();
  const { resourceId } = await searchParams;

  if (!user) {
    redirect("/signup");
  }

  if (user.role === "admin") {
    redirect("/admin");
  }

  const store = resourceId ? await readAppData() : null;
  const selectedResource = resourceId
    ? (() => {
        const resource = store?.resources.find(
        (resource) =>
          resource.id === resourceId &&
          resource.category === "revision-material" &&
          resource.audience !== "parent"
      );

        return resource
          ? {
              id: resource.id,
              title: resource.title,
              level: resource.level,
              subject: resource.subject,
              section: resource.section ?? "notes",
              assessmentSet: resource.assessmentSet ?? null
            }
          : null;
      })()
    : null;

  return (
    <main>
      <SiteHeader />

      <section className="page-shell section">
        <div className="section-head">
          <div>
            <span className="eyebrow">Subscription checkout</span>
            <h2>Start subscriptions and teacher purchases with Paystack.</h2>
          </div>
          <p>
            Signed in as {user.fullName}. {academyName} now saves customer, subscription, and
            payment records before Paystack verification unlocks access.
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
            <h3>Teacher scheme purchase</h3>
            <p className="subtle">
              Teachers can buy one-time schemes of work at KSh {schemeOfWorkPrice} per subject, per term.
            </p>
            {user.role === "teacher" ? (
              <SchemeCheckoutForm />
            ) : (
              <p className="subtle">
                Create or use a teacher account to buy one-time schemes of work.
              </p>
            )}
          </article>
        </div>

        <div className="dashboard-grid" style={{ marginTop: 18 }}>
          <article className="dashboard-card">
            <h3>Teacher single material purchase</h3>
            <p className="subtle">
              Teachers can also buy one-time notes or assessments at KSh {teacherMaterialPrice} per material.
            </p>
            {user.role === "teacher" ? (
              <ResourceCheckoutForm resource={selectedResource} />
            ) : (
              <p className="subtle">
                Create or use a teacher account to buy one-time notes and assessments.
              </p>
            )}
          </article>
        </div>
      </section>
    </main>
  );
}
