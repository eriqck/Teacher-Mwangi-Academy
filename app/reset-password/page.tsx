import Link from "next/link";
import { PasswordResetForm } from "@/components/password-reset-form";
import { SiteHeader } from "@/components/site-header";

export default async function ResetPasswordPage({
  searchParams
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <main>
      <SiteHeader />

      <section className="page-shell section">
        <div className="section-head">
          <div>
            <span className="eyebrow">Reset password</span>
            <h2>Choose a new password for your account.</h2>
          </div>
          <p>
            Reset codes are single-use and expire after 15 minutes for security.
          </p>
        </div>

        <div className="dashboard-grid">
          <article className="dashboard-card">
            <h3>Enter your reset code</h3>
            <PasswordResetForm email={email ?? null} />
          </article>

          <article className="dashboard-card">
            <h3>Need a fresh code?</h3>
            <p className="subtle">
              If this code has expired, request a new password reset and we will issue a fresh secure code.
            </p>
            <div className="hero-actions">
              <Link href="/forgot-password" className="button-secondary">
                Request new code
              </Link>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
