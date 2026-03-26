export type Level = {
  id: string;
  title: string;
  stage: "Junior School" | "Senior School";
  description: string;
  subjects: string[];
  cardTags?: string[];
  formats: string[];
};

export const levels: Level[] = [
  {
    id: "grade-7",
    title: "Grade 7",
    stage: "Junior School",
    description:
      "Foundation revision packs, topical questions, and home-study guides aligned to CBE learning outcomes.",
    subjects: [
      "English",
      "Kiswahili",
      "Mathematics",
      "Integrated Science",
      "Creative Arts and Sports",
      "Pre-Technical Studies",
      "Social Studies",
      "Religious Education",
      "Agriculture & Nutrition"
    ],
    cardTags: [
      "English",
      "Kiswahili",
      "Mathematics",
      "Integrated Science",
      "Social Studies",
      "Agriculture & Nutrition"
    ],
    formats: ["Topical PDFs", "Weekly revision plans", "Teacher marking schemes"]
  },
  {
    id: "grade-8",
    title: "Grade 8",
    stage: "Junior School",
    description:
      "Skill-building revision bundles with model answers, remedial practice, and exam-style assessments.",
    subjects: [
      "English",
      "Kiswahili",
      "Mathematics",
      "Integrated Science",
      "Creative Arts and Sports",
      "Pre-Technical Studies",
      "Social Studies",
      "Religious Education",
      "Agriculture & Nutrition"
    ],
    cardTags: [
      "English",
      "Kiswahili",
      "Mathematics",
      "Creative Arts and Sports",
      "Pre-Technical Studies",
      "Religious Education"
    ],
    formats: ["Revision booklets", "Printable tests", "Parent support guides"]
  },
  {
    id: "grade-9",
    title: "Grade 9",
    stage: "Junior School",
    description:
      "Transition-focused materials for stronger end-of-stage preparation and subject mastery.",
    subjects: [
      "English",
      "Kiswahili",
      "Mathematics",
      "Integrated Science",
      "Creative Arts and Sports",
      "Pre-Technical Studies",
      "Social Studies",
      "Religious Education",
      "Agriculture & Nutrition"
    ],
    cardTags: [
      "Mathematics",
      "Integrated Science",
      "Social Studies",
      "Creative Arts and Sports",
      "Religious Education",
      "Agriculture & Nutrition"
    ],
    formats: ["End-term exams", "Scheme-based worksheets", "Teacher progress trackers"]
  },
  {
    id: "grade-10",
    title: "Grade 10",
    stage: "Senior School",
    description:
      "New-stage revision resources designed for serious coverage, retention, and independent study habits.",
    subjects: ["Mathematics", "English", "Kiswahili", "Biology", "History"],
    formats: ["Topic mastery packs", "Holiday revision kits", "Assessment blueprints"]
  },
  {
    id: "form-3",
    title: "Form 3",
    stage: "Senior School",
    description:
      "KCSE-track revision materials with more intensive practice, answer guides, and performance analysis.",
    subjects: ["Mathematics", "Physics", "Chemistry", "Biology", "Geography"],
    formats: ["Exam papers", "Marking schemes", "Past-paper drills"]
  },
  {
    id: "form-4",
    title: "Form 4",
    stage: "Senior School",
    description:
      "Final-year exam preparation with mock bundles, targeted revision, and teacher-ready download packs.",
    subjects: ["Mathematics", "English", "Business Studies", "Chemistry", "CRE"],
    formats: ["Full mocks", "Prediction sets", "Revision crash packs"]
  }
];

export const featuredResources = [
  {
    title: "Grade 8 End-Term Revision Bank",
    level: "Grade 8",
    type: "Downloadable Pack",
    access: "Subscribers only"
  },
  {
    title: "Form 4 Mathematics Prediction Series",
    level: "Form 4",
    type: "Mock Set",
    access: "Premium tier"
  },
  {
    title: "Grade 7 Parent Homework Support Sheets",
    level: "Grade 7",
    type: "Parent Guide",
    access: "Subscribers only"
  },
  {
    title: "Form 3 Science Weekly Drills",
    level: "Form 3",
    type: "Practice Bundle",
    access: "Subscribers only"
  }
];

export const membershipPlans = [
  {
    name: "Parent Subscription",
    price: "KSh 300",
    cadence: "/month",
    audience: "For parents supporting one learner at a time",
    highlights: [
      "Access to one class level at a time",
      "Weekly downloadable revision packs",
      "Parent guidance notes and progress tips",
      "M-Pesa recurring renewal support"
    ]
  },
  {
    name: "Teacher Subscription",
    price: "KSh 150",
    cadence: "/month",
    audience: "For teachers, tutors, and subject support staff",
    highlights: [
      "Access across all revision levels",
      "Editable classroom assessment bundles",
      "Marking schemes and teaching notes",
      "Optional one-time schemes, notes, and assessments"
    ]
  }
];
