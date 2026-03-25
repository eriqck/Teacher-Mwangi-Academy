"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { levels } from "@/lib/catalog";

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

export function AdminUploadForm({ variant }: { variant: UploadVariant }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const isScheme = variant === "scheme-of-work";
  const [section, setSection] = useState("notes");
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

      const prepareResponse = await fetch("/api/admin/resources/upload-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          category: variant,
          fileName: file.name
        })
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
          const storageResponse = await fetch(prepareData.signedUrl, {
            method: "PUT",
            headers: {
              "x-upsert": "false"
            },
            body: uploadFormData
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

      response = await fetch("/api/admin/resources", {
        method: "POST",
        body: formData
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
          <select id={`${variant}-subject`} name="subject" defaultValue="Mathematics" required>
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
              <option value="set-1">Set 1</option>
              <option value="set-2">Set 2</option>
              <option value="set-3">Set 3</option>
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
        <div className="field">
          <label htmlFor={`${variant}-audience`}>Audience</label>
          <input id={`${variant}-audience`} value="Teachers only" readOnly />
          <small>Schemes are always teacher-only and sold at KSh 30.</small>
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
