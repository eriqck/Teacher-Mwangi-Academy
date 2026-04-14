"use client";

import { useState } from "react";

export function TeacherToolsAccessForm() {
  const [accountReference, setAccountReference] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/tools/access", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          accountReference
        })
      });

      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        data?: {
          authorization_url?: string | null;
          mock?: boolean;
          message?: string;
        };
      };

      if (!response.ok) {
        setError(data.error ?? "Unable to start teacher tools checkout.");
        return;
      }

      if (data.data?.authorization_url) {
        window.location.href = data.data.authorization_url;
        return;
      }

      setError(data.data?.message ?? "Checkout was saved but no payment link was returned.");
    } catch {
      setError("Unable to start teacher tools checkout right now.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="teacher-tools-access-form" onSubmit={handleSubmit}>
      <label className="field">
        <span>Account reference</span>
        <input
          value={accountReference}
          onChange={(event) => setAccountReference(event.target.value)}
          placeholder="Teacher Mwangi Bot Access"
          required
        />
      </label>

      {error ? <p className="message message-error">{error}</p> : null}

      <button type="submit" className="button button-buy" disabled={loading}>
        {loading ? "Redirecting to M-Pesa..." : "Unlock bot for KSh 30"}
      </button>
    </form>
  );
}
