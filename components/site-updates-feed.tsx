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
  compact = false,
  marquee = false
}: {
  updates: SiteUpdate[];
  compact?: boolean;
  marquee?: boolean;
}) {
  const renderCard = (update: SiteUpdate, key: string) => {
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
      <Link key={key} href={update.href} className="site-update-card">
        {content}
      </Link>
    ) : (
      <article key={key} className="site-update-card">
        {content}
      </article>
    );
  };

  if (marquee && updates.length > 0) {
    const loopedUpdates = [...updates, ...updates];

    return (
      <div className="site-updates-marquee">
        <div className="site-updates-track">
          {loopedUpdates.map((update, index) => renderCard(update, `${update.id}-${index}`))}
        </div>
      </div>
    );
  }

  return (
    <div className={`site-updates-feed${compact ? " site-updates-feed--compact" : ""}`}>
      {updates.map((update) => renderCard(update, update.id))}
    </div>
  );
}
