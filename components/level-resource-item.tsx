"use client";

import Link from "next/link";
import { useState } from "react";
import { assessmentSets } from "@/lib/assessment-sets";
import { getSchemeTermLabel, schemeTerms } from "@/lib/scheme-terms";
import type { AssessmentSet, ResourceRecord, ResourceSection, SchemeTerm } from "@/lib/store";

const subjects = [
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
  "CRE",
  "Social Studies",
  "Agriculture",
  "Pre-Technical Studies"
];

type LevelResourceItemProps = {
  resource: ResourceRecord & {
    canOpen?: boolean;
    canPurchase?: boolean;
  };
  label: string;
  isAdmin: boolean;
  teacherMaterialPrice: number;
  loginHref: string;
};

type FormState = {
  title: string;
  description: string;
  subject: string;
  section: ResourceSection;
  assessmentSet: AssessmentSet | "";
  term: SchemeTerm;
};

function createFormState(resource: ResourceRecord): FormState {
  return {
    title: resource.title,
    description: resource.description,
    subject: resource.subject,
    section: resource.section ?? "notes",
    assessmentSet: resource.assessmentSet ?? "",
    term: resource.term ?? "term-1"
  };
}

function getMetaText(resource: ResourceRecord, label: string) {
  return `${resource.subject} - ${label}`;
}

export function LevelResourceItem({
  resource,
  label,
  isAdmin,
  teacherMaterialPrice,
  loginHref
}: LevelResourceItemProps) {
  const [currentResource, setCurrentResource] = useState(resource);
  const [deleted, setDeleted] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [formState, setFormState] = useState<FormState>(() => createFormState(resource));

  if (deleted) {
    return null;
  }

  const linkText = currentResource.fileName || currentResource.title;
  const meta = getMetaText(currentResource, label);
  const showAssessmentFields = formState.section === "assessment";

  async function handleSave() {
    setSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/resources/${currentResource.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: formState.title,
          description: formState.description,
          level: currentResource.level,
          subject: formState.subject,
          audience: currentResource.audience,
          section: formState.section,
          assessmentSet: formState.section === "assessment" ? formState.assessmentSet : null,
          term: formState.term
        })
      });

      const data = (await response.json()) as {
        resource?: ResourceRecord;
        error?: string;
      };

      if (!response.ok || !data.resource) {
        setError(data.error ?? "Could not update this material.");
        return;
      }

      setCurrentResource(data.resource);
      setFormState(createFormState(data.resource));
      setEditing(false);
    } catch {
      setError("Could not update this material right now.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(`Delete "${currentResource.fileName || currentResource.title}"?`);
    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/resources/${currentResource.id}`, {
        method: "DELETE"
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? "Could not delete this material.");
        return;
      }

      setDeleted(true);
    } catch {
      setError("Could not delete this material right now.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <li className="material-link-item material-link-item--managed">
      <div className="material-link-row">
        {currentResource.canOpen ? (
          <a
            href={currentResource.fileUrl}
            className="material-file-link"
            download={currentResource.fileName}
            target="_blank"
            rel="noreferrer"
          >
            <span className="material-file-badge">PDF</span>
            <span>
              <strong>{linkText}</strong>
              <small>{meta}</small>
            </span>
          </a>
        ) : currentResource.canPurchase ? (
          <Link href={`/purchases/materials/${currentResource.id}`} className="material-file-link material-file-link--locked">
            <span className="material-file-badge material-file-badge--buy">BUY</span>
            <span>
              <strong>{linkText}</strong>
              <small>{meta} - KSh {teacherMaterialPrice}</small>
            </span>
          </Link>
        ) : (
          <Link href={loginHref} className="material-file-link material-file-link--locked">
            <span className="material-file-badge material-file-badge--lock">LOCK</span>
            <span>
              <strong>{linkText}</strong>
              <small>{loginHref === "/subscribe" ? "Subscribe to unlock download" : "Sign in to unlock download"}</small>
            </span>
          </Link>
        )}

        {isAdmin ? (
          <div className="material-inline-actions">
            <button
              type="button"
              className="button-secondary button-reset material-inline-button"
              onClick={() => {
                setError("");
                setEditing((current) => !current);
              }}
            >
              {editing ? "Cancel" : "Update"}
            </button>
            <button
              type="button"
              className="button-danger button-reset material-inline-button"
              onClick={() => void handleDelete()}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        ) : null}
      </div>

      {isAdmin && editing ? (
        <div className="material-inline-editor">
          <div className="form-grid">
            <label className="field">
              <span>Title</span>
              <input
                value={formState.title}
                onChange={(event) => setFormState((current) => ({ ...current, title: event.target.value }))}
              />
            </label>

            <label className="field">
              <span>Subject</span>
              <input
                value={formState.subject}
                list={`level-resource-subjects-${currentResource.id}`}
                onChange={(event) => setFormState((current) => ({ ...current, subject: event.target.value }))}
              />
              <datalist id={`level-resource-subjects-${currentResource.id}`}>
                {subjects.map((subject) => (
                  <option key={subject} value={subject} />
                ))}
              </datalist>
            </label>
          </div>

          <div className="form-grid">
            <label className="field">
              <span>Term</span>
              <select
                value={formState.term}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, term: event.target.value as SchemeTerm }))
                }
              >
                {schemeTerms.map((term) => (
                  <option key={term.id} value={term.id}>
                    {term.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Category</span>
              <select
                value={formState.section}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    section: event.target.value as ResourceSection,
                    assessmentSet: event.target.value === "assessment" ? current.assessmentSet || "set-1" : ""
                  }))
                }
              >
                <option value="notes">Notes</option>
                <option value="assessment">Assessment</option>
              </select>
            </label>

            <label className="field">
              <span>Assessment set</span>
              <select
                value={formState.assessmentSet || "set-1"}
                disabled={!showAssessmentFields}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, assessmentSet: event.target.value as AssessmentSet }))
                }
              >
                {assessmentSets.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
              <small>{showAssessmentFields ? getSchemeTermLabel(formState.term) : "Only used for assessments."}</small>
            </label>
          </div>

          <label className="field">
            <span>Description</span>
            <input
              value={formState.description}
              onChange={(event) => setFormState((current) => ({ ...current, description: event.target.value }))}
            />
          </label>

          {error ? <div className="message message-error">{error}</div> : null}

          <div className="resource-edit-actions">
            <button
              type="button"
              className="button button-reset"
              onClick={() => void handleSave()}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      ) : null}
    </li>
  );
}
