import { academyName } from "@/lib/business";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="page-shell site-footer-inner">
        <p>
          Copyright © {new Date().getFullYear()} {academyName}. All rights reserved.
        </p>
        <a
          href="https://ericdevportfolio.vercel.app"
          target="_blank"
          rel="noreferrer"
          className="site-footer-link"
        >
          Made by Developer Erick
        </a>
      </div>
    </footer>
  );
}
