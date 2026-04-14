import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { SiteHeader } from "@/components/site-header";
import { getCurrentUser } from "@/lib/auth";
import { schemeOfWorkPrice, teacherMaterialPrice } from "@/lib/business";

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main>
      <SiteHeader />
      <section className="page-shell section">
        <div className="section-head">
          <div>
            <span className="eyebrow">Sign in</span>
            <h2>Access your Teacher Mwangi Academy account.</h2>
          </div>
          <p>
            Parents and teachers can sign in here to manage subscriptions, check payments, and open
            their member dashboard.
          </p>
        </div>

        <div className="dashboard-grid">
          <article className="dashboard-card">
            <h3>Member login</h3>
            <Suspense fallback={<p className="subtle">Loading sign-in form...</p>}>
              <AuthForm mode="login" />
            </Suspense>
          </article>

          <article className="dashboard-card">
            <h3>New here?</h3>
            <ul className="list">
              <li>Parents can subscribe for KSh 300 per month.</li>
              <li>Teachers can subscribe for KSh 150 per month.</li>
              <li>Google sign-in is available for faster access.</li>
              <li>Teachers can also buy exact uploaded schemes of work at KSh {schemeOfWorkPrice} each.</li>
              <li>Teachers can buy single notes and assessments at KSh {teacherMaterialPrice} per material.</li>
            </ul>
            <div className="hero-actions">
              <Link href="/signup" className="button">
                Create account
              </Link>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
