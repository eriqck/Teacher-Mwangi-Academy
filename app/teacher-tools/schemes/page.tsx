import Link from "next/link";
import { requireTeacherUser } from "@/lib/auth";
import { readAppData } from "@/lib/repository";
import { levels } from "@/lib/catalog";
import { getSchemeTermLabel } from "@/lib/scheme-terms";

function getLevelTitle(levelId: string) {
  return levels.find((level) => level.id === levelId)?.title ?? levelId;
}

export default async function TeacherToolSchemesPage() {
  const user = await requireTeacherUser();
  const store = await readAppData();

  const schemes = store.generatedSchemes
    .filter((scheme) => scheme.userId === user.id || user.role === "admin")
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

  return (
    <section className="teacher-tools-content">
      <div className="teacher-tools-section-head">
        <div>
          <span className="eyebrow">My schemes</span>
          <h2>Saved generated schemes</h2>
        </div>
        <div className="hero-actions">
          <Link href="/teacher-tools/schemes/new" className="button">
            Create new scheme
          </Link>
        </div>
      </div>

      <article className="teacher-tools-card">
        {schemes.length > 0 ? (
          <div className="generated-scheme-list">
            {schemes.map((scheme) => (
              <article key={scheme.id} className="generated-scheme-card">
                <div className="generated-scheme-meta">
                  <span className="pill">{getLevelTitle(scheme.level)}</span>
                  <span className="pill">{getSchemeTermLabel(scheme.term)}</span>
                  <span className="pill">{scheme.subject}</span>
                </div>
                <h4>{scheme.title}</h4>
                <p className="subtle">{scheme.strand} / {scheme.subStrand}</p>
                <div className="hero-actions">
                  <Link href={`/teacher-tools/schemes/${scheme.id}`} className="button-secondary">
                    Open scheme
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h4>No generated schemes yet</h4>
            <p className="subtle">Your saved scheme outputs will appear here after the first generation.</p>
            <Link href="/teacher-tools/schemes/new" className="button">Create first scheme</Link>
          </div>
        )}
      </article>
    </section>
  );
}
