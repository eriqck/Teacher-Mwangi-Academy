#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";

const baseUrl = process.env.WC_URL || "https://homeskitspro.com";
const key = process.env.WC_KEY;
const secret = process.env.WC_SECRET;
const stamp = process.env.RUN_STAMP || "20260416-empty-category-cleanup";
const outputDir = path.resolve("outputs");

if (!key || !secret) {
  console.error("Missing WC_KEY or WC_SECRET environment variables.");
  process.exit(1);
}

mkdirSync(outputDir, { recursive: true });

const resultsOutputPath = path.resolve(outputDir, `empty-live-category-cleanup-results-${stamp}.csv`);
const summaryOutputPath = path.resolve(outputDir, `empty-live-category-cleanup-summary-${stamp}.json`);

function csvEscape(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function writeCsv(filePath, headers, rows) {
  const lines = [headers.map(csvEscape).join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => csvEscape(row[header] ?? "")).join(","));
  }
  writeFileSync(filePath, `${lines.join("\r\n")}\r\n`, "utf8");
}

function normalizeText(value) {
  return String(value ?? "")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;|&apos;/gi, "'")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function request(apiPath, method = "GET", body = null, allowedStatusCodes = [200]) {
  const args = ["-s", "-S", "-L", "-D", "-", "-u", `${key}:${secret}`, "-X", method];
  let tempBodyPath = null;

  if (body !== null) {
    tempBodyPath = path.resolve(outputDir, `curl-body-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
    writeFileSync(tempBodyPath, JSON.stringify(body), "utf8");
    args.push("-H", "Content-Type: application/json; charset=utf-8", "--data-binary", `@${tempBodyPath}`);
  }

  args.push(`${baseUrl}${apiPath}`);

  let raw;
  try {
    raw = execFileSync("curl.exe", args, {
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 50,
    });
  } finally {
    if (tempBodyPath) {
      try {
        unlinkSync(tempBodyPath);
      } catch {}
    }
  }

  const boundary = raw.lastIndexOf("\r\n\r\n");
  const headerText = raw.slice(0, boundary);
  const bodyText = raw.slice(boundary + 4).trim();
  const statusLine = headerText
    .split(/\r\n/)
    .reverse()
    .find((line) => line.startsWith("HTTP/"));
  const statusCode = Number(statusLine?.match(/HTTP\/\S+\s+(\d{3})/)?.[1] || 0);

  if (!allowedStatusCodes.includes(statusCode)) {
    throw new Error(`Request failed: ${statusLine || bodyText}`);
  }

  return bodyText ? JSON.parse(bodyText) : null;
}

function fetchAllCategories() {
  const items = [];
  for (let page = 1; page <= 10; page += 1) {
    const batch = request(`/wp-json/wc/v3/products/categories?per_page=100&page=${page}`);
    if (!Array.isArray(batch) || batch.length === 0) {
      break;
    }
    items.push(...batch);
    if (batch.length < 100) {
      break;
    }
  }
  return items;
}

function depth(category, categoryById) {
  let count = 0;
  let current = category;
  while (current?.parent && categoryById.has(Number(current.parent))) {
    count += 1;
    current = categoryById.get(Number(current.parent));
  }
  return count;
}

function buildEmptyBranches(categories) {
  const categoryById = new Map(categories.map((category) => [Number(category.id), category]));
  const childrenByParent = new Map();
  for (const category of categories) {
    const parentId = Number(category.parent || 0);
    if (!childrenByParent.has(parentId)) {
      childrenByParent.set(parentId, []);
    }
    childrenByParent.get(parentId).push(category);
  }

  const memo = new Map();
  function subtreeHasProducts(categoryId) {
    if (memo.has(categoryId)) {
      return memo.get(categoryId);
    }
    const category = categoryById.get(Number(categoryId));
    const hasProducts = Number(category?.count || 0) > 0;
    const childHasProducts = (childrenByParent.get(Number(categoryId)) || []).some((child) => subtreeHasProducts(child.id));
    const result = hasProducts || childHasProducts;
    memo.set(categoryId, result);
    return result;
  }

  return categories
    .filter((category) => !subtreeHasProducts(category.id))
    .sort((left, right) => depth(right, categoryById) - depth(left, categoryById) || Number(right.id) - Number(left.id));
}

const before = fetchAllCategories();
const emptyBranches = buildEmptyBranches(before);
const results = [];

for (const category of emptyBranches) {
  const response = request(`/wp-json/wc/v3/products/categories/${category.id}?force=true`, "DELETE", null, [200, 400, 404, 500]);
  results.push({
    id: category.id,
    name: normalizeText(category.name),
    parent: category.parent || 0,
    count: Number(category.count || 0),
    status:
      response?.deleted === true
        ? "deleted"
        : response?.data?.status === 404
          ? "not_found"
          : response?.data?.status === 400
            ? "skipped_400"
            : response?.data?.status === 500
              ? "skipped_500"
              : "unknown",
    message: normalizeText(response?.message || ""),
  });
}

const after = fetchAllCategories();
const remainingEmpty = buildEmptyBranches(after);

writeCsv(resultsOutputPath, ["id", "name", "parent", "count", "status", "message"], results);

const summary = {
  beforeCategories: before.length,
  targetedEmptyBranches: emptyBranches.length,
  deleted: results.filter((row) => row.status === "deleted").length,
  skipped: results.filter((row) => row.status !== "deleted").length,
  afterCategories: after.length,
  remainingEmptyBranches: remainingEmpty.length,
  remainingEmptyNames: remainingEmpty.map((category) => normalizeText(category.name)),
  resultsOutputPath,
};

writeFileSync(summaryOutputPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
console.log(JSON.stringify(summary, null, 2));
