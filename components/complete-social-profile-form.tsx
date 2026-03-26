"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ApiResponse = {
  ok?: boolean;
  error?: string;
  message?: string;
};

export function CompleteSocialProfileForm({
  email,
  fullName
}: {
  email: string;
  fullName: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/google/complete-profile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        role: formData.get("role"),
        phoneNumber: formData.get("phoneNumber")
      })
    });

    const data = (await response.json()) as ApiResponse;
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Unable to complete your profile.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form className="panel-stack auth-form auth-form--signup" onSubmit={handleSubmit}>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="social-fullName">Full name</label>
          <input id="social-fullName" value={fullName} readOnly />
        </div>
        <div className="field">
          <label htmlFor="social-email">Email address</label>
          <input id="social-email" value={email} readOnly />
        </div>
      </div>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="social-role">Account type</label>
          <select id="social-role" name="role" defaultValue="parent" required>
            <option value="parent">Parent</option>
            <option value="teacher">Teacher</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="social-phoneNumber">Phone number</label>
          <input id="social-phoneNumber" name="phoneNumber" placeholder="07XXXXXXXX" required />
        </div>
      </div>

      {error ? <div className="message message-error">{error}</div> : null}

      <button className="button" type="submit" disabled={loading}>
        {loading ? "Saving profile..." : "Finish Google sign-in"}
      </button>
    </form>
  );
}
