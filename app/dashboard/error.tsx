"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function DashboardError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard segment error", error);
  }, [error]);

  return (
    <main>
      <section className="page-shell section">
        <div className="section-head">
          <div>
            <span className="eyebrow">Member dashboard</span>
            <h2>Your account is signed in.</h2>
          </div>
          <p>The dashboard hit a loading problem, but your login was successful.</p>
        </div>

        <div className="dashboard-grid">
          <article className="dashboard-card">
            <h3>Try again</h3>
            <p className="subtle">
              Refresh the dashboard first. If the problem continues, use one of the quick links below.
            </p>
            <div className="hero-actions">
              <button type="button" className="button" onClick={() => reset()}>
                Reload dashboard
              </button>
              <Link href="/" className="button-secondary">
                Back to homepage
              </Link>
            </div>
          </article>

          <article className="dashboard-card">
            <h3>Quick links</h3>
            <div className="hero-actions">
              <Link href="/subscribe" className="button-secondary">
                Manage payments
              </Link>
              <Link href="/teacher-tools" className="button-secondary">
                Open teacher tools
              </Link>
            </div>
            {error.digest ? <p className="subtle">Reference: {error.digest}</p> : null}
          </article>
        </div>
      </section>
    </main>
  );
}
