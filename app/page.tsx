import Link from "next/link";
import Image from "next/image";
import { access } from "fs/promises";
import path from "path";
import { SiteUpdatesFeed } from "@/components/site-updates-feed";
import { getCurrentUser } from "@/lib/auth";
import { academyName } from "@/lib/business";
import { levels, membershipPlans } from "@/lib/catalog";
import { getLatestSiteUpdates } from "@/lib/site-updates";

const heroCards = [
  { icon: "📘", title: "Schemes", text: "Term-ready plans", href: "/levels/grade-6/schemes" },
  { icon: "✅", title: "Assessments", text: "Quick practice", href: "/levels/grade-6" },
  { icon: "🎓", title: "Revision", text: "Guided learning", href: "/levels/grade-6" },
  { icon: "👩🏾‍🏫", title: "Teachers", text: "Classroom support", href: "/teacher-tools" }
];

function shortenSubject(subject: string) {
  const replacements: Record<string, string> = {
    Mathematics: "Math",
    "Core Mathematics": "Core Math",
    "Integrated Science": "Science",
    "Creative Arts and Sports": "Creative",
    "Pre-Technical Studies": "Pre-Tech",
    "History & Citizenship": "History",
    "Business Studies": "Business",
    "Agriculture & Nutrition": "Agriculture",
    "Religious Education": "Religion"
  };

  return replacements[subject] ?? subject;
}

export default async function HomePage() {
  const user = await getCurrentUser();
  const latestUpdates = getLatestSiteUpdates(3);
  const founderImagePath = "/teacher-mwangi-profile.png";
  const founderImageAvailable = await access(
    path.join(process.cwd(), "public", "teacher-mwangi-profile.png")
  )
    .then(() => true)
    .catch(() => false);

  const navLinks = [
    { href: "#levels", label: "Levels" },
    { href: "#plans", label: "Plans" },
    { href: "#updates", label: "Updates" },
    { href: "#results", label: "Results" },
    ...(user?.role === "admin" ? [{ href: "/admin", label: "Admin" }] : [])
  ];

  const parentPlan =
    membershipPlans.find((plan) => plan.name === "Parent Subscription") ?? membershipPlans[0];
  const teacherPlan =
    membershipPlans.find((plan) => plan.name === "Teacher Subscription") ?? membershipPlans[1];

  return (
    <main className="home-landing">
      <section className="page-shell home-nav-wrap">
        <nav className="home-nav" aria-label="Primary">
          <Link href="/" className="home-brand">
            <span className="home-brand-mark">TM</span>
            <span className="home-brand-copy">
              <span className="home-brand-title">{academyName}</span>
            </span>
          </Link>

          <div className="home-nav-links">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className="home-nav-link">
                {link.label}
              </Link>
            ))}
          </div>

          <div className="home-nav-actions">
            {user ? (
              <>
                <Link href="/dashboard" className="home-nav-secondary">
                  Dashboard
                </Link>
                <form action="/api/auth/logout" method="post">
                  <button type="submit" className="home-nav-primary home-button-reset">
                    Log out
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link href="/login" className="home-nav-secondary">
                  Sign in
                </Link>
                <Link href="/subscribe" className="home-nav-primary">
                  Start subscription
                </Link>
              </>
            )}
          </div>
        </nav>
      </section>

      <section className="page-shell home-hero-grid">
        <article className="home-hero-card">
          <div className="home-hero-glow" aria-hidden="true" />
          <div className="home-hero-content">
            <h1 className="home-title">Clear revision. Better results.</h1>

            <div className="home-hero-actions">
              <Link href="#levels" className="home-hero-primary">
                Explore materials
              </Link>
              <Link href="#plans" className="home-hero-secondary">
                View plans
              </Link>
            </div>

            <div className="home-feature-grid">
              {heroCards.map((card) => (
                <Link key={card.title} href={card.href} className="home-feature-card">
                  <span className="home-feature-icon" aria-hidden="true">
                    {card.icon}
                  </span>
                  <h2 className="home-feature-title">{card.title}</h2>
                  <p className="home-feature-text">{card.text}</p>
                </Link>
              ))}
            </div>
          </div>
        </article>

        <aside className="home-side-stack">
          <article className="home-founder-card">
            <div className="home-founder-head">
              <div className="home-founder-portrait">
                {founderImageAvailable ? (
                  <Image
                    src={founderImagePath}
                    alt="Teacher Mwangi portrait"
                    fill
                    sizes="112px"
                    className="home-founder-image"
                  />
                ) : (
                  <span className="home-founder-fallback">TM</span>
                )}
              </div>

              <div className="home-founder-copy">
                <h2 className="home-founder-name">James Mwangi</h2>
              </div>
            </div>
          </article>
        </aside>
      </section>

      <section className="page-shell home-section" id="levels">
        <div className="home-section-head">
          <div>
            <span className="home-section-kicker">Levels</span>
            <h2 className="home-section-title">Choose class. Start revision.</h2>
          </div>
        </div>

        <div className="home-level-grid">
          {levels.map((level) => (
            <Link key={level.id} href={`/levels/${level.id}`} className="home-level-link">
              <article className="home-level-card" data-level={level.id}>
                <span className="home-level-stage">{level.stage}</span>
                <h3 className="home-level-title">{level.title}</h3>

                <div className="home-tag-row">
                  {(level.cardTags ?? level.subjects).slice(0, 6).map((subject) => (
                    <span key={subject} className="home-tag">
                      {shortenSubject(subject)}
                    </span>
                  ))}
                </div>

                <div className="home-level-actions">
                  <span className="home-level-button">See more</span>
                </div>
              </article>
            </Link>
          ))}
        </div>
      </section>

      <section className="page-shell home-section" id="plans">
        <div className="home-section-head">
          <div>
            <span className="home-section-kicker">Plans</span>
            <h2 className="home-section-title">Simple pricing.</h2>
          </div>
        </div>

        <div className="home-pricing-grid">
          <article className="home-pricing-card home-pricing-card--parent">
            <span className="home-pricing-badge">Popular</span>
            <p className="home-pricing-name">{parentPlan.name.replace(" Subscription", "")}</p>
            <h3 className="home-pricing-price">
              {parentPlan.price}
              <span className="home-pricing-cadence">per month</span>
            </h3>
            <ul className="home-pricing-list">
              <li>All levels access</li>
              <li>Revision downloads</li>
              <li>Parent support</li>
            </ul>
            <Link href="/subscribe" className="home-pricing-button">
              Choose plan
            </Link>
          </article>

          <article className="home-pricing-card home-pricing-card--teacher">
            <p className="home-pricing-name">{teacherPlan.name.replace(" Subscription", "")}</p>
            <h3 className="home-pricing-price">
              {teacherPlan.price}
              <span className="home-pricing-cadence">per month</span>
            </h3>
            <ul className="home-pricing-list">
              <li>Schemes</li>
              <li>Lesson plans</li>
              <li>Assessments</li>
              <li>Revision packs</li>
            </ul>
            <Link href="/subscribe" className="home-pricing-button">
              Get started
            </Link>
          </article>
        </div>
      </section>

      <section className="page-shell home-section home-updates-section" id="updates">
        <div className="home-section-head">
          <div>
            <span className="home-section-kicker">Updates</span>
            <h2 className="home-section-title">Latest updates.</h2>
          </div>
        </div>

        <SiteUpdatesFeed updates={latestUpdates} compact />
      </section>

      <section className="page-shell home-cta" id="results">
        <div className="home-cta-inner">
          <div>
            <h2 className="home-cta-title">Start revision now.</h2>
          </div>

          <div className="home-cta-actions">
            <Link href="/subscribe" className="home-cta-primary">
              Start membership
            </Link>
            <Link href="/levels/grade-6" className="home-cta-secondary">
              Browse materials
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
