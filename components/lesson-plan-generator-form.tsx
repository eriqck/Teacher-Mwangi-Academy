"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { teacherLessonPlanPrice as lessonPlanUnitPrice } from "@/lib/business";
import { schemeTerms } from "@/lib/scheme-terms";
import type { LessonPlanUnit } from "@/lib/lesson-plan-curriculum";
import type { SchemeTerm } from "@/lib/store";

type LessonPlanGeneratorFormProps = {
  levelId: string;
  levelTitle: string;
  subject: string;
  unitsByTerm: Record<string, LessonPlanUnit[]>;
  canGenerate?: boolean;
  isAdmin?: boolean;
  authRedirectPath?: string;
};

type PersistedLessonPlanDraft = {
  selectedIds: string[];
  meta: LessonPlanMeta;
  pendingSubmit: boolean;
};

type LessonPlanMeta = {
  schoolName: string;
  roll: string;
  lessonTime: string;
  year: string;
  term: string;
  lessonDate: string;
  teacherName: string;
  tscNumber: string;
};

const today = new Date().toISOString().slice(0, 10);

const initialMeta: LessonPlanMeta = {
  schoolName: "",
  roll: "",
  lessonTime: "",
  year: `${new Date().getFullYear()}`,
  term: "",
  lessonDate: today,
  teacherName: "",
  tscNumber: ""
};

function getSubStrandId(unitId: string, subStrand: string) {
  return `${unitId}::${subStrand}`;
}

function getLessonPlanDraftStorageKey(path: string) {
  return `teacher-mwangi:lesson-plan-draft:${path}`;
}

function getTermId(value: string): SchemeTerm {
  const term = schemeTerms.find((item) => item.id === value || item.label === value);
  return term?.id ?? "term-1";
}

function getTermLabel(value: string) {
  return schemeTerms.find((item) => item.id === value || item.label === value)?.label ?? value;
}

export function LessonPlanGeneratorForm({
  levelId,
  levelTitle,
  subject,
  unitsByTerm,
  canGenerate = false,
  isAdmin = false,
  authRedirectPath = "/teacher-tools/lesson-plans"
}: LessonPlanGeneratorFormProps) {
  const draftStorageKey = useMemo(() => getLessonPlanDraftStorageKey(authRedirectPath), [authRedirectPath]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [meta, setMeta] = useState<LessonPlanMeta>(initialMeta);
  const [error, setError] = useState<string | null>(null);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [pendingAuthResume, setPendingAuthResume] = useState(false);
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);
  const [isPending, startTransition] = useTransition();
  const hasTriggeredResumeRef = useRef(false);

  const selectedTermId = getTermId(meta.term);
  const activeUnits = meta.term ? unitsByTerm[selectedTermId] ?? [] : [];
  const totalSelected = selectedIds.length;
  const totalCost = totalSelected * lessonPlanUnitPrice;
  const teacherLessonPlanPrice = totalCost;

  const selectedUnitTitle = useMemo(() => {
    const firstUnit = activeUnits.find((unit) =>
      unit.subStrands.some((subStrand) => selectedIds.includes(getSubStrandId(unit.id, subStrand)))
    );
    return firstUnit?.title ?? "Selected unit";
  }, [activeUnits, selectedIds]);

  function persistDraft(pendingSubmit: boolean) {
    if (typeof window === "undefined") {
      return;
    }

    const payload: PersistedLessonPlanDraft = {
      selectedIds,
      meta,
      pendingSubmit
    };

    window.sessionStorage.setItem(draftStorageKey, JSON.stringify(payload));
  }

  function clearDraft() {
    if (typeof window === "undefined") {
      return;
    }

    window.sessionStorage.removeItem(draftStorageKey);
  }

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const rawDraft = window.sessionStorage.getItem(draftStorageKey);

    if (!rawDraft) {
      setHasRestoredDraft(true);
      return;
    }

    try {
      const draft = JSON.parse(rawDraft) as PersistedLessonPlanDraft;
      setSelectedIds(draft.selectedIds);
      setMeta({ ...initialMeta, ...(draft.meta ?? {}) });
      setPendingAuthResume(draft.pendingSubmit);
    } catch {
      window.sessionStorage.removeItem(draftStorageKey);
    } finally {
      setHasRestoredDraft(true);
    }
  }, [draftStorageKey]);

  useEffect(() => {
    if (!hasRestoredDraft || typeof window === "undefined") {
      return;
    }

    const payload: PersistedLessonPlanDraft = {
      selectedIds,
      meta,
      pendingSubmit: pendingAuthResume
    };

    window.sessionStorage.setItem(draftStorageKey, JSON.stringify(payload));
  }, [draftStorageKey, hasRestoredDraft, meta, pendingAuthResume, selectedIds]);

  function updateMeta<K extends keyof LessonPlanMeta>(key: K, value: LessonPlanMeta[K]) {
    setShowAuthPrompt(false);
    setPendingAuthResume(false);
    if (key === "term") {
      setSelectedIds([]);
    }
    setMeta((current) => ({ ...current, [key]: value }));
  }

  function toggleUnit(unit: LessonPlanUnit, checked: boolean) {
    setShowAuthPrompt(false);
    setPendingAuthResume(false);
    const unitIds = unit.subStrands.map((subStrand) => getSubStrandId(unit.id, subStrand));
    setSelectedIds((current) => {
      if (checked) {
        return Array.from(new Set([...current, ...unitIds]));
      }
      return current.filter((id) => !unitIds.includes(id));
    });
  }

  function toggleSubStrand(unitId: string, subStrand: string, checked: boolean) {
    setShowAuthPrompt(false);
    setPendingAuthResume(false);
    const id = getSubStrandId(unitId, subStrand);
    setSelectedIds((current) =>
      checked ? Array.from(new Set([...current, id])) : current.filter((entry) => entry !== id)
    );
  }

  async function submitLessonPlanGeneration() {
    const selectedSubStrands = activeUnits.flatMap((unit) =>
      unit.subStrands.filter((subStrand) => selectedIds.includes(getSubStrandId(unit.id, subStrand)))
    );

    const response = await fetch("/api/tools/lesson-plans", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        level: levelId,
        subject,
        unitTitle: selectedUnitTitle,
        subStrands: selectedSubStrands,
        schoolName: meta.schoolName.trim(),
        roll: meta.roll.trim(),
        lessonTime: meta.lessonTime.trim(),
        year: meta.year.trim(),
        term: getTermLabel(meta.term.trim()),
        lessonDate: meta.lessonDate,
        teacherName: meta.teacherName.trim(),
        tscNumber: meta.tscNumber.trim()
      })
    });

    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
      data?: { authorization_url?: string | null; message?: string };
    };

    if (!response.ok) {
      setError(data.error ?? "Unable to start lesson-plan generation right now.");
      return;
    }

    if (data.data?.authorization_url) {
      clearDraft();
      window.location.href = data.data.authorization_url;
      return;
    }

    setError(data.data?.message ?? "Unable to continue to M-Pesa right now.");
  }

  useEffect(() => {
    if (!hasRestoredDraft || !canGenerate || !pendingAuthResume || hasTriggeredResumeRef.current) {
      return;
    }

    hasTriggeredResumeRef.current = true;
    setShowAuthPrompt(false);
    setError(null);
    setPendingAuthResume(false);

    startTransition(async () => {
      await submitLessonPlanGeneration();
    });
  }, [canGenerate, hasRestoredDraft, pendingAuthResume]);

  async function handleSubmit() {
    if (!meta.term) {
      setError("Select the term first so the bot can show the correct strands and substrands.");
      return;
    }

    if (selectedIds.length === 0) {
      setError("Select at least one strand or substrand first.");
      return;
    }

    if (!canGenerate) {
      setPendingAuthResume(true);
      setShowAuthPrompt(true);
      setError("Sign in or create a teacher account to generate this lesson plan.");
      persistDraft(true);
      return;
    }

    setPendingAuthResume(false);
    setError(null);

    startTransition(async () => {
      await submitLessonPlanGeneration();
    });
  }

  return (
    <section className="teacher-tools-card lesson-plan-selector-card">
      <div className="teacher-tools-section-head">
        <div>
          <span className="eyebrow">Lesson plan generation</span>
          <h2>Select Strands/Substrands: {levelTitle} - {subject}</h2>
        </div>
      </div>

      <p className="lesson-plan-cost">
        Total Cost: <strong>KSh {totalCost}</strong> ({lessonPlanUnitPrice}/= per lesson plan)
      </p>

      <div className="scheme-wizard-card lesson-plan-meta-card">
        <div className="scheme-wizard-head">
          <h3>Lesson Plan Details</h3>
          <p>Fill these fields so the generated lesson plan header is complete.</p>
        </div>

        <div className="scheme-wizard-grid">
          <label className="field">
            <span>School</span>
            <input
              value={meta.schoolName}
              onChange={(event) => updateMeta("schoolName", event.target.value)}
              placeholder="Eg. Upendo Senior School"
            />
          </label>

          <label className="field">
            <span>Roll</span>
            <input
              value={meta.roll}
              onChange={(event) => updateMeta("roll", event.target.value)}
              placeholder="Eg. 20 boys and 10 girls"
            />
          </label>

          <label className="field">
            <span>Time</span>
            <input
              value={meta.lessonTime}
              onChange={(event) => updateMeta("lessonTime", event.target.value)}
              placeholder="Eg. 8.00 AM - 8.40 AM"
            />
          </label>

          <label className="field">
            <span>Year</span>
            <input
              value={meta.year}
              onChange={(event) => updateMeta("year", event.target.value)}
              placeholder="Eg. 2026"
            />
          </label>

          <label className="field">
            <span>Term</span>
            <select value={meta.term} onChange={(event) => updateMeta("term", event.target.value)}>
              <option value="">--- Select Term ---</option>
              {schemeTerms.map((term) => (
                <option key={term.id} value={term.id}>
                  {term.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Date</span>
            <input
              type="date"
              value={meta.lessonDate}
              onChange={(event) => updateMeta("lessonDate", event.target.value)}
            />
          </label>

          <label className="field">
            <span>Teacher's Name</span>
            <input
              value={meta.teacherName}
              onChange={(event) => updateMeta("teacherName", event.target.value)}
              placeholder="Eg. Mr Mwangi"
            />
          </label>

          <label className="field">
            <span>TSC No.</span>
            <input
              value={meta.tscNumber}
              onChange={(event) => updateMeta("tscNumber", event.target.value)}
              placeholder="Eg. 6390178"
            />
          </label>
        </div>
      </div>

      {!meta.term ? (
        <p className="message message-info">Select a term to load the correct strands and substrands.</p>
      ) : null}

      <div className="lesson-plan-unit-list">
        {activeUnits.map((unit) => {
          const unitIds = unit.subStrands.map((subStrand) => getSubStrandId(unit.id, subStrand));
          const checkedCount = unitIds.filter((id) => selectedIds.includes(id)).length;
          const allChecked = checkedCount === unitIds.length && unitIds.length > 0;

          return (
            <article key={unit.id} className="lesson-plan-unit-card">
              <div className="lesson-plan-unit-head">
                <label className="scheme-inline-check scheme-inline-check--strong">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    onChange={(event) => toggleUnit(unit, event.target.checked)}
                  />
                  <span>{unit.title} ({unit.subStrands.length} substrands)</span>
                </label>
              </div>

              <div className="lesson-plan-substrand-list">
                {unit.subStrands.map((subStrand) => {
                  const id = getSubStrandId(unit.id, subStrand);
                  return (
                    <label key={id} className="scheme-inline-check lesson-plan-substrand-row">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(id)}
                        onChange={(event) => toggleSubStrand(unit.id, subStrand, event.target.checked)}
                      />
                      <span>{subStrand}</span>
                    </label>
                  );
                })}
              </div>
            </article>
          );
        })}
      </div>

      {error ? <p className="message message-error">{error}</p> : null}
      {showAuthPrompt ? (
        <div className="teacher-tools-unlock-box">
          <p className="subtle">
            You can explore the lesson-plan flow freely, but signing in is required before generation starts.
          </p>
          <div className="hero-actions">
            <Link
              href={`/login?next=${encodeURIComponent(authRedirectPath)}`}
              className="button"
              onClick={() => persistDraft(true)}
            >
              Sign in to generate
            </Link>
            <Link
              href={`/signup?next=${encodeURIComponent(authRedirectPath)}`}
              className="button-secondary"
              onClick={() => persistDraft(true)}
            >
              Create teacher account
            </Link>
          </div>
        </div>
      ) : null}

      <div className="scheme-step-actions">
        <button
          type="button"
          className="teacher-tools-action teacher-tools-action--primary"
          onClick={handleSubmit}
          disabled={isPending}
        >
          {isPending
            ? isAdmin
              ? "Generating lesson plan..."
              : "Redirecting to M-Pesa..."
            : isAdmin
              ? "Generate Lesson Plan"
              : `Generate Lesson Plan · Pay KSh ${teacherLessonPlanPrice}`}
        </button>
      </div>
    </section>
  );
}
