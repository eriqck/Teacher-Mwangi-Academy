import { academyName } from "@/lib/business";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="page-shell">
        <p className="site-footer-copy">
          Copyright © {new Date().getFullYear()} {academyName}. All rights reserved. Made by{" "}
          <a
            href="https://ericdevportfolio.vercel.app"
            target="_blank"
            rel="noreferrer"
            className="site-footer-link"
          >
            Developer Erick
          </a>
        </p>
      </div>
    </footer>
  );
}
