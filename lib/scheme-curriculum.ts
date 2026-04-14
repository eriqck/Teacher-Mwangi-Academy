import { levels } from "@/lib/catalog";
import type { SchemeTerm } from "@/lib/store";

export type SchemeTopicGroup = {
  id: string;
  title: string;
  subtopics: string[];
};

type TopicTuple = [string, string[]];

const genericReferenceBooks = [
  "Teacher Guide",
  "Learner's Book",
  "Course Book",
  "Revision Workbook"
];

const subjectReferenceBooks: Record<string, string[]> = {
  mathematics: ["KLB Mathematics", "Mentor Mathematics", "Longhorn Mathematics", ...genericReferenceBooks],
  "core mathematics": ["KLB Core Mathematics", "Mentor Core Mathematics", "Longhorn Core Mathematics", ...genericReferenceBooks],
  chemistry: ["Access & Learn Chemistry", "KLB Chemistry", "Longhorn Chemistry", ...genericReferenceBooks],
  physics: ["Access & Learn Physics", "KLB Physics", "Longhorn Physics", ...genericReferenceBooks],
  biology: ["Access & Learn Biology", "KLB Biology", "Longhorn Biology", ...genericReferenceBooks],
  english: ["KLB English", "Longhorn English", "Spotlight English", ...genericReferenceBooks],
  kiswahili: ["KLB Kiswahili", "Longhorn Kiswahili", "Fasihi Bora", ...genericReferenceBooks],
  "integrated science": ["KLB Integrated Science", "Longhorn Integrated Science", ...genericReferenceBooks],
  "social studies": ["KLB Social Studies", "Longhorn Social Studies", ...genericReferenceBooks],
  geography: ["KLB Geography", "Longhorn Geography", ...genericReferenceBooks],
  history: ["KLB History", "Longhorn History", ...genericReferenceBooks],
  "history & citizenship": ["KLB History & Citizenship", "Longhorn History & Citizenship", ...genericReferenceBooks]
};

const subjectTopicTemplates: Array<{
  match: (subject: string) => boolean;
  topics: (term: SchemeTerm) => SchemeTopicGroup[];
}> = [
  {
    match: (subject) => subject.includes("chemistry"),
    topics: (term) => {
      const base: TopicTuple[] = term === "term-1"
        ? [
            ["Inorganic Chemistry", ["Laboratory safety", "Apparatus identification", "Acids, bases and indicators", "Salts and their uses", "Chemical symbols and formulae"]],
            ["Physical Chemistry", ["States of matter", "Kinetic theory", "Separation techniques", "Diffusion", "Solubility and crystallisation"]],
            ["Measurement and Experiments", ["Observation skills", "Data recording", "Heating and cooling curves", "Simple qualitative tests"]]
          ]
        : term === "term-2"
          ? [
              ["Organic Chemistry", ["Hydrocarbons", "Alcohols", "Carboxylic acids", "Polymer use in daily life"]],
              ["Energy Changes", ["Exothermic reactions", "Endothermic reactions", "Fuel efficiency", "Environmental safety"]],
              ["Rates and Equilibrium", ["Rate factors", "Collision theory", "Reversible reactions", "Applications of equilibrium"]]
            ]
          : [
              ["Chemical Analysis", ["Qualitative analysis", "Flame tests", "Identifying gases", "Water purification"]],
              ["Electrochemistry", ["Electrolysis", "Cells and batteries", "Corrosion prevention", "Industrial applications"]],
              ["Applied Chemistry", ["Agriculture and fertilisers", "Chemicals in manufacturing", "Chemistry and health", "Career pathways"]]
            ];

      return base.map(([title, subtopics], index) => ({
        id: `chemistry-${term}-${index + 1}`,
        title,
        subtopics
      }));
    }
  },
  {
    match: (subject) => subject.includes("physics"),
    topics: (term) => {
      const base: TopicTuple[] = term === "term-1"
        ? [
            ["Measurement", ["Units and quantities", "Precision and accuracy", "Instruments", "Experimental errors"]],
            ["Forces and Motion", ["Distance and displacement", "Speed and velocity", "Acceleration", "Newton's laws"]],
            ["Energy", ["Work and power", "Forms of energy", "Energy conversion", "Efficiency"]]
          ]
        : term === "term-2"
          ? [
              ["Waves", ["Wave properties", "Sound", "Applications of sound", "Noise control"]],
              ["Light", ["Reflection", "Refraction", "Lenses", "Optical instruments"]],
              ["Thermal Physics", ["Heat transfer", "Expansion", "Specific heat capacity", "Temperature scales"]]
            ]
          : [
              ["Electricity", ["Current and voltage", "Resistance", "Series and parallel circuits", "Electrical safety"]],
              ["Magnetism", ["Magnetic fields", "Electromagnets", "Motors", "Transformers"]],
              ["Modern Physics", ["Atomic models", "Radioactivity", "Applications in medicine", "Safety precautions"]]
            ];

      return base.map(([title, subtopics], index) => ({
        id: `physics-${term}-${index + 1}`,
        title,
        subtopics
      }));
    }
  },
  {
    match: (subject) => subject.includes("math"),
    topics: (term) => {
      const base: TopicTuple[] = term === "term-1"
        ? [
            ["Number", ["Integers", "Fractions", "Decimals", "Percentages", "Ratio and proportion"]],
            ["Algebra", ["Expressions", "Simple equations", "Formulae", "Patterns"]],
            ["Geometry", ["Angles", "Lines", "Polygons", "Constructions"]]
          ]
        : term === "term-2"
          ? [
              ["Algebra", ["Linear equations", "Graphs", "Sequences", "Inequalities"]],
              ["Mensuration", ["Perimeter", "Area", "Volume", "Surface area"]],
              ["Statistics", ["Data collection", "Tables and charts", "Mean", "Median and mode"]]
            ]
          : [
              ["Commercial Arithmetic", ["Profit and loss", "Discount", "Simple interest", "Budgets"]],
              ["Trigonometry", ["Right-angled triangles", "Ratios", "Applications"]],
              ["Probability", ["Simple events", "Experimental probability", "Tree diagrams"]]
            ];

      return base.map(([title, subtopics], index) => ({
        id: `mathematics-${term}-${index + 1}`,
        title,
        subtopics
      }));
    }
  },
  {
    match: (subject) => subject.includes("english") || subject.includes("kiswahili"),
    topics: (term) => {
      const base: TopicTuple[] = term === "term-1"
        ? [
            ["Language Grammar", ["Parts of speech", "Sentence structure", "Tenses", "Punctuation"]],
            ["Reading Skills", ["Comprehension", "Vocabulary building", "Inference", "Main ideas"]],
            ["Listening and Speaking", ["Pronunciation", "Oral presentations", "Discussion skills", "Active listening"]]
          ]
        : term === "term-2"
          ? [
              ["Writing Skills", ["Paragraph writing", "Functional writing", "Creative writing", "Editing"]],
              ["Literature", ["Short stories", "Poetry", "Character analysis", "Themes"]],
              ["Language Use", ["Idioms", "Register", "Context clues", "Summary writing"]]
            ]
          : [
              ["Revision and Assessment", ["Integrated grammar tasks", "Composition improvement", "Set-book revision", "Oral practice"]],
              ["Critical Reading", ["Opinion texts", "Argument analysis", "Bias and tone", "Evaluation"]],
              ["Communication", ["Public speaking", "Interview skills", "Debate", "Collaboration"]]
            ];

      return base.map(([title, subtopics], index) => ({
        id: `language-${term}-${index + 1}`,
        title,
        subtopics
      }));
    }
  }
];

function defaultTopics(subject: string, term: SchemeTerm): SchemeTopicGroup[] {
  const termLabel = term.replace("term-", "Term ");
  return [
    {
      id: `${subject}-${term}-1`,
      title: `${subject} Strand 1`,
      subtopics: [`${termLabel} topic 1`, `${termLabel} topic 2`, `${termLabel} practical activity`, `${termLabel} assessment task`]
    },
    {
      id: `${subject}-${term}-2`,
      title: `${subject} Strand 2`,
      subtopics: [`${termLabel} concept review`, `${termLabel} learner discussion`, `${termLabel} application task`, `${termLabel} reinforcement activity`]
    },
    {
      id: `${subject}-${term}-3`,
      title: `${subject} Strand 3`,
      subtopics: [`${termLabel} inquiry task`, `${termLabel} project idea`, `${termLabel} reflection task`, `${termLabel} end-of-topic check`]
    }
  ];
}

export function getReferenceBooksForSubject(subject: string) {
  const key = subject.trim().toLowerCase();
  return subjectReferenceBooks[key] ?? genericReferenceBooks;
}

export function getTopicGroupsForScheme(subject: string, term: SchemeTerm) {
  const normalized = subject.trim().toLowerCase();
  const matchedTemplate = subjectTopicTemplates.find((template) => template.match(normalized));
  return matchedTemplate ? matchedTemplate.topics(term) : defaultTopics(subject, term);
}

export function getLevelOptionsByStage(stage: "Junior School" | "Senior School" | "") {
  return stage ? levels.filter((level) => level.stage === stage) : levels;
}

export function getSchemeYearOptions(baseYear = new Date().getFullYear()) {
  return [baseYear - 1, baseYear, baseYear + 1, baseYear + 2];
}
