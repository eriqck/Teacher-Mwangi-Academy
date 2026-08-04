import type { Metadata } from "next";
import Link from "next/link";
import { MentorshipRegistrationForm } from "@/components/mentorship-registration-form";
import { SiteHeader } from "@/components/site-header";

const defaultSessionTitle = "Parent Mentorship Session";
const defaultSessionDate = "Saturday at 8:00 PM";

export const metadata: Metadata = {
  title: "Parent mentorship",
  description:
    "Register for Teacher Mwangi Academy parent mentorship sessions and receive session details by email."
};

export default function MentorshipPage() {
  const sessionTitle = process.env.MENTORSHIP_SESSION_TITLE?.trim() || defaultSessionTitle;
  const sessionDate = process.env.MENTORSHIP_SESSION_DATE?.trim() || defaultSessionDate;

  return (
    <main>
      <SiteHeader />

      <section className="page-shell section">
        <div className="section-head">
          <div>
            <span className="eyebrow">Parent mentorship</span>
            <h2>Register once. Receive session details automatically.</h2>
          </div>
          <p>
            A simple mentorship space for parents who want practical guidance on supporting CBE
            learners at home.
          </p>
        </div>

        <div className="dashboard-grid">
          <article className="dashboard-card">
            <h3>{sessionTitle}</h3>
            <div className="panel-stack">
              <div className="dashboard-stat">
                <span className="subtle">Next session</span>
                <strong>{sessionDate}</strong>
              </div>
              <p className="subtle">
                Parents will learn how to guide study routines, understand assessment needs, and
                support learners without confusion or pressure.
              </p>
              <ul className="list">
                <li>Study planning and consistency at home</li>
                <li>How to use notes and assessments effectively</li>
                <li>Parent questions and practical guidance</li>
              </ul>
            </div>
          </article>

          <article className="dashboard-card">
            <h3>Register for the next session</h3>
            <p className="subtle">
              Fill in your details below. We will save your registration and send session details
              before the meeting.
            </p>
            <MentorshipRegistrationForm />
          </article>
        </div>
      </section>

      <section className="page-shell section">
        <div className="dashboard-grid">
          <article className="dashboard-card">
            <h3>How it works</h3>
            <ul className="list">
              <li>Register using the form on this page.</li>
              <li>Receive confirmation by email when email delivery is configured.</li>
              <li>Join the Google Meet session using the shared link.</li>
              <li>Get follow-up information after the session when available.</li>
            </ul>
          </article>

          <article className="dashboard-card">
            <h3>Need learning materials too?</h3>
            <p className="subtle">
              You can also browse notes and assessment materials by grade from the main academy.
            </p>
            <div className="hero-actions">
              <Link href="/levels/grade-6" className="button-secondary">
                Browse materials
              </Link>
              <Link href="/subscribe" className="button">
                Register or renew
              </Link>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
