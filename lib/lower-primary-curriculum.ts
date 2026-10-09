import { getSubjectsForStage, levels } from "@/lib/catalog";

export const lowerPrimaryStages = ["Early Years", "Lower Primary", "Upper Primary"] as const;

export function isLowerPrimaryLevel(levelTitle: string) {
  const level = levels.find((entry) => entry.title === levelTitle || entry.id === levelTitle);
  return level ? lowerPrimaryStages.some((stage) => stage === level.stage) : false;
}

export function getLowerPrimaryLevel(levelTitle: string) {
  return levels.find((entry) => entry.title === levelTitle || entry.id === levelTitle) ?? null;
}

export function getSubjectsForLowerLevel(levelTitle: string) {
  const level = getLowerPrimaryLevel(levelTitle);
  return level && isLowerPrimaryLevel(level.title) ? getSubjectsForStage(level.stage) : [];
}

const subjectStrandMap: Record<string, string[]> = {
  "Language Activities": ["Listening and Speaking", "Reading Readiness", "Writing Readiness"],
  "English Activities": ["Listening and Speaking", "Reading", "Writing", "Grammar in Use"],
  "Kiswahili Activities": ["Kusikiliza na Kuzungumza", "Kusoma", "Kuandika", "Sarufi"],
  "Mathematical Activities": ["Numbers", "Measurement", "Geometry", "Data Handling"],
  "Mathematics Activities": ["Numbers", "Measurement", "Geometry", "Data Handling"],
  Mathematics: ["Numbers", "Measurement", "Geometry", "Data Handling", "Algebra"],
  "Environmental Activities": ["Our Environment", "Health and Safety", "Plants and Animals", "Weather"],
  "Science and Technology": ["Living Things", "Matter", "Force and Energy", "Technology and Design"],
  "Agriculture and Nutrition": ["Crop Production", "Animal Production", "Food and Nutrition", "Conservation"],
  "Creative Activities": ["Art and Craft", "Music and Movement", "Creative Play"],
  "Creative Arts": ["Visual Arts", "Music", "Performing Arts"],
  "Religious Activities": ["Christian Religious Activities", "Islamic Religious Activities", "Hindu Religious Activities"],
  "Religious Education": ["CRE", "IRE", "HRE"],
  "Social Studies": ["Citizenship", "People and Population", "Resources and Economic Activities", "Map Work"]
};

const strandSubstrandMap: Record<string, string[]> = {
  "Listening and Speaking": ["Greetings", "Polite Language", "Oral Narratives", "Conversations"],
  "Reading Readiness": ["Letter Sounds", "Picture Reading", "Word Recognition"],
  "Writing Readiness": ["Pattern Writing", "Letter Formation", "Copying Words"],
  Reading: ["Fluency", "Comprehension", "Vocabulary"],
  Writing: ["Handwriting", "Sentence Writing", "Creative Writing"],
  "Grammar in Use": ["Nouns", "Verbs", "Adjectives", "Sentence Structure"],
  "Kusikiliza na Kuzungumza": ["Salamu", "Maagizo", "Mazungumzo", "Hadithi"],
  Kusoma: ["Matamshi", "Ufahamu", "Msamiati"],
  Kuandika: ["Mwandiko", "Sentensi", "Insha Fupi"],
  Sarufi: ["Nomino", "Vitenzi", "Vivumishi"],
  Numbers: ["Number Recognition", "Place Value", "Operations", "Fractions"],
  Measurement: ["Length", "Mass", "Capacity", "Time", "Money"],
  Geometry: ["Shapes", "Position and Direction", "Patterns"],
  "Data Handling": ["Sorting", "Tables", "Pictographs"],
  Algebra: ["Patterns", "Number Sentences"],
  "Our Environment": ["Home Environment", "School Environment", "Cleanliness"],
  "Health and Safety": ["Personal Hygiene", "Safety at Home", "First Aid"],
  "Plants and Animals": ["Plants", "Domestic Animals", "Wild Animals"],
  Weather: ["Weather Conditions", "Weather Symbols", "Seasons"],
  "Living Things": ["Plants", "Animals", "Human Body"],
  Matter: ["Materials", "Water", "Air"],
  "Force and Energy": ["Light", "Sound", "Heat", "Simple Machines"],
  "Technology and Design": ["Tools", "Digital Devices", "Making Models"],
  "Crop Production": ["Soil", "Planting", "Crop Care"],
  "Animal Production": ["Domestic Animals", "Animal Care", "Animal Products"],
  "Food and Nutrition": ["Food Groups", "Balanced Diet", "Food Safety"],
  Conservation: ["Water Conservation", "Soil Conservation", "Environmental Care"],
  "Art and Craft": ["Drawing", "Painting", "Modelling"],
  "Music and Movement": ["Songs", "Rhythm", "Dance"],
  "Creative Play": ["Role Play", "Games", "Storytelling"],
  "Visual Arts": ["Drawing", "Painting", "Craft"],
  Music: ["Singing", "Rhythm", "Instruments"],
  "Performing Arts": ["Dance", "Drama", "Poetry"],
  "Christian Religious Activities": ["Creation", "Prayer", "Bible Stories"],
  "Islamic Religious Activities": ["Prayer", "Good Manners", "Prophets"],
  "Hindu Religious Activities": ["Prayer", "Festivals", "Good Conduct"],
  CRE: ["Creation", "Bible Stories", "Christian Values"],
  IRE: ["Quran", "Hadith", "Islamic Values"],
  HRE: ["Scriptures", "Festivals", "Moral Values"],
  Citizenship: ["Family", "School", "Community", "Leadership"],
  "People and Population": ["Culture", "Population", "Social Groups"],
  "Resources and Economic Activities": ["Natural Resources", "Trade", "Work"],
  "Map Work": ["Direction", "Symbols", "Location"]
};

export function getStrandsForLowerSubject(subject: string) {
  return subjectStrandMap[subject] ?? ["General Strand"];
}

export function getSubstrandsForLowerStrand(strand: string) {
  return strandSubstrandMap[strand] ?? ["General Substrand"];
}
