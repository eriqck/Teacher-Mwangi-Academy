import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { academyName, schemeOfWorkPrice } from "@/lib/business";
import { featuredResources, levels, membershipPlans } from "@/lib/catalog";

export default async function HomePage() {
  return (
    <main>
      <SiteHeader />

      <section className="page-shell hero">
        <div className="hero-grid">
          <div className="hero-card">
            <span className="eyebrow">Built for Kenyan families and teachers</span>
            <h1>{academyName} makes revision materials easy to sell and access.</h1>
            <p>
              A fast membership website for CBC and secondary revision content, with Paystack
              checkout, member login, saved payment records, and dedicated coverage for Grades 7,
              8, 9, 10, Form 3, and Form 4.
            </p>
            <div className="hero-actions">
              <Link href="/subscribe" className="button">
                Start with M-Pesa
              </Link>
              <Link href="/signup" className="button-secondary">
                Create account
              </Link>
            </div>
          </div>

          <div className="hero-side">
            <div className="panel">
              <h3>Why this setup works</h3>
              <div className="stat-grid">
                <div className="stat">
                  <strong>6</strong>
                  <span>Target levels covered from Grade 7 to Form 4</span>
                </div>
                <div className="stat">
                  <strong>Paystack</strong>
                  <span>Saved payment records and verified checkout flow</span>
                </div>
                <div className="stat">
                  <strong>Members</strong>
                  <span>Signup, login, subscriptions, and dashboard access</span>
                </div>
                <div className="stat">
                  <strong>Fast</strong>
                  <span>Next.js app structure built for speed and SEO</span>
                </div>
              </div>
            </div>

            <div className="panel">
              <h3>Commercial model</h3>
              <p className="subtle">
                Parents subscribe at KSh 300 per month. Teachers subscribe at KSh 150 per month and
                can also buy one-time schemes of work at KSh {schemeOfWorkPrice} per subject.
              </p>
              <div className="tag-row">
                <span className="tag">Subscription revenue</span>
                <span className="tag">Teacher scheme sales</span>
                <span className="tag">Protected downloads</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="page-shell section">
        <div className="section-head">
          <div>
            <span className="eyebrow">Platform strengths</span>
            <h2>Designed to sell trust, structure, and results.</h2>
          </div>
          <p>
            The first version leans into clear value for parents and teachers: easy discovery,
            simple subscription choices, and a clean members-only experience for revision material
            delivery.
          </p>
        </div>

        <div className="feature-grid">
          <article className="feature-card">
            <h3>Curriculum-aligned catalog</h3>
            <p className="subtle">
              Organize revision packs by level, subject, and exam period so buyers immediately find
              the right material.
            </p>
          </article>
          <article className="feature-card">
            <h3>Paystack payment records</h3>
            <p className="subtle">
              Every checkout saves the customer, payment, and order state before Paystack verifies
              the transaction.
            </p>
          </article>
          <article className="feature-card">
            <h3>Members-only dashboard</h3>
            <p className="subtle">
              Deliver downloads, renewal status, and purchase history inside a dedicated account
              area.
            </p>
          </article>
        </div>
      </section>

      <section className="page-shell section" id="levels">
        <div className="section-head">
          <div>
            <span className="eyebrow">Coverage</span>
            <h2>From Junior Secondary to exam-year preparation.</h2>
          </div>
          <p>
            These are the levels now built into the starter catalog so you can start populating
            material immediately and expand subjects over time.
          </p>
        </div>

        <div className="class-grid">
          {levels.map((level) => (
            <Link key={level.id} href={`/levels/${level.id}`} className="card-link">
              <article className="class-card">
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
            <h2>Simple plans for homes and classrooms.</h2>
          </div>
          <p>
            Start with simple monthly memberships and one-time teacher scheme purchases.
          </p>
        </div>

        <div className="pricing-grid">
          {membershipPlans.map((plan) => (
            <article key={plan.name} className="pricing-card">
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
            <h2>Show buyers what they unlock after subscribing.</h2>
          </div>
          <p>
            Use visible preview cards to market the depth of your material while reserving the full
            files for subscribers.
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

      <section className="page-shell cta">
        <div className="cta-box">
          <span className="eyebrow">Ready to launch</span>
          <h2>Accounts, subscriptions, and payment records are now part of the platform.</h2>
          <p>
            Sign up, log in, start Paystack checkout, and track saved subscriptions and payments from
            the dashboard.
          </p>
          <div className="hero-actions">
            <Link href="/subscribe" className="button">
              Open checkout flow
            </Link>
            <Link href="/dashboard" className="button-secondary">
              See the member area
            </Link>
          </div>
        </div>
      </section>

      <footer className="page-shell footer">
        {academyName} is built for selling Kenyan curriculum revision materials through membership
        access and Paystack checkout.
      </footer>
    </main>
  );
}
