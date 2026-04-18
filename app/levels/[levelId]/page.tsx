import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { assessmentSets } from "@/lib/assessment-sets";
import { SiteHeader } from "@/components/site-header";
import { schemeOfWorkPrice, teacherMaterialPrice } from "@/lib/business";
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
      title: "Level not found"
    };
  }

  const description = `${level.description} Explore notes, assessments, and teacher resources for ${level.title} at Teacher Mwangi Academy.`;

  return {
    title: `${level.title} materials`,
    description,
    alternates: {
      canonical: `/levels/${level.id}`
    },
    openGraph: {
      title: `${level.title} materials`,
      description,
      url: `/levels/${level.id}`
    }
  };
}

function getResourceYear(resource: { createdAt: string }) {
  const date = new Date(resource.createdAt);

  if (Number.isNaN(date.getTime())) {
    return `${new Date().getFullYear()}`;
  }

  return `${date.getFullYear()}`;
}

function getResourceTerm(resource: { term?: SchemeTerm | null }): SchemeTerm {
  return resource.term ?? "term-1";
}

export default async function LevelPage({
  params
}: {
  params: Promise<{ levelId: string }>;
}) {
  const { levelId } = await params;
  const pageData = await getLevelPageData(levelId);

  if (!pageData) {
    notFound();
  }

  const { level, resources, user, hasLevelAccess, dataUnavailable } = pageData;
  const notes = resources.filter(
    (resource) => resource.category === "revision-material" && (resource.section ?? "notes") === "notes"
  );
  const assessments = resources.filter(
    (resource) => resource.category === "revision-material" && resource.section === "assessment"
  );
  const revisionMaterials = [...notes, ...assessments];
  const materialYears = Array.from(new Set(revisionMaterials.map((resource) => getResourceYear(resource)))).sort(
    (left, right) => right.localeCompare(left)
  );
  const revisionMaterialYearGroups = materialYears.map((year) => ({
    year,
    terms: schemeTerms
      .map((term) => {
        const termNotes = notes.filter(
          (resource) => getResourceYear(resource) === year && getResourceTerm(resource) === term.id
        );
        const setGroups = assessmentSets
          .map((assessmentSet) => ({
            ...assessmentSet,
            resources: assessments.filter(
              (resource) =>
                getResourceYear(resource) === year &&
                getResourceTerm(resource) === term.id &&
                resource.assessmentSet === assessmentSet.id
            )
          }))
          .filter((group) => group.resources.length > 0);
        const totalCount = termNotes.length + setGroups.reduce((sum, group) => sum + group.resources.length, 0);

        return {
          term,
          notes: termNotes,
          setGroups,
          totalCount
        };
      })
      .filter((group) => group.totalCount > 0)
  }));
  const schemes = resources.filter((resource) => resource.category === "scheme-of-work");
  const unassignedSchemes = schemes.filter((resource) => !resource.term);
  const termSchemeGroups = schemeTerms
    .map((term) => ({
      term,
      resources: schemes.filter((resource) => resource.term === term.id)
    }))
    .filter((group) => group.resources.length > 0);
  const renderRevisionResourceLink = (
    resource: (typeof resources)[number],
    label: string
  ) => {
    const linkText = resource.fileName || resource.title;
    const meta = `${resource.subject} - ${label}`;

    if (resource.canOpen) {
      return (
        <li key={resource.id} className="material-link-item">
          <a
            href={resource.fileUrl}
            className="material-file-link"
            download={resource.fileName}
            target="_blank"
            rel="noreferrer"
          >
            <span className="material-file-badge">PDF</span>
            <span>
              <strong>{linkText}</strong>
              <small>{meta}</small>
            </span>
          </a>
        </li>
      );
    }

    if (resource.canPurchase) {
      return (
        <li key={resource.id} className="material-link-item">
          <Link href={`/purchases/materials/${resource.id}`} className="material-file-link material-file-link--locked">
            <span className="material-file-badge material-file-badge--buy">BUY</span>
            <span>
              <strong>{linkText}</strong>
              <small>{meta} - KSh {teacherMaterialPrice}</small>
            </span>
          </Link>
        </li>
      );
    }

    return (
      <li key={resource.id} className="material-link-item">
        <Link href={user ? "/subscribe" : "/login"} className="material-file-link material-file-link--locked">
          <span className="material-file-badge material-file-badge--lock">LOCK</span>
          <span>
            <strong>{linkText}</strong>
            <small>{user ? "Subscribe to unlock download" : "Sign in to unlock download"}</small>
          </span>
        </Link>
      </li>
    );
  };

  return (
    <main>
      <SiteHeader />

      <section className="page-shell section">
        <div className="section-head">
          <div>
            <span className="eyebrow">{level.stage}</span>
            <h2>{level.title} materials</h2>
          </div>
          <p>
            {level.description} Click into the resources below to access files that match this level.
          </p>
        </div>

        {dataUnavailable ? (
          <article className="dashboard-card">
            <h3>Materials are temporarily unavailable</h3>
            <p className="subtle">
              We could not load the files for this level right now. Please try again shortly.
            </p>
          </article>
        ) : null}

        <div className="dashboard-grid">
          <article className="dashboard-card">
            <h3>Subjects covered</h3>
            <div className="tag-row">
              {level.subjects.map((subject) => (
                <span key={subject} className="tag">
                  {subject}
                </span>
              ))}
            </div>
          </article>

          <article className="dashboard-card">
            <h3>Access status</h3>
            {!user ? (
              <p className="subtle">
                Sign in to unlock files for this level.
              </p>
            ) : user.role === "admin" ? (
              <p className="subtle">Admin account: full access to all uploaded files.</p>
            ) : hasLevelAccess ? (
              <p className="subtle">Your account currently has access to this level's revision materials.</p>
            ) : user.role === "teacher" ? (
              <p className="subtle">
                Teachers can unlock all revision materials with a monthly subscription or buy
                specific notes and assessments one time.
              </p>
            ) : user.role === "parent" ? (
              <p className="subtle">
                Parents can unlock all revision materials with a monthly subscription or buy
                specific notes one time.
              </p>
            ) : (
              <p className="subtle">
                Your current account does not yet have access to this level. Start or update a
                matching subscription to unlock downloads.
              </p>
            )}
            <div className="hero-actions">
              {!user ? (
                <Link href="/login" className="button">
                  Sign in
                </Link>
              ) : (
                <Link href="/subscribe" className="button">
                  Manage subscription
                </Link>
              )}
            </div>
          </article>
        </div>
      </section>

      <section className="page-shell section">
        <div className="section-head">
          <div>
            <span className="eyebrow">Learning materials</span>
            <h2>{level.title} materials by year and term.</h2>
          </div>
          <p>
            Materials are grouped to keep the page simple. Older uploads without a selected term
            automatically appear under Term 1.
          </p>
        </div>

        {revisionMaterialYearGroups.length > 0 ? (
          <div className="material-browser">
            {revisionMaterialYearGroups.map((yearGroup) => (
              <article key={yearGroup.year} className="dashboard-card material-browser-year">
                <div className="material-browser-year-head">
                  <div>
                    <span className="eyebrow">School year</span>
                    <h3>{yearGroup.year}</h3>
                  </div>
                  <div className="tag-row">
                    {yearGroup.terms.map((group) => (
                      <span key={group.term.id} className="tag">
                        {group.term.label}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="material-browser-terms">
                  {yearGroup.terms.map((group, groupIndex) => (
                    <details key={group.term.id} className="material-browser-term" open={groupIndex === 0}>
                      <summary>
                        <span>
                          {yearGroup.year} {group.term.label}
                        </span>
                        <strong>{group.totalCount} item{group.totalCount === 1 ? "" : "s"}</strong>
                      </summary>

                      <div className="material-browser-groups">
                        {group.notes.length > 0 ? (
                          <section className="material-browser-group">
                            <div className="material-browser-group-head">
                              <h4>Notes</h4>
                              <span className="pill">{group.notes.length}</span>
                            </div>
                            <ul className="material-link-list">
                              {group.notes.map((resource) => renderRevisionResourceLink(resource, "Notes"))}
                            </ul>
                          </section>
                        ) : null}

                        {group.setGroups.map((assessmentSet) => (
                          <section key={assessmentSet.id} className="material-browser-group">
                            <div className="material-browser-group-head">
                              <h4>{assessmentSet.label}</h4>
                              <span className="pill">{assessmentSet.resources.length}</span>
                            </div>
                            <ul className="material-link-list">
                              {assessmentSet.resources.map((resource) =>
                                renderRevisionResourceLink(resource, assessmentSet.label)
                              )}
                            </ul>
                          </section>
                        ))}
                      </div>
                    </details>
                  ))}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <article className="resource-card">
            <h3>No revision materials uploaded yet</h3>
            <p className="subtle">
              There are no uploaded notes or assessments for {level.title} yet.
            </p>
          </article>
        )}
      </section>

      <section className="page-shell section">
        <div className="section-head">
          <div>
            <span className="eyebrow">Teacher resources</span>
            <h2>{level.title} schemes of work</h2>
          </div>
          <p>Teacher schemes for this level only show terms that already have uploaded scheme files.</p>
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
                            <span>KSh {schemeOfWorkPrice} one-time</span>
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

            {unassignedSchemes.length > 0 ? (
              <section className="assessment-block">
                <div className="assessment-head">
                  <span className="eyebrow">Older uploads</span>
                  <h3>Schemes still missing a term</h3>
                </div>

                <div className="resource-grid">
                  {unassignedSchemes.map((resource) => (
                    <article key={resource.id} className="resource-card">
                      <h3>{resource.title}</h3>
                      <div className="resource-meta">
                        <span>{resource.subject}</span>
                        <span>{getSchemeTermLabel(resource.term)}</span>
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
            ) : null}
          </div>
        ) : (
          <div className="resource-grid">
            <article className="resource-card">
              <h3>No schemes uploaded yet</h3>
              <p className="subtle">There are no teacher schemes uploaded for {level.title} yet.</p>
            </article>
          </div>
        )}
      </section>
    </main>
  );
}
