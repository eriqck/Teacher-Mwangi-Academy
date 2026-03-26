"use client";

import Link from "next/link";
import { useState } from "react";

type ApiResponse = {
  ok?: boolean;
  error?: string;
  message?: string;
  data?: {
    previewUrl?: string | null;
  };
};

export function PasswordResetRequestForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    setPreviewUrl(null);

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
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Unable to start password reset.");
      return;
    }

    setMessage(
      data.message ??
        "If an account exists for that email, we have sent password reset instructions."
    );
    setPreviewUrl(data.data?.previewUrl ?? null);
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

      {previewUrl ? (
        <div className="auth-helper-stack">
          <Link href={previewUrl} className="button-secondary">
            Open reset link
          </Link>
          <small className="subtle">
            Email sending is not configured here yet, so the secure reset link is shown for local testing.
          </small>
        </div>
      ) : null}

      <button className="button" type="submit" disabled={loading}>
        {loading ? "Sending instructions..." : "Send reset instructions"}
      </button>
    </form>
  );
}
