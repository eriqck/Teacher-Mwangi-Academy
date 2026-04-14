"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { teacherLessonPlanPrice } from "@/lib/business";
import type { LessonPlanUnit } from "@/lib/lesson-plan-curriculum";

type LessonPlanGeneratorFormProps = {
  levelId: string;
  levelTitle: string;
  subject: string;
  units: LessonPlanUnit[];
  canGenerate?: boolean;
  authRedirectPath?: string;
};

function getSubStrandId(unitId: string, subStrand: string) {
  return `${unitId}::${subStrand}`;
}

export function LessonPlanGeneratorForm({
  levelId,
  levelTitle,
  subject,
  units,
  canGenerate = false,
  authRedirectPath = "/teacher-tools/lesson-plans"
}: LessonPlanGeneratorFormProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [isPending, startTransition] = useTransition();

  const totalSelected = selectedIds.length;
  const totalCost = totalSelected > 0 ? teacherLessonPlanPrice : 0;

  const selectedUnitTitle = useMemo(() => {
    const firstUnit = units.find((unit) =>
      unit.subStrands.some((subStrand) => selectedIds.includes(getSubStrandId(unit.id, subStrand)))
    );
    return firstUnit?.title ?? "Selected unit";
  }, [selectedIds, units]);

  function toggleUnit(unit: LessonPlanUnit, checked: boolean) {
    setShowAuthPrompt(false);
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
    const id = getSubStrandId(unitId, subStrand);
    setSelectedIds((current) =>
      checked ? Array.from(new Set([...current, id])) : current.filter((entry) => entry !== id)
    );
  }

  async function handleSubmit() {
    if (selectedIds.length === 0) {
      setError("Select at least one strand or substrand first.");
      return;
    }

    if (!canGenerate) {
      setShowAuthPrompt(true);
      setError("Sign in or create a teacher account to generate this lesson plan.");
      return;
    }

    setError(null);

    startTransition(async () => {
      const selectedSubStrands = units.flatMap((unit) =>
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
          subStrands: selectedSubStrands
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
        window.location.href = data.data.authorization_url;
        return;
      }

      setError(data.data?.message ?? "Unable to continue to M-Pesa right now.");
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
        Total Cost: <strong>KSh {totalCost}</strong> ({teacherLessonPlanPrice}/= per lesson plan)
      </p>

      <div className="lesson-plan-unit-list">
        {units.map((unit) => {
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
            <Link href={`/login?next=${encodeURIComponent(authRedirectPath)}`} className="button">
              Sign in to generate
            </Link>
            <Link href={`/signup?next=${encodeURIComponent(authRedirectPath)}`} className="button-secondary">
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
          {isPending ? "Redirecting to M-Pesa..." : `Generate Lesson Plan · Pay KSh ${teacherLessonPlanPrice}`}
        </button>
      </div>
    </section>
  );
}
