"use client";

import { useMemo, useState, useTransition } from "react";
import { teacherSchemeGenerationPrice } from "@/lib/business";
import {
  getLevelOptionsByStage,
  getReferenceBooksForSubject,
  getSchemeYearOptions,
  getTopicGroupsForScheme,
  type SchemeTopicGroup
} from "@/lib/scheme-curriculum";
import { levels } from "@/lib/catalog";
import { schemeTerms } from "@/lib/scheme-terms";
import type { SchemeTerm } from "@/lib/store";

type WizardStep = 1 | 2 | 3 | 4;

type BreakItem = {
  id: string;
  title: string;
  durationWeeks: string;
};

type SchemeGeneratorFormState = {
  schoolName: string;
  stage: "Junior School" | "Senior School" | "";
  level: string;
  subject: string;
  referenceBook: string;
  term: SchemeTerm | "";
  year: string;
  lessonsPerWeek: number;
  firstWeek: number;
  firstLesson: number;
  lastWeek: number;
  lastLesson: number;
  doubleLesson: string;
  noBreaks: boolean;
  breaks: BreakItem[];
};

const initialState: SchemeGeneratorFormState = {
  schoolName: "",
  stage: "",
  level: "",
  subject: "",
  referenceBook: "",
  term: "",
  year: `${new Date().getFullYear()}`,
  lessonsPerWeek: 5,
  firstWeek: 1,
  firstLesson: 1,
  lastWeek: 12,
  lastLesson: 5,
  doubleLesson: "",
  noBreaks: false,
  breaks: [
    {
      id: "break-1",
      title: "",
      durationWeeks: ""
    }
  ]
};

const defaultCoreCompetencies = [
  "Communication and collaboration",
  "Critical thinking and problem solving",
  "Learning to learn"
];

const defaultValues = [
  "Responsibility",
  "Respect",
  "Integrity"
];

const defaultPertinentIssues = [
  "Citizenship",
  "Health education",
  "Environmental awareness"
];

function getSubtopicId(topicId: string, subtopic: string) {
  return `${topicId}::${subtopic}`;
}

function getTopicSelection(subject: string, term: SchemeTerm | "") {
  if (!subject.trim() || !term) {
    return { topics: [], allIds: [] };
  }

  const topics = getTopicGroupsForScheme(subject, term);
  const allIds = topics.flatMap((topic) => topic.subtopics.map((subtopic) => getSubtopicId(topic.id, subtopic)));
  return { topics, allIds };
}

function getSelectedSubtopics(topicGroups: SchemeTopicGroup[], selectedSubtopicIds: string[]) {
  return topicGroups.flatMap((topic) =>
    topic.subtopics.filter((subtopic) => selectedSubtopicIds.includes(getSubtopicId(topic.id, subtopic)))
  );
}

function getSelectedTopicTitles(topicGroups: SchemeTopicGroup[], selectedSubtopicIds: string[]) {
  return topicGroups
    .filter((topic) =>
      topic.subtopics.some((subtopic) => selectedSubtopicIds.includes(getSubtopicId(topic.id, subtopic)))
    )
    .map((topic) => topic.title);
}

function makeBreakId(index: number) {
  return `break-${Date.now()}-${index}`;
}

export function SchemeGeneratorForm() {
  const [step, setStep] = useState<WizardStep>(1);
  const [formState, setFormState] = useState(initialState);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const initialTopicSelection = useMemo(
    () => getTopicSelection(initialState.subject, initialState.term),
    []
  );
  const [selectedSubtopicIds, setSelectedSubtopicIds] = useState<string[]>(initialTopicSelection.allIds);

  const levelOptions = useMemo(
    () => getLevelOptionsByStage(formState.stage),
    [formState.stage]
  );
  const stageOptions = [
    { id: "Junior School", label: "Junior School (Grade 6-9)" },
    { id: "Senior School", label: "Senior School (Grade 10 / Form 3 / Form 4)" }
  ] as const;
  const selectedLevel = useMemo(
    () => levels.find((entry) => entry.id === formState.level) ?? null,
    [formState.level]
  );
  const subjectOptions = selectedLevel?.subjects ?? [];
  const referenceBooks = useMemo(
    () => getReferenceBooksForSubject(formState.subject),
    [formState.subject]
  );
  const yearOptions = useMemo(() => getSchemeYearOptions(), []);
  const topicSelection = useMemo(
    () => getTopicSelection(formState.subject, formState.term),
    [formState.subject, formState.term]
  );
  const selectedSubtopics = useMemo(
    () => getSelectedSubtopics(topicSelection.topics, selectedSubtopicIds),
    [topicSelection.topics, selectedSubtopicIds]
  );
  const selectedTopicTitles = useMemo(
    () => getSelectedTopicTitles(topicSelection.topics, selectedSubtopicIds),
    [topicSelection.topics, selectedSubtopicIds]
  );
  const stepPercent = step === 1 ? 25 : step === 2 ? 55 : step === 3 ? 80 : 100;

  function resetTopicSelection(nextSubject: string, nextTerm: SchemeTerm | "") {
    const nextSelection = getTopicSelection(nextSubject, nextTerm);
    setSelectedSubtopicIds(nextSelection.allIds);
  }

  function updateField<K extends keyof SchemeGeneratorFormState>(
    key: K,
    value: SchemeGeneratorFormState[K]
  ) {
    setFormState((current) => ({ ...current, [key]: value }));
  }

  function handleStageChange(nextStage: "Junior School" | "Senior School" | "") {
    if (!nextStage) {
      setFormState((current) => ({
        ...current,
        stage: "",
        level: "",
        subject: "",
        referenceBook: ""
      }));
      setSelectedSubtopicIds([]);
      return;
    }

    const nextLevels = getLevelOptionsByStage(nextStage);
    const nextLevel = nextLevels[0]?.id ?? "";
    const nextSubject = nextLevels[0]?.subjects[0] ?? "";
    const nextReferenceBook = getReferenceBooksForSubject(nextSubject)[0] ?? "Teacher Guide";

    setFormState((current) => ({
      ...current,
      stage: nextStage,
      level: nextLevel,
      subject: nextSubject,
      referenceBook: nextReferenceBook
    }));
    resetTopicSelection(nextSubject, formState.term);
  }

  function handleLevelChange(nextLevel: string) {
    const nextSubject = levels.find((entry) => entry.id === nextLevel)?.subjects[0] ?? "";
    const nextReferenceBook = getReferenceBooksForSubject(nextSubject)[0] ?? "Teacher Guide";

    setFormState((current) => ({
      ...current,
      level: nextLevel,
      subject: nextSubject,
      referenceBook: nextReferenceBook
    }));
    resetTopicSelection(nextSubject, formState.term);
  }

  function handleSubjectChange(nextSubject: string) {
    const nextReferenceBook = getReferenceBooksForSubject(nextSubject)[0] ?? "Teacher Guide";

    setFormState((current) => ({
      ...current,
      subject: nextSubject,
      referenceBook: nextReferenceBook
    }));
    resetTopicSelection(nextSubject, formState.term);
  }

  function handleTermChange(nextTerm: SchemeTerm | "") {
    setFormState((current) => ({ ...current, term: nextTerm }));
    if (!nextTerm) {
      setSelectedSubtopicIds([]);
      return;
    }
    resetTopicSelection(formState.subject, nextTerm);
  }

  function toggleAllTopics(checked: boolean) {
    setSelectedSubtopicIds(checked ? topicSelection.allIds : []);
  }

  function toggleTopicGroup(topic: SchemeTopicGroup, checked: boolean) {
    const groupIds = topic.subtopics.map((subtopic) => getSubtopicId(topic.id, subtopic));
    setSelectedSubtopicIds((current) => {
      if (checked) {
        return Array.from(new Set([...current, ...groupIds]));
      }

      return current.filter((id) => !groupIds.includes(id));
    });
  }

  function toggleSubtopic(topicId: string, subtopic: string, checked: boolean) {
    const subtopicId = getSubtopicId(topicId, subtopic);
    setSelectedSubtopicIds((current) =>
      checked ? Array.from(new Set([...current, subtopicId])) : current.filter((id) => id !== subtopicId)
    );
  }

  function updateBreakItem(id: string, key: "title" | "durationWeeks", value: string) {
    setFormState((current) => ({
      ...current,
      breaks: current.breaks.map((item) => (item.id === id ? { ...item, [key]: value } : item))
    }));
  }

  function addBreakItem() {
    setFormState((current) => ({
      ...current,
      breaks: [
        ...current.breaks,
        {
          id: makeBreakId(current.breaks.length + 1),
          title: "",
          durationWeeks: ""
        }
      ]
    }));
  }

  function removeBreakItem(id: string) {
    setFormState((current) => ({
      ...current,
      breaks: current.breaks.length === 1
        ? [{ id: makeBreakId(1), title: "", durationWeeks: "" }]
        : current.breaks.filter((item) => item.id !== id)
    }));
  }

  function validateCurrentStep() {
    if (step === 1) {
      if (
        !formState.schoolName.trim() ||
        !formState.stage ||
        !formState.level ||
        !formState.subject.trim() ||
        !formState.referenceBook.trim() ||
        !formState.term ||
        !formState.year
      ) {
        setError("Fill in all mandatory school, level, subject, term, and year details first.");
        return false;
      }
    }

    if (step === 2) {
      if (selectedSubtopicIds.length === 0) {
        setError("Select at least one topic or subtopic before moving to the next step.");
        return false;
      }
    }

    if (step === 3) {
      if (formState.lastWeek < formState.firstWeek) {
        setError("Last week of teaching cannot come before the first week.");
        return false;
      }

      if (formState.lastWeek === formState.firstWeek && formState.lastLesson < formState.firstLesson) {
        setError("Last lesson of teaching cannot come before the first lesson.");
        return false;
      }
    }

    if (step === 4 && !formState.noBreaks) {
      const hasInvalidBreak = formState.breaks.some(
        (item) => !item.title.trim() || !item.durationWeeks
      );

      if (hasInvalidBreak) {
        setError("Fill in all break titles and durations, or turn on No Breaks.");
        return false;
      }
    }

    setError(null);
    return true;
  }

  function goNext() {
    if (!validateCurrentStep()) {
      return;
    }

    setStep((current) => (current < 4 ? ((current + 1) as WizardStep) : current));
  }

  function goBack() {
    setError(null);
    setStep((current) => (current > 1 ? ((current - 1) as WizardStep) : current));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!validateCurrentStep()) {
      return;
    }

    startTransition(async () => {
      const weeksCount = Math.max(1, formState.lastWeek - formState.firstWeek + 1);
      const breakSummary = formState.noBreaks
        ? "No breaks recorded for this term."
        : (() => {
            const entries = formState.breaks
              .filter((item) => item.title.trim() && item.durationWeeks)
              .map((item) => `${item.title.trim()} (${item.durationWeeks} week${item.durationWeeks === "1" ? "" : "s"})`);

            return entries.length > 0 ? entries.join("; ") : "No breaks recorded for this term.";
          })();

      const payload = {
        schoolName: formState.schoolName.trim(),
        className: selectedLevel?.title ?? formState.level,
        level: formState.level,
        subject: formState.subject.trim(),
        term: formState.term as SchemeTerm,
        strand: selectedTopicTitles[0] ?? `${formState.subject} term coverage`,
        subStrand:
          selectedSubtopics.slice(0, 3).join(", ") ||
          "Selected subtopics",
        weeksCount,
        lessonsPerWeek: formState.lessonsPerWeek,
        learningOutcomes: selectedSubtopics
          .map((subtopic) => `Develop understanding of ${subtopic}.`)
          .join("\n"),
        keyInquiryQuestions: selectedSubtopics
          .slice(0, 6)
          .map((subtopic) => `How can learners apply ${subtopic.toLowerCase()} in ${formState.subject.toLowerCase()}?`)
          .join("\n"),
        coreCompetencies: defaultCoreCompetencies.join("\n"),
        values: defaultValues.join("\n"),
        pertinentIssues: defaultPertinentIssues.join("\n"),
        resources: [formState.referenceBook, "Teacher guide", "Learner's book"].join("\n"),
        assessmentMethods: [
          "Observation",
          "Oral questions",
          "Short written exercise",
          "Topic quiz"
        ].join("\n"),
        notes: [
          `Academic year: ${formState.year}`,
          `Teaching starts at week ${formState.firstWeek}, lesson ${formState.firstLesson}.`,
          `Teaching ends at week ${formState.lastWeek}, lesson ${formState.lastLesson}.`,
          `Double lesson: ${formState.doubleLesson || "No double lesson"}.`,
          `Reference book: ${formState.referenceBook}.`,
          `Breaks: ${breakSummary}`
        ].join("\n")
      };

      const response = await fetch("/api/tools/schemes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
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

  return (
    <form className="scheme-wizard" onSubmit={handleSubmit}>
      <div className="scheme-wizard-topbar">
        <span className="scheme-wizard-help">Need a tutorial? Click Here</span>
        <div className="scheme-wizard-progress">
          <div
            className="scheme-wizard-progress-bar"
            style={{ width: `${stepPercent}%` }}
          />
          <span className="scheme-wizard-progress-label">Your Progress</span>
        </div>
      </div>

      {error ? <p className="message message-error">{error}</p> : null}

      {step === 1 ? (
        <section className="scheme-wizard-card">
          <div className="scheme-wizard-head">
            <h3>Subject &amp; School Details</h3>
            <p>Fields marked with asterisks (*) are mandatory.</p>
          </div>

          <div className="scheme-wizard-grid">
            <label className="field">
              <span>School *</span>
              <input
                value={formState.schoolName}
                onChange={(event) => updateField("schoolName", event.target.value)}
                placeholder="eg. Nyandarua High School"
                required
              />
            </label>

            <label className="field">
              <span>Level *</span>
              <select
                value={formState.stage}
                onChange={(event) =>
                  handleStageChange(event.target.value as "Junior School" | "Senior School" | "")
                }
                required
              >
                <option value="">--- Select Level ---</option>
                {stageOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Term *</span>
              <select
                value={formState.term}
                onChange={(event) => handleTermChange(event.target.value as SchemeTerm | "")}
                required
              >
                <option value="">--- Select Term ---</option>
                {schemeTerms.map((term) => (
                  <option key={term.id} value={term.id}>
                    {term.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Year *</span>
              <select
                value={formState.year}
                onChange={(event) => updateField("year", event.target.value)}
                required
              >
                {yearOptions.map((year) => (
                  <option key={year} value={`${year}`}>
                    {year}
                  </option>
                ))}
              </select>
            </label>

            {formState.stage ? (
              <>
                <label className="field">
                  <span>Grade *</span>
                  <select
                    value={formState.level}
                    onChange={(event) => handleLevelChange(event.target.value)}
                    required
                  >
                    <option value="">--- Select Grade ---</option>
                    {levelOptions.map((level) => (
                      <option key={level.id} value={level.id}>
                        {level.title}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Subject *</span>
                  <select
                    value={formState.subject}
                    onChange={(event) => handleSubjectChange(event.target.value)}
                    required
                  >
                    <option value="">--- Select Subject ---</option>
                    {subjectOptions.map((subject) => (
                      <option key={subject} value={subject}>
                        {subject}
                      </option>
                    ))}
                  </select>
                </label>

                {formState.subject ? (
                  <label className="field field-span-2">
                    <span>Reference Book</span>
                    <select
                      value={formState.referenceBook}
                      onChange={(event) => updateField("referenceBook", event.target.value)}
                    >
                      {referenceBooks.map((book) => (
                        <option key={book} value={book}>
                          {book}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
              </>
            ) : null}
          </div>

          <div className="scheme-step-actions">
            <button type="button" className="teacher-tools-action teacher-tools-action--primary" onClick={goNext}>
              Next →
            </button>
          </div>

          <div className="scheme-wizard-banner">
            ✨ {selectedLevel?.title ?? "Selected level"} Schemes of Work Are Now Available! ✨
          </div>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="scheme-wizard-card">
          <div className="scheme-wizard-head scheme-wizard-head--spaced">
            <div>
              <h3>Topics &amp; Subtopics Details</h3>
              <p>
                {selectedLevel?.title} {formState.subject}. Select the topics and subtopics you want in this scheme.
              </p>
            </div>
          </div>

          <div className="scheme-inline-banner scheme-inline-banner--success">
            Did you know that you can include the uncovered subtopics of the previous term or class?
            Scroll down and select the topics you want included.
          </div>

          <div className="scheme-select-all">
            <span>Select all for:</span>
            <label className="scheme-inline-check">
              <input
                type="checkbox"
                checked={selectedSubtopicIds.length === topicSelection.allIds.length}
                onChange={(event) => toggleAllTopics(event.target.checked)}
              />
              <span>{schemeTerms.find((term) => term.id === formState.term)?.label ?? "Term"}</span>
            </label>
          </div>

          <div className="scheme-topic-list">
            {topicSelection.topics.map((topic) => {
              const groupIds = topic.subtopics.map((subtopic) => getSubtopicId(topic.id, subtopic));
              const checkedCount = groupIds.filter((id) => selectedSubtopicIds.includes(id)).length;
              const groupChecked = checkedCount === groupIds.length;

              return (
                <article key={topic.id} className="scheme-topic-card">
                  <div className="scheme-topic-head">
                    <label className="scheme-inline-check scheme-inline-check--strong">
                      <input
                        type="checkbox"
                        checked={groupChecked}
                        onChange={(event) => toggleTopicGroup(topic, event.target.checked)}
                      />
                      <span>{topic.title} ({topic.subtopics.length} subtopics)</span>
                    </label>
                    <span className="pill">{checkedCount} selected</span>
                  </div>

                  <div className="scheme-subtopic-grid">
                    {topic.subtopics.map((subtopic) => {
                      const subtopicId = getSubtopicId(topic.id, subtopic);
                      const checked = selectedSubtopicIds.includes(subtopicId);

                      return (
                        <label key={subtopicId} className="scheme-inline-check scheme-inline-check--tile">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) => toggleSubtopic(topic.id, subtopic, event.target.checked)}
                          />
                          <span>{subtopic}</span>
                        </label>
                      );
                    })}
                  </div>
                </article>
              );
            })}
          </div>

          <div className="scheme-step-actions">
            <button type="button" className="teacher-tools-action teacher-tools-action--warning" onClick={goBack}>
              ← Back
            </button>
            <button type="button" className="teacher-tools-action teacher-tools-action--primary" onClick={goNext}>
              Next →
            </button>
          </div>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="scheme-wizard-card">
          <div className="scheme-wizard-head">
            <h3>Lesson Setup Details</h3>
            <p>Set the lesson spread for this scheme of work before moving to term breaks and interruptions.</p>
          </div>

          <div className="scheme-wizard-grid">
            <label className="field">
              <span>Number of Lessons Per Week *</span>
              <select
                value={formState.lessonsPerWeek}
                onChange={(event) => updateField("lessonsPerWeek", Number(event.target.value))}
              >
                {Array.from({ length: 8 }, (_, index) => index + 1).map((count) => (
                  <option key={count} value={count}>
                    {count}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="scheme-split-card">
            <h4>First Lesson Details</h4>
            <div className="scheme-wizard-grid">
              <label className="field">
                <span>First week of teaching *</span>
                <select
                  value={formState.firstWeek}
                  onChange={(event) => updateField("firstWeek", Number(event.target.value))}
                >
                  {Array.from({ length: 14 }, (_, index) => index + 1).map((week) => (
                    <option key={week} value={week}>
                      {week}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>First lesson of teaching *</span>
                <select
                  value={formState.firstLesson}
                  onChange={(event) => updateField("firstLesson", Number(event.target.value))}
                >
                  {Array.from({ length: formState.lessonsPerWeek }, (_, index) => index + 1).map((lesson) => (
                    <option key={lesson} value={lesson}>
                      {lesson}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="scheme-split-card">
            <h4>Last Lesson Details</h4>
            <div className="scheme-wizard-grid">
              <label className="field">
                <span>Last week of teaching *</span>
                <select
                  value={formState.lastWeek}
                  onChange={(event) => updateField("lastWeek", Number(event.target.value))}
                >
                  {Array.from({ length: 14 }, (_, index) => index + 1).map((week) => (
                    <option key={week} value={week}>
                      {week}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Last lesson of teaching *</span>
                <select
                  value={formState.lastLesson}
                  onChange={(event) => updateField("lastLesson", Number(event.target.value))}
                >
                  {Array.from({ length: formState.lessonsPerWeek }, (_, index) => index + 1).map((lesson) => (
                    <option key={lesson} value={lesson}>
                      {lesson}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="scheme-split-card">
            <h4>Double Lesson Details</h4>
            <div className="scheme-wizard-grid">
              <label className="field">
                <span>Double lesson</span>
                <select
                  value={formState.doubleLesson}
                  onChange={(event) => updateField("doubleLesson", event.target.value)}
                >
                  <option value="">--- No double lesson ---</option>
                  <option value="Lesson 1 and 2">Lesson 1 and 2</option>
                  <option value="Lesson 2 and 3">Lesson 2 and 3</option>
                  <option value="Lesson 3 and 4">Lesson 3 and 4</option>
                  <option value="Lesson 4 and 5">Lesson 4 and 5</option>
                </select>
              </label>
            </div>
          </div>

          <div className="scheme-step-actions">
            <button type="button" className="teacher-tools-action teacher-tools-action--warning" onClick={goBack}>
              ← Back
            </button>
            <button type="button" className="teacher-tools-action teacher-tools-action--primary" onClick={goNext}>
              Next →
            </button>
          </div>
        </section>
      ) : null}

      {step === 4 ? (
        <section className="scheme-wizard-card">
          <div className="scheme-wizard-head">
            <h3>Term Breaks and Interruptions</h3>
            <p>Capture any interruptions, then proceed to payment and generation.</p>
          </div>

          <label className="scheme-inline-check scheme-inline-check--strong">
            <input
              type="checkbox"
              checked={formState.noBreaks}
              onChange={(event) => updateField("noBreaks", event.target.checked)}
            />
            <span>No Breaks</span>
          </label>

          {!formState.noBreaks ? (
            <div className="scheme-break-stack">
              {formState.breaks.map((item, index) => (
                <article key={item.id} className="scheme-break-card">
                  <div className="scheme-break-card-head">
                    <h4>Enter New Break Details</h4>
                    {formState.breaks.length > 1 ? (
                      <button
                        type="button"
                        className="button-secondary button-reset"
                        onClick={() => removeBreakItem(item.id)}
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>

                  <div className="scheme-wizard-grid">
                    <label className="field">
                      <span>Title of Break/Interruption</span>
                      <input
                        value={item.title}
                        onChange={(event) => updateBreakItem(item.id, "title", event.target.value)}
                        placeholder="Eg. Midterm Break, Exams, Reporting, Revision"
                      />
                    </label>

                    <label className="field">
                      <span>How long does the break span? *</span>
                      <select
                        value={item.durationWeeks}
                        onChange={(event) => updateBreakItem(item.id, "durationWeeks", event.target.value)}
                      >
                        <option value="">--- Select ---</option>
                        <option value="1">1 week</option>
                        <option value="2">2 weeks</option>
                        <option value="3">3 weeks</option>
                        <option value="4">4 weeks</option>
                      </select>
                    </label>
                  </div>
                </article>
              ))}

              <div className="scheme-break-actions">
                <button type="button" className="button-secondary button-reset" onClick={addBreakItem}>
                  + New Break
                </button>
              </div>
            </div>
          ) : null}

          <div className="scheme-review-card">
            <h4>Review before generation</h4>
            <div className="scheme-review-grid">
              <div>
                <span className="subtle">School</span>
                <strong>{formState.schoolName || "Not set"}</strong>
              </div>
              <div>
                <span className="subtle">Level and subject</span>
                <strong>{selectedLevel?.title ?? formState.level} · {formState.subject}</strong>
              </div>
              <div>
                <span className="subtle">Reference book</span>
                <strong>{formState.referenceBook}</strong>
              </div>
              <div>
                <span className="subtle">Selected subtopics</span>
                <strong>{selectedSubtopicIds.length}</strong>
              </div>
            </div>
          </div>
          <div className="scheme-step-actions">
            <button type="button" className="teacher-tools-action teacher-tools-action--warning" onClick={goBack}>
              ← Back
            </button>
            <button type="submit" className="teacher-tools-action teacher-tools-action--primary" disabled={isPending}>
              {isPending ? "Redirecting to M-Pesa..." : `Generate PDF · Pay KSh ${teacherSchemeGenerationPrice}`}
            </button>
          </div>
        </section>
      ) : null}
    </form>
  );
}
