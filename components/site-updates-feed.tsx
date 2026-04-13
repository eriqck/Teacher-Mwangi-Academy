import Link from "next/link";
import type { SiteUpdate } from "@/lib/site-updates";

function formatUpdateDate(date: string) {
  return new Intl.DateTimeFormat("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Nairobi"
  }).format(new Date(date));
}

export function SiteUpdatesFeed({
  updates,
  compact = false
}: {
  updates: SiteUpdate[];
  compact?: boolean;
}) {
  return (
    <div className={`site-updates-feed${compact ? " site-updates-feed--compact" : ""}`}>
      {updates.map((update) => {
        const content = (
          <>
            <div className="site-updates-head">
              <span className="site-updates-badge">{update.badge}</span>
              <span className="site-updates-date">{formatUpdateDate(update.date)}</span>
            </div>
            <h3>{update.title}</h3>
            <p>{update.summary}</p>
          </>
        );

        return update.href ? (
          <Link key={update.id} href={update.href} className="site-update-card">
            {content}
          </Link>
        ) : (
          <article key={update.id} className="site-update-card">
            {content}
          </article>
        );
      })}
    </div>
  );
}
