"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { assessmentSets } from "@/lib/assessment-sets";
import { schemeOfWorkPrice } from "@/lib/business";
import { levels } from "@/lib/catalog";
import { schemeTerms } from "@/lib/scheme-terms";

type UploadVariant = "revision-material" | "scheme-of-work";

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

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(
  input: RequestInfo | URL,
  init: RequestInit,
  options?: {
    retries?: number;
    retryOnResponse?: boolean;
  }
) {
  const retries = options?.retries ?? 2;
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(input, init);

      if (
        options?.retryOnResponse &&
        !response.ok &&
        attempt < retries &&
        response.status >= 500
      ) {
        await wait(350 * (attempt + 1));
        continue;
      }

      return response;
    } catch (error) {
      lastError = error;

      if (attempt === retries) {
        throw error;
      }

      await wait(350 * (attempt + 1));
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Request failed.");
}

export function AdminUploadForm({ variant }: { variant: UploadVariant }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const isScheme = variant === "scheme-of-work";
  const [section, setSection] = useState("notes");
  const [term, setTerm] = useState("term-1");
  const showAssessmentSet = !isScheme && section === "assessment";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const formData = new FormData(form);
      formData.set("category", variant);

      const file = formData.get("file");

      if (!(file instanceof File) || file.size === 0) {
        setError("Please choose a file to upload.");
        return;
      }

      let response: Response;

      const prepareResponse = await fetchWithRetry("/api/admin/resources/upload-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          category: variant,
          fileName: file.name
        })
      }, {
        retries: 2,
        retryOnResponse: true
      });

      const prepareData = (await prepareResponse.json().catch(() => null)) as
        | {
            ok?: boolean;
            error?: string;
            signedUrl?: string;
            storagePath?: string;
            fileUrl?: string;
          }
        | null;

      const canUseDirectUpload = Boolean(prepareResponse.ok && prepareData?.signedUrl && prepareData?.storagePath);

      if (canUseDirectUpload && prepareData?.signedUrl && prepareData.storagePath) {
        const uploadFormData = new FormData();
        uploadFormData.append("cacheControl", "3600");
        uploadFormData.append("", file);

        try {
          const storageResponse = await fetchWithRetry(prepareData.signedUrl, {
            method: "PUT",
            headers: {
              "x-upsert": "false"
            },
            body: uploadFormData
          }, {
            retries: 2,
            retryOnResponse: true
          });

          const storagePayload = (await storageResponse.json().catch(() => null)) as
            | { error?: string; message?: string }
            | null;

          if (!storageResponse.ok) {
            if (file.size > 4_000_000) {
              setError(
                storagePayload?.error ??
                  storagePayload?.message ??
                  "Direct upload to storage failed for this file."
              );
              return;
            }
          } else {
            formData.delete("file");
            formData.set("storagePath", prepareData.storagePath);
            formData.set("fileName", file.name);
            formData.set("mimeType", file.type || "application/octet-stream");
          }
        } catch (storageError) {
          if (file.size > 4_000_000) {
            setError(
              storageError instanceof Error
                ? `${storageError.message}. Check the Supabase bucket and try again.`
                : "Direct upload failed."
            );
            return;
          }
        }
      } else if (file.size > 4_000_000) {
        setError(
          prepareData?.error ??
            "Large-file upload could not be prepared. Confirm Supabase storage is configured."
        );
        return;
      }

      response = await fetchWithRetry("/api/admin/resources", {
        method: "POST",
        body: formData
      }, {
        retries: 2,
        retryOnResponse: true
      });

      const data = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string; message?: string }
        | null;

      if (!response.ok) {
        setError(data?.error ?? "Upload failed.");
        return;
      }

      setMessage(data?.message ?? "Upload complete.");
      form.reset();
      setSection("notes");
      setTerm("term-1");
      router.refresh();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="panel-stack" onSubmit={handleSubmit}>
      <div className="form-grid">
        <div className="field">
          <label htmlFor={`${variant}-title`}>Title</label>
          <input
            id={`${variant}-title`}
            name="title"
            defaultValue={isScheme ? "Scheme of Work" : ""}
            required
          />
        </div>
        <div className="field">
          <label htmlFor={`${variant}-subject`}>Subject</label>
          <input
            id={`${variant}-subject`}
            name="subject"
            defaultValue="Mathematics"
            list={`${variant}-subject-options`}
            placeholder="Type or choose a subject"
            required
          />
          <datalist id={`${variant}-subject-options`}>
            {subjects.map((subject) => (
              <option key={subject} value={subject} />
            ))}
          </datalist>
          <small>Type any missing subject or choose from the suggestions.</small>
        </div>
      </div>

      <div className="form-grid">
        <div className="field">
          <label htmlFor={`${variant}-level`}>Level</label>
          <select id={`${variant}-level`} name="level" defaultValue="Grade 7" required>
            {levels.map((level) => (
              <option key={level.id} value={level.title}>
                {level.title}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`${variant}-section`}>{isScheme ? "Resource type" : "Content category"}</label>
          {isScheme ? (
            <>
              <input value="Notes" readOnly />
              <small>Schemes of work stay as separate teacher resources.</small>
            </>
          ) : (
            <>
              <select
                id={`${variant}-section`}
                name="section"
                value={section}
                onChange={(event) => setSection(event.target.value)}
              >
                <option value="notes">Notes</option>
                <option value="assessment">Assessment</option>
              </select>
              <small>Each level will show Notes and Assessment separately.</small>
            </>
          )}
        </div>
      </div>

      {!isScheme ? (
        <div className="form-grid">
          <div className="field">
            <label htmlFor={`${variant}-assessment-set`}>Assessment set</label>
            <select
              id={`${variant}-assessment-set`}
              name="assessmentSet"
              defaultValue="set-1"
              disabled={!showAssessmentSet}
            >
              {assessmentSets.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
            <small>{showAssessmentSet ? "Choose where the assessment should appear." : "Used only when the content category is Assessment."}</small>
          </div>
          <div className="field">
            <label htmlFor={`${variant}-audience`}>Audience</label>
            <select id={`${variant}-audience`} name="audience" defaultValue="both">
              <option value="both">Parents and teachers</option>
              <option value="parent">Parents only</option>
              <option value="teacher">Teachers only</option>
            </select>
            <small>Use audience to control visibility.</small>
          </div>
        </div>
      ) : (
        <div className="form-grid">
          <div className="field">
            <label htmlFor={`${variant}-term`}>School term</label>
            <select
              id={`${variant}-term`}
              name="term"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
            >
              {schemeTerms.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
            <small>Each scheme is saved under Term 1, Term 2, or Term 3.</small>
          </div>

          <div className="field">
            <label htmlFor={`${variant}-audience`}>Audience</label>
            <input id={`${variant}-audience`} value="Teachers only" readOnly />
            <small>Schemes are always teacher-only and sold at KSh {schemeOfWorkPrice}.</small>
          </div>
        </div>
      )}

      <div className="field">
        <label htmlFor={`${variant}-description`}>Description</label>
        <input
          id={`${variant}-description`}
          name="description"
          placeholder={
            isScheme
              ? "Example: Term 2 weekly plan aligned to the subject sequence."
              : "Example: End-term revision pack with answers and topical practice."
          }
          required
        />
      </div>

      <div className="field">
        <label htmlFor={`${variant}-file`}>Upload file</label>
        <input id={`${variant}-file`} name="file" type="file" required />
        <small>PDF, DOCX, XLSX, images, and other common teaching files are supported.</small>
      </div>

      {error ? <div className="message message-error">{error}</div> : null}
      {message ? <div className="message message-success">{message}</div> : null}

      <button className="button" type="submit" disabled={loading}>
        {loading ? "Uploading..." : isScheme ? "Upload scheme of work" : "Upload revision material"}
      </button>
    </form>
  );
}
