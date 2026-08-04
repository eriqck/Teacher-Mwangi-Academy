import { redirect } from "next/navigation";
import Link from "next/link";
import { SubscriptionCheckoutForm } from "@/components/checkout-forms";
import { JoinAndSubscribeForm } from "@/components/join-subscribe-form";
import { SubscribeCountdown } from "@/components/subscribe-countdown";
import { SiteHeader } from "@/components/site-header";
import { academyName, schemeOfWorkPrice, teacherMaterialPrice } from "@/lib/business";
import { getCurrentUser } from "@/lib/auth";
import { membershipPlans } from "@/lib/catalog";

export default async function SubscribePage() {
  const user = await getCurrentUser();

  if (user && user.role === "admin") {
    redirect("/admin");
  }

  const subscriber = user && user.role !== "admin" ? user : null;
  return (
    <main>
      <SiteHeader />

      <section className="page-shell subscribe-hero-grid">
        <article className="subscribe-hero-card">
          <span className="eyebrow">Masterclass registration</span>
          <h1>Join the parent masterclass and get the Google Meet link by email.</h1>
          <p className="subscribe-copy">
            Learn how to support your child’s learning, improve revision habits, and make
            school work more manageable. Reserve your place now and we’ll send the link once
            your registration is confirmed.
          </p>

          <SubscribeCountdown targetDate="2026-08-10T20:00:00.000Z" />

          <div className="subscribe-feature-grid">
            <article className="subscribe-feature-card">
              <h3>Live expert tips</h3>
              <p>Practical, classroom-ready strategies for parents.</p>
            </article>
            <article className="subscribe-feature-card">
              <h3>Google Meet link</h3>
              <p>Delivered in your confirmation email after registration.</p>
            </article>
            <article className="subscribe-feature-card">
              <h3>Secure your spot</h3>
              <p>Limited seats available, so register before the session fills up.</p>
            </article>
          </div>
        </article>

        <aside className="subscribe-form-card">
          <div className="subscribe-form-head">
            <p className="home-kicker">Register now</p>
            <h2>Enter your details to reserve your seat</h2>
          </div>

          {subscriber ? (
            <SubscriptionCheckoutForm role={subscriber.role as "parent" | "teacher"} />
          ) : (
            <JoinAndSubscribeForm />
          )}
        </aside>
      </section>
    </main>
  );
}
