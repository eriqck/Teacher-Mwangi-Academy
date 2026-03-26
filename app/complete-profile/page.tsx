import { redirect } from "next/navigation";
import { CompleteSocialProfileForm } from "@/components/complete-social-profile-form";
import { SiteHeader } from "@/components/site-header";
import { getCurrentUser, getPendingSocialProfile } from "@/lib/auth";

export default async function CompleteProfilePage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  const pendingProfile = await getPendingSocialProfile();

  if (!pendingProfile) {
    redirect("/login");
  }

  return (
    <main>
      <SiteHeader />

      <section className="page-shell section">
        <div className="section-head">
          <div>
            <span className="eyebrow">Complete profile</span>
            <h2>Finish setting up your Google account.</h2>
          </div>
          <p>
            Choose whether this is a parent or teacher account, then add the phone number you want on file.
          </p>
        </div>

        <div className="dashboard-grid">
          <article className="dashboard-card">
            <h3>Account details</h3>
            <CompleteSocialProfileForm
              email={pendingProfile.email}
              fullName={pendingProfile.fullName}
            />
          </article>
        </div>
      </section>
    </main>
  );
}
