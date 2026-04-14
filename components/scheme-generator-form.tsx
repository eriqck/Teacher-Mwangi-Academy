"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { levels } from "@/lib/catalog";
import { teacherSchemeGenerationPrice } from "@/lib/business";
import { schemeTerms } from "@/lib/scheme-terms";

const defaultLevel = levels[0]?.id ?? "grade-6";

function defaultSubjectForLevel(levelId: string) {
  return levels.find((entry) => entry.id === levelId)?.subjects[0] ?? "";
}

type SchemeGeneratorFormState = {
  schoolName: string;
  className: string;
  level: string;
  subject: string;
  term: string;
  strand: string;
  subStrand: string;
  weeksCount: number;
  lessonsPerWeek: number;
  learningOutcomes: string;
  keyInquiryQuestions: string;
  coreCompetencies: string;
  values: string;
  pertinentIssues: string;
  resources: string;
  assessmentMethods: string;
  notes: string;
};

const initialState: SchemeGeneratorFormState = {
  schoolName: "",
  className: "",
  level: defaultLevel,
  subject: defaultSubjectForLevel(defaultLevel),
  term: "term-1",
  strand: "",
  subStrand: "",
  weeksCount: 12,
  lessonsPerWeek: 3,
  learningOutcomes: "",
  keyInquiryQuestions: "",
  coreCompetencies: "Critical thinking and problem solving\nCommunication and collaboration",
  values: "Responsibility\nRespect",
  pertinentIssues: "Citizenship\nHealth education",
  resources: "Course book\nTeacher guide",
  assessmentMethods: "Observation\nOral questions\nShort written exercise",
  notes: ""
};

export function SchemeGeneratorForm() {
  const router = useRouter();
  const [formState, setFormState] = useState(initialState);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const availableSubjects = useMemo(
    () => levels.find((entry) => entry.id === formState.level)?.subjects ?? [],
    [formState.level]
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const response = await fetch("/api/tools/schemes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formState)
      });

      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        data?: {
          authorization_url?: string | null;
          message?: string;
        };
      };

      if (!response.ok) {
        setError(data.error ?? "Unable to generate a scheme right now.");
        return;
      }

      if (data.data?.authorization_url) {
        window.location.href = data.data.authorization_url;
        return;
      }

      setError(data.data?.message ?? "Unable to start scheme checkout right now.");
    });
  }

  function updateField<K extends keyof SchemeGeneratorFormState>(
    key: K,
    value: SchemeGeneratorFormState[K]
  ) {
    setFormState((current) => ({ ...current, [key]: value }));
  }

  return (
    <form className="scheme-generator-form" onSubmit={handleSubmit}>
      <div className="form-grid">
        <label className="field">
          <span>School name</span>
          <input
            value={formState.schoolName}
            onChange={(event) => updateField("schoolName", event.target.value)}
            placeholder="Teacher Mwangi Academy"
          />
        </label>

        <label className="field">
          <span>Class / stream</span>
          <input
            value={formState.className}
            onChange={(event) => updateField("className", event.target.value)}
            placeholder="North Stream"
          />
        </label>

        <label className="field">
          <span>Level</span>
          <select
            value={formState.level}
            onChange={(event) => {
              const level = event.target.value;
              updateField("level", level);
              updateField("subject", defaultSubjectForLevel(level));
            }}
          >
            {levels.map((level) => (
              <option key={level.id} value={level.id}>
                {level.title}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Subject</span>
          <input
            list="scheme-subject-suggestions"
            value={formState.subject}
            onChange={(event) => updateField("subject", event.target.value)}
            placeholder="Mathematics"
            required
          />
          <datalist id="scheme-subject-suggestions">
            {availableSubjects.map((subject) => (
              <option key={subject} value={subject} />
            ))}
          </datalist>
        </label>

        <label className="field">
          <span>Term</span>
          <select
            value={formState.term}
            onChange={(event) => updateField("term", event.target.value)}
          >
            {schemeTerms.map((term) => (
              <option key={term.id} value={term.id}>
                {term.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Weeks in term</span>
          <input
            type="number"
            min={1}
            max={20}
            value={formState.weeksCount}
            onChange={(event) => updateField("weeksCount", Number(event.target.value))}
            required
          />
        </label>

        <label className="field">
          <span>Lessons per week</span>
          <input
            type="number"
            min={1}
            max={10}
            value={formState.lessonsPerWeek}
            onChange={(event) => updateField("lessonsPerWeek", Number(event.target.value))}
            required
          />
        </label>

        <label className="field">
          <span>Strand</span>
          <input
            value={formState.strand}
            onChange={(event) => updateField("strand", event.target.value)}
            placeholder="Number"
            required
          />
        </label>
      </div>

      <div className="form-grid">
        <label className="field">
          <span>Sub-strand</span>
          <input
            value={formState.subStrand}
            onChange={(event) => updateField("subStrand", event.target.value)}
            placeholder="Fractions"
            required
          />
        </label>

        <label className="field">
          <span>Learning outcomes</span>
          <textarea
            rows={5}
            value={formState.learningOutcomes}
            onChange={(event) => updateField("learningOutcomes", event.target.value)}
            placeholder={"One outcome per line\nSolve practical fraction problems"}
            required
          />
        </label>

        <label className="field">
          <span>Key inquiry questions</span>
          <textarea
            rows={5}
            value={formState.keyInquiryQuestions}
            onChange={(event) => updateField("keyInquiryQuestions", event.target.value)}
            placeholder={"One question per line\nHow are fractions used in real life?"}
          />
        </label>
      </div>

      <div className="form-grid">
        <label className="field">
          <span>Core competencies</span>
          <textarea
            rows={4}
            value={formState.coreCompetencies}
            onChange={(event) => updateField("coreCompetencies", event.target.value)}
          />
        </label>

        <label className="field">
          <span>Values</span>
          <textarea
            rows={4}
            value={formState.values}
            onChange={(event) => updateField("values", event.target.value)}
          />
        </label>

        <label className="field">
          <span>Pertinent issues</span>
          <textarea
            rows={4}
            value={formState.pertinentIssues}
            onChange={(event) => updateField("pertinentIssues", event.target.value)}
          />
        </label>
      </div>

      <div className="form-grid">
        <label className="field">
          <span>Learning resources</span>
          <textarea
            rows={4}
            value={formState.resources}
            onChange={(event) => updateField("resources", event.target.value)}
          />
        </label>

        <label className="field">
          <span>Assessment methods</span>
          <textarea
            rows={4}
            value={formState.assessmentMethods}
            onChange={(event) => updateField("assessmentMethods", event.target.value)}
          />
        </label>

        <label className="field">
          <span>Teacher notes / remarks</span>
          <textarea
            rows={4}
            value={formState.notes}
            onChange={(event) => updateField("notes", event.target.value)}
            placeholder="Optional notes to carry into each weekly remark."
          />
        </label>
      </div>

      {error ? <p className="message message-error">{error}</p> : null}

      <div className="scheme-generator-actions">
        <button type="submit" className="button" disabled={isPending}>
          {isPending ? "Redirecting to M-Pesa..." : `Pay KSh ${teacherSchemeGenerationPrice} and generate scheme`}
        </button>
      </div>
    </form>
  );
}
