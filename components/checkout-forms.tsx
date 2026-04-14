"use client";

import { useState } from "react";
import { getAssessmentSetLabel } from "@/lib/assessment-sets";
import { schemeOfWorkPrice, teacherMaterialPrice } from "@/lib/business";
import { getSchemeTermLabel } from "@/lib/scheme-terms";
import type { AssessmentSet, ResourceSection, SchemeTerm } from "@/lib/store";

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
      </div>

      <div className="field">
        <label htmlFor="level-access-summary">Level access</label>
        <input
          id="level-access-summary"
          value="All levels unlocked with this monthly plan"
          readOnly
        />
        <small>
          {role === "teacher"
            ? "Teacher subscriptions automatically unlock all revision levels."
            : "Parent subscriptions now unlock all revision levels too."}
        </small>
      </div>

      {error ? <div className="message message-error">{error}</div> : null}
      {message ? <div className="message message-success">{message}</div> : null}

      <button className="button button-buy" type="submit" disabled={loading}>
        {loading ? "Redirecting to M-Pesa..." : "Continue to M-Pesa"}
      </button>
    </form>
  );
}

type SelectedScheme = {
  id: string;
  title: string;
  level: string;
  subject: string;
  term: SchemeTerm | null;
};

function getUniqueValues(values: string[]) {
  return Array.from(new Set(values));
}

export function SchemeCheckoutForm({
  schemes,
  selectedScheme
}: {
  schemes: SelectedScheme[];
  selectedScheme: SelectedScheme | null;
}) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const selectableSchemes = schemes.filter(
    (scheme): scheme is SelectedScheme & { term: SchemeTerm } => scheme.term !== null
  );
  const isPinnedLegacyScheme = !!selectedScheme && selectedScheme.term === null;
  const initialScheme =
    (selectedScheme
      ? selectableSchemes.find((scheme) => scheme.id === selectedScheme.id) ?? null
      : null) ??
    selectableSchemes[0] ??
    null;
  const [selectedSchemeId, setSelectedSchemeId] = useState(initialScheme?.id ?? "");
  const activeScheme = isPinnedLegacyScheme
    ? selectedScheme
    : selectableSchemes.find((scheme) => scheme.id === selectedSchemeId) ?? initialScheme;

  function getSubjectsForLevel(level: string) {
    return getUniqueValues(
      selectableSchemes
        .filter((scheme) => scheme.level === level)
        .map((scheme) => scheme.subject)
    );
  }

  function getTermsForSelection(level: string, subject: string) {
    return getUniqueValues(
      selectableSchemes
        .filter((scheme) => scheme.level === level && scheme.subject === subject)
        .map((scheme) => scheme.term)
    ) as SchemeTerm[];
  }

  function getSchemesForSelection(level: string, subject: string, term: SchemeTerm) {
    return selectableSchemes.filter(
      (scheme) => scheme.level === level && scheme.subject === subject && scheme.term === term
    );
  }

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
        resourceId: formData.get("resourceId")
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

  if (!activeScheme) {
    return (
      <p className="subtle">
        No schemes of work have been uploaded yet. Upload a scheme first, then it will appear here automatically.
      </p>
    );
  }

  const subjectOptions = isPinnedLegacyScheme ? [] : getSubjectsForLevel(activeScheme.level);
  const termOptions =
    isPinnedLegacyScheme || !activeScheme.term
      ? []
      : getTermsForSelection(activeScheme.level, activeScheme.subject);
  const matchingSchemes =
    isPinnedLegacyScheme || !activeScheme.term
      ? []
      : getSchemesForSelection(activeScheme.level, activeScheme.subject, activeScheme.term);

  function handleLevelChange(nextLevel: string) {
    const nextSubject = getSubjectsForLevel(nextLevel)[0] ?? "";
    const nextTerm = nextSubject ? getTermsForSelection(nextLevel, nextSubject)[0] ?? null : null;
    const nextScheme =
      nextSubject && nextTerm
        ? getSchemesForSelection(nextLevel, nextSubject, nextTerm)[0] ?? null
        : null;
    setSelectedSchemeId(nextScheme?.id ?? "");
  }

  function handleSubjectChange(nextSubject: string) {
    const nextTerm = getTermsForSelection(activeScheme.level, nextSubject)[0] ?? null;
    const nextScheme =
      nextTerm
        ? getSchemesForSelection(activeScheme.level, nextSubject, nextTerm)[0] ?? null
        : null;
    setSelectedSchemeId(nextScheme?.id ?? "");
  }

  function handleTermChange(nextTerm: SchemeTerm) {
    const nextScheme =
      getSchemesForSelection(activeScheme.level, activeScheme.subject, nextTerm)[0] ?? null;
    setSelectedSchemeId(nextScheme?.id ?? "");
  }

  return (
    <form className="panel-stack" onSubmit={handleSubmit}>
      <input type="hidden" name="resourceId" value={activeScheme.id} />

      <div className="dashboard-card">
        <h3>{activeScheme.title}</h3>
        <div className="resource-meta">
          <span>{activeScheme.level}</span>
          <span>{activeScheme.subject}</span>
          <span>{getSchemeTermLabel(activeScheme.term)}</span>
        </div>
        <p className="subtle">One-time teacher purchase at KSh {schemeOfWorkPrice} for this exact scheme.</p>
      </div>

      {!isPinnedLegacyScheme ? (
        <div className="form-grid">
          <div className="field">
            <label htmlFor="scheme-level">Level</label>
            <select
              id="scheme-level"
              value={activeScheme.level}
              onChange={(event) => handleLevelChange(event.target.value)}
              required
            >
              {getUniqueValues(selectableSchemes.map((scheme) => scheme.level)).map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="scheme-subject">Subject</label>
            <select
              id="scheme-subject"
              value={activeScheme.subject}
              onChange={(event) => handleSubjectChange(event.target.value)}
              required
            >
              {subjectOptions.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="scheme-term">Term</label>
            <select
              id="scheme-term"
              value={activeScheme.term ?? ""}
              onChange={(event) => handleTermChange(event.target.value as SchemeTerm)}
              required
            >
              {termOptions.map((term) => (
                <option key={term} value={term}>
                  {getSchemeTermLabel(term)}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="scheme-file">Available scheme</label>
            <select
              id="scheme-file"
              value={activeScheme.id}
              onChange={(event) => setSelectedSchemeId(event.target.value)}
              required
            >
              {matchingSchemes.map((scheme) => (
                <option key={scheme.id} value={scheme.id}>
                  {scheme.title}
                </option>
              ))}
            </select>
            <small>Only subjects and terms with uploaded schemes appear in these lists.</small>
          </div>
        </div>
      ) : (
        <p className="subtle">
          This scheme is an older upload without a saved term, so checkout is pinned to the exact file you selected.
        </p>
      )}

      <div className="form-grid">
        <div className="field">
          <label htmlFor="accountReference">Reference</label>
          <input id="accountReference" name="accountReference" placeholder="Teacher name or school" required />
        </div>
      </div>

      {error ? <div className="message message-error">{error}</div> : null}
      {message ? <div className="message message-success">{message}</div> : null}

      <button className="button button-buy" type="submit" disabled={loading}>
        {loading ? "Redirecting to M-Pesa..." : `Buy selected scheme for KSh ${schemeOfWorkPrice}`}
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
  audience: "parent" | "teacher" | "both";
};

function getResourceLabel(resource: SelectedResource) {
  return resource.section === "assessment"
    ? `${resource.title} (${getAssessmentSetLabel(resource.assessmentSet)})`
    : `${resource.title} (Notes)`;
}

export function ResourceCheckoutForm({
  resource,
  buyerRole
}: {
  resource: SelectedResource | null;
  buyerRole: "parent" | "teacher" | "admin";
}) {
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
        Choose an eligible note or assessment from a level page to buy it one time at KSh {teacherMaterialPrice}.
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
        <p className="subtle">
          One-time {buyerRole === "parent" ? "parent" : "teacher"} purchase at KSh {teacherMaterialPrice} per material.
        </p>
      </div>

      <div className="field">
        <label htmlFor="material-accountReference">Reference</label>
        <input
          id="material-accountReference"
          name="accountReference"
          placeholder={buyerRole === "parent" ? "Parent name or learner name" : "Teacher name or school"}
          required
        />
      </div>

      {error ? <div className="message message-error">{error}</div> : null}
      {message ? <div className="message message-success">{message}</div> : null}

      <button className="button button-buy" type="submit" disabled={loading}>
        {loading ? "Redirecting to M-Pesa..." : `Buy for KSh ${teacherMaterialPrice}`}
      </button>
    </form>
  );
}
