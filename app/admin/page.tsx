import Link from "next/link";
import { AdminUploadForm } from "@/components/admin-upload-form";
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
            Open the saved file directly or use the metadata here as the basis for future catalog
            and download controls.
          </p>
        </div>

        <article className="dashboard-card">
          {uploads.length > 0 ? (
            <table className="mini-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Level</th>
                  <th>Subject</th>
                  <th>File</th>
                </tr>
              </thead>
              <tbody>
                {uploads.map((resource) => (
                  <tr key={resource.id}>
                    <td>{resource.title}</td>
                    <td>{resource.category}</td>
                    <td>{resource.level}</td>
                    <td>{resource.subject}</td>
                    <td>
                      <Link href={resource.fileUrl} target="_blank" className="nav-link">
                        Open file
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="subtle">No uploads yet. Add your first material above.</p>
          )}
        </article>
      </section>
    </main>
  );
}
