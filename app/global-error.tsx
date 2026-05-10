"use client";

import Link from "next/link";

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <main>
          <section className="page-shell section">
            <div className="section-head">
              <div>
                <span className="eyebrow">Something went wrong</span>
                <h2>The page could not finish loading.</h2>
              </div>
              <p>Your account may still be signed in. You can retry or go back to the homepage.</p>
            </div>

            <div className="dashboard-grid">
              <article className="dashboard-card">
                <h3>Quick recovery</h3>
                <div className="hero-actions">
                  <button type="button" className="button" onClick={() => reset()}>
                    Try again
                  </button>
                  <Link href="/" className="button-secondary">
                    Go to homepage
                  </Link>
                </div>
              </article>

              <article className="dashboard-card">
                <h3>Reference</h3>
                <p className="subtle">{error.digest ?? "No digest available."}</p>
              </article>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
