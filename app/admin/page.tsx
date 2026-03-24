import { AdminUploadForm } from "@/components/admin-upload-form";
import { AdminResourceManager } from "@/components/admin-resource-manager";
import { SiteHeader } from "@/components/site-header";
import { schemeOfWorkPrice } from "@/lib/business";
import { requireAdmin } from "@/lib/auth";
import { readAppData } from "@/lib/repository";

export default async function AdminPage() {
  const user = await requireAdmin();

  const store = await readAppData();
  const uploads = store.resources
    .filter((resource) => resource.uploadedByUserId === user.id)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  return (
    <main>
      <SiteHeader />

      <section className="page-shell section">
        <div className="section-head">
          <div>
            <span className="eyebrow">Admin workspace</span>
            <h2>Upload revision materials and schemes from the browser.</h2>
          </div>
          <p>
            Files are stored locally inside this project and every upload is registered in the app
            store so you can manage what is available to members.
          </p>
        </div>

        <div className="dashboard-grid">
          <article className="dashboard-card">
            <h3>Upload revision material</h3>
            <p className="subtle">
              Use this for subscriber resources such as topical packs, exams, answer keys, and
              teacher notes.
            </p>
            <AdminUploadForm variant="revision-material" />
          </article>

          <article className="dashboard-card">
            <h3>Upload scheme of work</h3>
            <p className="subtle">
              Teacher schemes are stored as paid one-time resources priced at KSh {schemeOfWorkPrice}.
            </p>
            <AdminUploadForm variant="scheme-of-work" />
          </article>
        </div>
      </section>

      <section className="page-shell section">
        <div className="section-head">
          <div>
            <span className="eyebrow">Uploads</span>
            <h2>Your latest uploaded files.</h2>
          </div>
          <p>
            Open, edit, or remove uploaded materials here whenever you need to refine the catalog.
          </p>
        </div>

        <AdminResourceManager initialResources={uploads} />
      </section>
    </main>
  );
}
