"use client";

import Link from "next/link";
import { useState } from "react";
import { GoogleAuthButton } from "@/components/google-auth-button";

type ApiResponse = {
  ok?: boolean;
  error?: string;
  message?: string;
  data?: {
    authorization_url?: string | null;
    reference?: string;
    mock?: boolean;
    message?: string;
  };
};

const planOptions = [
  { id: "parent-monthly", label: "Parent Subscription — KSh 300/month", role: "parent" },
  { id: "teacher-monthly", label: "Teacher Subscription — KSh 150/month", role: "teacher" }
];

type Tab = "new" | "renew";

export function JoinAndSubscribeForm() {
  const [tab, setTab] = useState<Tab>("new");

  return (
    <div className="panel-stack join-subscribe">
      <div className="join-tabs" role="tablist" aria-label="Subscription options">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "new"}
          className={`join-tab${tab === "new" ? " join-tab-active" : ""}`}
          onClick={() => setTab("new")}
        >
          New member
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "renew"}
          className={`join-tab${tab === "renew" ? " join-tab-active" : ""}`}
          onClick={() => setTab("renew")}
        >
          Renew subscription
        </button>
      </div>

      {tab === "new" ? <NewMemberForm /> : <RenewMemberForm />}
    </div>
  );
}

function NewMemberForm() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<"parent" | "teacher">("parent");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());

    try {
      const response = await fetch("/api/auth/signup-and-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = (await response.json()) as ApiResponse;

      if (!response.ok) {
        setError(data.error ?? "Unable to create your account and start checkout.");
        setLoading(false);
        return;
      }

      if (data.data?.authorization_url) {
        window.location.href = data.data.authorization_url;
        return;
      }

      window.location.assign("/dashboard");
    } catch {
      setError("Unable to complete this request right now.");
      setLoading(false);
    }
  }

  return (
    <form className="panel-stack" onSubmit={handleSubmit}>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="new-fullName">Full name</label>
          <input id="new-fullName" name="fullName" required />
        </div>
        <div className="field">
          <label htmlFor="new-role">Account type</label>
          <select
            id="new-role"
            name="role"
            value={role}
            onChange={(event) => setRole(event.target.value as "parent" | "teacher")}
            required
          >
            <option value="parent">Parent</option>
            <option value="teacher">Teacher</option>
          </select>
        </div>
      </div>

      <div className="form-grid">
        <div className="field">
          <label htmlFor="new-phoneNumber">Phone number</label>
          <input id="new-phoneNumber" name="phoneNumber" placeholder="07XXXXXXXX" required />
        </div>
        <div className="field">
          <label htmlFor="new-email">Email address</label>
          <input id="new-email" name="email" type="email" required />
        </div>
      </div>

      <div className="form-grid">
        <div className="field">
          <label htmlFor="new-password">Password</label>
          <input id="new-password" name="password" type="password" minLength={6} required />
          <small>Use at least 6 characters.</small>
        </div>
        <div className="field">
          <label htmlFor="new-accountReference">Learner or account reference</label>
          <input
            id="new-accountReference"
            name="accountReference"
            placeholder="Parent account or learner name"
            required
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="new-plan">Subscription plan</label>
        <select id="new-plan" value={role === "teacher" ? "teacher-monthly" : "parent-monthly"} disabled>
          {planOptions
            .filter((plan) => plan.role === role)
            .map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.label}
              </option>
            ))}
        </select>
        <small>Matches the account type selected above.</small>
        <input type="hidden" name="plan" value={role === "teacher" ? "teacher-monthly" : "parent-monthly"} />
      </div>

      {error ? <div className="message message-error">{error}</div> : null}

      <button className="button button-buy" type="submit" disabled={loading}>
        {loading ? "Redirecting to M-Pesa..." : "Create account & continue to M-Pesa"}
      </button>

      <GoogleAuthButton mode="signup" />

      <p className="subtle">
        Already have an account? Switch to the <strong>Renew subscription</strong> tab above.
      </p>
    </form>
  );
}

function RenewMemberForm() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<"parent" | "teacher">("parent");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());

    try {
      const response = await fetch("/api/auth/login-and-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = (await response.json()) as ApiResponse;

      if (!response.ok) {
        setError(data.error ?? "Unable to sign in and start checkout.");
        setLoading(false);
        return;
      }

      if (data.data?.authorization_url) {
        window.location.href = data.data.authorization_url;
        return;
      }

      window.location.assign("/dashboard");
    } catch {
      setError("Unable to complete this request right now.");
      setLoading(false);
    }
  }

  return (
    <form className="panel-stack" onSubmit={handleSubmit}>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="renew-email">Email address</label>
          <input id="renew-email" name="email" type="email" required />
        </div>
        <div className="field">
          <label htmlFor="renew-password">Password</label>
          <input id="renew-password" name="password" type="password" minLength={6} required />
        </div>
      </div>

      <div className="form-grid">
        <div className="field">
          <label htmlFor="renew-role">Account type</label>
          <select
            id="renew-role"
            name="role-display"
            value={role}
            onChange={(event) => setRole(event.target.value as "parent" | "teacher")}
          >
            <option value="parent">Parent</option>
            <option value="teacher">Teacher</option>
          </select>
          <small>Must match the account type you signed up with.</small>
        </div>
        <div className="field">
          <label htmlFor="renew-accountReference">Learner or account reference</label>
          <input
            id="renew-accountReference"
            name="accountReference"
            placeholder="Parent account or learner name"
            required
          />
        </div>
      </div>

      <input type="hidden" name="plan" value={role === "teacher" ? "teacher-monthly" : "parent-monthly"} />

      {error ? <div className="message message-error">{error}</div> : null}

      <button className="button button-buy" type="submit" disabled={loading}>
        {loading ? "Redirecting to M-Pesa..." : "Sign in & continue to M-Pesa"}
      </button>

      <p className="subtle">
        Forgot your password? <Link href="/forgot-password">Reset it here</Link>.
      </p>
    </form>
  );
}
