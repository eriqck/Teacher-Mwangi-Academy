function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function isEmailConfigured() {
  return !!process.env.RESEND_API_KEY && !!process.env.EMAIL_FROM;
}

export async function sendPasswordResetEmail(input: {
  email: string;
  fullName: string;
  resetUrl: string;
}) {
  if (!isEmailConfigured()) {
    return false;
  }

  const safeName = escapeHtml(input.fullName);
  const safeUrl = escapeHtml(input.resetUrl);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: [input.email],
      subject: "Reset your Teacher Mwangi Academy password",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2a2e;">
          <p>Hello ${safeName},</p>
          <p>We received a request to reset your Teacher Mwangi Academy password.</p>
          <p>
            <a
              href="${safeUrl}"
              style="display: inline-block; padding: 12px 18px; border-radius: 999px; background: #d95d39; color: #ffffff; text-decoration: none; font-weight: 600;"
            >
              Reset password
            </a>
          </p>
          <p>This link expires in 1 hour.</p>
          <p>If you did not request this change, you can safely ignore this email.</p>
        </div>
      `,
      text: `Hello ${input.fullName},\n\nReset your Teacher Mwangi Academy password here: ${input.resetUrl}\n\nThis link expires in 1 hour.\nIf you did not request this change, you can ignore this email.`
    })
  });

  if (!response.ok) {
    throw new Error("Unable to send password reset email.");
  }

  return true;
}
