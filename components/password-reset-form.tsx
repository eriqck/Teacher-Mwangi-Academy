"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type ApiResponse = {
  ok?: boolean;
  error?: string;
  message?: string;
};

export function PasswordResetForm({ token }: { token: string | null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!token) {
      setError("This reset link is missing or invalid. Request a new one.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const password = `${formData.get("password") ?? ""}`;
    const confirmPassword = `${formData.get("confirmPassword") ?? ""}`;

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        token,
        password
      })
    });

    const data = (await response.json()) as ApiResponse;
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Unable to reset password.");
      return;
    }

    setMessage(data.message ?? "Password reset successful.");
    router.push("/dashboard");
    router.refresh();
  }

  if (!token) {
    return (
      <div className="panel-stack auth-form auth-form--login">
        <div className="message message-error">
          This reset link is missing or invalid. Request a new password reset email first.
        </div>
        <Link href="/forgot-password" className="button-secondary">
          Request new reset link
        </Link>
      </div>
    );
  }

  return (
    <form className="panel-stack auth-form auth-form--login" onSubmit={handleSubmit}>
      <div className="auth-login-grid">
        <div className="field">
          <label htmlFor="password">New password</label>
          <input id="password" name="password" type="password" minLength={6} required />
          <small>Use at least 6 characters.</small>
        </div>
        <div className="field">
          <label htmlFor="confirmPassword">Confirm new password</label>
          <input id="confirmPassword" name="confirmPassword" type="password" minLength={6} required />
        </div>
      </div>

      {error ? <div className="message message-error">{error}</div> : null}
      {message ? <div className="message message-success">{message}</div> : null}

      <button className="button" type="submit" disabled={loading}>
        {loading ? "Updating password..." : "Reset password"}
      </button>
    </form>
  );
}
