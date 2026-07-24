#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const baseUrl = process.env.WC_URL || "https://homeskitspro.com";
const wcKey = process.env.WC_KEY;
const wcSecret = process.env.WC_SECRET;
const csvPath = process.env.IMPORT_CSV || "C:\\Users\\Eric\\Downloads\\WooCommerce_Import_Optimized.csv";
const stamp = process.env.RUN_STAMP || "20260417-import-live-compare";
const outputDir = path.resolve("outputs");

if (!wcKey || !wcSecret) {
  console.error("Missing WC_KEY or WC_SECRET environment variables.");
  process.exit(1);
}

mkdirSync(outputDir, { recursive: true });

function requestWoo(apiPath) {
  const raw = execFileSync("curl.exe", ["-s", "-S", "-L", "--http1.1", "--ssl-no-revoke", "-u", `${wcKey}:${wcSecret}`, `${baseUrl}${apiPath}`], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 80,
  });
  return raw ? JSON.parse(raw) : null;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  if (cell || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  const headers = rows.shift() || [];
  return rows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
}

function csvEscape(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function writeCsv(filePath, headers, rows) {
  const lines = [headers.map(csvEscape).join(",")];
  for (const row of rows) lines.push(headers.map((header) => csvEscape(row[header])).join(","));
  writeFileSync(filePath, `${lines.join("\r\n")}\r\n`, "utf8");
}

function normalizeText(value) {
  return String(value ?? "")
    .replace(/&amp;/g, "&")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2019]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeKey(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function metaValue(product, keys) {
  for (const key of keys) {
    const found = (product.meta_data || []).find((meta) => meta.key === key);
    if (found && found.value !== "" && found.value !== null && found.value !== undefined) return normalizeText(found.value);
  }
  return "";
}

function attributeValue(product, names) {
  const wanted = names.map((name) => name.toLowerCase());
  const found = (product.attributes || []).find((attribute) => wanted.includes(String(attribute.name || "").toLowerCase()));
  return found ? normalizeText((found.options || []).join("|")) : "";
}

function productBrand(product) {
  return metaValue(product, ["_wc_gla_brand", "fb_brand", "_brand", "brand"]) || attributeValue(product, ["Brand", "brand"]);
}

function productMpn(product) {
  return metaValue(product, ["_wc_gla_mpn", "fb_mpn", "_mpn", "mpn"]) || attributeValue(product, ["MPN", "Model", "Model Number"]);
}

function tokens(value) {
  const ignored = new Set(["and", "with", "for", "the", "inch", "inches", "smart", "electric", "digital", "portable"]);
  return normalizeKey(value)
    .split(" ")
    .filter((token) => token.length > 2 && !ignored.has(token));
}

function tokenScore(left, right) {
  const a = new Set(tokens(left));
  const b = new Set(tokens(right));
  if (!a.size || !b.size) return 0;
  const intersection = [...a].filter((token) => b.has(token)).length;
  const union = new Set([...a, ...b]).size;
  return intersection / union;
}

function categoryRoot(value) {
  return normalizeText(value).split(">").map((part) => part.trim()).filter(Boolean)[0] || "";
}

function liveCategoryRoot(product) {
  return (product.categories || []).map((category) => category.name).filter(Boolean)[0] || "";
}

const importRows = parseCsv(readFileSync(csvPath, "utf8"));

const liveProducts = [];
for (let page = 1; page < 1000; page += 1) {
  const batch = requestWoo(`/wp-json/wc/v3/products?per_page=100&page=${page}&status=publish`);
  if (!Array.isArray(batch) || batch.length === 0) break;
  liveProducts.push(...batch);
  if (batch.length < 100) break;
}

const liveIndex = liveProducts.map((product) => ({
  id: product.id,
  sku: normalizeText(product.sku),
  name: normalizeText(product.name),
  nameKey: normalizeKey(product.name),
  brand: productBrand(product),
  brandKey: normalizeKey(productBrand(product)),
  mpn: productMpn(product),
  mpnKey: normalizeKey(productMpn(product)),
  categories: (product.categories || []).map((category) => category.name).join(" > "),
  categoryRoot: liveCategoryRoot(product),
  permalink: product.permalink,
}));

function findMatch(row) {
  const sku = normalizeText(row.SKU);
  const name = normalizeText(row.Name);
  const nameKey = normalizeKey(row.Name);
  const brand = normalizeText(row["Meta: _brand"]);
  const brandKey = normalizeKey(brand);
  const mpn = normalizeText(row["Meta: _mpn"]);
  const mpnKey = normalizeKey(mpn);
  const root = categoryRoot(row.Categories);

  const exactSku = sku ? liveIndex.find((product) => product.sku && normalizeKey(product.sku) === normalizeKey(sku)) : null;
  if (exactSku) return { status: "already_live", reason: "same SKU", match: exactSku, score: 1 };

  const exactMpn = mpnKey && mpnKey !== "n a"
    ? liveIndex.find((product) => product.mpnKey === mpnKey || normalizeKey(product.name).includes(mpnKey))
    : null;
  if (exactMpn) return { status: "already_live", reason: "same MPN/model", match: exactMpn, score: 1 };

  const exactName = liveIndex.find((product) => product.nameKey === nameKey);
  if (exactName) return { status: "already_live", reason: "same normalized name", match: exactName, score: 1 };

  const scored = liveIndex
    .filter((product) => !brandKey || !product.brandKey || product.brandKey === brandKey || product.nameKey.includes(brandKey))
    .map((product) => ({
      product,
      score: tokenScore(name, product.name),
    }))
    .sort((left, right) => right.score - left.score)[0];

  const sameCategoryFamily = scored?.product && root && normalizeKey(scored.product.categoryRoot) === normalizeKey(root);
  if (scored && scored.score >= 0.74 && (sameCategoryFamily || brandKey)) {
    return { status: "possible_match_review", reason: "similar name; review model/category before import", match: scored.product, score: scored.score };
  }

  return { status: "missing", reason: "no SKU, MPN, or strong name match", match: scored?.product || null, score: scored?.score || 0 };
}

const comparisonRows = importRows.map((row) => {
  const result = findMatch(row);
  return {
    sku: row.SKU,
    name: row.Name,
    categories: row.Categories,
    category_root: categoryRoot(row.Categories),
    brand: row["Meta: _brand"],
    mpn: row["Meta: _mpn"],
    gtin: row["Meta: _gtin"],
    regular_price: row["Regular price"],
    sale_price: row["Sale price"],
    status: result.status,
    match_reason: result.reason,
    match_score: result.score.toFixed(2),
    live_id: result.match?.id || "",
    live_sku: result.match?.sku || "",
    live_name: result.match?.name || "",
    live_categories: result.match?.categories || "",
    live_permalink: result.match?.permalink || "",
  };
});

const missingRows = comparisonRows
  .filter((row) => row.status === "missing")
  .sort((a, b) => a.categories.localeCompare(b.categories) || a.name.localeCompare(b.name));
const reviewRows = comparisonRows
  .filter((row) => row.status === "possible_match_review")
  .sort((a, b) => a.categories.localeCompare(b.categories) || a.name.localeCompare(b.name));

const categorySummary = Object.values(missingRows.reduce((summary, row) => {
  const key = row.categories || "(uncategorized)";
  summary[key] ||= { categories: key, missing_count: 0 };
  summary[key].missing_count += 1;
  return summary;
}, {})).sort((a, b) => b.missing_count - a.missing_count || a.categories.localeCompare(b.categories));

const comparisonPath = path.resolve(outputDir, `hsp-import-live-comparison-${stamp}.csv`);
const missingPath = path.resolve(outputDir, `hsp-import-live-missing-${stamp}.csv`);
const categorySummaryPath = path.resolve(outputDir, `hsp-import-live-missing-by-category-${stamp}.csv`);

const headers = [
  "sku",
  "name",
  "categories",
  "category_root",
  "brand",
  "mpn",
  "gtin",
  "regular_price",
  "sale_price",
  "status",
  "match_reason",
  "match_score",
  "live_id",
  "live_sku",
  "live_name",
  "live_categories",
  "live_permalink",
];

writeCsv(comparisonPath, headers, comparisonRows);
writeCsv(missingPath, headers, missingRows);
writeCsv(categorySummaryPath, ["categories", "missing_count"], categorySummary);

console.log(JSON.stringify({
  importProducts: importRows.length,
  liveProducts: liveProducts.length,
  alreadyLive: comparisonRows.filter((row) => row.status === "already_live").length,
  possibleMatchReview: reviewRows.length,
  missing: missingRows.length,
  missingByCategory: categorySummary,
  comparisonPath,
  missingPath,
  categorySummaryPath,
}, null, 2));
