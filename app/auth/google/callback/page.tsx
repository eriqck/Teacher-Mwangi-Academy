import Link from "next/link";
import { GoogleCallbackHandler } from "@/components/google-callback-handler";
import { SiteHeader } from "@/components/site-header";

export default function GoogleCallbackPage() {
  return (
    <main>
      <SiteHeader />

      <section className="page-shell section">
        <div className="section-head">
          <div>
            <span className="eyebrow">Google sign-in</span>
            <h2>Finishing your Google login.</h2>
          </div>
          <p>
            We are verifying your Google account and connecting it to Teacher Mwangi Academy.
          </p>
        </div>

        <div className="dashboard-grid">
          <article className="dashboard-card">
            <h3>Please wait</h3>
            <GoogleCallbackHandler />
          </article>

          <article className="dashboard-card">
            <h3>Need to go back?</h3>
            <p className="subtle">
              If Google sign-in does not finish, return to the login page and try again.
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
