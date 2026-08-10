import { MeetingSignup } from "@/components/meeting-signup";
import Link from "next/link";

export const metadata = {
  title: "Grade 9 Meeting with Tr. Mwangi: School Selection & New Updates"
};

export default function Grade9MeetingPage() {
  return (
    <section className="teacher-tools-content">
      <nav className="teacher-tools-breadcrumbs" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span>/</span>
        <Link href="/teacher-tools">Teacher tools</Link>
        <span>/</span>
        <span>Grade 9 meeting</span>
      </nav>

      <div className="teacher-tools-section-head">
        <div>
          <span className="eyebrow">Mentor class</span>
          <h1>Grade 9 Meeting with Tr. Mwangi: School Selection & New Updates</h1>
          <p className="subtle">Join the meeting — invited participants will receive the Google Meet link by email.</p>
        </div>
      </div>

      <article className="teacher-tools-card">
        <MeetingSignup />
      </article>
    </section>
  );
}
