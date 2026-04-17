#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";

const baseUrl = process.env.WC_URL || "https://homeskitspro.com";
const wcKey = process.env.WC_KEY;
const wcSecret = process.env.WC_SECRET;
const stamp = process.env.RUN_STAMP || "20260417-safe-product-identifiers";
const outputDir = path.resolve("outputs");
const applyChanges = process.env.APPLY === "1";
const clearInvalidGtins = process.env.CLEAR_INVALID_GTINS !== "0";
const sourceCsvPaths = [
  "C:\\Users\\Eric\\Downloads\\kenya_gmc_products (1).csv",
  "C:\\Users\\Eric\\Downloads\\New Products.csv",
  "C:\\Users\\Eric\\Downloads\\New products to be added.csv",
].filter(existsSync);

if (!wcKey || !wcSecret) {
  console.error("Missing WC_KEY or WC_SECRET environment variables.");
  process.exit(1);
}

mkdirSync(outputDir, { recursive: true });

const brandMatchers = [
  ["GoldenTech Rich", /\bgoldentech\s+rich\b/i],
  ["HomesKitsPro", /\bhomeskitspro\b/i],
  ["Rutanpump", /\brutanpump\b/i],
  ["Pedrollo", /\bpedrollo\b/i],
  ["Solarmax", /\bsolarmax\b/i],
  ["Electromate", /\belectromate\b/i],
  ["AiLyons", /\bailyons\b/i],
  ["Maxmech", /\bmaxmech\b/i],
  ["Premier", /\bpremier\b/i],
  ["Dayliff", /\bdayliff\b/i],
  ["Hisense", /\bhisense\b/i],
  ["Alltop", /\balltop\b/i],
  ["Ingco", /\bingco\b/i],
  ["Total", /\btotal\b/i],
  ["Royce", /\broyce\b/i],
  ["Sonar", /\bsonar\b/i],
  ["Nunix", /\bnunix\b/i],
  ["Vitro", /\bvitro\b/i],
  ["Von", /\bvon\b/i],
  ["TCL", /\btcl\b/i],
  ["LG", /\blg\b/i],
  ["USK", /\busk\b/i],
  ["LSWQB", /\blswqb\b/i],
];

function requestWoo(apiPath, method = "GET", body = null) {
  const args = ["-s", "-S", "-L", "--http1.1", "--ssl-no-revoke", "-u", `${wcKey}:${wcSecret}`];
  let tempPath = "";

  if (body) {
    tempPath = path.resolve(outputDir, `wp-body-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
    writeFileSync(tempPath, JSON.stringify(body), "utf8");
    args.push("-H", "Content-Type: application/json", "-X", method, "--data-binary", `@${tempPath}`);
  } else if (method !== "GET") {
    args.push("-X", method);
  }

  args.push(`${baseUrl}${apiPath}`);

  try {
    const raw = execFileSync("curl.exe", args, {
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 80,
    });
    return raw ? JSON.parse(raw) : null;
  } finally {
    if (tempPath) {
      try {
        unlinkSync(tempPath);
      } catch {
        // Ignore temp cleanup failures.
      }
    }
  }
}

function csvEscape(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function writeCsv(filePath, headers, rows) {
  const lines = [headers.map(csvEscape).join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => csvEscape(row[header])).join(","));
  }
  writeFileSync(filePath, `${lines.join("\r\n")}\r\n`, "utf8");
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
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(cell);
      if (row.some((value) => value !== "")) {
        rows.push(row);
      }
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
    if (found && found.value !== "" && found.value !== null && found.value !== undefined) {
      return normalizeText(found.value);
    }
  }
  return "";
}

function attributeValue(product, names) {
  const wanted = names.map((name) => name.toLowerCase());
  const found = (product.attributes || []).find((attribute) => wanted.includes(String(attribute.name || "").toLowerCase()));
  return found ? normalizeText((found.options || []).join("|")) : "";
}

function validGtin(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (![8, 12, 13, 14].includes(digits.length)) {
    return false;
  }

  const checkDigit = Number(digits.at(-1));
  const body = digits.slice(0, -1).split("").reverse().map(Number);
  const sum = body.reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === checkDigit;
}

function sourceValue(source, keys) {
  if (!source) {
    return "";
  }

  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null && normalizeText(source[key])) {
      return normalizeText(source[key]);
    }
  }
  return "";
}

const sourceRows = [];
for (const csvPath of sourceCsvPaths) {
  for (const row of parseCsv(readFileSync(csvPath, "utf8"))) {
    sourceRows.push({ ...row, __source_file: path.basename(csvPath) });
  }
}

const sourceByTitle = new Map();
for (const row of sourceRows) {
  const title = sourceValue(row, ["title", "Name"]);
  if (title) {
    sourceByTitle.set(normalizeKey(title), row);
  }
}

function sourceForProduct(product) {
  const key = normalizeKey(product.name);
  if (sourceByTitle.has(key)) {
    return sourceByTitle.get(key);
  }

  return sourceRows.find((row) => {
    const sourceTitle = normalizeKey(sourceValue(row, ["title", "Name"]));
    return sourceTitle && (sourceTitle.includes(key) || key.includes(sourceTitle));
  });
}

function findBrand(product, source) {
  const sourceBrand = sourceValue(source, ["brand", "Brands", "Meta: fb_brand"]);
  if (sourceBrand && sourceBrand.toLowerCase() !== "generic") {
    return sourceBrand;
  }

  const existing =
    metaValue(product, ["_wc_gla_brand", "fb_brand", "brand", "_brand"]) ||
    attributeValue(product, ["Brand", "brand"]);
  if (existing) {
    return existing;
  }

  const name = normalizeText(product.name);
  const match = brandMatchers.find(([, pattern]) => pattern.test(name));
  return match ? match[0] : "HomesKitsPro";
}

function modelCandidates(name) {
  const candidates = [];
  const patterns = [
    /\bDSD\s+\d+\/\d+\b/gi,
    /\b\dFS\d+(?:\.\d+)?-\d+-\d+\b/gi,
    /\bJZDC\d+(?:\.\d+)?-\d+V-\d+W\b/gi,
    /\b[A-Z]{1,}[A-Z0-9]*(?:[-/][A-Z0-9.]+)+\b/gi,
    /\b[A-Z]{2,}\d[A-Z0-9]*\b/gi,
    /\b\d{2}[A-Z]\d[A-Z]\b/gi,
    /\bPKM\d+\b/gi,
  ];

  for (const pattern of patterns) {
    for (const match of name.matchAll(pattern)) {
      candidates.push(normalizeText(match[0]).toUpperCase());
    }
  }

  return [...new Set(candidates)].filter((candidate) => !/^\d+(?:V|W|HP|L|KG|CM|MM|PSI|BAR)$/i.test(candidate));
}

function findMpn(product, brand, source) {
  const sourceMpn = sourceValue(source, ["mpn", "MPN", "Meta: fb_mpn"]);
  if (sourceMpn && sourceMpn.toLowerCase() !== "n/a") {
    return sourceMpn.toUpperCase();
  }

  const existing =
    metaValue(product, ["_wc_gla_mpn", "fb_mpn", "mpn", "_mpn"]) ||
    attributeValue(product, ["MPN", "Model", "Model Number"]);
  if (existing && existing.toLowerCase() !== "n/a") {
    return existing.toUpperCase();
  }

  const candidates = modelCandidates(normalizeText(product.name));
  if (candidates.length > 0) {
    return candidates[0];
  }

  if (brand === "HomesKitsPro") {
    return normalizeText(product.sku) || `HSP-${product.id}`;
  }

  return "";
}

function existingGtinValues(product, source = null) {
  return [
    product.global_unique_id,
    metaValue(product, ["_wc_gla_gtin", "fb_gtin", "_global_unique_id", "_wpm_gtin_code", "_alg_ean", "_ts_gtin"]),
    metaValue(product, ["_wc_gla_upc", "upc", "_upc"]),
    metaValue(product, ["_wc_gla_ean", "ean", "_ean"]),
    metaValue(product, ["_wc_gla_isbn", "isbn", "_isbn"]),
    sourceValue(source, ["gtin", "GTIN, UPC, EAN, or ISBN"]),
  ]
    .map((value) => {
      const raw = String(value ?? "").trim();
      if (/^\d+(?:\.\d+)?e\+\d+$/i.test(raw)) {
        return Number(raw).toFixed(0);
      }
      return raw.replace(/\D/g, "");
    })
    .filter(Boolean);
}

function productPlan(product, duplicateGtins) {
  const source = sourceForProduct(product);
  const brand = findBrand(product, source);
  const mpn = findMpn(product, brand, source);
  const existingGtins = existingGtinValues(product, source);
  const validUniqueGtins = existingGtins.filter((gtin) => validGtin(gtin) && !duplicateGtins.has(gtin));
  const gtin = validUniqueGtins[0] || "";
  const invalidGtins = existingGtins.filter((value) => value && value !== gtin);
  const identifierExists = gtin || (brand && mpn) ? "yes" : "no";
  const note = gtin
    ? "Existing valid GTIN retained"
    : identifierExists === "yes"
      ? "No verified GTIN; brand and MPN supplied"
      : "No verified GTIN/MPN available";

  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    categories: (product.categories || []).map((category) => category.name).join(" > "),
    brand,
    mpn,
    accepted_gtin: gtin,
    invalid_gtins: [...new Set(invalidGtins)].join("|"),
    identifier_exists: identifierExists,
    note,
    source_file: source?.__source_file || "",
  };
}

function updateBody(product, plan) {
  const metaData = [
    { key: "fb_brand", value: plan.brand },
    { key: "fb_mpn", value: plan.mpn },
    { key: "fb_gtin", value: plan.accepted_gtin },
    { key: "fb_identifier_exists", value: plan.identifier_exists },
    { key: "_wc_gla_brand", value: plan.brand },
    { key: "_wc_gla_mpn", value: plan.mpn },
    { key: "_wc_gla_gtin", value: plan.accepted_gtin },
    { key: "_wc_gla_identifier_exists", value: plan.identifier_exists },
    { key: "_wc_gla_condition", value: "new" },
    { key: "gmc_identifier_note", value: plan.note },
  ];

  const body = { meta_data: metaData };
  const currentGlobalId = String(product.global_unique_id ?? "").replace(/\D/g, "");
  if (clearInvalidGtins && currentGlobalId && currentGlobalId !== plan.accepted_gtin) {
    body.global_unique_id = "";
  }
  return body;
}

const products = [];
for (let page = 1; page < 1000; page += 1) {
  const batch = requestWoo(`/wp-json/wc/v3/products?per_page=100&page=${page}&status=publish`);
  if (!Array.isArray(batch) || batch.length === 0) {
    break;
  }
  products.push(...batch);
  if (batch.length < 100) {
    break;
  }
}

const gtinCounts = new Map();
for (const product of products) {
  const source = sourceForProduct(product);
  for (const value of [...new Set(existingGtinValues(product, source).filter(validGtin))]) {
    gtinCounts.set(value, (gtinCounts.get(value) || 0) + 1);
  }
}
const duplicateGtins = new Set([...gtinCounts].filter(([, count]) => count > 1).map(([value]) => value));

const rows = [];
for (const product of products) {
  const plan = productPlan(product, duplicateGtins);
  let status = "dry_run";
  let response = "";

  if (applyChanges) {
    try {
      const updated = requestWoo(`/wp-json/wc/v3/products/${product.id}`, "PUT", updateBody(product, plan));
      status = updated?.id ? "updated" : "unknown_response";
      response = updated?.id ? "" : JSON.stringify(updated);
    } catch (error) {
      status = "failed";
      response = error.stderr?.toString() || error.stdout?.toString() || error.message;
    }
  }

  rows.push({ ...plan, status, response });
}

const csvPath = path.resolve(outputDir, `hsp-product-identifier-update-results-${stamp}.csv`);
const jsonPath = path.resolve(outputDir, `hsp-product-identifier-update-results-${stamp}.json`);
const headers = [
  "id",
  "sku",
  "name",
  "categories",
  "brand",
  "mpn",
  "accepted_gtin",
  "invalid_gtins",
  "identifier_exists",
  "note",
  "source_file",
  "status",
  "response",
];

writeCsv(csvPath, headers, rows);
writeFileSync(jsonPath, `${JSON.stringify(rows, null, 2)}\n`, "utf8");

console.log(JSON.stringify({
  mode: applyChanges ? "apply" : "dry_run",
  totalProducts: rows.length,
  productsWithAcceptedGtin: rows.filter((row) => row.accepted_gtin).length,
  productsWithBrandAndMpn: rows.filter((row) => row.brand && row.mpn).length,
  identifierExistsYes: rows.filter((row) => row.identifier_exists === "yes").length,
  invalidGtinProducts: rows.filter((row) => row.invalid_gtins).length,
  updated: rows.filter((row) => row.status === "updated").length,
  failed: rows.filter((row) => row.status === "failed").length,
  csvPath,
  jsonPath,
}, null, 2));
