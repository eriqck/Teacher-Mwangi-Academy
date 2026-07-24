#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const baseUrl = process.env.WC_URL || "https://homeskitspro.com";
const wcKey = process.env.WC_KEY;
const wcSecret = process.env.WC_SECRET;
const csvPath = process.env.IMPORT_CSV || "C:\\Users\\Eric\\Downloads\\WooCommerce_Import_Optimized.csv";
const stamp = process.env.RUN_STAMP || "20260417-optimized-import-relaxed";
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

const familyRules = [
  ["instant_water_heater", /\b(water heater|instant shower|electric shower)\b/i],
  ["washing_machine", /\b(washing machine|washer|front load|top load|twin tub)\b/i],
  ["refrigerator", /\b(refrigerator|fridge|freezer)\b/i],
  ["projector", /\b(projector)\b/i],
  ["smart_tv", /\b(tv|television|qled)\b/i],
  ["bluetooth_speaker", /\b(bluetooth speaker|speaker)\b/i],
  ["air_purifier", /\b(air purifier|hepa|pm2\.?5)\b/i],
  ["stand_fan", /\b(stand fan|standing fan|tower fan|fan)\b/i],
  ["blender", /\b(blender|juicer|smoothie)\b/i],
  ["electric_kettle", /\b(kettle)\b/i],
  ["clothes_iron", /\b(iron|steamer)\b/i],
  ["water_filter", /\b(water filter|under sink water filter|sediment water filter|water purifier)\b/i],
  ["pipe", /\b(pipe|hdpe|ppr|polythene)\b/i],
  ["floor_drain", /\b(floor drain)\b/i],
  ["tap_fitting", /\b(tap|mixer tap|faucet)\b/i],
  ["shower_set", /\b(shower head|rainfall shower|shower)\b/i],
  ["sink_basin", /\b(sink|basin)\b/i],
  ["toilet", /\b(toilet|cistern)\b/i],
  ["mirror_cabinet", /\b(mirror cabinet|mirror)\b/i],
  ["extension_cord", /\b(extension cord|power strip)\b/i],
  ["usb_cable", /\b(usb[- ]?c.*cable|cable.*usb[- ]?c|fast charge cable|adapter cable)\b/i],
  ["power_bank", /\b(power bank)\b/i],
  ["micro_sd", /\b(microsd|memory card|sd card)\b/i],
  ["smartwatch", /\b(smart watch|smartwatch|wearable)\b/i],
  ["cctv_camera", /\b(cctv|camera|surveillance|dvr)\b/i],
  ["solar_flood_light", /\b(solar flood|flood light|solar light)\b/i],
  ["cordless_drill", /\b(cordless drill|drill driver|impact drill|electric drill|drill)\b/i],
  ["angle_grinder", /\b(angle grinder|grinder|polisher)\b/i],
  ["circular_saw", /\b(circular saw|saw blade|reciprocating saw|jig saw|saw)\b/i],
  ["workbench", /\b(workbench|sawhorse)\b/i],
  ["carpet_rug", /\b(carpet|rug)\b/i],
];

function familiesFor(name, categories = "") {
  const source = `${name} ${categories}`;
  return familyRules.filter(([, pattern]) => pattern.test(source)).map(([family]) => family);
}

function exactPresent(row, liveIndex) {
  const sku = normalizeKey(row.SKU);
  const name = normalizeKey(row.Name);
  const mpn = normalizeKey(row["Meta: _mpn"]);

  if (sku) {
    const match = liveIndex.find((product) => product.skuKey && product.skuKey === sku);
    if (match) return { match, reason: "same SKU" };
  }

  if (mpn && mpn !== "n a") {
    const match = liveIndex.find((product) => product.mpnKey && product.mpnKey === mpn);
    if (match) return { match, reason: "same MPN/model" };
  }

  const match = liveIndex.find((product) => product.nameKey === name);
  return match ? { match, reason: "same normalized name" } : null;
}

function scoreSimilar(row, product, importFamilies) {
  const brandKey = normalizeKey(row["Meta: _brand"]);
  const liveBrandKey = normalizeKey(product.brand);
  const familyOverlap = importFamilies.filter((family) => product.families.includes(family));
  if (familyOverlap.length === 0) return null;

  let score = 0.62;
  const reasons = [`same product family: ${familyOverlap.join("|")}`];

  if (brandKey && liveBrandKey && brandKey === liveBrandKey) {
    score += 0.25;
    reasons.push("same brand");
  }

  const importRoot = normalizeKey(String(row.Categories || "").split(">")[0]);
  const liveRoot = normalizeKey(String(product.categoryRoot || "").split(">")[0]);
  const rootMap = {
    "bathroom": ["water plumbing", "accessories"],
    "electrical": ["electronics", "energy"],
    "home appliances": ["cooking kitchen", "laundry", "refrigerators", "fans air treatment", "cleaning appliances"],
    "electronics": ["audio", "tvs home entertainment", "security"],
    "lighting": ["lighting"],
    "security": ["security"],
    "tools hardware": ["power tools", "hand tools", "safety tools"],
    "water plumbing": ["water pumps", "water filters purifiers", "accessories"],
  };
  const acceptedRoots = rootMap[importRoot] || [importRoot];
  if (acceptedRoots.includes(liveRoot)) {
    score += 0.1;
    reasons.push("same category family");
  }

  const importTokens = new Set(normalizeKey(row.Name).split(" ").filter((token) => token.length > 2));
  const liveTokens = new Set(normalizeKey(product.name).split(" ").filter((token) => token.length > 2));
  const overlap = [...importTokens].filter((token) => liveTokens.has(token)).length;
  score += Math.min(overlap * 0.025, 0.12);

  return { score, reasons: reasons.join("; "), family: familyOverlap.join("|") };
}

function classify(row, liveIndex) {
  const exact = exactPresent(row, liveIndex);
  if (exact) {
    return {
      status: "present_exact",
      match: exact.match,
      match_score: 1,
      match_reason: exact.reason,
      family: exact.match.families.join("|"),
    };
  }

  const importFamilies = familiesFor(row.Name, row.Categories);
  if (importFamilies.length === 0) {
    return { status: "missing", match: null, match_score: 0, match_reason: "no product-family rule matched", family: "" };
  }

  const candidates = liveIndex
    .map((product) => {
      const similar = scoreSimilar(row, product, importFamilies);
      return similar ? { product, ...similar } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  if (candidates.length > 0) {
    return {
      status: "present_similar",
      match: candidates[0].product,
      match_score: Math.min(candidates[0].score, 0.99),
      match_reason: candidates[0].reasons,
      family: candidates[0].family,
    };
  }

  return { status: "missing", match: null, match_score: 0, match_reason: `no live product in same family (${importFamilies.join("|")})`, family: importFamilies.join("|") };
}

const importRows = parseCsv(readFileSync(csvPath, "utf8"));
const liveProducts = [];

for (let page = 1; page < 1000; page += 1) {
  const batch = requestWoo(`/wp-json/wc/v3/products?per_page=100&page=${page}&status=publish`);
  if (!Array.isArray(batch) || batch.length === 0) break;
  liveProducts.push(...batch);
  if (batch.length < 100) break;
}

const liveIndex = liveProducts.map((product) => {
  const categories = (product.categories || []).map((category) => category.name).join(" > ");
  const brand = productBrand(product);
  const mpn = productMpn(product);
  return {
    id: product.id,
    sku: normalizeText(product.sku),
    skuKey: normalizeKey(product.sku),
    name: normalizeText(product.name),
    nameKey: normalizeKey(product.name),
    brand,
    brandKey: normalizeKey(brand),
    mpn,
    mpnKey: normalizeKey(mpn),
    categories,
    categoryRoot: (product.categories || [])[0]?.name || "",
    families: familiesFor(product.name, categories),
    permalink: product.permalink,
  };
});

const rows = importRows.map((row) => {
  const result = classify(row, liveIndex);
  return {
    sku: row.SKU,
    name: row.Name,
    categories: row.Categories,
    category_root: String(row.Categories || "").split(">").map((part) => part.trim())[0] || "",
    brand: row["Meta: _brand"],
    mpn: row["Meta: _mpn"],
    gtin: row["Meta: _gtin"],
    status: result.status,
    product_family: result.family,
    match_reason: result.match_reason,
    match_score: result.match_score.toFixed(2),
    live_id: result.match?.id || "",
    live_sku: result.match?.sku || "",
    live_name: result.match?.name || "",
    live_brand: result.match?.brand || "",
    live_mpn: result.match?.mpn || "",
    live_categories: result.match?.categories || "",
    live_permalink: result.match?.permalink || "",
  };
});

const headers = [
  "sku",
  "name",
  "categories",
  "category_root",
  "brand",
  "mpn",
  "gtin",
  "status",
  "product_family",
  "match_reason",
  "match_score",
  "live_id",
  "live_sku",
  "live_name",
  "live_brand",
  "live_mpn",
  "live_categories",
  "live_permalink",
];

const relaxedPath = path.resolve(outputDir, `hsp-import-live-relaxed-comparison-${stamp}.csv`);
const presentSimilarPath = path.resolve(outputDir, `hsp-import-live-present-similar-${stamp}.csv`);
const missingPath = path.resolve(outputDir, `hsp-import-live-relaxed-missing-${stamp}.csv`);
const summaryPath = path.resolve(outputDir, `hsp-import-live-relaxed-summary-${stamp}.csv`);

const presentSimilarRows = rows.filter((row) => row.status === "present_similar").sort((a, b) => a.categories.localeCompare(b.categories) || a.name.localeCompare(b.name));
const missingRows = rows.filter((row) => row.status === "missing").sort((a, b) => a.categories.localeCompare(b.categories) || a.name.localeCompare(b.name));

const summaryRows = Object.values(rows.reduce((summary, row) => {
  const key = row.category_root || "(uncategorized)";
  summary[key] ||= { category_root: key, total_in_csv: 0, present_exact: 0, present_similar: 0, missing: 0 };
  summary[key].total_in_csv += 1;
  summary[key][row.status] += 1;
  return summary;
}, {})).sort((a, b) => b.total_in_csv - a.total_in_csv || a.category_root.localeCompare(b.category_root));

writeCsv(relaxedPath, headers, rows);
writeCsv(presentSimilarPath, headers, presentSimilarRows);
writeCsv(missingPath, headers, missingRows);
writeCsv(summaryPath, ["category_root", "total_in_csv", "present_exact", "present_similar", "missing"], summaryRows);

console.log(JSON.stringify({
  importProducts: importRows.length,
  liveProducts: liveProducts.length,
  presentExact: rows.filter((row) => row.status === "present_exact").length,
  presentSimilar: presentSimilarRows.length,
  presentTotal: rows.filter((row) => row.status !== "missing").length,
  missing: missingRows.length,
  summaryByRoot: summaryRows,
  relaxedPath,
  presentSimilarPath,
  missingPath,
  summaryPath,
}, null, 2));
