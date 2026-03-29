import nodemailer from "nodemailer";

let transporterPromise: Promise<nodemailer.Transporter> | null = null;

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function isSmtpConfigured() {
  return !!process.env.SMTP_HOST && !!process.env.SMTP_PORT && !!process.env.SMTP_USER && !!process.env.SMTP_PASS && !!process.env.EMAIL_FROM;
}

function getTransporter() {
  if (!transporterPromise) {
    transporterPromise = Promise.resolve(
      nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: process.env.SMTP_SECURE === "true" || Number(process.env.SMTP_PORT) === 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      })
    );
  }

  return transporterPromise;
}

export async function sendPasswordResetOtp(input: {
  email: string;
  fullName: string;
  otp: string;
}) {
  if (!isSmtpConfigured()) {
    return false;
  }

  const transporter = await getTransporter();
  const safeName = escapeHtml(input.fullName);
  const safeOtp = escapeHtml(input.otp);

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: input.email,
    subject: "Your Teacher Mwangi Academy password reset code",
    text: `Hello ${input.fullName},\n\nUse this one-time code to reset your Teacher Mwangi Academy password: ${input.otp}\n\nThis code expires in 15 minutes and can only be used once.\n\nIf you did not request this, you can ignore this message.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2a2e;">
        <p>Hello ${safeName},</p>
        <p>Use this one-time code to reset your Teacher Mwangi Academy password:</p>
        <p style="margin: 20px 0;">
          <span style="display: inline-block; padding: 12px 18px; border-radius: 14px; background: #166534; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: 0.2em;">
            ${safeOtp}
          </span>
        </p>
        <p>This code expires in 15 minutes and can only be used once.</p>
        <p>If you did not request this, you can safely ignore this email.</p>
      </div>
    `
  });

  return true;
}
