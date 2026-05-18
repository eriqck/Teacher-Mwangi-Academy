"use client";

type PrintSchemeButtonProps = {
  downloadUrl?: string;
  downloadLabel?: string;
};

export function PrintSchemeButton({
  downloadUrl,
  downloadLabel = "Download Word"
}: PrintSchemeButtonProps) {
  return (
    <div className="hero-actions">
      {downloadUrl ? (
        <a href={downloadUrl} className="button-secondary">
          {downloadLabel}
        </a>
      ) : null}
      <button
        type="button"
        className="button-secondary"
        onClick={() => window.print()}
      >
        Print or save PDF
      </button>
    </div>
  );
}
