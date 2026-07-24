#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";

const baseUrl = process.env.WP_URL || "https://homeskitspro.com";
const wpUser = process.env.WP_USER;
const wpAppPassword = process.env.WP_APP_PASSWORD;
const phone = process.env.NEW_PHONE || "+254 712 675537";
const stamp = process.env.RUN_STAMP || "20260420-fix-phone-opening-bracket";
const mode = (process.argv[2] || "apply").toLowerCase();
const outputDir = path.resolve("outputs");

if (!wpUser || !wpAppPassword) {
  console.error("Missing WP_USER or WP_APP_PASSWORD environment variables.");
  process.exit(1);
}

if (!["apply", "verify"].includes(mode)) {
  console.error("Mode must be one of: apply, verify");
  process.exit(1);
}

mkdirSync(outputDir, { recursive: true });

const cmsBlockIds = [489, 514, 684];
const publicPaths = ["/", "/contact-us/", "/services/", "/track-order/", "/about-us/", "/privacy-policy/", "/returns-and-refunds/"];

function csvEscape(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function writeCsv(filePath, headers, rows) {
  const lines = [headers.map(csvEscape).join(",")];
  for (const row of rows) lines.push(headers.map((header) => csvEscape(row[header] ?? "")).join(","));
  writeFileSync(filePath, `${lines.join("\r\n")}\r\n`, "utf8");
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
        // Ignore cleanup failures.
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

function fixBracket(value) {
  const source = String(value ?? "");
  const fixed = source
    .replaceAll(`Phone: (${phone}`, `Phone: ${phone}`)
    .replaceAll(`(${phone}`, phone);
  return { fixed, replacements: source === fixed ? 0 : (source.match(new RegExp(`\\(${phone.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "g")) || []).length };
}

function clearElementorCache() {
  execFileSync("curl.exe", [
    "--retry",
    "3",
    "--retry-delay",
    "3",
    "--retry-all-errors",
    "-s",
    "-S",
    "-L",
    "--http1.1",
    "--ssl-no-revoke",
    "-u",
    `${wpUser}:${wpAppPassword}`,
    "-X",
    "DELETE",
    `${baseUrl}/wp-json/elementor/v1/cache`,
  ]);
}

const applyRows = [];
const verifyRows = [];

if (mode === "apply") {
  for (const id of cmsBlockIds) {
    const block = requestJson(`/wp-json/wp/v2/cms_block/${id}?context=edit`);
    const rawContent = block.content?.raw || "";
    const elementorData = block.meta?._elementor_data || "";
    const rawFix = fixBracket(rawContent);
    const metaFix = fixBracket(elementorData);
    const payload = {};

    if (rawFix.replacements > 0) payload.content = rawFix.fixed;
    if (metaFix.replacements > 0) payload.meta = { _elementor_data: metaFix.fixed };

    if (Object.keys(payload).length > 0) {
      requestJson(`/wp-json/wp/v2/cms_block/${id}`, "POST", payload, [200]);
    }

    applyRows.push({
      id,
      title: block.title?.raw || block.title?.rendered || "",
      raw_replacements: rawFix.replacements,
      elementor_replacements: metaFix.replacements,
      status: Object.keys(payload).length > 0 ? "updated" : "unchanged",
    });
  }

  clearElementorCache();
}

for (const publicPath of publicPaths) {
  const html = fetchText(`${baseUrl}${publicPath}`);
  const footerBracketMatches = [...html.matchAll(new RegExp(`Phone:\\s*\\(${phone.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "g"))];
  const anyNewPhoneBracketMatches = [...html.matchAll(new RegExp(`\\(${phone.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "g"))];
  verifyRows.push({
    path: publicPath,
    has_new_phone: html.includes(phone) ? "yes" : "no",
    phone_opening_bracket_count: anyNewPhoneBracketMatches.length,
    footer_phone_opening_bracket_count: footerBracketMatches.length,
  });
}

let applyPath = "";
if (mode === "apply") {
  applyPath = path.resolve(outputDir, `hsp-fix-phone-opening-bracket-results-${stamp}.csv`);
  writeCsv(applyPath, ["id", "title", "raw_replacements", "elementor_replacements", "status"], applyRows);
}

const verifyPath = path.resolve(outputDir, `hsp-fix-phone-opening-bracket-verify-${stamp}.csv`);
writeCsv(verifyPath, ["path", "has_new_phone", "phone_opening_bracket_count", "footer_phone_opening_bracket_count"], verifyRows);

console.log(
  JSON.stringify(
    {
      mode,
      updatedBlocks: applyRows.filter((row) => row.status === "updated").length,
      totalRawReplacements: applyRows.reduce((sum, row) => sum + Number(row.raw_replacements || 0), 0),
      totalElementorReplacements: applyRows.reduce((sum, row) => sum + Number(row.elementor_replacements || 0), 0),
      publicPagesWithBracket: verifyRows.filter((row) => Number(row.phone_opening_bracket_count) > 0).length,
      applyPath,
      verifyPath,
    },
    null,
    2,
  ),
);
