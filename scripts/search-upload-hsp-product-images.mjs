#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";

const baseUrl = process.env.WC_URL || "https://homeskitspro.com";
const wcKey = process.env.WC_KEY;
const wcSecret = process.env.WC_SECRET;
const wpUser = process.env.WP_USER || "admin";
const wpAppPassword = process.env.WP_APP_PASSWORD;
const sourceCsvPath = process.argv[2] || "C:/Users/Eric/Downloads/New products to be added.csv";
const stamp = process.env.RUN_STAMP || "20260416-hsp-online-images";
const outputDir = path.resolve("outputs");
const imageDir = path.resolve(outputDir, `hsp-online-product-images-${stamp}`);
const resultsOutputPath = path.resolve(outputDir, `hsp-online-product-image-results-${stamp}.csv`);
const candidatesOutputPath = path.resolve(outputDir, `hsp-online-product-image-candidates-${stamp}.csv`);
const summaryOutputPath = path.resolve(outputDir, `hsp-online-product-image-summary-${stamp}.json`);

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

function htmlDecode(value) {
  return String(value || "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function requestWoo(apiPath, method = "GET", body = null, allowedStatusCodes = [200]) {
  const args = ["-s", "-S", "-L", "--http1.1", "--ssl-no-revoke", "-D", "-", "-u", `${wcKey}:${wcSecret}`, "-X", method];
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

function fetchProductBySku(sku) {
  const response = requestWoo(`/wp-json/wc/v3/products?sku=${encodeURIComponent(sku)}`);
  return Array.isArray(response) ? response[0] || null : null;
}

function bingImageCandidates(query) {
  const html = execFileSync(
    "curl.exe",
    ["-L", "-s", "-S", "-A", "Mozilla/5.0", `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&form=HDRSC2`],
    {
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 20,
    },
  );

  const candidates = [];
  const matches = [
    ...html.matchAll(/m="([^"]+)"/g),
    ...html.matchAll(/m=\\"([^"]+)\\"/g),
  ];
  for (const match of matches) {
    const decoded = htmlDecode(match[1].replace(/\\"/g, '"'));
    if (!decoded.includes('"murl"')) continue;
    try {
      const data = JSON.parse(decoded);
      if (data?.murl) {
        candidates.push(data);
      }
    } catch {}
  }

  return candidates;
}

function titleTokens(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 4 && !["with", "inch", "product", "image"].includes(token));
}

function scoreCandidate(row, candidate) {
  const brand = normalizeText(row.brand).toLowerCase();
  const mpn = normalizeText(row.mpn).toLowerCase();
  const haystack = normalizeText(`${candidate.t || ""} ${candidate.desc || ""} ${candidate.purl || ""} ${candidate.murl || ""}`).toLowerCase();
  let score = 0;
  const reasons = [];
  let hasBrand = false;
  let hasMpn = false;

  if (brand && haystack.includes(brand)) {
    hasBrand = true;
    score += 3;
    reasons.push("brand");
  }
  if (mpn && haystack.includes(mpn)) {
    hasMpn = true;
    score += 6;
    reasons.push("mpn");
  }

  const tokens = titleTokens(row.title);
  const matchedTokens = tokens.filter((token) => haystack.includes(token));
  score += Math.min(4, matchedTokens.length);
  if (matchedTokens.length) {
    reasons.push(`tokens:${matchedTokens.slice(0, 5).join("|")}`);
  }

  const lowerUrl = normalizeText(candidate.murl).toLowerCase();
  if (/\.(jpg|jpeg|png|webp)(\?|$)/.test(lowerUrl)) {
    score += 1;
    reasons.push("image_ext");
  }

  return {
    score,
    hasBrand,
    hasMpn,
    reasons: reasons.join(","),
  };
}

function downloadImage(url, destination) {
  execFileSync(
    "curl.exe",
    ["-k", "-L", "-s", "-S", "--fail", "--connect-timeout", "20", "--max-time", "80", "-A", "Mozilla/5.0", "-o", destination, url],
    {
      encoding: "utf8",
      maxBuffer: 1024 * 1024,
    },
  );

  return existsSync(destination) && statSync(destination).size > 4000;
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

  return JSON.parse(bodyText);
}

const sourceRows = parseCsv(readFileSync(sourceCsvPath, "utf8"));
const results = [];
const candidateRows = [];

for (const row of sourceRows) {
  const sku = hspSkuFromSource(row.sku);
  const product = fetchProductBySku(sku);
  const title = normalizeText(row.title);
  const brand = normalizeText(row.brand);
  const mpn = normalizeText(row.mpn);

  if (!product) {
    results.push({ sku, title, product_id: "", status: "missing_product", media_id: "", score: "", source_url: "", page_url: "", message: "" });
    continue;
  }

  if ((product.images || []).length > 0) {
    results.push({ sku, title, product_id: product.id, status: "already_has_image", media_id: product.images[0].id || "", score: "", source_url: product.images[0].src || "", page_url: "", message: "" });
    continue;
  }

  let candidates = [];
  for (const query of [`"${brand}" "${mpn}" product image`, `"${title}" product image`]) {
    try {
      candidates.push(...bingImageCandidates(query));
    } catch {}
  }

  const scored = candidates
    .map((candidate) => ({
      ...candidate,
      ...scoreCandidate(row, candidate),
    }))
    .filter((candidate) => candidate.murl && candidate.score >= 9 && candidate.hasBrand && candidate.hasMpn)
    .sort((left, right) => right.score - left.score)
    .slice(0, 8);

  for (const candidate of scored.slice(0, 5)) {
    candidateRows.push({
      sku,
      title,
      score: candidate.score,
      reasons: candidate.reasons,
      image_url: candidate.murl,
      page_url: candidate.purl || "",
      result_title: normalizeText(candidate.t || ""),
    });
  }

  let attached = false;
  let lastMessage = scored.length ? "" : "no high-confidence image candidate";

  for (const [index, candidate] of scored.entries()) {
    const filePath = path.resolve(imageDir, `${sku.toLowerCase()}-${index + 1}-${safeFilename(title)}.jpg`);
    const filename = `${sku.toLowerCase()}-${safeFilename(title)}.jpg`;
    try {
      if (!downloadImage(candidate.murl, filePath)) {
        lastMessage = "downloaded file too small";
        continue;
      }
      const media = uploadMedia(filePath, filename, title);
      const updated = requestWoo(`/wp-json/wc/v3/products/${product.id}`, "PUT", {
        images: [{ id: media.id }],
      });
      results.push({
        sku,
        title,
        product_id: updated.id,
        status: "attached_online_image",
        media_id: media.id,
        score: candidate.score,
        source_url: candidate.murl,
        page_url: candidate.purl || "",
        message: candidate.reasons,
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
      status: "not_attached",
      media_id: "",
      score: scored[0]?.score || "",
      source_url: scored[0]?.murl || "",
      page_url: scored[0]?.purl || "",
      message: lastMessage,
    });
  }
}

writeCsv(resultsOutputPath, ["sku", "title", "product_id", "status", "media_id", "score", "source_url", "page_url", "message"], results);
writeCsv(candidatesOutputPath, ["sku", "title", "score", "reasons", "image_url", "page_url", "result_title"], candidateRows);

const summary = {
  sourceCsvPath,
  totalRows: sourceRows.length,
  attached: results.filter((row) => row.status === "attached_online_image").length,
  alreadyHadImage: results.filter((row) => row.status === "already_has_image").length,
  notAttached: results.filter((row) => row.status === "not_attached").length,
  missingProducts: results.filter((row) => row.status === "missing_product").length,
  resultsOutputPath,
  candidatesOutputPath,
};
writeFileSync(summaryOutputPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
console.log(JSON.stringify(summary, null, 2));
