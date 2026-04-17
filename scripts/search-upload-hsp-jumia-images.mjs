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
const stamp = process.env.RUN_STAMP || "20260416-hsp-jumia-images";
const matchMode = process.env.MATCH_MODE || "strict";
const relaxedMode = matchMode === "relaxed";
const visualMode = matchMode === "visual";
const dryRun = process.env.DRY_RUN === "1";
const outputDir = path.resolve("outputs");
const imageDir = path.resolve(outputDir, `hsp-jumia-product-images-${stamp}`);
const resultsOutputPath = path.resolve(outputDir, `hsp-jumia-product-image-results-${stamp}.csv`);
const candidatesOutputPath = path.resolve(outputDir, `hsp-jumia-product-image-candidates-${stamp}.csv`);
const summaryOutputPath = path.resolve(outputDir, `hsp-jumia-product-image-summary-${stamp}.json`);

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
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      cell = "";
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      continue;
    }

    cell += char;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    if (row.some((value) => value !== "")) rows.push(row);
  }

  if (rows.length === 0) return [];
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

function htmlDecode(value) {
  return String(value || "")
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function hspSkuFromSource(sourceSku) {
  const number = normalizeText(sourceSku).match(/(\d+)/)?.[1] || "";
  return number ? `HSP-${number.padStart(3, "0")}` : normalizeText(sourceSku).replace(/^SKU-/i, "HSP-");
}

function safeFilename(value) {
  return normalizeText(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90);
}

function titleTokens(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !["with", "and", "the", "for", "new", "inch"].includes(token));
}

const familyTerms = [
  ["washing machine", ["washing", "washer", "machine"]],
  ["refrigerator", ["refrigerator", "fridge", "freezer"]],
  ["tv", ["tv", "television"]],
  ["standing fan", ["standing", "stand", "fan"]],
  ["tower fan", ["tower", "fan"]],
  ["air cooler", ["air", "cooler"]],
  ["generator", ["generator", "genset"]],
  ["inverter", ["inverter"]],
  ["solar panel", ["solar", "panel"]],
  ["water pump", ["water", "pump"]],
  ["plate cooker", ["plate", "cooker", "hotplate"]],
  ["gas cooker", ["gas", "cooker", "burner"]],
  ["microwave", ["microwave"]],
  ["blender", ["blender"]],
  ["mixer", ["mixer"]],
  ["kettle", ["kettle"]],
  ["iron", ["iron"]],
  ["vacuum cleaner", ["vacuum", "cleaner"]],
  ["air purifier", ["air", "purifier"]],
  ["speaker", ["speaker"]],
  ["water dispenser", ["water", "dispenser"]],
];

function productFamily(value) {
  const text = normalizeText(value).toLowerCase();
  return familyTerms.find(([, terms]) => terms.every((term) => text.includes(term)))?.[0] || "";
}

function specsFromText(value) {
  const text = normalizeText(value).toLowerCase();
  const specs = [];
  for (const match of text.matchAll(/(\d+(?:\.\d+)?)\s*(kg|kgs|kilogram|kilograms|l|lt|ltr|litre|litres|liter|liters|inch|inches|in|kva|kw|w|watts|hp)\b/g)) {
    const number = Number(match[1]);
    let unit = match[2];
    if (!Number.isFinite(number)) continue;
    if (["kgs", "kilogram", "kilograms"].includes(unit)) unit = "kg";
    if (["lt", "ltr", "litre", "litres", "liter", "liters"].includes(unit)) unit = "l";
    if (["inches", "in"].includes(unit)) unit = "inch";
    if (unit === "watts") unit = "w";
    specs.push({ number, unit });
  }
  return specs;
}

function relevantSpecs(row) {
  return specsFromText(`${row.title} ${row.size} ${row.product_type} ${row.custom_label_0}`).filter((spec) => {
    if (spec.unit === "w" && spec.number < 100) return false;
    return true;
  });
}

function specsCompatible(row, haystack) {
  const wanted = relevantSpecs(row);
  const found = specsFromText(haystack);
  const reasons = [];

  for (const spec of wanted) {
    const sameUnit = found.filter((candidate) => candidate.unit === spec.unit);
    if (sameUnit.length === 0) continue;
    const match = sameUnit.some((candidate) => {
      const tolerance = spec.unit === "w" ? Math.max(25, spec.number * 0.08) : Math.max(1, spec.number * 0.08);
      return Math.abs(candidate.number - spec.number) <= tolerance;
    });
    if (!match) return { ok: false, reasons: [`spec_mismatch:${spec.number}${spec.unit}`] };
    reasons.push(`spec:${spec.number}${spec.unit}`);
  }

  return { ok: true, reasons };
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
    raw = execFileSync("curl.exe", args, { encoding: "utf8", maxBuffer: 1024 * 1024 * 50 });
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
  const statusLine = headerText.split(/\r\n/).reverse().find((line) => line.startsWith("HTTP/"));
  const statusCode = Number(statusLine?.match(/HTTP\/\S+\s+(\d{3})/)?.[1] || 0);

  if (!allowedStatusCodes.includes(statusCode)) throw new Error(`Woo request failed: ${statusLine || bodyText}`);
  return bodyText ? JSON.parse(bodyText) : null;
}

function fetchProductBySku(sku) {
  const response = requestWoo(`/wp-json/wc/v3/products?sku=${encodeURIComponent(sku)}`);
  return Array.isArray(response) ? response[0] || null : null;
}

function jumiaCards(query) {
  const html = execFileSync(
    "curl.exe",
    ["-L", "-s", "-S", "-A", "Mozilla/5.0", `https://www.jumia.co.ke/catalog/?q=${encodeURIComponent(query)}`],
    { encoding: "utf8", maxBuffer: 1024 * 1024 * 15 },
  );
  const cards = [...html.matchAll(/<article class="prd[^>]*>.*?<\/article>/gs)].map((match) => match[0]);
  return cards.map((card) => {
    const attr = (name) => htmlDecode(card.match(new RegExp(`${name}="([^"]*)"`, "i"))?.[1] || "");
    const image = htmlDecode(card.match(/<img[^>]+data-src="([^"]+)"/i)?.[1] || card.match(/<img[^>]+src="([^"]+)"/i)?.[1] || "");
    const href = htmlDecode(card.match(/<a[^>]+href="([^"]+)"/i)?.[1] || "");
    const pageUrl = href ? new URL(href, "https://www.jumia.co.ke").toString() : "";
    return {
      title: attr("data-ga4-item_name") || normalizeText(card.replace(/<[^>]+>/g, " ")),
      brand: attr("data-ga4-item_brand"),
      sku: attr("data-ga4-item_id") || attr("data-sku"),
      image,
      pageUrl,
    };
  }).filter((card) => card.image && !card.image.startsWith("data:"));
}

function scoreCard(row, card) {
  const brand = normalizeText(row.brand).toLowerCase();
  const mpn = normalizeText(row.mpn).toLowerCase();
  const haystack = normalizeText(`${card.brand} ${card.title} ${urlPathText(card.pageUrl)} ${urlPathText(card.image)}`).toLowerCase();
  const family = productFamily(`${row.title} ${row.product_type} ${row.custom_label_0}`);
  const familyMatched = family ? familyTerms.find(([name]) => name === family)?.[1]?.some((term) => haystack.includes(term)) : false;
  const specCheck = specsCompatible(row, haystack);
  let score = 0;
  const reasons = [];
  const cardBrand = normalizeText(card.brand).toLowerCase();

  if (brand && (cardBrand === brand || haystack.includes(brand))) {
    score += 4;
    reasons.push("brand");
  }

  if (mpn && haystack.includes(mpn)) {
    score += 8;
    reasons.push("mpn");
  }

  const tokens = titleTokens(row.title);
  const matched = tokens.filter((token) => haystack.includes(token));
  score += Math.min(5, matched.length);
  if (matched.length) reasons.push(`tokens:${matched.slice(0, 6).join("|")}`);

  const size = normalizeText(row.size).toLowerCase();
  if (size && haystack.includes(size)) {
    score += 2;
    reasons.push("size");
  }

  if (familyMatched) {
    score += 4;
    reasons.push(`family:${family}`);
  }

  if (!specCheck.ok) {
    score -= 10;
    reasons.push(...specCheck.reasons);
  } else if (specCheck.reasons.length) {
    score += Math.min(4, specCheck.reasons.length * 2);
    reasons.push(...specCheck.reasons);
  }

  return {
    score,
    reasons: reasons.join(","),
    matchedTokens: matched.length,
    hasBrand: reasons.includes("brand"),
    hasMpn: reasons.includes("mpn"),
    familyMatched,
    specsOk: specCheck.ok,
    specMatched: specCheck.reasons.length > 0,
  };
}

function urlPathText(value) {
  try {
    const parsed = new URL(value, "https://www.jumia.co.ke");
    return decodeURIComponent(parsed.pathname).replace(/[-_/]+/g, " ");
  } catch {
    return "";
  }
}

function queriesForRow(row) {
  const brand = normalizeText(row.brand);
  const mpn = normalizeText(row.mpn);
  const label = normalizeText(row.custom_label_0);
  const title = normalizeText(row.title);
  const size = normalizeText(row.size);
  const family = productFamily(`${row.title} ${row.product_type} ${label}`);
  return [
    `${brand} ${mpn}`,
    title,
    `${brand} ${size} ${label}`,
    `${brand} ${size} ${family}`,
    visualMode ? `${size} ${family}` : "",
    visualMode ? `${size} ${label}` : "",
    visualMode ? family : "",
    `${brand} ${titleTokens(title).slice(0, 5).join(" ")}`,
  ].map(normalizeText).filter(Boolean);
}

function downloadImage(url, destination) {
  const normalized = url.startsWith("//") ? `https:${url}` : url;
  execFileSync("curl.exe", ["-k", "-L", "-s", "-S", "--fail", "--connect-timeout", "20", "--max-time", "80", "-A", "Mozilla/5.0", "-o", destination, normalized], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
  });
  return existsSync(destination) && statSync(destination).size > 4000;
}

function uploadMedia(filePath, filename, altText) {
  const raw = execFileSync(
    "curl.exe",
    ["-s", "-S", "-L", "-D", "-", "-u", `${wpUser}:${wpAppPassword}`, "-X", "POST", "-H", `Content-Disposition: attachment; filename="${filename}"`, "-H", "Content-Type: image/jpeg", "--data-binary", `@${filePath}`, `${baseUrl}/wp-json/wp/v2/media`],
    { encoding: "utf8", maxBuffer: 1024 * 1024 * 50 },
  );
  const boundary = raw.lastIndexOf("\r\n\r\n");
  const headerText = raw.slice(0, boundary);
  const bodyText = raw.slice(boundary + 4).trim();
  const statusLine = headerText.split(/\r\n/).reverse().find((line) => line.startsWith("HTTP/"));
  const statusCode = Number(statusLine?.match(/HTTP\/\S+\s+(\d{3})/)?.[1] || 0);
  if (statusCode !== 201) throw new Error(`Media upload failed: ${statusLine || bodyText}`);
  return JSON.parse(bodyText);
}

const rows = parseCsv(readFileSync(sourceCsvPath, "utf8"));
const results = [];
const candidateRows = [];

for (const row of rows) {
  const sku = hspSkuFromSource(row.sku);
  const product = fetchProductBySku(sku);
  const title = normalizeText(row.title);

  if (!product) {
    results.push({ sku, title, product_id: "", status: "missing_product", media_id: "", score: "", jumia_title: "", image_url: "", page_url: "", message: "" });
    continue;
  }

  if ((product.images || []).length > 0) {
    results.push({ sku, title, product_id: product.id, status: "already_has_image", media_id: product.images[0].id || "", score: "", jumia_title: "", image_url: product.images[0].src || "", page_url: "", message: "" });
    continue;
  }

  let cards = [];
  for (const query of queriesForRow(row)) {
    try {
      cards.push(...jumiaCards(query));
    } catch {}
  }

  const uniqueCards = [...new Map(cards.map((card) => [`${card.title}|${card.image}`, card])).values()];
  const scored = uniqueCards
    .map((card) => ({ ...card, ...scoreCard(row, card) }))
    .filter((card) => {
      if (!card.specsOk) return false;
      if (visualMode) return card.score >= 8 && card.familyMatched && (card.specMatched || card.hasBrand || card.matchedTokens >= 3);
      if (relaxedMode) return card.score >= 10 && card.familyMatched && (card.hasBrand || card.specMatched || card.matchedTokens >= 4);
      return card.score >= 11 && (card.hasMpn || (card.hasBrand && card.matchedTokens >= 4));
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, 6);

  for (const card of scored.slice(0, 5)) {
    candidateRows.push({ sku, title, score: card.score, reasons: card.reasons, jumia_title: card.title, jumia_brand: card.brand, image_url: card.image, page_url: card.pageUrl });
  }

  let attached = false;
  let lastMessage = scored.length ? "" : "no safe Jumia match";
  if (dryRun && scored.length > 0) {
    const card = scored[0];
    results.push({ sku, title, product_id: product.id, status: "dry_run_candidate", media_id: "", score: card.score, jumia_title: card.title, image_url: card.image, page_url: card.pageUrl, message: card.reasons });
    continue;
  }

  if (dryRun) {
    results.push({ sku, title, product_id: product.id, status: "not_attached", media_id: "", score: "", jumia_title: "", image_url: "", page_url: "", message: lastMessage });
    continue;
  }

  for (const [index, card] of scored.entries()) {
    const filePath = path.resolve(imageDir, `${sku.toLowerCase()}-jumia-${index + 1}-${safeFilename(title)}.jpg`);
    const filename = `${sku.toLowerCase()}-${safeFilename(title)}.jpg`;
    try {
      if (!downloadImage(card.image, filePath)) {
        lastMessage = "downloaded image too small";
        continue;
      }
      const media = uploadMedia(filePath, filename, title);
      const updated = requestWoo(`/wp-json/wc/v3/products/${product.id}`, "PUT", { images: [{ id: media.id }] });
      results.push({ sku, title, product_id: updated.id, status: "attached_jumia_image", media_id: media.id, score: card.score, jumia_title: card.title, image_url: card.image, page_url: card.pageUrl, message: card.reasons });
      attached = true;
      break;
    } catch (error) {
      lastMessage = normalizeText(error.message);
    }
  }

  if (!attached) {
    results.push({ sku, title, product_id: product.id, status: "not_attached", media_id: "", score: scored[0]?.score || "", jumia_title: scored[0]?.title || "", image_url: scored[0]?.image || "", page_url: scored[0]?.pageUrl || "", message: lastMessage });
  }
}

writeCsv(resultsOutputPath, ["sku", "title", "product_id", "status", "media_id", "score", "jumia_title", "image_url", "page_url", "message"], results);
writeCsv(candidatesOutputPath, ["sku", "title", "score", "reasons", "jumia_title", "jumia_brand", "image_url", "page_url"], candidateRows);

const summary = {
  sourceCsvPath,
  totalRows: rows.length,
  attached: results.filter((row) => row.status === "attached_jumia_image").length,
  alreadyHadImage: results.filter((row) => row.status === "already_has_image").length,
  notAttached: results.filter((row) => row.status === "not_attached").length,
  missingProducts: results.filter((row) => row.status === "missing_product").length,
  resultsOutputPath,
  candidatesOutputPath,
};

writeFileSync(summaryOutputPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
console.log(JSON.stringify(summary, null, 2));
