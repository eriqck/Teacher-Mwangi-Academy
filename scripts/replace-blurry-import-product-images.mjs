#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";

const baseUrl = process.env.WC_URL || "https://homeskitspro.com";
const key = process.env.WC_KEY;
const secret = process.env.WC_SECRET;
const importCsvPath = process.env.IMPORT_CSV || "C:\\Users\\Eric\\Downloads\\WooCommerce_Import_Optimized.csv";
const resultsCsvPath =
  process.env.RESULTS_CSV ||
  path.resolve("outputs", "hsp-missing-products-import-results-20260417-import-missing-optimized-apply.csv");
const stamp = process.env.RUN_STAMP || "20260418-replace-blurry-import-images";
const mode = (process.argv[2] || "preview").toLowerCase();
const outputDir = path.resolve("outputs");

if (!key || !secret) {
  console.error("Missing WC_KEY or WC_SECRET environment variables.");
  process.exit(1);
}

if (!["preview", "apply", "verify"].includes(mode)) {
  console.error("Mode must be one of: preview, apply, verify");
  process.exit(1);
}

mkdirSync(outputDir, { recursive: true });

function csvEscape(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function writeCsv(filePath, headers, rows) {
  const lines = [headers.map(csvEscape).join(",")];
  for (const row of rows) lines.push(headers.map((header) => csvEscape(row[header] ?? "")).join(","));
  writeFileSync(filePath, `${lines.join("\r\n")}\r\n`, "utf8");
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;
  const normalized = String(text).replace(/^\uFEFF/, "");

  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];
    const next = normalized[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    if (row.some((value) => value !== "")) rows.push(row);
  }

  const headers = rows.shift() || [];
  return rows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
}

function normalizeText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function stripThumbnailSize(url) {
  const cleaned = normalizeText(url).split(",")[0].trim();
  if (!cleaned) return "";

  // WordPress generated thumbnails end with -WIDTHxHEIGHT before the extension.
  return cleaned.replace(/-\d+x\d+(?=\.(?:jpe?g|png|webp)$)/i, "");
}

function request(apiPath, method = "GET", body = null, allowedStatusCodes = [200]) {
  const args = ["-s", "-S", "-L", "--http1.1", "--ssl-no-revoke", "-D", "-", "-u", `${key}:${secret}`, "-X", method];
  let tempBodyPath = "";

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
    const error = new Error(`Request failed: ${statusLine || bodyText}`);
    error.statusCode = statusCode;
    error.bodyText = bodyText;
    throw error;
  }

  return bodyText ? JSON.parse(bodyText) : null;
}

function headStatus(url) {
  const args = ["-I", "-L", "-s", "-S", "--http1.1", "--ssl-no-revoke", url];
  const raw = execFileSync("curl.exe", args, { encoding: "utf8", maxBuffer: 1024 * 1024 * 5 });
  const statusLine = raw
    .split(/\r?\n/)
    .reverse()
    .find((line) => line.startsWith("HTTP/"));
  const statusCode = Number(statusLine?.match(/HTTP\/\S+\s+(\d{3})/)?.[1] || 0);
  return { statusCode, statusLine: statusLine || "" };
}

const importRows = parseCsv(readFileSync(importCsvPath, "utf8"));
const resultRows = parseCsv(readFileSync(resultsCsvPath, "utf8")).filter((row) => normalizeText(row.product_id));
const importBySku = new Map(importRows.map((row) => [normalizeText(row.SKU), row]));

const planRows = [];
const applyRows = [];
const verifyRows = [];

for (const result of resultRows) {
  const sku = normalizeText(result.sku);
  const productId = normalizeText(result.product_id);
  const importRow = importBySku.get(sku);
  const originalUrl = normalizeText(importRow?.Images || "");
  const replacementUrl = stripThumbnailSize(originalUrl);
  const hadThumbnailSuffix = /-\d+x\d+(?=\.(?:jpe?g|png|webp)$)/i.test(originalUrl);
  let replacementStatus = "";

  try {
    replacementStatus = replacementUrl ? headStatus(replacementUrl).statusCode : "";
  } catch (error) {
    replacementStatus = `error: ${error.message}`;
  }

  planRows.push({
    sku,
    product_id: productId,
    name: normalizeText(result.name),
    original_image: originalUrl,
    replacement_image: replacementUrl,
    had_thumbnail_suffix: hadThumbnailSuffix ? "yes" : "no",
    replacement_status: replacementStatus,
  });

  if (mode === "apply") {
    try {
      if (!replacementUrl || replacementStatus !== 200) {
        throw new Error(`Replacement image unavailable: ${replacementStatus}`);
      }

      const updated = request(`/wp-json/wc/v3/products/${productId}`, "PUT", {
        images: [
          {
            src: replacementUrl,
            name: normalizeText(result.name),
            alt: normalizeText(result.name),
          },
        ],
      });

      applyRows.push({
        sku,
        product_id: productId,
        name: normalizeText(result.name),
        status: "updated",
        image_id: updated.images?.[0]?.id || "",
        live_image: updated.images?.[0]?.src || "",
        message: "",
      });
    } catch (error) {
      applyRows.push({
        sku,
        product_id: productId,
        name: normalizeText(result.name),
        status: "failed",
        image_id: "",
        live_image: "",
        message: error.message,
      });
    }
  }

  if (mode === "verify") {
    try {
      const product = request(`/wp-json/wc/v3/products/${productId}`);
      const image = product.images?.[0] || {};
      verifyRows.push({
        sku,
        product_id: productId,
        name: product.name,
        live_image: image.src || "",
        image_id: image.id || "",
        still_thumbnail: /-\d+x\d+(?:-\d+)?(?=\.(?:jpe?g|png|webp)$)/i.test(image.src || "") ? "yes" : "no",
        width_hint: image.sizes || "",
        status: product.status,
      });
    } catch (error) {
      verifyRows.push({
        sku,
        product_id: productId,
        name: normalizeText(result.name),
        live_image: "",
        image_id: "",
        still_thumbnail: "unknown",
        width_hint: "",
        status: `error: ${error.message}`,
      });
    }
  }
}

const planPath = path.resolve(outputDir, `hsp-imported-products-image-repair-plan-${stamp}.csv`);
writeCsv(planPath, ["sku", "product_id", "name", "original_image", "replacement_image", "had_thumbnail_suffix", "replacement_status"], planRows);

let applyPath = "";
if (mode === "apply") {
  applyPath = path.resolve(outputDir, `hsp-imported-products-image-repair-results-${stamp}.csv`);
  writeCsv(applyPath, ["sku", "product_id", "name", "status", "image_id", "live_image", "message"], applyRows);
}

let verifyPath = "";
if (mode === "verify") {
  verifyPath = path.resolve(outputDir, `hsp-imported-products-image-repair-verify-${stamp}.csv`);
  writeCsv(verifyPath, ["sku", "product_id", "name", "live_image", "image_id", "still_thumbnail", "width_hint", "status"], verifyRows);
}

console.log(
  JSON.stringify(
    {
      mode,
      products: resultRows.length,
      thumbnailSources: planRows.filter((row) => row.had_thumbnail_suffix === "yes").length,
      replacementAvailable: planRows.filter((row) => row.replacement_status === 200).length,
      updated: applyRows.filter((row) => row.status === "updated").length,
      failed: applyRows.filter((row) => row.status === "failed").length,
      stillThumbnail: verifyRows.filter((row) => row.still_thumbnail === "yes").length,
      planPath,
      applyPath,
      verifyPath,
    },
    null,
    2,
  ),
);
