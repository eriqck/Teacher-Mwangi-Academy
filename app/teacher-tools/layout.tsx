import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { reconcilePaidPaystackPaymentsForUser } from "@/lib/payments";

export default async function TeacherToolsLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const isTeacherWorkspaceUser = user?.role === "teacher" || user?.role === "admin";

  if (user?.role === "teacher") {
    await reconcilePaidPaystackPaymentsForUser(user.id);
  }

  const teacherLinks = [
    { href: "/teacher-tools", label: "Dashboard" },
    { href: "/teacher-tools/schemes", label: "My Schemes" },
    { href: "/teacher-tools/schemes/new", label: "Create Scheme" },
    { href: "/teacher-tools/lesson-plans", label: "Lesson Plans" }
  ];

  const guestLinks = [
    { href: "/teacher-tools", label: "Bot Home" },
    { href: "/teacher-tools/schemes/new", label: "Create Scheme" },
    { href: "/teacher-tools/lesson-plans", label: "Lesson Plans" },
    { href: "/login", label: "Teacher Sign In" }
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

        {isTeacherWorkspaceUser && user ? (
          <div className="teacher-tools-profile">
            <div className="teacher-tools-avatar">{user.fullName.charAt(0)}</div>
            <div>
              <strong>{user.fullName}</strong>
              <p>{user.email}</p>
            </div>
          </div>
        ) : (
          <div className="teacher-tools-profile teacher-tools-profile--guest">
            <div className="teacher-tools-avatar">T</div>
            <div>
              <strong>Teacher access</strong>
              <p>Open the workspace first, then sign in to generate.</p>
            </div>
          </div>
        )}

        <nav className="teacher-tools-nav" aria-label="Teacher tools navigation">
          {(isTeacherWorkspaceUser ? teacherLinks : guestLinks).map((link) => (
            <Link key={link.href} href={link.href} className="teacher-tools-nav-link">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="teacher-tools-sidebar-footer">
          <span className={`teacher-tools-status ${isTeacherWorkspaceUser ? "is-active" : "is-pending"}`}>
            {isTeacherWorkspaceUser ? "Per-output payment model" : "Teacher sign-in available here"}
          </span>

          <Link href="/" className="teacher-tools-home-link">
            Back to main site
          </Link>

          {isTeacherWorkspaceUser ? (
            <form action="/api/auth/logout" method="post">
              <button type="submit" className="teacher-tools-logout">
                Log out
              </button>
            </form>
          ) : (
            <div className="teacher-tools-guest-actions">
              <Link href="/login" className="teacher-tools-home-link">
                Sign in
              </Link>
              <Link href="/signup" className="teacher-tools-home-link">
                Create teacher account
              </Link>
            </div>
          )}
        </div>
      </aside>

      <div className="teacher-tools-main">
        {children}
      </div>
    </main>
  );
}
