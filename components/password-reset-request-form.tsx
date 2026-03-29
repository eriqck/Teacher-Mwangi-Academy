"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type ApiResponse = {
  ok?: boolean;
  error?: string;
  message?: string;
  data?: {
    previewCode?: string | null;
    email?: string | null;
  };
};

export function PasswordResetRequestForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [previewCode, setPreviewCode] = useState<string | null>(null);
  const [resetEmail, setResetEmail] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    setPreviewCode(null);
    setResetEmail(null);

    try {
      const formData = new FormData(event.currentTarget);
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: formData.get("email")
        })
      });

      const data = (await response.json()) as ApiResponse;

      if (!response.ok) {
        setError(data.error ?? "Unable to start password reset.");
        return;
      }

      setMessage(
        data.message ??
          "If an account exists for that email, we have sent a reset code."
      );
      setPreviewCode(data.data?.previewCode ?? null);
      const nextEmail = data.data?.email ?? null;
      setResetEmail(nextEmail);

      if (nextEmail) {
        router.push(`/reset-password?email=${encodeURIComponent(nextEmail)}`);
        router.refresh();
      }
    } catch {
      setError("Unable to send a reset code right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="panel-stack auth-form auth-form--login" onSubmit={handleSubmit}>
      <div className="auth-login-grid">
        <div className="field">
          <label htmlFor="reset-email">Email address</label>
          <input id="reset-email" name="email" type="email" required />
          <small>Enter the email you use to sign in.</small>
        </div>
      </div>

      {error ? <div className="message message-error">{error}</div> : null}
      {message ? <div className="message message-success">{message}</div> : null}

      {message && resetEmail ? (
        <div className="auth-helper-stack">
          {previewCode ? <div className="message message-success">Reset code: {previewCode}</div> : null}
          <Link href={`/reset-password${resetEmail ? `?email=${encodeURIComponent(resetEmail)}` : ""}`} className="button-secondary">
            Enter reset code
          </Link>
          <small className="subtle">
            {previewCode
              ? "Delivery is not configured here yet, so the OTP is shown for local testing."
              : "Check your inbox for the OTP, then continue here to reset your password."}
          </small>
        </div>
      ) : null}

      <button className="button" type="submit" disabled={loading}>
        {loading ? "Sending code..." : "Send reset code"}
      </button>
    </form>
  );
}
