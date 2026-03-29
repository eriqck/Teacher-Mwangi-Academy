const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/\D/g, "") ?? "";
const defaultMessage =
  process.env.NEXT_PUBLIC_WHATSAPP_MESSAGE ??
  "Hello Teacher Mwangi Academy, I would like help with subscriptions and materials.";

function buildWhatsAppUrl() {
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
      <span className="whatsapp-fab-icon" aria-hidden="true">
        W
      </span>
      <span className="whatsapp-fab-text">WhatsApp</span>
    </a>
  );
}
