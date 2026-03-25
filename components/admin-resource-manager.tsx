"use client";

import { useState } from "react";
import { levels } from "@/lib/catalog";
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

type ResourceManagerProps = {
  initialResources: ResourceRecord[];
};

type ResourceFormState = {
  title: string;
  description: string;
  level: string;
  subject: string;
  audience: "parent" | "teacher" | "both";
  section: ResourceSection;
  assessmentSet: AssessmentSet | "";
  term: SchemeTerm | "";
};

function buildFormState(resource: ResourceRecord): ResourceFormState {
  return {
    title: resource.title,
    description: resource.description,
    level: resource.level,
    subject: resource.subject,
    audience: resource.audience,
    section: resource.section ?? "notes",
    assessmentSet: resource.assessmentSet ?? "",
    term: resource.term ?? "term-1"
  };
}

function getResourceTypeLabel(resource: ResourceRecord) {
  if (resource.category === "scheme-of-work") {
    return `${getSchemeTermLabel(resource.term)} scheme of work`;
  }

  return resource.section === "assessment" ? "Assessment" : "Notes";
}

export function AdminResourceManager({ initialResources }: ResourceManagerProps) {
  const [resources, setResources] = useState(initialResources);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [formState, setFormState] = useState<ResourceFormState | null>(null);

  const sortedResources = [...resources].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt)
  );

  function startEditing(resource: ResourceRecord) {
    setEditingId(resource.id);
    setFormState(buildFormState(resource));
    setError("");
    setMessage("");
  }

  function cancelEditing() {
    setEditingId(null);
    setFormState(null);
    setError("");
  }

  async function handleSave(resource: ResourceRecord) {
    if (!formState) return;

    setSavingId(resource.id);
    setError("");
    setMessage("");

    const response = await fetch(`/api/admin/resources/${resource.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        title: formState.title,
        description: formState.description,
        level: formState.level,
        subject: formState.subject,
        audience: resource.category === "scheme-of-work" ? "teacher" : formState.audience,
        section: resource.category === "scheme-of-work" ? "notes" : formState.section,
        assessmentSet:
          resource.category === "scheme-of-work"
            ? null
            : formState.section === "assessment"
              ? formState.assessmentSet
              : null,
        term: resource.category === "scheme-of-work" ? formState.term : null
      })
    });

    const data = (await response.json()) as {
      ok?: boolean;
      error?: string;
      message?: string;
      resource?: ResourceRecord;
    };

    setSavingId(null);

    if (!response.ok || !data.resource) {
      setError(data.error ?? "Could not update the material.");
      return;
    }

    setResources((current) =>
      current.map((entry) => (entry.id === data.resource!.id ? data.resource! : entry))
    );
    setEditingId(null);
    setFormState(null);
    setMessage(data.message ?? "Material updated.");
  }

  async function handleDelete(resource: ResourceRecord) {
    const confirmed = window.confirm(`Delete "${resource.title}"? This cannot be undone.`);
    if (!confirmed) return;

    setDeletingId(resource.id);
    setError("");
    setMessage("");

    const response = await fetch(`/api/admin/resources/${resource.id}`, {
      method: "DELETE"
    });

    const data = (await response.json()) as { ok?: boolean; error?: string; message?: string };
    setDeletingId(null);

    if (!response.ok) {
      setError(data.error ?? "Could not delete the material.");
      return;
    }

    setResources((current) => current.filter((entry) => entry.id !== resource.id));
    if (editingId === resource.id) {
      setEditingId(null);
      setFormState(null);
    }
    setMessage(data.message ?? "Material deleted.");
  }

  return (
    <article className="dashboard-card">
      {error ? <div className="message message-error">{error}</div> : null}
      {message ? <div className="message message-success">{message}</div> : null}

      {sortedResources.length > 0 ? (
        <div className="resource-admin-list">
          {sortedResources.map((resource) => {
            const isEditing = editingId === resource.id && formState;
            const showAssessmentFields =
              resource.category === "revision-material" && formState?.section === "assessment";

            return (
              <section key={resource.id} className="resource-admin-card">
                <div className="resource-admin-head">
                  <div>
                    <h3>{resource.title}</h3>
                    <p className="subtle">
                      {resource.level} · {resource.subject} · {getResourceTypeLabel(resource)}
                    </p>
                  </div>
                  <div className="resource-admin-actions">
                    <a href={resource.fileUrl} target="_blank" rel="noreferrer" className="button-secondary">
                      Open file
                    </a>
                    <button
                      type="button"
                      className="button-secondary button-reset"
                      onClick={() => (isEditing ? cancelEditing() : startEditing(resource))}
                    >
                      {isEditing ? "Cancel" : "Edit"}
                    </button>
                    <button
                      type="button"
                      className="button-danger button-reset"
                      onClick={() => handleDelete(resource)}
                      disabled={deletingId === resource.id}
                    >
                      {deletingId === resource.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>

                {isEditing ? (
                  <form
                    className="panel-stack resource-edit-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void handleSave(resource);
                    }}
                  >
                    <div className="form-grid">
                      <div className="field">
                        <label htmlFor={`edit-title-${resource.id}`}>Title</label>
                        <input
                          id={`edit-title-${resource.id}`}
                          value={formState.title}
                          onChange={(event) =>
                            setFormState((current) =>
                              current ? { ...current, title: event.target.value } : current
                            )
                          }
                          required
                        />
                      </div>
                      <div className="field">
                        <label htmlFor={`edit-subject-${resource.id}`}>Subject</label>
                        <select
                          id={`edit-subject-${resource.id}`}
                          value={formState.subject}
                          onChange={(event) =>
                            setFormState((current) =>
                              current ? { ...current, subject: event.target.value } : current
                            )
                          }
                        >
                          {subjects.map((subject) => (
                            <option key={subject} value={subject}>
                              {subject}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="form-grid">
                      <div className="field">
                        <label htmlFor={`edit-level-${resource.id}`}>Level</label>
                        <select
                          id={`edit-level-${resource.id}`}
                          value={formState.level}
                          onChange={(event) =>
                            setFormState((current) =>
                              current ? { ...current, level: event.target.value } : current
                            )
                          }
                        >
                          {levels.map((level) => (
                            <option key={level.id} value={level.title}>
                              {level.title}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="field">
                        <label htmlFor={resource.category === "scheme-of-work" ? `edit-term-${resource.id}` : `edit-audience-${resource.id}`}>
                          {resource.category === "scheme-of-work" ? "School term" : "Audience"}
                        </label>
                        {resource.category === "scheme-of-work" ? (
                          <>
                            <select
                              id={`edit-term-${resource.id}`}
                              value={formState.term || "term-1"}
                              onChange={(event) =>
                                setFormState((current) =>
                                  current
                                    ? {
                                        ...current,
                                        term: event.target.value as SchemeTerm
                                      }
                                    : current
                                )
                              }
                            >
                              {schemeTerms.map((item) => (
                                <option key={item.id} value={item.id}>
                                  {item.label}
                                </option>
                              ))}
                            </select>
                            <small>Each scheme stays attached to one school term.</small>
                          </>
                        ) : (
                          <select
                            id={`edit-audience-${resource.id}`}
                            value={formState.audience}
                            onChange={(event) =>
                              setFormState((current) =>
                                current
                                  ? {
                                      ...current,
                                      audience: event.target.value as ResourceFormState["audience"]
                                    }
                                  : current
                              )
                            }
                          >
                            <option value="both">Parents and teachers</option>
                            <option value="parent">Parents only</option>
                            <option value="teacher">Teachers only</option>
                          </select>
                        )}
                      </div>
                    </div>

                    {resource.category === "revision-material" ? (
                      <div className="form-grid">
                        <div className="field">
                          <label htmlFor={`edit-section-${resource.id}`}>Content category</label>
                          <select
                            id={`edit-section-${resource.id}`}
                            value={formState.section}
                            onChange={(event) =>
                              setFormState((current) =>
                                current
                                  ? {
                                      ...current,
                                      section: event.target.value as ResourceSection,
                                      assessmentSet:
                                        event.target.value === "assessment"
                                          ? current.assessmentSet || "set-1"
                                          : ""
                                    }
                                  : current
                              )
                            }
                          >
                            <option value="notes">Notes</option>
                            <option value="assessment">Assessment</option>
                          </select>
                        </div>

                        <div className="field">
                          <label htmlFor={`edit-assessment-set-${resource.id}`}>Assessment set</label>
                          <select
                            id={`edit-assessment-set-${resource.id}`}
                            value={formState.assessmentSet || "set-1"}
                            disabled={!showAssessmentFields}
                            onChange={(event) =>
                              setFormState((current) =>
                                current
                                  ? {
                                      ...current,
                                      assessmentSet: event.target.value as AssessmentSet
                                    }
                                  : current
                              )
                            }
                          >
                            <option value="set-1">Set 1</option>
                            <option value="set-2">Set 2</option>
                            <option value="set-3">Set 3</option>
                          </select>
                          <small>
                            {showAssessmentFields
                              ? "Choose where the assessment should appear."
                              : "Used only when the content category is Assessment."}
                          </small>
                        </div>
                      </div>
                    ) : null}

                    <div className="field">
                      <label htmlFor={`edit-description-${resource.id}`}>Description</label>
                      <input
                        id={`edit-description-${resource.id}`}
                        value={formState.description}
                        onChange={(event) =>
                          setFormState((current) =>
                            current ? { ...current, description: event.target.value } : current
                          )
                        }
                        required
                      />
                    </div>

                    <div className="resource-edit-actions">
                      <button type="submit" className="button" disabled={savingId === resource.id}>
                        {savingId === resource.id ? "Saving..." : "Save changes"}
                      </button>
                      <button
                        type="button"
                        className="button-secondary button-reset"
                        onClick={cancelEditing}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : null}
              </section>
            );
          })}
        </div>
      ) : (
        <p className="subtle">No uploads yet. Add your first material above.</p>
      )}
    </article>
  );
}
