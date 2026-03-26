import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { SiteHeader } from "@/components/site-header";
import { getCurrentUser } from "@/lib/auth";

export default async function SignupPage() {
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
            <span className="eyebrow">Create account</span>
            <h2>Join Teacher Mwangi Academy.</h2>
          </div>
          <p>
            Create a parent or teacher account first, then start your subscription or buy a scheme
            of work with M-Pesa.
          </p>
        </div>

        <div className="dashboard-grid">
          <article className="dashboard-card">
            <h3>Account setup</h3>
            <AuthForm mode="signup" />
          </article>

          <article className="dashboard-card">
            <h3>What happens next</h3>
            <ul className="list">
              <li>Your account is saved immediately.</li>
              <li>You are signed in automatically after signup.</li>
              <li>You can also continue with Google and finish your role setup in one step.</li>
              <li>You can then start a subscription or buy teacher materials.</li>
            </ul>
            <p className="subtle">
              Already have an account? <Link href="/login">Sign in here</Link>.
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}
