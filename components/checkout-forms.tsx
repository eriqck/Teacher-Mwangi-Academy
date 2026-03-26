"use client";

import { useState } from "react";
import { levels } from "@/lib/catalog";
import { schemeOfWorkPrice, teacherMaterialPrice } from "@/lib/business";
import { schemeTerms } from "@/lib/scheme-terms";
import type { AssessmentSet, ResourceSection } from "@/lib/store";

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
  { id: "parent-monthly", label: "Parent Subscription", role: "parent" },
  { id: "teacher-monthly", label: "Teacher Subscription", role: "teacher" }
];

const schemeSubjects = [
  "Mathematics",
  "English",
  "Kiswahili",
  "Integrated Science",
  "Biology",
  "Chemistry",
  "Physics",
  "Business Studies",
  "History",
  "Geography",
  "CRE"
];

export function SubscriptionCheckoutForm({ role }: { role: "parent" | "teacher" }) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const selectedPlan = `${formData.get("plan") ?? ""}`;
    const response = await fetch("/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plan: selectedPlan,
        accountReference: formData.get("accountReference"),
        level: formData.get("level")
      })
    });

    const data = (await response.json()) as ApiResponse;
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Unable to start subscription.");
      return;
    }

    if (data.data?.authorization_url) {
      window.location.href = data.data.authorization_url;
      return;
    }

    setMessage(data.data?.message ?? data.message ?? "Checkout started for your subscription.");
  }

  return (
    <form className="panel-stack" onSubmit={handleSubmit}>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="plan">Subscription plan</label>
          <select
            id="plan"
            name="plan"
            defaultValue={role === "teacher" ? "teacher-monthly" : "parent-monthly"}
            required
          >
            {planOptions
              .filter((plan) => plan.role === role)
              .map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.label}
              </option>
              ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="accountReference">Learner or account reference</label>
          <input id="accountReference" name="accountReference" placeholder="Parent account or learner name" required />
        </div>
        <div className="field">
          <label htmlFor="level">Level access for parent plan</label>
          <select id="level" name="level" defaultValue="grade-7">
            {levels.map((level) => (
              <option key={level.id} value={level.id}>
                {level.title}
              </option>
            ))}
          </select>
          <small>
            {role === "teacher"
              ? "Teacher subscriptions automatically unlock all levels."
              : "Parent subscriptions unlock one selected learner level."}
          </small>
        </div>
      </div>

      {error ? <div className="message message-error">{error}</div> : null}
      {message ? <div className="message message-success">{message}</div> : null}

      <button className="button" type="submit" disabled={loading}>
        {loading ? "Redirecting to Paystack..." : "Continue to Paystack"}
      </button>
    </form>
  );
}

export function SchemeCheckoutForm() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const formData = new FormData(event.currentTarget);

    const response = await fetch("/api/materials/purchase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "scheme",
        accountReference: formData.get("accountReference"),
        subject: formData.get("subject"),
        level: formData.get("level"),
        term: formData.get("term"),
        amount: schemeOfWorkPrice
      })
    });

    const data = (await response.json()) as ApiResponse;
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Unable to start scheme purchase.");
      return;
    }

    if (data.data?.authorization_url) {
      window.location.href = data.data.authorization_url;
      return;
    }

    setMessage(data.data?.message ?? data.message ?? "Scheme purchase started.");
  }

  return (
    <form className="panel-stack" onSubmit={handleSubmit}>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="subject">Subject</label>
          <select id="subject" name="subject" defaultValue="Mathematics" required>
            {schemeSubjects.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="level">Level</label>
          <select id="level" name="level" defaultValue="Grade 7" required>
            {levels.map((level) => (
              <option key={level.id} value={level.title}>
                {level.title}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="term">Term</label>
          <select id="term" name="term" defaultValue="term-1" required>
            {schemeTerms.map((term) => (
              <option key={term.id} value={term.id}>
                {term.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="accountReference">Reference</label>
          <input id="accountReference" name="accountReference" placeholder="Teacher name or school" required />
        </div>
      </div>

      {error ? <div className="message message-error">{error}</div> : null}
      {message ? <div className="message message-success">{message}</div> : null}

      <button className="button" type="submit" disabled={loading}>
        {loading ? "Redirecting to Paystack..." : "Buy with Paystack"}
      </button>
    </form>
  );
}

type SelectedResource = {
  id: string;
  title: string;
  level: string;
  subject: string;
  section: ResourceSection;
  assessmentSet: AssessmentSet | null;
};

function getResourceLabel(resource: SelectedResource) {
  return resource.section === "assessment"
    ? `${resource.title} (${resource.assessmentSet ? resource.assessmentSet.replace("set-", "Set ") : "Assessment"})`
    : `${resource.title} (Notes)`;
}

export function ResourceCheckoutForm({ resource }: { resource: SelectedResource | null }) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const formData = new FormData(event.currentTarget);

    const response = await fetch("/api/materials/purchase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "resource",
        accountReference: formData.get("accountReference"),
        resourceId: formData.get("resourceId")
      })
    });

    const data = (await response.json()) as ApiResponse;
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Unable to start material purchase.");
      return;
    }

    if (data.data?.authorization_url) {
      window.location.href = data.data.authorization_url;
      return;
    }

    setMessage(data.data?.message ?? data.message ?? "Material purchase started.");
  }

  if (!resource) {
    return (
      <p className="subtle">
        Choose a note or assessment from a level page to buy it one time at KSh {teacherMaterialPrice}.
      </p>
    );
  }

  return (
    <form className="panel-stack" onSubmit={handleSubmit}>
      <input type="hidden" name="resourceId" value={resource.id} />

      <div className="dashboard-card">
        <h3>{getResourceLabel(resource)}</h3>
        <div className="resource-meta">
          <span>{resource.level}</span>
          <span>{resource.subject}</span>
        </div>
        <p className="subtle">One-time teacher purchase at KSh {teacherMaterialPrice} per material.</p>
      </div>

      <div className="field">
        <label htmlFor="material-accountReference">Reference</label>
        <input
          id="material-accountReference"
          name="accountReference"
          placeholder="Teacher name or school"
          required
        />
      </div>

      {error ? <div className="message message-error">{error}</div> : null}
      {message ? <div className="message message-success">{message}</div> : null}

      <button className="button" type="submit" disabled={loading}>
        {loading ? "Redirecting to Paystack..." : `Buy for KSh ${teacherMaterialPrice}`}
      </button>
    </form>
  );
}
