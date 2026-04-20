import { getSubjectsForStage, levels } from "@/lib/catalog";
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
  },
  {
    match: (subject) => subject.includes("integrated science"),
    topics: (term) => {
      const base: TopicTuple[] = term === "term-1"
        ? [
            ["Scientific Investigation", ["Laboratory safety", "Observation and classification", "Measuring instruments", "Recording findings"]],
            ["Living Things", ["Characteristics of living things", "Plants and animals", "Human body systems", "Healthy habits"]],
            ["Matter and Materials", ["Properties of matter", "Mixtures", "Separation of mixtures", "Uses of materials"]]
          ]
        : term === "term-2"
          ? [
              ["Force and Energy", ["Forms of energy", "Simple machines", "Friction", "Energy conservation"]],
              ["Earth and Space", ["Weather", "Soil", "Water cycle", "Environmental conservation"]],
              ["Health and Technology", ["Nutrition", "Disease prevention", "First aid", "Science in daily life"]]
            ]
          : [
              ["Applied Science", ["Project work", "Science models", "Community science problems", "Innovation tasks"]],
              ["Revision and Assessment", ["Practical investigation", "Data interpretation", "Integrated science quiz", "Learner reflection"]],
              ["Environment and Sustainability", ["Waste management", "Conservation practices", "Climate awareness", "Responsible resource use"]]
            ];

      return base.map(([title, subtopics], index) => ({
        id: `integrated-science-${term}-${index + 1}`,
        title,
        subtopics
      }));
    }
  },
  {
    match: (subject) => subject.includes("social studies"),
    topics: (term) => {
      const base: TopicTuple[] = term === "term-1"
        ? [
            ["Natural and Built Environments", ["Physical features", "Weather and climate", "Human settlement", "Environmental care"]],
            ["Citizenship and Governance", ["Rights and responsibilities", "Leadership", "National values", "Conflict resolution"]],
            ["People and Population", ["Population distribution", "Communities", "Migration", "Culture and identity"]]
          ]
        : term === "term-2"
          ? [
              ["Economic Activities", ["Farming", "Trade", "Transport", "Use of resources"]],
              ["History and Heritage", ["Historical sources", "Cultural heritage", "Important leaders", "National symbols"]],
              ["Maps and Location", ["Direction", "Map symbols", "Scale", "Using maps in daily life"]]
            ]
          : [
              ["Regional Studies", ["Counties and regions", "Resources in Kenya", "Neighbouring countries", "Regional cooperation"]],
              ["Social Responsibility", ["Community service", "Peaceful living", "Disaster preparedness", "Responsible citizenship"]],
              ["Revision and Assessment", ["Case studies", "Map work", "Structured questions", "Project presentation"]]
            ];

      return base.map(([title, subtopics], index) => ({
        id: `social-studies-${term}-${index + 1}`,
        title,
        subtopics
      }));
    }
  },
  {
    match: (subject) => subject.includes("religious") || subject === "cre" || subject.includes("christian religious"),
    topics: (term) => {
      const base: TopicTuple[] = term === "term-1"
        ? [
            ["Creation and Faith", ["Creation stories", "Human dignity", "Care for creation", "Faith in daily life"]],
            ["Sacred Scriptures", ["Bible stories", "Teachings from scripture", "Prayer", "Applying scripture values"]],
            ["Moral Values", ["Respect", "Responsibility", "Honesty", "Forgiveness"]]
          ]
        : term === "term-2"
          ? [
              ["Worship and Community", ["Places of worship", "Religious celebrations", "Service to others", "Unity in diversity"]],
              ["Life Skills and Values", ["Decision making", "Peer influence", "Compassion", "Peaceful relationships"]],
              ["Religious Leaders", ["Biblical leaders", "Servant leadership", "Role models", "Leadership qualities"]]
            ]
          : [
              ["Christian Living", ["Love and service", "Stewardship", "Responsible choices", "Living with others"]],
              ["Revision and Assessment", ["Scripture review", "Moral questions", "Case studies", "Reflection tasks"]],
              ["Faith in Action", ["Community projects", "Helping the needy", "Environmental care", "Personal commitment"]]
            ];

      return base.map(([title, subtopics], index) => ({
        id: `religious-education-${term}-${index + 1}`,
        title,
        subtopics
      }));
    }
  },
  {
    match: (subject) => subject.includes("agriculture") || subject.includes("nutrition"),
    topics: (term) => {
      const base: TopicTuple[] = term === "term-1"
        ? [
            ["Crop Production", ["Soil preparation", "Planting materials", "Crop care", "Harvesting"]],
            ["Foods and Nutrition", ["Food groups", "Balanced diet", "Food hygiene", "Meal planning"]],
            ["Agricultural Tools", ["Tool identification", "Tool safety", "Tool maintenance", "Simple farm operations"]]
          ]
        : term === "term-2"
          ? [
              ["Animal Production", ["Domestic animals", "Animal feeds", "Animal housing", "Animal health"]],
              ["Food Preparation", ["Kitchen safety", "Cooking methods", "Preservation", "Serving meals"]],
              ["Conservation Agriculture", ["Water conservation", "Soil conservation", "Composting", "Sustainable farming"]]
            ]
          : [
              ["Agribusiness", ["Farm records", "Marketing farm produce", "Budgeting", "Entrepreneurship"]],
              ["Home Management", ["Cleaning routines", "Laundry", "Resource management", "Safety at home"]],
              ["Revision and Practical Tasks", ["Practical assessment", "Project work", "Portfolio tasks", "Reflection"]]
            ];

      return base.map(([title, subtopics], index) => ({
        id: `agriculture-nutrition-${term}-${index + 1}`,
        title,
        subtopics
      }));
    }
  },
  {
    match: (subject) => subject.includes("pre-technical"),
    topics: (term) => {
      const base: TopicTuple[] = term === "term-1"
        ? [
            ["Workshop Safety", ["Safety rules", "Personal protective equipment", "Tool handling", "First aid"]],
            ["Technical Drawing", ["Drawing instruments", "Lines and symbols", "Sketching", "Simple plans"]],
            ["Materials and Tools", ["Wood", "Metal", "Plastics", "Measuring tools"]]
          ]
        : term === "term-2"
          ? [
              ["Simple Machines", ["Levers", "Pulleys", "Inclined planes", "Applications of machines"]],
              ["Making and Repair", ["Joining methods", "Finishing", "Maintenance", "Problem solving"]],
              ["Energy and Technology", ["Sources of energy", "Electrical safety", "Simple circuits", "Technology careers"]]
            ]
          : [
              ["Design Process", ["Identifying needs", "Generating ideas", "Making models", "Evaluating products"]],
              ["Entrepreneurship", ["Product costing", "Marketing", "Customer needs", "Innovation"]],
              ["Revision and Project Work", ["Practical project", "Portfolio assessment", "Presentation", "Reflection"]]
            ];

      return base.map(([title, subtopics], index) => ({
        id: `pre-technical-${term}-${index + 1}`,
        title,
        subtopics
      }));
    }
  },
  {
    match: (subject) => subject.includes("creative arts") || subject.includes("sports"),
    topics: (term) => {
      const base: TopicTuple[] = term === "term-1"
        ? [
            ["Visual Arts", ["Drawing", "Painting", "Pattern making", "Art appreciation"]],
            ["Music", ["Rhythm", "Melody", "Singing", "Listening skills"]],
            ["Games and Movement", ["Basic movement", "Ball handling", "Teamwork", "Safety in play"]]
          ]
        : term === "term-2"
          ? [
              ["Performing Arts", ["Drama", "Dance", "Voice projection", "Creative expression"]],
              ["Sports Skills", ["Athletics", "Games rules", "Fitness", "Fair play"]],
              ["Creative Production", ["Craft work", "Improvisation", "Presentation", "Peer feedback"]]
            ]
          : [
              ["Art and Design Project", ["Planning artwork", "Creating final pieces", "Exhibition", "Reflection"]],
              ["Music and Performance", ["Group performance", "Instrument use", "Composition", "Evaluation"]],
              ["Revision and Assessment", ["Skill practice", "Portfolio tasks", "Performance assessment", "Self assessment"]]
            ];

      return base.map(([title, subtopics], index) => ({
        id: `creative-arts-sports-${term}-${index + 1}`,
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
      title: `${subject} Foundations`,
      subtopics: [`${subject} key concepts`, `${subject} vocabulary`, `${subject} guided practice`, `${termLabel} assessment task`]
    },
    {
      id: `${subject}-${term}-2`,
      title: `${subject} Skills and Practice`,
      subtopics: [`${subject} concept review`, `${subject} learner discussion`, `${subject} application task`, `${subject} reinforcement activity`]
    },
    {
      id: `${subject}-${term}-3`,
      title: `${subject} Application and Assessment`,
      subtopics: [`${subject} inquiry task`, `${subject} project idea`, `${subject} reflection task`, `${termLabel} end-of-topic check`]
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

export function getSubjectOptionsByStage(stage: "Junior School" | "Senior School" | "") {
  return stage ? getSubjectsForStage(stage) : [];
}

export function getSchemeYearOptions(baseYear = new Date().getFullYear()) {
  return [baseYear - 1, baseYear, baseYear + 1, baseYear + 2];
}
