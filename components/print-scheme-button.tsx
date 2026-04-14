"use client";

export function PrintSchemeButton() {
  return (
    <button
      type="button"
      className="button-secondary"
      onClick={() => window.print()}
    >
      Print or save PDF
    </button>
  );
}
