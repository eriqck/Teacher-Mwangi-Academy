import Link from "next/link";
import Image from "next/image";
import { access } from "fs/promises";
import path from "path";
import { getCurrentUser } from "@/lib/auth";
import { academyName, schemeOfWorkPrice, teacherMaterialPrice } from "@/lib/business";
import { levels, membershipPlans } from "@/lib/catalog";

const testimonials = [
  {
    quote:
      "My son became far more consistent in Mathematics after using the weekly revision packs. The structure made a huge difference.",
    author: "Parent, Nairobi"
  },
  {
    quote:
      "The materials save me preparation time and help my learners revise with more confidence.",
    author: "Teacher, Kiambu"
  },
  {
    quote:
      "This feels more guided than random notes online. It gives both parents and students a clear path.",
    author: "Parent, Thika"
  }
];

const metrics = [
  { value: "1,200+", label: "Learners supported" },
  { value: "6", label: "Levels covered" },
  { value: "Weekly", label: "Fresh revision support" },
  { value: "KSh 150", label: "Starting subscription" }
];

const painPoints = [
  "CBE revision can feel confusing and scattered.",
  "Parents often lack time to guide study consistently.",
  "Students revise hard but still underperform without structure.",
  "Teachers need ready-made quality resources they can trust."
];

const solutions = [
  "Structured learning paths by class level and subject.",
  "Downloadable packs with practical revision guidance.",
  "Clear assessments, topical drills, and model answers.",
  "One trusted place for both home and classroom support."
];

export default async function HomePage() {
  const user = await getCurrentUser();
  const founderImagePath = "/teacher-mwangi-profile.png";
  const founderImageAvailable = await access(
    path.join(process.cwd(), "public", "teacher-mwangi-profile.png")
  )
    .then(() => true)
    .catch(() => false);

  const navLinks = [
    { href: "#why", label: "Why us" },
    { href: "#levels", label: "Levels" },
    { href: "#pricing", label: "Pricing" },
    { href: "#testimonials", label: "Results" },
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
              <span className="home-brand-subtitle">CBE learning support for families and teachers</span>
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
            <span className="home-kicker">Trusted CBE revision platform</span>
            <h1 className="home-title">Help your child move from confusion to confidence.</h1>
            <p className="home-copy">
              Structured revision materials, teacher guidance, and classroom-ready resources designed
              for Grade 7, Grade 8, Grade 9, Grade 10, Form 3, and Form 4.
            </p>

            <div className="home-pill-row">
              <span className="home-pill">Weekly guided revision</span>
              <span className="home-pill">Parents and teachers supported</span>
              <span className="home-pill">Simple, local, practical</span>
            </div>

            <div className="home-hero-actions">
              <Link href="/subscribe" className="home-hero-primary">
                Explore membership
              </Link>
              <Link href="#levels" className="home-hero-secondary">
                Browse materials
              </Link>
            </div>

            <div className="home-metric-grid">
              {metrics.map((item) => (
                <div key={item.label} className="home-metric-card">
                  <strong className="home-metric-value">{item.value}</strong>
                  <span className="home-metric-label">{item.label}</span>
                </div>
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
                <span className="home-kicker home-kicker--soft">Founder spotlight</span>
                <h2 className="home-founder-name">James Mwangi</h2>
                <p className="home-founder-text">
                  Physics and Mathematics teacher focused on helping learners understand concepts
                  clearly and improve steadily.
                </p>
              </div>
            </div>
          </article>

          <article className="home-dark-card">
            <span className="home-dark-kicker">Why parents join</span>
            <h2 className="home-dark-title">A guided system, not random notes.</h2>
            <ul className="home-dark-list">
              <li>Easy-to-follow revision paths</li>
              <li>Better home support without overwhelm</li>
              <li>Trusted materials organised by level</li>
              <li>Practical support for both learners and teachers</li>
            </ul>
            <Link href="#pricing" className="home-dark-link">
              See how it works
            </Link>
          </article>
        </aside>
      </section>

      <section className="page-shell home-problem-grid" id="why">
        <article className="home-problem-card">
          <span className="home-section-kicker">The problem</span>
          <h2 className="home-section-title">Families do not need more content. They need clarity.</h2>
          <div className="home-chip-list">
            {painPoints.map((item) => (
              <div key={item} className="home-chip-card home-chip-card--problem">
                {item}
              </div>
            ))}
          </div>
        </article>

        <article className="home-problem-card home-problem-card--solution">
          <span className="home-section-kicker home-section-kicker--emerald">Our solution</span>
          <h2 className="home-section-title">
            Everything needed to revise with direction and confidence.
          </h2>
          <div className="home-chip-list">
            {solutions.map((item) => (
              <div key={item} className="home-chip-card home-chip-card--solution">
                {item}
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="page-shell home-section" id="levels">
        <div className="home-section-head">
          <div>
            <span className="home-section-kicker">Coverage</span>
            <h2 className="home-section-title">Find the right materials by grade and level.</h2>
          </div>
          <p className="home-section-copy">
            Simple navigation makes it easy for parents, learners, and teachers to go straight to
            the right support materials.
          </p>
        </div>

        <div className="home-level-grid">
          {levels.map((level) => (
            <Link key={level.id} href={`/levels/${level.id}`} className="home-level-link">
              <article className="home-level-card" data-level={level.id}>
                <span className="home-level-stage">{level.stage}</span>
                <h3 className="home-level-title">{level.title}</h3>
                <p className="home-level-description">{level.description}</p>

                <div className="home-tag-row">
                  {(level.cardTags ?? level.subjects).slice(0, 6).map((subject) => (
                    <span key={subject} className="home-tag">
                      {subject}
                    </span>
                  ))}
                </div>
                <div className="home-level-actions">
                  <span className="home-level-more">See more...</span>
                  <span className="home-level-button">View materials</span>
                </div>
              </article>
            </Link>
          ))}
        </div>
      </section>

      <section className="page-shell home-section" id="pricing">
        <div className="home-section-head">
          <div>
            <span className="home-section-kicker">Pricing</span>
            <h2 className="home-section-title">Simple plans for parents and teachers.</h2>
          </div>
          <p className="home-section-copy">
            Keep the decision easy: one affordable monthly plan for consistent support, plus
            one-time purchases when needed.
          </p>
        </div>

        <div className="home-pricing-grid">
          <article className="home-pricing-card home-pricing-card--parent">
            <span className="home-pricing-badge">Most popular</span>
            <p className="home-pricing-name">{parentPlan.name}</p>
            <h3 className="home-pricing-price">
              {parentPlan.price}
              <span className="home-pricing-cadence">{parentPlan.cadence}</span>
            </h3>
            <p className="home-pricing-copy">
              That is about KSh 10 a day for guided revision support.
            </p>
            <ul className="home-pricing-list">
              {parentPlan.highlights.map((highlight) => (
                <li key={highlight}>{highlight}</li>
              ))}
            </ul>
            <Link href="/subscribe" className="home-pricing-button">
              Choose parent plan
            </Link>
          </article>

          <article className="home-pricing-card home-pricing-card--teacher">
            <p className="home-pricing-name">{teacherPlan.name}</p>
            <h3 className="home-pricing-price">
              {teacherPlan.price}
              <span className="home-pricing-cadence">{teacherPlan.cadence}</span>
            </h3>
            <p className="home-pricing-copy">
              Affordable professional support for teachers and tutors.
            </p>
            <ul className="home-pricing-list">
              {teacherPlan.highlights.map((highlight) => (
                <li key={highlight}>{highlight}</li>
              ))}
            </ul>
            <Link href="/subscribe" className="home-pricing-button">
              Choose teacher plan
            </Link>
          </article>
        </div>

        <article className="home-one-time-card">
          <div>
            <h3>One-time resource purchases</h3>
            <p className="home-one-time-copy">
              Schemes of work can be bought separately at KSh {schemeOfWorkPrice} each, while notes
              and assessments are available to teachers at KSh {teacherMaterialPrice} per material.
            </p>
          </div>
          <Link href="/subscribe" className="home-one-time-button">
            Browse one-time resources
          </Link>
        </article>
      </section>

      <section className="page-shell home-section" id="testimonials">
        <div className="home-section-head">
          <div>
            <span className="home-section-kicker">Community feedback</span>
            <h2 className="home-section-title">What parents and teachers are saying.</h2>
          </div>
          <p className="home-section-copy">
            Honest feedback from homes and classrooms shows how the academy is supporting clearer
            revision, stronger routines, and more confident learning.
          </p>
        </div>

        <div className="home-testimonial-grid">
          {testimonials.map((item) => (
            <article key={item.author} className="home-testimonial-card">
              <div className="home-stars" aria-hidden="true">
                {"\u2605\u2605\u2605\u2605\u2605"}
              </div>
              <p>"{item.quote}"</p>
              <strong>{item.author}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="page-shell home-cta">
        <div className="home-cta-inner">
          <div>
            <span className="home-cta-tag">Ready to learn with confidence</span>
            <h2 className="home-cta-title">
              Give learners one trusted place for structured CBE revision.
            </h2>
            <p className="home-cta-copy">
              Join {academyName} and help students revise with more clarity, more consistency, and
              less confusion.
            </p>
          </div>

          <div className="home-cta-actions">
            <Link href="/subscribe" className="home-cta-primary">
              Start subscription
            </Link>
            <Link href="/levels/grade-7" className="home-cta-secondary">
              Browse materials
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
