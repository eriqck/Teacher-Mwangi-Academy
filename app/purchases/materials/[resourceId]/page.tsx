import { redirect } from "next/navigation";
import { ResourceCheckoutForm } from "@/components/checkout-forms";
import { SiteHeader } from "@/components/site-header";
import { getCurrentUser } from "@/lib/auth";
import { teacherMaterialPrice } from "@/lib/business";
import { getSelectedResourceForCheckout } from "@/lib/purchase-data";

export default async function ResourcePurchasePage({
  params
}: {
  params: Promise<{ resourceId: string }>;
}) {
  const user = await getCurrentUser();
  const { resourceId } = await params;

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "teacher" && user.role !== "parent") {
    redirect("/subscribe");
  }

  const selectedResource = await getSelectedResourceForCheckout(resourceId);

  if (!selectedResource) {
    redirect("/dashboard");
  }

  if (user.role === "teacher" && selectedResource.audience === "parent") {
    redirect("/dashboard");
  }

  if (
    user.role === "parent" &&
    (selectedResource.audience === "teacher" || selectedResource.section !== "notes")
  ) {
    redirect("/dashboard");
  }

  return (
    <main>
      <SiteHeader />

      <section className="page-shell section">
        <div className="section-head">
          <div>
            <span className="eyebrow">One-time material purchase</span>
            <h2>Buy this exact material.</h2>
          </div>
          <p>
            You are checking out one selected material only. This keeps the flow easy to follow before M-Pesa checkout.
          </p>
        </div>

        <article className="dashboard-card">
          <h3>Material checkout</h3>
          <p className="subtle">
            Exact one-time material purchase at KSh {teacherMaterialPrice} for this account.
          </p>
          <ResourceCheckoutForm resource={selectedResource} buyerRole={user.role} />
        </article>
      </section>
    </main>
  );
}
