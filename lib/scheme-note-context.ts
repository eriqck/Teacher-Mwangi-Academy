import { promises as fs } from "fs";
import path from "path";
import JSZip from "jszip";
import { PDFParse } from "pdf-parse";
import type { ResourceRecord, SchemeTerm } from "@/lib/store";

export type SchemeSourceFormatStyle = "rationalized" | "mentor";

export type SchemeNoteContext = {
  noteTitles: string[];
  noteSnippets: string[];
  schemeTitles: string[];
  schemeSnippets: string[];
  preferredFormatStyle: SchemeSourceFormatStyle | null;
};

function normalizeSubject(value: string) {
  return value.trim().toLowerCase();
}

function decodeEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function scoreSnippet(snippet: string, keywords: string[]) {
  const normalized = snippet.toLowerCase();
  return keywords.reduce((score, keyword) => (normalized.includes(keyword) ? score + 2 : score), 0);
}

function getKeywords(subject: string, subStrand: string) {
  return Array.from(
    new Set(
      `${subject} ${subStrand}`
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .map((part) => part.trim())
        .filter((part) => part.length >= 4)
    )
  );
}

function inferFormatStyle(source: string): SchemeSourceFormatStyle | null {
  const normalized = source.toLowerCase();

  if (normalized.includes("mentor")) {
    return "mentor";
  }

  if (normalized.includes("rational") || normalized.includes("rationalised") || normalized.includes("rationalized")) {
    return "rationalized";
  }

  return null;
}

function extractCandidateSnippets(text: string) {
  return text
    .split(/\r?\n|(?<=[.!?])\s+/)
    .map((entry) => normalizeWhitespace(entry))
    .filter((entry) => entry.length >= 40 && entry.length <= 260)
    .filter(
      (entry) =>
        !/^(week|wk|lesson|lsn|strand|sub-?strand|specific learning outcomes?|assessment methods?|assessment method|reflection|refl)$/i.test(
          entry
        )
    )
    .filter((entry) => /[a-z]/i.test(entry));
}

function dedupe(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function isLikelyResourceSnippet(snippet: string) {
  return /(teacher'?s notes?|teacher guide|learner'?s book|course book|digital devices|internet|charts?|apparatus|equipment|bible|flashcards?|tools?|specimens)/i.test(
    snippet
  );
}

function isLikelyAssessmentSnippet(snippet: string) {
  return /(assessment|rubrics?|written tests?|oral questions?|checklists?|observation|projects?|discussion|demonstration|quiz)/i.test(
    snippet
  );
}

function isLikelyLearningSnippet(snippet: string) {
  return /(^by the end of the lesson|learners are guided|discuss|explain|identify|describe|demonstrate|appreciate|apply)/i.test(
    snippet
  );
}

async function extractDocxText(buffer: Buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const documentXml = await zip.file("word/document.xml")?.async("string");

  if (!documentXml) {
    return "";
  }

  return normalizeWhitespace(decodeEntities(documentXml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ")));
}

async function extractPdfText(buffer: Buffer) {
  const parser = new PDFParse({ data: buffer });

  try {
    const parsed = await parser.getText().catch(() => null);

    if (!parsed?.text) {
      return "";
    }

    return normalizeWhitespace(parsed.text);
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}

async function readLocalResourceBuffer(resource: ResourceRecord) {
  if (resource.filePath.startsWith("materials/") || resource.filePath.startsWith("schemes/")) {
    return null;
  }

  const absolutePath = path.isAbsolute(resource.filePath)
    ? resource.filePath
    : path.join(process.cwd(), resource.filePath);

  return fs.readFile(absolutePath);
}

async function fetchRemoteResourceBuffer(resource: ResourceRecord) {
  const response = await fetch(resource.fileUrl, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Unable to fetch resource: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function extractResourceText(resource: ResourceRecord) {
  const extension = path.extname(resource.fileName || resource.filePath).toLowerCase();
  const buffer =
    (await readLocalResourceBuffer(resource).catch(() => null)) ??
    (await fetchRemoteResourceBuffer(resource).catch(() => null));

  if (!buffer) {
    return "";
  }

  if (extension === ".docx") {
    return extractDocxText(buffer);
  }

  if (extension === ".pdf") {
    return extractPdfText(buffer);
  }

  if (extension === ".txt" || extension === ".md") {
    return normalizeWhitespace(buffer.toString("utf8"));
  }

  return "";
}

function filterByLevelSubjectTerm(resources: ResourceRecord[], input: { levelTitle: string; subject: string; term: SchemeTerm }) {
  return resources.filter((resource) => {
    if (resource.level !== input.levelTitle) {
      return false;
    }

    if (resource.term && resource.term !== input.term) {
      return false;
    }

    return normalizeSubject(resource.subject) === normalizeSubject(input.subject);
  });
}

export async function buildSchemeNoteContext(input: {
  resources: ResourceRecord[];
  levelTitle: string;
  subject: string;
  term: SchemeTerm;
}) {
  const matchingResources = filterByLevelSubjectTerm(input.resources, input);
  const matchingNotes = matchingResources.filter(
    (resource) => resource.category === "revision-material" && resource.section === "notes"
  );
  const matchingSchemes = matchingResources.filter((resource) => resource.category === "scheme-of-work");

  const usableNotes = matchingNotes.slice(0, 3);
  const usableSchemes = matchingSchemes.slice(0, 3);
  const extractedNotes = await Promise.all(
    usableNotes.map(async (resource) => ({
      title: resource.title,
      text: await extractResourceText(resource)
    }))
  );
  const extractedSchemes = await Promise.all(
    usableSchemes.map(async (resource) => ({
      title: resource.title,
      text: await extractResourceText(resource)
    }))
  );
  const preferredFormatStyle =
    usableSchemes.map((resource) => inferFormatStyle(`${resource.title} ${resource.description}`)).find(Boolean) ??
    extractedSchemes.map((item) => inferFormatStyle(`${item.title} ${item.text.slice(0, 600)}`)).find(Boolean) ??
    null;

  return {
    noteTitles: usableNotes.map((resource) => resource.title),
    noteSnippets: extractedNotes.flatMap((item) => extractCandidateSnippets(item.text)).slice(0, 120),
    schemeTitles: usableSchemes.map((resource) => resource.title),
    schemeSnippets: extractedSchemes.flatMap((item) => extractCandidateSnippets(item.text)).slice(0, 180),
    preferredFormatStyle
  } satisfies SchemeNoteContext;
}

function rankContextSnippets(snippets: string[], subject: string, subStrand: string, limit: number, matcher?: (snippet: string) => boolean) {
  const keywords = getKeywords(subject, subStrand);

  return snippets
    .filter((snippet) => (matcher ? matcher(snippet) : true))
    .map((snippet) => ({ snippet, score: scoreSnippet(snippet, keywords) }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.snippet.length - right.snippet.length)
    .map((entry) => entry.snippet)
    .filter((snippet, index, all) => all.indexOf(snippet) === index)
    .slice(0, limit);
}

export function pickSchemeSnippetsForSubStrand(context: SchemeNoteContext, subject: string, subStrand: string, limit = 3) {
  return rankContextSnippets(context.schemeSnippets, subject, subStrand, limit, isLikelyLearningSnippet);
}

export function pickNoteSnippetsForSubStrand(context: SchemeNoteContext, subject: string, subStrand: string, limit = 3) {
  return rankContextSnippets(context.noteSnippets, subject, subStrand, limit);
}

export function pickResourceSnippets(context: SchemeNoteContext, subject: string, subStrand: string, limit = 4) {
  return dedupe([
    ...rankContextSnippets(context.schemeSnippets, subject, subStrand, limit, isLikelyResourceSnippet),
    ...rankContextSnippets(context.noteSnippets, subject, subStrand, limit, isLikelyResourceSnippet)
  ]).slice(0, limit);
}

export function pickAssessmentSnippets(context: SchemeNoteContext, subject: string, subStrand: string, limit = 4) {
  return dedupe(
    rankContextSnippets(context.schemeSnippets, subject, subStrand, limit, isLikelyAssessmentSnippet)
  ).slice(0, limit);
}
