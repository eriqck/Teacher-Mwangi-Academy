import Link from "next/link";
import Image from "next/image";
import { access } from "fs/promises";
import path from "path";
import { SiteHeader } from "@/components/site-header";
import { academyName, schemeOfWorkPrice } from "@/lib/business";
import { featuredResources, levels, membershipPlans } from "@/lib/catalog";

const reasons = [
  {
    title: "Competency-Focused Learning",
    description:
      "We do not just teach for exams. Every lesson is designed to build real understanding, practical application, and confident mastery aligned to the CBC framework."
  },
  {
    title: "Personalized Student Support",
    description:
      "Every learner is unique. We provide tailored guidance, regular feedback, and close mentorship so students can strengthen their abilities and overcome academic gaps."
  },
  {
    title: "Proven Results and Holistic Growth",
    description:
      "Our approach blends theory, practical learning, revision strategy, and exam preparation while also nurturing discipline, critical thinking, and character."
  }
];

export default async function HomePage() {
  const founderImagePath = "/teacher-mwangi-profile.png";
  const founderImageAvailable = await access(
    path.join(process.cwd(), "public", "teacher-mwangi-profile.png")
  )
    .then(() => true)
    .catch(() => false);

  return (
    <main>
      <SiteHeader />

      <section className="page-shell hero">
        <div className="hero-grid">
          <div className="hero-card">
            <span className="eyebrow">Access all essential CBE learning materials in one convenient place</span>
            <h1>Guiding students to competence and confidence.</h1>
            <p>
              {academyName} brings together structured revision materials, trusted teacher guidance,
              and a focused learning environment for students, parents, and teachers across Grades
              7, 8, 9, 10, Form 3, and Form 4.
            </p>
            <div className="hero-actions">
              <Link href="/subscribe" className="button">
                Explore membership
              </Link>
              <Link href="#about" className="button-secondary">
                About Teacher Mwangi
              </Link>
            </div>
          </div>

          <div className="hero-side">
            <div className="panel founder-panel">
              <div className="founder-portrait">
                {founderImageAvailable ? (
                  <Image
                    src={founderImagePath}
                    alt="Teacher Mwangi portrait"
                    fill
                    sizes="220px"
                    className="portrait-image founder-image"
                  />
                ) : (
                  <span className="portrait-fallback">TM</span>
                )}
              </div>
              <span className="eyebrow">Founder spotlight</span>
              <h3>James Mwangi</h3>
              <p className="subtle">
                Physics and Mathematics teacher passionate about shaping minds and redefining
                learning through innovative teaching and accessible resources.
              </p>
              <div className="stat-grid">
                <div className="stat">
                  <strong>Physics</strong>
                  <span>Clear explanations and practical understanding</span>
                </div>
                <div className="stat">
                  <strong>Maths</strong>
                  <span>Confidence-building support and strong revision habits</span>
                </div>
              </div>
            </div>

            <div className="panel">
              <h3>Built for homes and classrooms</h3>
              <p className="subtle">
                Parents access guided learning support and revision materials in one place. Teachers
                subscribe for broad curriculum support and can also buy schemes of work at KSh{" "}
                {schemeOfWorkPrice} per subject.
              </p>
              <div className="tag-row">
                <span className="tag">Competency-focused</span>
                <span className="tag">Student support</span>
                <span className="tag">Teacher resources</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="page-shell section" id="about">
        <div className="section-head">
          <div>
            <span className="eyebrow">About me</span>
            <h2>Teaching with clarity, care, and competence.</h2>
          </div>
          <p>
            Home / About Me
          </p>
        </div>

        <div className="about-grid">
          <article className="feature-card about-card">
            <span className="eyebrow">Guiding students to competence and confidence</span>
            <h3>Teacher Mwangi supports students, parents, and teachers with practical academic direction.</h3>
            <p className="subtle">
              Tr Mwangi is a Physics and Mathematics teacher passionate about shaping minds and
              redefining learning. Through innovative teaching and accessible resources, he supports
              students, parents, and teachers in achieving academic excellence.
            </p>
            <p className="subtle">
              This academy is built around understanding, confidence, and everyday progress. The aim
              is not only to help learners pass, but to help them truly grow in skill, discipline,
              and self-belief.
            </p>
          </article>

          <aside className="about-aside">
            <div className="quote-card">
              <span className="eyebrow">Teaching philosophy</span>
              <p>
                “We do not just prepare learners for assessments. We prepare them to think clearly,
                apply knowledge confidently, and grow with purpose.”
              </p>
            </div>
            <div className="mini-profile">
              <strong>Focus areas</strong>
              <div className="tag-row">
                <span className="tag">CBC alignment</span>
                <span className="tag">Physics</span>
                <span className="tag">Mathematics</span>
                <span className="tag">Revision support</span>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="page-shell section">
        <div className="section-head">
          <div>
            <span className="eyebrow">Why Teacher Mwangi?</span>
            <h2>Focused support for real growth, not just exam performance.</h2>
          </div>
          <p>
            The academy is built to help learners master concepts, improve steadily, and feel more
            confident in every stage of their learning journey.
          </p>
        </div>

        <div className="feature-grid">
          {reasons.map((reason) => (
            <article key={reason.title} className="feature-card reason-card">
              <h3>{reason.title}</h3>
              <p className="subtle">{reason.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="page-shell section" id="levels">
        <div className="section-head">
          <div>
            <span className="eyebrow">Coverage</span>
            <h2>Essential learning materials organised by grade and form.</h2>
          </div>
          <p>
            Learners and teachers can move directly into the right level and access the materials
            designed for that stage.
          </p>
        </div>

        <div className="class-grid">
          {levels.map((level) => (
            <Link key={level.id} href={`/levels/${level.id}`} className="card-link">
              <article className="class-card" data-level={level.id}>
              <p className="eyebrow">{level.stage}</p>
              <h3>{level.title}</h3>
              <p className="subtle">{level.description}</p>
              <div className="tag-row">
                {level.subjects.map((subject) => (
                  <span key={subject} className="tag">
                    {subject}
                  </span>
                ))}
              </div>
              </article>
            </Link>
          ))}
        </div>
      </section>

      <section className="page-shell section" id="membership">
        <div className="section-head">
          <div>
            <span className="eyebrow">Pricing</span>
            <h2>Simple access plans for families and teachers.</h2>
          </div>
          <p>
            Choose a monthly subscription or add one-time professional teaching resources when
            needed.
          </p>
        </div>

        <div className="pricing-grid">
          {membershipPlans.map((plan) => (
            <article
              key={plan.name}
              className="pricing-card"
              data-audience={plan.name.toLowerCase().includes("parent") ? "parent" : "teacher"}
            >
              <h3>{plan.name}</h3>
              <p className="subtle">{plan.audience}</p>
              <p className="price">
                {plan.price}
                <small>{plan.cadence}</small>
              </p>
              <Link href="/subscribe" className="button">
                Choose {plan.name}
              </Link>
              <ul className="list">
                {plan.highlights.map((highlight) => (
                  <li key={highlight}>{highlight}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
        <article className="dashboard-card" style={{ marginTop: 18 }}>
          <h3>Teacher one-time purchase</h3>
          <p className="subtle">
            Schemes of work are sold separately at KSh {schemeOfWorkPrice} per scheme per subject.
          </p>
        </article>
      </section>

      <section className="page-shell section" id="library">
        <div className="section-head">
          <div>
            <span className="eyebrow">Featured library</span>
            <h2>A closer look at the learning resources inside.</h2>
          </div>
          <p>
            Preview the kinds of packs, guides, and revision support available inside the academy.
          </p>
        </div>

        <div className="resource-grid">
          {featuredResources.map((resource) => (
            <Link
              key={resource.title}
              href={`/levels/${levels.find((level) => level.title === resource.level)?.id ?? "grade-7"}`}
              className="card-link"
            >
              <article className="resource-card">
              <h3>{resource.title}</h3>
              <div className="resource-meta">
                <span>{resource.level}</span>
                <span>{resource.type}</span>
              </div>
              <p className="subtle">{resource.access}</p>
              </article>
            </Link>
          ))}
        </div>
      </section>

      <section className="page-shell section" id="team">
        <div className="section-head">
          <div>
            <span className="eyebrow">Our team</span>
            <h2>Leadership grounded in subject mastery and learner support.</h2>
          </div>
          <p>
            The academy is led by an educator committed to excellence in teaching, mentorship, and
            meaningful student progress.
          </p>
        </div>

        <div className="team-grid">
          <article className="team-card">
            <div className="team-portrait">
              {founderImageAvailable ? (
                <Image
                  src={founderImagePath}
                  alt="James Mwangi portrait"
                  fill
                  sizes="120px"
                  className="portrait-image team-image"
                />
              ) : (
                <span className="portrait-fallback">JM</span>
              )}
            </div>
            <div>
              <h3>James Mwangi</h3>
              <p className="team-role">Founder & Leader</p>
              <p className="subtle">
                James Mwangi is a Physics and Mathematics teacher passionate about shaping minds and
                redefining learning. Through innovative teaching and accessible resources, he
                supports students, parents, and teachers in achieving academic excellence.
              </p>
            </div>
          </article>
        </div>
      </section>

      <section className="page-shell cta">
        <div className="cta-box">
          <span className="eyebrow">Ready to learn with confidence</span>
          <h2>Access essential CBE learning materials in one trusted, guided academy.</h2>
          <p>
            Join the academy, choose the right level, and start learning with materials designed to
            build understanding, confidence, and measurable progress.
          </p>
          <div className="hero-actions">
            <Link href="/subscribe" className="button">
              Start subscription
            </Link>
            <Link href="/levels/grade-7" className="button-secondary">
              Browse materials
            </Link>
          </div>
        </div>
      </section>

      <footer className="page-shell footer">
        {academyName} supports learners, parents, and teachers with focused CBC-aligned materials,
        mentorship, and purposeful academic growth.
      </footer>
    </main>
  );
}
