import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { academyName } from "@/lib/business";

export async function SiteHeader() {
  const user = await getCurrentUser();
  const links = [
    { href: "#levels", label: "Levels" },
    { href: "#membership", label: "Membership" },
    { href: "#library", label: "Library" },
    { href: "/dashboard", label: "Dashboard" },
    ...(user?.role === "admin" ? [{ href: "/admin", label: "Admin" }] : [])
  ];

  return (
    <header className="page-shell nav">
      <Link href="/" className="brand">
        <span className="brand-mark">TM</span>
        <span>{academyName}</span>
      </Link>

      <nav className="nav-links" aria-label="Primary">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="nav-link">
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="nav-actions">
        {user ? (
          <>
            <span className="nav-link">Hi, {user.fullName.split(" ")[0]}</span>
            <form action="/api/auth/logout" method="post">
              <button type="submit" className="button-secondary button-reset">
                Log out
              </button>
            </form>
          </>
        ) : (
          <>
            <Link href="/login" className="nav-link">
              Sign in
            </Link>
            <Link href="/signup" className="button">
              Create account
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
