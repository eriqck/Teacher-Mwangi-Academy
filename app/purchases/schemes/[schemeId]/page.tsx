import { redirect } from "next/navigation";
import { SchemeCheckoutForm } from "@/components/checkout-forms";
import { SiteHeader } from "@/components/site-header";
import { getCurrentUser } from "@/lib/auth";
import { schemeOfWorkPrice } from "@/lib/business";
import { getAvailableSchemesForCheckout, getSelectedSchemeForCheckout } from "@/lib/purchase-data";

export default async function SchemePurchasePage({
  params
}: {
  params: Promise<{ schemeId: string }>;
}) {
  const user = await getCurrentUser();
  const { schemeId } = await params;

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "teacher") {
    redirect("/subscribe");
  }

  const [selectedScheme, availableSchemes] = await Promise.all([
    getSelectedSchemeForCheckout(schemeId),
    getAvailableSchemesForCheckout()
  ]);

  if (!selectedScheme) {
    redirect("/dashboard");
  }

  return (
    <main>
      <SiteHeader />

      <section className="page-shell section">
        <div className="section-head">
          <div>
            <span className="eyebrow">One-time teacher purchase</span>
            <h2>Buy this exact scheme of work.</h2>
          </div>
          <p>
            You are checking out one selected scheme only. This keeps the flow simple and clear before M-Pesa checkout.
          </p>
        </div>

        <article className="dashboard-card">
          <h3>Scheme checkout</h3>
          <p className="subtle">
            Exact uploaded scheme purchase at KSh {schemeOfWorkPrice}. After payment, this scheme unlocks for your teacher account.
          </p>
          <SchemeCheckoutForm schemes={availableSchemes} selectedScheme={selectedScheme} />
        </article>
      </section>
    </main>
  );
}
