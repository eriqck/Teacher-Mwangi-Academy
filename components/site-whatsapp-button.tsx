function buildWhatsAppUrl() {
  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/\D/g, "") ?? "";
  const defaultMessage =
    process.env.NEXT_PUBLIC_WHATSAPP_MESSAGE ??
    "Hello Teacher Mwangi Academy, I would like help with subscriptions and materials.";

  if (!whatsappNumber) {
    return null;
  }

  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(defaultMessage)}`;
}

export function SiteWhatsAppButton() {
  const href = buildWhatsAppUrl();

  if (!href) {
    return null;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="whatsapp-fab"
      aria-label="Chat with Teacher Mwangi Academy on WhatsApp"
    >
      <svg
        className="whatsapp-fab-icon"
        viewBox="0 0 32 32"
        aria-hidden="true"
        focusable="false"
      >
        <path
          fill="currentColor"
          d="M19.11 17.21c-.29-.14-1.7-.84-1.96-.94-.26-.1-.45-.14-.64.14-.19.29-.74.94-.91 1.13-.17.19-.34.22-.63.07-.29-.14-1.23-.45-2.34-1.44-.86-.77-1.45-1.71-1.62-2-.17-.29-.02-.45.13-.59.13-.13.29-.34.43-.5.14-.17.19-.29.29-.48.1-.19.05-.36-.02-.5-.07-.14-.64-1.55-.88-2.12-.23-.55-.47-.48-.64-.48h-.55c-.19 0-.5.07-.76.36-.26.29-1 1-.98 2.43.02 1.43 1.03 2.82 1.17 3.01.14.19 2.02 3.08 4.89 4.32.68.29 1.22.46 1.63.59.69.22 1.32.19 1.82.12.56-.08 1.7-.69 1.94-1.35.24-.67.24-1.24.17-1.35-.07-.12-.26-.19-.55-.34Z"
        />
        <path
          fill="currentColor"
          d="M27.24 4.76A15.83 15.83 0 0 0 16.01.12C7.23.12.11 7.24.11 16.01c0 2.8.73 5.53 2.11 7.94L0 31.88l8.12-2.13a15.88 15.88 0 0 0 7.89 2.14h.01c8.77 0 15.89-7.12 15.89-15.89 0-4.24-1.65-8.22-4.67-11.24ZM16.02 29.2h-.01a13.2 13.2 0 0 1-6.73-1.84l-.48-.28-4.82 1.27 1.29-4.7-.31-.49a13.18 13.18 0 0 1-2.03-7.12c0-7.29 5.93-13.21 13.22-13.21 3.53 0 6.84 1.37 9.34 3.87a13.1 13.1 0 0 1 3.87 9.34c0 7.29-5.93 13.21-13.22 13.21Z"
        />
      </svg>
    </a>
  );
}
