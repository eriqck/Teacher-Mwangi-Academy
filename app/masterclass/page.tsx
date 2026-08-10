import { MasterclassSignup } from "@/components/masterclass-signup";
import Link from "next/link";

export const metadata = {
  title: "KJSEA Examiner Masterclass - Tr. Mwangi Academy",
  description:
    "Join our exclusive masterclass with KJSEA Examiners. Learn presentation tips, marking strategies, and exam success secrets.",
};

export default function MasterclassPage() {
  return (
    <section className="teacher-tools-content">
      <nav className="teacher-tools-breadcrumbs" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span>/</span>
        <Link href="/teacher-tools">Teacher tools</Link>
        <span>/</span>
        <span>KJSEA Masterclass</span>
      </nav>

      <article className="teacher-tools-card">
        <MasterclassSignup />
      </article>
    </section>
  );
}
