#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";

const baseUrl = process.env.WP_URL || "https://homeskitspro.com";
const wpUser = process.env.WP_USER;
const wpAppPassword = process.env.WP_APP_PASSWORD;
const newPhone = process.env.NEW_PHONE || "+254 712 675537";
const stamp = process.env.RUN_STAMP || "20260419-site-phone-number-update";
const mode = (process.argv[2] || "audit").toLowerCase();
const outputDir = path.resolve("outputs");

if (!wpUser || !wpAppPassword) {
  console.error("Missing WP_USER or WP_APP_PASSWORD environment variables.");
  process.exit(1);
}

if (!["audit", "apply", "verify"].includes(mode)) {
  console.error("Mode must be one of: audit, apply, verify");
  process.exit(1);
}

mkdirSync(outputDir, { recursive: true });

const publicPaths = ["/", "/contact-us/", "/services/", "/track-order/", "/about-us/", "/privacy-policy/", "/returns-and-refunds/"];

const phonePatterns = [
  /\+\d[\d\s().-]{7,}\d/g,
  /\b0\d{2,4}[\s().-]?\d{3}[\s().-]?\d{3,4}\b/g,
  /\b\d{3}[\s().-]\d{3}[\s().-]\d{4}\b/g,
];

function csvEscape(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function writeCsv(filePath, headers, rows) {
  const lines = [headers.map(csvEscape).join(",")];
  for (const row of rows) lines.push(headers.map((header) => csvEscape(row[header] ?? "")).join(","));
  writeFileSync(filePath, `${lines.join("\r\n")}\r\n`, "utf8");
}

function normalizeText(value) {
  return String(value ?? "")
    .replace(/&amp;/gi, "&")
    .replace(/&#43;/g, "+")
    .replace(/\s+/g, " ")
    .trim();
}

function requestJson(apiPath, method = "GET", body = null, allowedStatusCodes = [200]) {
  const args = ["-s", "-S", "-L", "--http1.1", "--ssl-no-revoke", "-D", "-", "-u", `${wpUser}:${wpAppPassword}`, "-X", method];
  let tempBodyPath = "";

  if (body !== null) {
    tempBodyPath = path.resolve(outputDir, `wp-body-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
    writeFileSync(tempBodyPath, JSON.stringify(body), "utf8");
    args.push("-H", "Content-Type: application/json; charset=utf-8", "--data-binary", `@${tempBodyPath}`);
  }

  args.push(`${baseUrl}${apiPath}`);

  let raw;
  try {
    raw = execFileSync("curl.exe", args, {
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 80,
    });
  } finally {
    if (tempBodyPath) {
      try {
        unlinkSync(tempBodyPath);
      } catch {
        // Ignore temp cleanup failures.
      }
    }
  }

  const boundary = raw.lastIndexOf("\r\n\r\n");
  if (boundary === -1) throw new Error("Unexpected curl response format.");
  const headerText = raw.slice(0, boundary);
  const bodyText = raw.slice(boundary + 4).trim();
  const statusLine = headerText
    .split(/\r\n/)
    .reverse()
    .find((line) => line.startsWith("HTTP/"));
  const statusCode = Number(statusLine?.match(/HTTP\/\S+\s+(\d{3})/)?.[1] || 0);

  if (!allowedStatusCodes.includes(statusCode)) {
    const error = new Error(`WP request failed: ${statusLine || bodyText}`);
    error.statusCode = statusCode;
    error.bodyText = bodyText;
    throw error;
  }

  return bodyText ? JSON.parse(bodyText) : null;
}

function fetchText(url) {
  return execFileSync("curl.exe", ["-s", "-S", "-L", "--http1.1", "--ssl-no-revoke", url], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 40,
  });
}

function fetchAll(type) {
  const items = [];
  for (let page = 1; page <= 20; page += 1) {
    const batch = requestJson(`/wp-json/wp/v2/${type}?per_page=100&page=${page}&status=publish,draft,private,pending,future&context=edit`, "GET", null, [200, 400]);
    if (!Array.isArray(batch) || batch.length === 0) break;
    items.push(...batch);
    if (batch.length < 100) break;
  }
  return items;
}

function availableRestBases() {
  const types = requestJson("/wp-json/wp/v2/types?context=edit");
  const bases = new Set(["pages", "posts"]);
  for (const type of Object.values(types || {})) {
    if (["cms_block", "blocks", "templates", "template-parts", "portfolio"].includes(type.rest_base)) {
      bases.add(type.rest_base);
    }
  }
  return Array.from(bases);
}

function decodeEntities(value) {
  return String(value ?? "")
    .replace(/&#43;/g, "+")
    .replace(/&#x2B;/gi, "+")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&");
}

function phoneMatches(text) {
  const decoded = decodeEntities(text);
  const matches = [];
  for (const pattern of phonePatterns) {
    for (const match of decoded.matchAll(pattern)) {
      const value = normalizeText(match[0]);
      const start = Math.max(0, match.index - 70);
      const end = Math.min(decoded.length, match.index + match[0].length + 70);
      const context = decoded.slice(start, end);
      if (!value || value === newPhone) continue;
      matches.push({ value, context });
    }
  }
  return Array.from(new Map(matches.map((match) => [`${match.value}:${match.context}`, match])).values());
}

function isWhatsAppContext(context) {
  return /whats\s*app|wa\.me|api\.whatsapp\.com|chat/i.test(context);
}

function replacePhonesOutsideWhatsApp(raw) {
  let text = String(raw ?? "");
  let replaced = 0;

  for (const pattern of phonePatterns) {
    text = text.replace(pattern, (match, offset, whole) => {
      const start = Math.max(0, offset - 120);
      const end = Math.min(whole.length, offset + match.length + 120);
      const context = whole.slice(start, end);
      if (isWhatsAppContext(context)) return match;
      const normalized = normalizeText(decodeEntities(match));
      if (!normalized || normalized === newPhone) return match;
      replaced += 1;
      return newPhone;
    });
  }

  return { text, replaced };
}

function renderedContext(text, phone) {
  const decoded = decodeEntities(text);
  const index = decoded.indexOf(phone);
  if (index === -1) return "";
  return decoded.slice(Math.max(0, index - 90), Math.min(decoded.length, index + phone.length + 90)).replace(/\s+/g, " ");
}

const auditRows = [];
const applyRows = [];
const verifyRows = [];

const items = [];
for (const restBase of availableRestBases()) {
  for (const item of fetchAll(restBase)) {
    items.push({ type: restBase, item });
  }
}

for (const { type, item } of items) {
  const rawContent = item.content?.raw ?? item.content?.rendered ?? "";
  const rawExcerpt = item.excerpt?.raw ?? item.excerpt?.rendered ?? "";
  const rawElementorData = item.meta?._elementor_data ?? "";
  const combined = `${item.title?.raw || item.title?.rendered || ""}\n${rawContent}\n${rawExcerpt}\n${rawElementorData}`;
  const matches = phoneMatches(combined);

  for (const match of matches) {
    auditRows.push({
      source: "wp-content",
      type,
      id: item.id,
      title: item.title?.raw || item.title?.rendered || "",
      phone: match.value,
      whatsapp_context: isWhatsAppContext(match.context) ? "yes" : "no",
      context: match.context.replace(/\s+/g, " "),
    });
  }

  if (mode === "apply") {
    const contentReplacement = replacePhonesOutsideWhatsApp(rawContent);
    const excerptReplacement = replacePhonesOutsideWhatsApp(rawExcerpt);
    const elementorReplacement = replacePhonesOutsideWhatsApp(rawElementorData);
    const payload = {};
    if (contentReplacement.replaced > 0) payload.content = contentReplacement.text;
    if (excerptReplacement.replaced > 0) payload.excerpt = excerptReplacement.text;
    if (elementorReplacement.replaced > 0) payload.meta = { _elementor_data: elementorReplacement.text };

    if (Object.keys(payload).length > 0) {
      try {
        requestJson(`/wp-json/wp/v2/${type}/${item.id}`, "POST", payload, [200]);
        applyRows.push({
          type,
          id: item.id,
          title: item.title?.raw || item.title?.rendered || "",
          content_replacements: contentReplacement.replaced,
          excerpt_replacements: excerptReplacement.replaced,
          elementor_replacements: elementorReplacement.replaced,
          status: "updated",
          message: "",
        });
      } catch (error) {
        applyRows.push({
          type,
          id: item.id,
          title: item.title?.raw || item.title?.rendered || "",
          content_replacements: contentReplacement.replaced,
          excerpt_replacements: excerptReplacement.replaced,
          elementor_replacements: elementorReplacement.replaced,
          status: "failed",
          message: error.message,
        });
      }
    }
  }
}

for (const publicPath of publicPaths) {
  try {
    const url = `${baseUrl}${publicPath}`;
    const html = fetchText(url);
    const matches = phoneMatches(html);
    for (const match of matches) {
      auditRows.push({
        source: "rendered-page",
        type: "public",
        id: "",
        title: publicPath,
        phone: match.value,
        whatsapp_context: isWhatsAppContext(match.context) ? "yes" : "no",
        context: match.context.replace(/\s+/g, " "),
      });
    }

    if (mode === "verify") {
      verifyRows.push({
        path: publicPath,
        has_new_phone: html.includes(newPhone) ? "yes" : "no",
        old_non_whatsapp_phones: matches.filter((match) => !isWhatsAppContext(match.context)).map((match) => match.value).join(" | "),
        whatsapp_phones_found: matches.filter((match) => isWhatsAppContext(match.context)).map((match) => match.value).join(" | "),
        sample_new_phone_context: renderedContext(html, newPhone),
      });
    }
  } catch (error) {
    if (mode === "verify") {
      verifyRows.push({
        path: publicPath,
        has_new_phone: "error",
        old_non_whatsapp_phones: "",
        whatsapp_phones_found: "",
        sample_new_phone_context: error.message,
      });
    }
  }
}

const auditPath = path.resolve(outputDir, `hsp-site-phone-audit-${stamp}.csv`);
writeCsv(auditPath, ["source", "type", "id", "title", "phone", "whatsapp_context", "context"], auditRows);

let applyPath = "";
if (mode === "apply") {
  applyPath = path.resolve(outputDir, `hsp-site-phone-update-results-${stamp}.csv`);
  writeCsv(
    applyPath,
    ["type", "id", "title", "content_replacements", "excerpt_replacements", "elementor_replacements", "status", "message"],
    applyRows,
  );
}

let verifyPath = "";
if (mode === "verify") {
  verifyPath = path.resolve(outputDir, `hsp-site-phone-verify-${stamp}.csv`);
  writeCsv(verifyPath, ["path", "has_new_phone", "old_non_whatsapp_phones", "whatsapp_phones_found", "sample_new_phone_context"], verifyRows);
}

console.log(
  JSON.stringify(
    {
      mode,
      wpContentMatches: auditRows.filter((row) => row.source === "wp-content").length,
      renderedMatches: auditRows.filter((row) => row.source === "rendered-page").length,
      nonWhatsappMatches: auditRows.filter((row) => row.whatsapp_context === "no").length,
      whatsappMatchesLeftAlone: auditRows.filter((row) => row.whatsapp_context === "yes").length,
      updatedItems: applyRows.filter((row) => row.status === "updated").length,
      failedUpdates: applyRows.filter((row) => row.status === "failed").length,
      auditPath,
      applyPath,
      verifyPath,
    },
    null,
    2,
  ),
);
