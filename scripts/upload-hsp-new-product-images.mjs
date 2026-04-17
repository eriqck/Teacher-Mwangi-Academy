#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";

const baseUrl = process.env.WC_URL || "https://homeskitspro.com";
const wcKey = process.env.WC_KEY;
const wcSecret = process.env.WC_SECRET;
const wpUser = process.env.WP_USER || "admin";
const wpAppPassword = process.env.WP_APP_PASSWORD;
const sourceCsvPath = process.argv[2] || "C:/Users/Eric/Downloads/New products to be added.csv";
const stamp = process.env.RUN_STAMP || "20260416-hsp-new-images";
const outputDir = path.resolve("outputs");
const imageDir = path.resolve(outputDir, `hsp-new-product-images-${stamp}`);
const resultsOutputPath = path.resolve(outputDir, `hsp-new-product-image-results-${stamp}.csv`);
const summaryOutputPath = path.resolve(outputDir, `hsp-new-product-image-summary-${stamp}.json`);

if (!wcKey || !wcSecret) {
  console.error("Missing WC_KEY or WC_SECRET environment variables.");
  process.exit(1);
}

if (!wpAppPassword) {
  console.error("Missing WP_APP_PASSWORD environment variable.");
  process.exit(1);
}

mkdirSync(outputDir, { recursive: true });
mkdirSync(imageDir, { recursive: true });

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
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(cell);
      cell = "";
      if (row.some((value) => value !== "")) {
        rows.push(row);
      }
      row = [];
      continue;
    }

    cell += char;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    if (row.some((value) => value !== "")) {
      rows.push(row);
    }
  }

  if (rows.length === 0) {
    return [];
  }

  const headers = rows[0];
  return rows.slice(1).map((values) => {
    const entry = {};
    headers.forEach((header, index) => {
      entry[header] = values[index] ?? "";
    });
    return entry;
  });
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

function hspSkuFromSource(sourceSku) {
  const number = normalizeText(sourceSku).match(/(\d+)/)?.[1] || "";
  return number ? `HSP-${number.padStart(3, "0")}` : normalizeText(sourceSku).replace(/^SKU-/i, "HSP-");
}

function safeFilename(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function requestWoo(apiPath, method = "GET", body = null, allowedStatusCodes = [200]) {
  const args = ["-s", "-S", "-L", "-D", "-", "-u", `${wcKey}:${wcSecret}`, "-X", method];
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
    throw new Error(`Woo request failed: ${statusLine || bodyText}`);
  }

  return bodyText ? JSON.parse(bodyText) : null;
}

function fetchAllProducts() {
  const items = [];
  for (let page = 1; page <= 20; page += 1) {
    const batch = requestWoo(`/wp-json/wc/v3/products?per_page=100&page=${page}`);
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

function downloadImage(url, destination) {
  const args = [
    "-k",
    "-L",
    "-s",
    "-S",
    "--fail",
    "--connect-timeout",
    "20",
    "--max-time",
    "60",
    "-A",
    "Mozilla/5.0",
    "-o",
    destination,
    url,
  ];
  execFileSync("curl.exe", args, {
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
  });
  return existsSync(destination);
}

function uploadMedia(filePath, filename, altText) {
  const raw = execFileSync(
    "curl.exe",
    [
      "-s",
      "-S",
      "-L",
      "-D",
      "-",
      "-u",
      `${wpUser}:${wpAppPassword}`,
      "-X",
      "POST",
      "-H",
      `Content-Disposition: attachment; filename="${filename}"`,
      "-H",
      "Content-Type: image/jpeg",
      "--data-binary",
      `@${filePath}`,
      `${baseUrl}/wp-json/wp/v2/media`,
    ],
    {
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 50,
    },
  );

  const boundary = raw.lastIndexOf("\r\n\r\n");
  const headerText = raw.slice(0, boundary);
  const bodyText = raw.slice(boundary + 4).trim();
  const statusLine = headerText
    .split(/\r\n/)
    .reverse()
    .find((line) => line.startsWith("HTTP/"));
  const statusCode = Number(statusLine?.match(/HTTP\/\S+\s+(\d{3})/)?.[1] || 0);

  if (statusCode !== 201) {
    throw new Error(`Media upload failed: ${statusLine || bodyText}`);
  }

  const media = JSON.parse(bodyText);

  try {
    requestWpJson(`/wp-json/wp/v2/media/${media.id}`, "POST", {
      alt_text: altText,
      caption: "",
      description: "",
    });
  } catch {}

  return media;
}

function requestWpJson(apiPath, method = "GET", body = null) {
  const args = ["-s", "-S", "-L", "-u", `${wpUser}:${wpAppPassword}`, "-X", method];
  if (body !== null) {
    args.push("-H", "Content-Type: application/json; charset=utf-8", "--data-binary", JSON.stringify(body));
  }
  args.push(`${baseUrl}${apiPath}`);
  const output = execFileSync("curl.exe", args, {
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 50,
  });
  return output ? JSON.parse(output) : null;
}

const rows = parseCsv(readFileSync(sourceCsvPath, "utf8"));
const liveProducts = fetchAllProducts();
const productBySku = new Map(liveProducts.filter((product) => normalizeText(product.sku)).map((product) => [normalizeText(product.sku), product]));
const results = [];

for (const row of rows) {
  const sku = hspSkuFromSource(row.sku);
  const product = productBySku.get(sku);
  const title = normalizeText(row.title);
  const urls = [normalizeText(row.image_link), normalizeText(row.additional_image_link)].filter(Boolean);

  if (!product) {
    results.push({ sku, title, product_id: "", status: "missing_product", media_id: "", source_url: "", message: "" });
    continue;
  }

  if ((product.images || []).length > 0) {
    results.push({ sku, title, product_id: product.id, status: "already_has_image", media_id: product.images[0].id || "", source_url: product.images[0].src || "", message: "" });
    continue;
  }

  let attached = false;
  let lastMessage = "";

  for (let index = 0; index < urls.length; index += 1) {
    const sourceUrl = urls[index];
    const filePath = path.resolve(imageDir, `${sku.toLowerCase()}-${index + 1}-${safeFilename(title)}.jpg`);
    const filename = `${sku.toLowerCase()}-${safeFilename(title)}.jpg`;

    try {
      downloadImage(sourceUrl, filePath);
      const media = uploadMedia(filePath, filename, title);
      const updated = requestWoo(`/wp-json/wc/v3/products/${product.id}`, "PUT", {
        images: [{ id: media.id }],
      });
      results.push({
        sku,
        title,
        product_id: updated.id,
        status: "attached",
        media_id: media.id,
        source_url: sourceUrl,
        message: "",
      });
      attached = true;
      break;
    } catch (error) {
      lastMessage = normalizeText(error.message);
    }
  }

  if (!attached) {
    results.push({
      sku,
      title,
      product_id: product.id,
      status: "image_failed",
      media_id: "",
      source_url: urls.join(" | "),
      message: lastMessage,
    });
  }
}

writeCsv(resultsOutputPath, ["sku", "title", "product_id", "status", "media_id", "source_url", "message"], results);

const summary = {
  sourceCsvPath,
  totalRows: rows.length,
  attached: results.filter((row) => row.status === "attached").length,
  alreadyHadImage: results.filter((row) => row.status === "already_has_image").length,
  failed: results.filter((row) => row.status === "image_failed").length,
  missingProducts: results.filter((row) => row.status === "missing_product").length,
  resultsOutputPath,
};
writeFileSync(summaryOutputPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
console.log(JSON.stringify(summary, null, 2));
