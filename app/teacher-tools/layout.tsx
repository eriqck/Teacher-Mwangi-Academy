import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { reconcilePaidPaystackPaymentsForUser } from "@/lib/payments";
import { readAppData } from "@/lib/repository";
import { getTeacherToolAccess } from "@/lib/teacher-tools";

export default async function TeacherToolsLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  if (user.role !== "teacher" && user.role !== "admin") {
    redirect("/dashboard");
  }

  if (user.role === "teacher") {
    await reconcilePaidPaystackPaymentsForUser(user.id);
  }

  const store = await readAppData();
  const access = getTeacherToolAccess(store, user);

  const links = [
    { href: "/teacher-tools", label: "Dashboard" },
    { href: "/teacher-tools/schemes", label: "My Schemes" },
    { href: "/teacher-tools/schemes/new", label: "Create Scheme" },
    { href: "/teacher-tools/lesson-plans", label: "Lesson Plans" },
    { href: "/teacher-tools/transactions", label: "Transactions" }
  ];

  return (
    <main className="teacher-tools-shell">
      <aside className="teacher-tools-sidebar">
        <div className="teacher-tools-brand">
          <div className="teacher-tools-brand-mark">TM</div>
          <div>
            <strong>Teacher Mwangi Bot</strong>
            <p>Teacher workspace</p>
          </div>
        </div>

        <div className="teacher-tools-profile">
          <div className="teacher-tools-avatar">{user.fullName.charAt(0)}</div>
          <div>
            <strong>{user.fullName}</strong>
            <p>{user.email}</p>
          </div>
        </div>

        <nav className="teacher-tools-nav" aria-label="Teacher tools navigation">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="teacher-tools-nav-link">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="teacher-tools-sidebar-footer">
          <span className={`teacher-tools-status ${access.hasAccess ? "is-active" : access.pendingAccess ? "is-pending" : ""}`}>
            {access.hasAccess ? "Bot access active" : access.pendingAccess ? "Payment pending" : "Bot locked"}
          </span>

          <Link href="/" className="teacher-tools-home-link">
            Back to main site
          </Link>

          <form action="/api/auth/logout" method="post">
            <button type="submit" className="teacher-tools-logout">
              Log out
            </button>
          </form>
        </div>
      </aside>

      <div className="teacher-tools-main">
        {children}
      </div>
    </main>
  );
}
