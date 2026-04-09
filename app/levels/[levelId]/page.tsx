import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { schemeOfWorkPrice, teacherMaterialPrice } from "@/lib/business";
import { getLevelById } from "@/lib/levels";
import { getLevelPageData } from "@/lib/resource-access";
import { getSchemeTermLabel, schemeTerms } from "@/lib/scheme-terms";

const assessmentSets = [
  { id: "set-1", label: "Set 1" },
  { id: "set-2", label: "Set 2" },
  { id: "set-3", label: "Set 3" }
] as const;

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
  const schemes = resources.filter((resource) => resource.category === "scheme-of-work");
  const unassignedSchemes = schemes.filter((resource) => !resource.term);
  const termSchemeGroups = schemeTerms
    .map((term) => ({
      term,
      resources: schemes.filter((resource) => resource.term === term.id)
    }))
    .filter((group) => group.resources.length > 0);

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
            <span className="eyebrow">Notes</span>
            <h2>{level.title} notes</h2>
          </div>
          <p>Topic notes, study support, and learning guides for this level.</p>
        </div>

        <div className="resource-grid">
          {notes.length > 0 ? (
            notes.map((resource) => (
              <article key={resource.id} className="resource-card">
                <h3>{resource.title}</h3>
                <div className="resource-meta">
                  <span>{resource.subject}</span>
                  <span>
                    {user?.role === "teacher" && !resource.canOpen && resource.canPurchase
                      ? `KSh ${teacherMaterialPrice} one-time`
                      : "Notes"}
                  </span>
                </div>
                <p className="subtle">{resource.description}</p>
                <div className="hero-actions">
                  {resource.canOpen ? (
                    <Link href={resource.fileUrl} target="_blank" className="button">
                      Open material
                    </Link>
                  ) : user?.role === "teacher" && resource.canPurchase ? (
                    <Link href={`/subscribe?resourceId=${resource.id}`} className="button-secondary button-buy">
                      Buy for KSh {teacherMaterialPrice}
                    </Link>
                  ) : (
                    <span className="pill">Login and active access required</span>
                  )}
                </div>
              </article>
            ))
          ) : (
            <article className="resource-card">
              <h3>No notes uploaded yet</h3>
              <p className="subtle">
                There are no uploaded notes for {level.title} yet.
              </p>
            </article>
          )}
        </div>
      </section>

      <section className="page-shell section">
        <div className="section-head">
          <div>
            <span className="eyebrow">Assessment</span>
            <h2>{level.title} assessments</h2>
          </div>
          <p>Assessments are grouped into Set 1, Set 2, and Set 3 for easier navigation.</p>
        </div>

        <div className="assessment-stack">
          {assessmentSets.map((assessmentSet) => {
            const setResources = assessments.filter(
              (resource) => resource.assessmentSet === assessmentSet.id
            );

            return (
              <section key={assessmentSet.id} className="assessment-block">
                <div className="assessment-head">
                  <span className="eyebrow">{assessmentSet.label}</span>
                  <h3>{assessmentSet.label} assessments</h3>
                </div>

                <div className="resource-grid">
                  {setResources.length > 0 ? (
                    setResources.map((resource) => (
                      <article key={resource.id} className="resource-card">
                        <h3>{resource.title}</h3>
                        <div className="resource-meta">
                          <span>{resource.subject}</span>
                          <span>
                            {user?.role === "teacher" && !resource.canOpen && resource.canPurchase
                              ? `KSh ${teacherMaterialPrice} one-time`
                              : assessmentSet.label}
                          </span>
                        </div>
                        <p className="subtle">{resource.description}</p>
                        <div className="hero-actions">
                          {resource.canOpen ? (
                            <Link href={resource.fileUrl} target="_blank" className="button">
                              Open assessment
                            </Link>
                          ) : user?.role === "teacher" && resource.canPurchase ? (
                            <Link href={`/subscribe?resourceId=${resource.id}`} className="button-secondary button-buy">
                              Buy for KSh {teacherMaterialPrice}
                            </Link>
                          ) : (
                            <span className="pill">Login and active access required</span>
                          )}
                        </div>
                      </article>
                    ))
                  ) : (
                    <article className="resource-card">
                      <h3>No {assessmentSet.label.toLowerCase()} uploaded yet</h3>
                      <p className="subtle">
                        There are no {assessmentSet.label.toLowerCase()} assessments uploaded for{" "}
                        {level.title} yet.
                      </p>
                    </article>
                  )}
                </div>
              </section>
            );
          })}
        </div>
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
                              <Link href={`/subscribe?schemeId=${resource.id}`} className="button-secondary button-buy">
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
                          <Link href={`/subscribe?schemeId=${resource.id}`} className="button-secondary button-buy">
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
