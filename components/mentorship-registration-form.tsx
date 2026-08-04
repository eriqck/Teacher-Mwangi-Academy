"use client";

import { useState } from "react";

type RegistrationResponse = {
  ok?: boolean;
  error?: string;
  message?: string;
  registration?: {
    sessionTitle: string;
    sessionDate: string;
    confirmationSent: boolean;
  };
};

export function MentorshipRegistrationForm() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const form = event.currentTarget;
      const formData = new FormData(form);
      const response = await fetch("/api/mentorship/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(Object.fromEntries(formData.entries()))
      });
      const data = (await response.json()) as RegistrationResponse;

      if (!response.ok || !data.ok) {
        setError(data.error ?? "Unable to register right now.");
        return;
      }

      setMessage(data.message ?? "Registration received.");
      form.reset();
    } catch {
      setError("Unable to register right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="panel-stack auth-form" onSubmit={handleSubmit}>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="fullName">Full name</label>
          <input id="fullName" name="fullName" placeholder="Parent name" required />
        </div>
        <div className="field">
          <label htmlFor="phoneNumber">Phone / WhatsApp number</label>
          <input id="phoneNumber" name="phoneNumber" placeholder="07XXXXXXXX" required />
        </div>
      </div>

      <div className="form-grid">
        <div className="field">
          <label htmlFor="email">Email address</label>
          <input id="email" name="email" type="email" placeholder="you@example.com" required />
        </div>
        <div className="field">
          <label htmlFor="childClass">Child&apos;s class or school</label>
          <input id="childClass" name="childClass" placeholder="Example: Grade 8, optional" />
        </div>
      </div>

      {message ? <div className="message message-success">{message}</div> : null}
      {error ? <div className="message message-error">{error}</div> : null}

      <button className="button" type="submit" disabled={loading}>
        {loading ? "Registering..." : "Register for mentorship"}
      </button>
    </form>
  );
}
