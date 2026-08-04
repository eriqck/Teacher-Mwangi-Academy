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
    <form className="mentorship-form" onSubmit={handleSubmit}>
      <div className="mentorship-field">
        <label htmlFor="fullName" className="mentorship-sr">Name</label>
        <input id="fullName" name="fullName" placeholder="Name *" required />
      </div>

      <div className="mentorship-field">
        <label htmlFor="email" className="mentorship-sr">Email</label>
        <input id="email" name="email" type="email" placeholder="Email *" required />
      </div>

      <div className="mentorship-field">
        <label htmlFor="sessionDate" className="mentorship-sr">Select Date</label>
        <select id="sessionDate" name="sessionDate" defaultValue="" required>
          <option value="" disabled>
            Select Date
          </option>
          <option value="This Saturday">This Saturday</option>
          <option value="Next Saturday">Next Saturday</option>
          <option value="I will confirm later">I will confirm later</option>
        </select>
      </div>

      <div className="mentorship-field">
        <label htmlFor="sessionTime" className="mentorship-sr">Select Time</label>
        <select id="sessionTime" name="sessionTime" defaultValue="" required>
          <option value="" disabled>
            Select Time
          </option>
          <option value="8:00 PM">8:00 PM</option>
          <option value="7:30 PM">7:30 PM</option>
          <option value="9:00 PM">9:00 PM</option>
        </select>
      </div>

      <div className="mentorship-phone-row">
        <span className="mentorship-country-code">KE</span>
        <input
          id="phoneNumber"
          name="phoneNumber"
          placeholder="Enter a phone number"
          aria-label="Phone number"
          required
        />
      </div>

      <input type="hidden" name="childClass" value="" />

      {message ? <div className="message message-success">{message}</div> : null}
      {error ? <div className="message message-error">{error}</div> : null}

      <button className="mentorship-submit" type="submit" disabled={loading}>
        {loading ? "Reserving..." : "Reserve my spot now"}
      </button>
    </form>
  );
}
