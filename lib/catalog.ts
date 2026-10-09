export type Level = {
  id: string;
  title: string;
  stage: "Early Years" | "Lower Primary" | "Upper Primary" | "Junior School" | "Senior School";
  description: string;
  subjects: string[];
  cardTags?: string[];
  formats: string[];
};

export type SchemeStage = "Junior School" | "Senior School";

export const juniorSchoolSubjects = [
  "English",
  "Kiswahili",
  "Mathematics",
  "Integrated Science",
  "Creative Arts and Sports",
  "Pre-Technical Studies",
  "Social Studies",
  "Religious Education",
  "Agriculture & Nutrition"
];

export const seniorSchoolSubjects = [
  "Core Mathematics",
  "Mathematics",
  "English",
  "Kiswahili",
  "Biology",
  "Chemistry",
  "Physics",
  "General Science",
  "Geography",
  "History & Citizenship",
  "Business Studies",
  "CRE",
  "IRE",
  "HRE",
  "Agriculture",
  "Computer Studies",
  "Home Science",
  "Art and Design",
  "Music",
  "Physical Education",
  "Aviation Technology",
  "Building Construction",
  "Electricity",
  "Metal Work",
  "Woodwork",
  "Power Mechanics",
  "Drawing and Design",
  "French",
  "German",
  "Arabic"
];

export function getSubjectsForStage(stage: Level["stage"]) {
  if (stage === "Early Years") {
    return [
      "Language Activities",
      "Kiswahili Activities",
      "Mathematical Activities",
      "Environmental Activities",
      "Creative Activities",
      "Religious Activities"
    ];
  }

  if (stage === "Lower Primary") {
    return [
      "English Activities",
      "Kiswahili Activities",
      "Mathematics Activities",
      "Environmental Activities",
      "Creative Arts",
      "Religious Education"
    ];
  }

  if (stage === "Upper Primary") {
    return [
      "English",
      "Kiswahili",
      "Mathematics",
      "Science and Technology",
      "Agriculture and Nutrition",
      "Creative Arts",
      "Social Studies",
      "Religious Education"
    ];
  }

  return stage === "Junior School" ? juniorSchoolSubjects : seniorSchoolSubjects;
}

export const levels: Level[] = [
  {
    id: "pp1-pp2",
    title: "PP1 & PP2",
    stage: "Early Years",
    description:
      "Early-years learning activities grouped for simple access to foundational practice and parent support.",
    subjects: [
      "Language Activities",
      "Kiswahili Activities",
      "Mathematical Activities",
      "Environmental Activities",
      "Creative Activities",
      "Religious Activities"
    ],
    cardTags: ["Language", "Math", "Creative"],
    formats: ["Activity sheets", "Foundation practice", "Answer guides"]
  },
  {
    id: "grade-1",
    title: "Grade 1",
    stage: "Lower Primary",
    description:
      "Lower primary learning support with simple activities, practice tasks, and answer-guided materials.",
    subjects: [
      "English Activities",
      "Kiswahili Activities",
      "Mathematics Activities",
      "Environmental Activities",
      "Creative Arts",
      "Religious Education"
    ],
    cardTags: ["English", "Kiswahili", "Math"],
    formats: ["Activity sheets", "Topical practice", "Answer guides"]
  },
  {
    id: "grade-2",
    title: "Grade 2",
    stage: "Lower Primary",
    description:
      "Step-by-step lower primary resources for core activities, home practice, and classroom revision.",
    subjects: [
      "English Activities",
      "Kiswahili Activities",
      "Mathematics Activities",
      "Environmental Activities",
      "Creative Arts",
      "Religious Education"
    ],
    cardTags: ["English", "Kiswahili", "Math"],
    formats: ["Activity sheets", "Topical practice", "Answer guides"]
  },
  {
    id: "grade-3",
    title: "Grade 3",
    stage: "Lower Primary",
    description:
      "Focused lower primary revision materials organized by activity area for easier parent and teacher use.",
    subjects: [
      "English Activities",
      "Kiswahili Activities",
      "Mathematics Activities",
      "Environmental Activities",
      "Creative Arts",
      "Religious Education"
    ],
    cardTags: ["English", "Kiswahili", "Math"],
    formats: ["Activity sheets", "Topical practice", "Answer guides"]
  },
  {
    id: "grade-4",
    title: "Grade 4",
    stage: "Upper Primary",
    description:
      "Upper primary topical practice and assessment support arranged for quick subject access.",
    subjects: [
      "English",
      "Kiswahili",
      "Mathematics",
      "Science and Technology",
      "Agriculture and Nutrition",
      "Creative Arts",
      "Social Studies",
      "Religious Education"
    ],
    cardTags: ["English", "Math", "Science"],
    formats: ["Topical PDFs", "Practice tasks", "Answer guides"]
  },
  {
    id: "grade-5",
    title: "Grade 5",
    stage: "Upper Primary",
    description:
      "Upper primary topical materials, assessment practice, and answer-guided revision support.",
    subjects: [
      "English",
      "Kiswahili",
      "Mathematics",
      "Science and Technology",
      "Agriculture and Nutrition",
      "Creative Arts",
      "Social Studies",
      "Religious Education"
    ],
    cardTags: ["English", "Math", "Science"],
    formats: ["Topical PDFs", "Practice tasks", "Answer guides"]
  },
  {
    id: "grade-6",
    title: "Grade 6",
    stage: "Junior School",
    description:
      "Early junior school revision support with practical notes, assessments, and subject-by-subject guidance.",
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
    formats: ["Topical PDFs", "Revision exercises", "Assessment practice"]
  },
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
    subjects: ["Core Mathematics", "English", "Kiswahili", "Biology", "History & Citizenship"],
    cardTags: ["Core Mathematics", "English", "Kiswahili", "Biology", "History & Citizenship"],
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
    audience: "For parents supporting learners across all available levels",
    highlights: [
      "Access across all revision levels",
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
