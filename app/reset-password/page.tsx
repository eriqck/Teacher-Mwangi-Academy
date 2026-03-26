import Link from "next/link";
import { PasswordResetForm } from "@/components/password-reset-form";
import { SiteHeader } from "@/components/site-header";

export default async function ResetPasswordPage({
  searchParams
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

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
            Reset links are single-use and expire after one hour for security.
          </p>
        </div>

        <div className="dashboard-grid">
          <article className="dashboard-card">
            <h3>Set new password</h3>
            <PasswordResetForm token={token ?? null} />
          </article>

          <article className="dashboard-card">
            <h3>Need a fresh link?</h3>
            <p className="subtle">
              If this link has expired, request a new password reset and we will issue a fresh secure link.
            </p>
            <div className="hero-actions">
              <Link href="/forgot-password" className="button-secondary">
                Request new link
              </Link>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
