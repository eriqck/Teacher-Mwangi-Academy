import MasterclassRegistration from "@/components/MasterclassRegistration";
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
        <Link href="/masterclass">Masterclass</Link>
      </nav>

      <article className="teacher-tools-card">
        <MasterclassRegistration />
      </article>
    </section>
  );
}
