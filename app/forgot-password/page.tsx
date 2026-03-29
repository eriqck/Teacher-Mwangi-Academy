import Link from "next/link";
import { redirect } from "next/navigation";
import { PasswordResetRequestForm } from "@/components/password-reset-request-form";
import { SiteHeader } from "@/components/site-header";
import { getCurrentUser } from "@/lib/auth";

export default async function ForgotPasswordPage() {
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
            <span className="eyebrow">Forgot password</span>
            <h2>Request a secure password reset code.</h2>
          </div>
          <p>
            Enter your account email and we will help you reset access safely with a one-time code.
          </p>
        </div>

        <div className="dashboard-grid">
          <article className="dashboard-card">
            <h3>Reset access</h3>
            <PasswordResetRequestForm />
          </article>

          <article className="dashboard-card">
            <h3>Need to sign in instead?</h3>
            <p className="subtle">
              If you still remember your password, go back to the login page and continue normally.
            </p>
            <div className="hero-actions">
              <Link href="/login" className="button-secondary">
                Back to login
              </Link>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
