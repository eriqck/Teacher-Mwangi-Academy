"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { GoogleAuthButton } from "@/components/google-auth-button";

type Mode = "login" | "signup";

type AuthFormProps = {
  mode: Mode;
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());
    const endpoint = mode === "signup" ? "/api/auth/signup" : "/api/auth/login";

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = (await response.json()) as { ok?: boolean; error?: string; message?: string };

    if (!response.ok) {
      setError(data.error ?? "Something went wrong.");
      setLoading(false);
      return;
    }

    setSuccess(data.message ?? "Success");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form className={`panel-stack auth-form auth-form--${mode}`} onSubmit={handleSubmit}>
      {mode === "signup" ? (
        <>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="fullName">Full name</label>
              <input id="fullName" name="fullName" required />
            </div>
            <div className="field">
              <label htmlFor="role">Account type</label>
              <select id="role" name="role" defaultValue="parent" required>
                <option value="parent">Parent</option>
                <option value="teacher">Teacher</option>
              </select>
            </div>
          </div>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="phoneNumber">Phone number</label>
              <input id="phoneNumber" name="phoneNumber" placeholder="07XXXXXXXX" required />
            </div>
            <div className="field">
              <label htmlFor="email">Email address</label>
              <input id="email" name="email" type="email" required />
            </div>
          </div>
        </>
      ) : null}

      {mode === "login" ? (
        <div className="auth-login-grid">
          <div className="field">
            <label htmlFor="email">Email address</label>
            <input id="email" name="email" type="email" required />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" minLength={6} required />
            <small>Use at least 6 characters.</small>
          </div>
        </div>
      ) : (
        <div className="form-grid form-grid-single">
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" minLength={6} required />
            <small>Use at least 6 characters.</small>
          </div>
        </div>
      )}

      {error ? <div className="message message-error">{error}</div> : null}
      {success ? <div className="message message-success">{success}</div> : null}

      <button className="button" type="submit" disabled={loading}>
        {loading ? "Please wait..." : mode === "signup" ? "Create account" : "Sign in"}
      </button>

      <GoogleAuthButton mode={mode} />

      {mode === "login" ? (
        <div className="auth-form-meta">
          <Link href="/forgot-password">Forgot password?</Link>
        </div>
      ) : null}
    </form>
  );
}
