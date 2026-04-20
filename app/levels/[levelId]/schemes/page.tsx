import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { schemeOfWorkPrice, teacherSchemeGenerationPrice } from "@/lib/business";
import { getLevelById } from "@/lib/levels";
import { getLevelPageData } from "@/lib/resource-access";
import { getSchemeTermLabel, schemeTerms } from "@/lib/scheme-terms";
import type { SchemeTerm } from "@/lib/store";

export async function generateMetadata({
  params
}: {
  params: Promise<{ levelId: string }>;
}): Promise<Metadata> {
  const { levelId } = await params;
  const level = getLevelById(levelId);

  if (!level) {
    return {
      title: "Schemes not found"
    };
  }

  return {
    title: `${level.title} schemes of work`,
    description: `Generate schemes of work or choose ready uploaded schemes for ${level.title} at Teacher Mwangi Academy.`,
    alternates: {
      canonical: `/levels/${level.id}/schemes`
    }
  };
}

function getResourceTerm(resource: { term?: SchemeTerm | null }): SchemeTerm {
  return resource.term ?? "term-1";
}

export default async function LevelSchemesPage({
  params
}: {
  params: Promise<{ levelId: string }>;
}) {
  const { levelId } = await params;
  const pageData = await getLevelPageData(levelId);

  if (!pageData) {
    notFound();
  }

  const { level, resources, user, dataUnavailable } = pageData;
  const schemes = resources.filter((resource) => resource.category === "scheme-of-work");
  const termSchemeGroups = schemeTerms
    .map((term) => ({
      term,
      resources: schemes.filter((resource) => getResourceTerm(resource) === term.id)
    }))
    .filter((group) => group.resources.length > 0);

  return (
    <main>
      <SiteHeader />

      <section className="page-shell section">
        <div className="section-head">
          <div>
            <span className="eyebrow">{level.stage}</span>
            <h2>{level.title} schemes of work</h2>
          </div>
          <p>
            Generate a new scheme with the Teacher Bot or choose a ready uploaded scheme for this level.
          </p>
        </div>

        <div className="dashboard-grid">
          <article className="dashboard-card">
            <h3>Generate a scheme</h3>
            <p className="subtle">
              Use the Teacher Bot to create a fresh scheme of work. The first generation is free, then KSh{" "}
              {teacherSchemeGenerationPrice} per generated scheme.
            </p>
            <div className="hero-actions">
              <Link href="/teacher-tools/schemes/new" className="button">
                Open scheme generator
              </Link>
            </div>
          </article>

          <article className="dashboard-card">
            <h3>Get ready schemes</h3>
            <p className="subtle">
              Browse uploaded schemes below and buy the exact ready scheme you need at KSh {schemeOfWorkPrice}.
            </p>
            <div className="hero-actions">
              <a href="#ready-schemes" className="button-secondary">
                Browse ready schemes
              </a>
            </div>
          </article>
        </div>

        {dataUnavailable ? (
          <article className="dashboard-card">
            <h3>Schemes are temporarily unavailable</h3>
            <p className="subtle">We could not load ready schemes right now. Please try again shortly.</p>
          </article>
        ) : null}
      </section>

      <section id="ready-schemes" className="page-shell section">
        <div className="section-head">
          <div>
            <span className="eyebrow">Ready schemes</span>
            <h2>Uploaded schemes by term</h2>
          </div>
        </div>

        {schemes.length > 0 ? (
          <div className="assessment-stack">
            {termSchemeGroups.map(({ term, resources: termSchemes }) => (
              <section key={term.id} className="assessment-block">
                <div className="assessment-head">
                  <span className="eyebrow">{term.label}</span>
                  <h3>{term.label} schemes of work</h3>
                </div>

                <div className="resource-grid">
                  {termSchemes.map((resource) => (
                    <article key={resource.id} className="resource-card">
                      <h3>{resource.title}</h3>
                      <div className="resource-meta">
                        <span>{resource.subject}</span>
                        <span>{getSchemeTermLabel(getResourceTerm(resource))}</span>
                        <span>KSh {schemeOfWorkPrice}</span>
                      </div>
                      <p className="subtle">{resource.description}</p>
                      <div className="hero-actions">
                        {resource.canOpen ? (
                          <Link href={resource.fileUrl} target="_blank" className="button">
                            Open scheme
                          </Link>
                        ) : user?.role === "teacher" ? (
                          <Link href={`/purchases/schemes/${resource.id}`} className="button-secondary button-buy">
                            Buy exact scheme
                          </Link>
                        ) : !user ? (
                          <Link href="/login" className="button-secondary">
                            Sign in as teacher
                          </Link>
                        ) : (
                          <span className="pill">Teacher account required</span>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <article className="resource-card">
            <h3>No ready schemes uploaded yet</h3>
            <p className="subtle">
              There are no uploaded ready schemes for {level.title} yet. You can still generate one with the Teacher Bot.
            </p>
            <div className="hero-actions">
              <Link href="/teacher-tools/schemes/new" className="button">
                Generate a scheme
              </Link>
            </div>
          </article>
        )}
      </section>
    </main>
  );
}
