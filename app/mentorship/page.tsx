import type { Metadata } from "next";
import Image from "next/image";
import { MentorshipRegistrationForm } from "@/components/mentorship-registration-form";

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
    <main className="mentorship-page">
      <section className="mentorship-shell">
        <div className="mentorship-hero-copy">
          <p className="mentorship-kicker">Free parent masterclass</p>
          <h1>Help your child beat academic overwhelm and study with focus.</h1>
          <p>
            Discover practical ways to guide revision, use CBE materials correctly, and build
            consistent study habits at home.
          </p>
        </div>

        <div className="mentorship-layout">
          <div className="mentorship-video-card">
            <div className="mentorship-video-frame">
              <Image
                src="/teacher-mwangi-profile.png"
                alt="Teacher Mwangi mentorship session"
                fill
                priority
                sizes="(max-width: 900px) 100vw, 680px"
                className="mentorship-video-image"
              />
              <div className="mentorship-play-button" aria-hidden="true">
                TM
              </div>
            </div>
            <p>With Teacher Mwangi, CBE learning support for parents and learners.</p>
          </div>

          <aside className="mentorship-register-card">
            <div className="mentorship-card-banner">
              <span aria-hidden="true">[]</span>
              <strong>Playing for a limited time only</strong>
            </div>
            <div className="mentorship-card-body">
              <p className="mentorship-local-time">All times shown in your local time</p>
              <MentorshipRegistrationForm />
              <p className="mentorship-fine-print">
                By registering, you agree to receive mentorship session updates from Teacher Mwangi
                Academy. You can unsubscribe from future updates anytime.
              </p>
            </div>
          </aside>
        </div>

        <div className="mentorship-session-note">
          <span>{sessionTitle}</span>
          <strong>{sessionDate}</strong>
        </div>
      </section>
    </main>
  );
}
