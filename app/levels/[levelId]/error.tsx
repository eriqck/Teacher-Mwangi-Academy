"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function LevelPageError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Level page error", error);
  }, [error]);

  return (
    <main>
      <section className="page-shell section">
        <div className="section-head">
          <div>
            <span className="eyebrow">Learning materials</span>
            <h2>This level could not load right now.</h2>
          </div>
          <p>Try again, or return to the homepage and open another level.</p>
        </div>

        <div className="dashboard-grid">
          <article className="dashboard-card">
            <h3>Try again</h3>
            <div className="hero-actions">
              <button type="button" className="button" onClick={() => reset()}>
                Reload level
              </button>
              <Link href="/" className="button-secondary">
                Back to homepage
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
  );
}
