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

function getSmtpConfig() {
  const host = process.env.SMTP_HOST?.trim() ?? "";
  const port = Number(process.env.SMTP_PORT);
  const user = process.env.SMTP_USER?.trim() ?? "";
  const pass = process.env.SMTP_PASS?.replace(/\s+/g, "") ?? "";
  const from = process.env.EMAIL_FROM?.trim() ?? "";

  return {
    host,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    user,
    pass,
    from
  };
}

export function isPasswordResetEmailConfigured() {
  const config = getSmtpConfig();
  return !!config.host && Number.isFinite(config.port) && config.port > 0 && !!config.user && !!config.pass && !!config.from;
}

function getTransporter() {
  if (!transporterPromise) {
    const config = getSmtpConfig();

    transporterPromise = Promise.resolve(
      nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
        dnsTimeout: 10000,
        auth: {
          user: config.user,
          pass: config.pass
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
  if (!isPasswordResetEmailConfigured()) {
    console.error("SMTP password reset send failed: SMTP env vars are incomplete.");
    return false;
  }

  const transporter = await getTransporter();
  const config = getSmtpConfig();
  const safeName = escapeHtml(input.fullName);
  const safeOtp = escapeHtml(input.otp);

  try {
    await Promise.race([
      transporter.sendMail({
        from: config.from,
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
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("SMTP send timed out.")), 20000)
      )
    ]);
  } catch (error) {
    transporterPromise = null;
    console.error("SMTP password reset send failed:", error);
    throw error;
  }

  return true;
}

export async function sendMentorshipRegistrationConfirmation(input: {
  email: string;
  fullName: string;
  sessionTitle: string;
  sessionDate: string;
  meetLink?: string;
}) {
  if (!isPasswordResetEmailConfigured()) {
    console.error("SMTP mentorship confirmation failed: SMTP env vars are incomplete.");
    return false;
  }

  const transporter = await getTransporter();
  const config = getSmtpConfig();
  const safeName = escapeHtml(input.fullName);
  const safeSessionTitle = escapeHtml(input.sessionTitle);
  const safeSessionDate = escapeHtml(input.sessionDate);
  const safeMeetLink = input.meetLink ? escapeHtml(input.meetLink) : "";
  const meetLine = input.meetLink
    ? `Google Meet link: ${input.meetLink}`
    : "You will receive the Google Meet link before the session.";
  const meetHtml = input.meetLink
    ? `<p><strong>Google Meet link:</strong> <a href="${safeMeetLink}">${safeMeetLink}</a></p>`
    : "<p>You will receive the Google Meet link before the session.</p>";

  try {
    await Promise.race([
      transporter.sendMail({
        from: config.from,
        to: input.email,
        subject: `Registration confirmed: ${input.sessionTitle}`,
        text: `Hello ${input.fullName},\n\nThank you for registering for ${input.sessionTitle}.\n\nSession time: ${input.sessionDate}\n\n${meetLine}\n\nTeacher Mwangi Academy`,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2a2e;">
            <p>Hello ${safeName},</p>
            <p>Thank you for registering for <strong>${safeSessionTitle}</strong>.</p>
            <p><strong>Session time:</strong> ${safeSessionDate}</p>
            ${meetHtml}
            <p>Teacher Mwangi Academy</p>
          </div>
        `
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("SMTP send timed out.")), 20000)
      )
    ]);
  } catch (error) {
    transporterPromise = null;
    console.error("SMTP mentorship confirmation failed:", error);
    return false;
  }

  return true;
}
