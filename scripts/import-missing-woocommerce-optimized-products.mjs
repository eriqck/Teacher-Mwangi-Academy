#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";

const baseUrl = process.env.WC_URL || "https://homeskitspro.com";
const key = process.env.WC_KEY;
const secret = process.env.WC_SECRET;
const sourceCsvPath = process.env.IMPORT_CSV || "C:\\Users\\Eric\\Downloads\\WooCommerce_Import_Optimized.csv";
const missingCsvPath = process.env.MISSING_CSV || path.resolve("outputs", "hsp-import-live-relaxed-missing-20260417-optimized-import-relaxed-v2.csv");
const stamp = process.env.RUN_STAMP || "20260417-import-missing-optimized-products";
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
  return String(value ?? "")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;|&apos;/gi, "'")
    .replace(/&nbsp;/gi, " ")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2019]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function stripHtml(value) {
  return normalizeText(String(value ?? "").replace(/<[^>]+>/g, " "));
}

function slugify(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function money(value) {
  const numeric = Number(String(value || "").replace(/[^\d.]/g, ""));
  return Number.isFinite(numeric) && numeric > 0 ? String(Math.round(numeric)) : "";
}

function gtinDigits(value) {
  const raw = normalizeText(value);
  if (!raw) return "";
  if (/^\d+(?:\.\d+)?e\+\d+$/i.test(raw)) {
    const numeric = Number(raw);
    return Number.isFinite(numeric) ? numeric.toFixed(0) : "";
  }
  return raw.replace(/[^\d]/g, "");
}

function validGtin(value) {
  const digits = gtinDigits(value);
  if (![8, 12, 13, 14].includes(digits.length)) return false;
  const checkDigit = Number(digits.at(-1));
  const body = digits.slice(0, -1).split("").reverse().map(Number);
  const sum = body.reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === checkDigit;
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

function fetchAllProducts() {
  const items = [];
  for (let page = 1; page <= 30; page += 1) {
    const batch = request(`/wp-json/wc/v3/products?per_page=100&page=${page}&status=publish`);
    if (!Array.isArray(batch) || batch.length === 0) break;
    items.push(...batch);
    if (batch.length < 100) break;
  }
  return items;
}

function fetchAllCategories() {
  const items = [];
  for (let page = 1; page <= 20; page += 1) {
    const batch = request(`/wp-json/wc/v3/products/categories?per_page=100&page=${page}`);
    if (!Array.isArray(batch) || batch.length === 0) break;
    items.push(...batch);
    if (batch.length < 100) break;
  }
  return items;
}

function buildCategoryStore(categories) {
  const store = { list: [...categories], byKey: new Map() };
  for (const category of categories) {
    store.byKey.set(`${Number(category.parent || 0)}:${normalizeText(category.name).toLowerCase()}`, category);
  }
  return store;
}

function getCategoryByPath(categoryStore, categoryPath, createMissing) {
  let parentId = 0;
  let current = null;

  for (const part of categoryPath) {
    const name = normalizeText(part);
    const keyForPart = `${parentId}:${name.toLowerCase()}`;
    current = categoryStore.byKey.get(keyForPart) || null;

    if (!current && createMissing) {
      current = request(
        "/wp-json/wc/v3/products/categories",
        "POST",
        {
          name,
          slug: parentId ? slugify(`${categoryStore.list.find((item) => Number(item.id) === parentId)?.name || ""}-${name}`) : slugify(name),
          parent: parentId,
        },
        [201],
      );
      categoryStore.list.push(current);
      categoryStore.byKey.set(keyForPart, current);
    }

    if (!current) return null;
    parentId = Number(current.id);
  }

  return current;
}

function categoryPathFromRow(row) {
  return normalizeText(row.Categories)
    .split(">")
    .map((part) => normalizeText(part))
    .filter(Boolean);
}

function specRows(row) {
  const title = normalizeText(row.Name);
  const brand = normalizeText(row["Meta: _brand"]) || "HomesKitsPro";
  const model = normalizeText(row["Meta: _mpn"]) || normalizeText(row.SKU);
  const description = stripHtml(row.Description || row["Short description"]);
  const gtin = validGtin(row["Meta: _gtin"]) ? gtinDigits(row["Meta: _gtin"]) : "";
  const rows = [
    ["Brand", brand],
    ["Model / MPN", model],
    ["SKU", normalizeText(row.SKU)],
    ["Product Type", categoryPathFromRow(row).slice(-1)[0] || "Home product"],
  ];

  const patterns = [
    ["Power", /\b(\d+(?:\.\d+)?\s?(?:W|kW|A))\b/i],
    ["Capacity / Size", /\b(\d+(?:\.\d+)?\s?(?:L|KG|GB|mAh|cm|inch|in|metre|meter|m|mm)(?:\s?x\s?\d+(?:\.\d+)?\s?(?:cm|m|mm|inch|in))?)\b/i],
    ["Cable / Length", /\b(\d+(?:\.\d+)?\s?(?:m|metre|meter))\b/i],
    ["Material", /\b(stainless steel|steel|chrome|vitreous china|nylon braided|ceramic|latex)\b/i],
    ["Protection / Rating", /\b(IP\d{2}|surge protection|anti[- ]?fog|anti[- ]?slip|soft close|deep water seal|PD\s?3\.0|V30|Class 10)\b/i],
  ];

  for (const [label, pattern] of patterns) {
    const match = `${title}. ${description}`.match(pattern);
    if (match && !rows.some(([existingLabel]) => existingLabel === label)) rows.push([label, normalizeText(match[1])]);
  }

  if (gtin) rows.push(["GTIN / EAN", gtin]);
  rows.push(["Availability", "in stock"]);
  rows.push(["Condition", "new"]);
  return rows;
}

function highlightItems(row) {
  const description = stripHtml(row.Description || row["Short description"]);
  const fragments = description
    .split(/[,.;]/)
    .map((part) => normalizeText(part))
    .filter((part) => part.length > 8)
    .slice(0, 5);
  return fragments.length ? fragments : ["Practical build for everyday use", "Clear model information for easy comparison", "Selected for HomesKitsPro customers"];
}

function useCase(row) {
  const path = categoryPathFromRow(row).join(" > ").toLowerCase();
  if (path.includes("water heater")) return "instant hot-water use in bathrooms, guest rooms, rental units, and compact home shower setups";
  if (path.includes("bathroom")) return "bathroom upgrades, renovation projects, replacement fittings, and clean modern washroom installations";
  if (path.includes("electrical")) return "safe everyday charging, power extension, and home or office electrical accessory use";
  if (path.includes("electronics")) return "personal entertainment, mobile-device support, home media, and everyday digital convenience";
  if (path.includes("flooring")) return "living rooms, bedrooms, rental spaces, and soft floor comfort with a decorative finish";
  if (path.includes("workbench")) return "workshops, garages, tool rooms, and heavy-duty DIY or repair tasks";
  if (path.includes("drainage")) return "bathrooms, kitchens, utility areas, tiled floors, and drainage replacement projects";
  return "home, office, and light commercial use";
}

function buildShortDescription(row) {
  const title = normalizeText(row.Name);
  const brand = normalizeText(row["Meta: _brand"]) || "HomesKitsPro";
  const highlights = highlightItems(row).slice(0, 2).join("; ").toLowerCase();
  return `<p>${title} from ${brand} is built for ${useCase(row)}. Key highlights include ${highlights}.</p>`;
}

function buildLongDescription(row) {
  const title = normalizeText(row.Name);
  const brand = normalizeText(row["Meta: _brand"]) || "HomesKitsPro";
  const model = normalizeText(row["Meta: _mpn"]) || normalizeText(row.SKU);
  const description = stripHtml(row.Description || row["Short description"]);
  const specs = specRows(row)
    .map(([label, value]) => `<tr><td><strong>${label}</strong></td><td>${value}</td></tr>`)
    .join("\n");
  const highlights = highlightItems(row)
    .map((item) => `<tr><td><strong>${item}</strong></td><td>Helps customers compare features clearly before checkout.</td></tr>`)
    .join("\n");

  return [
    `<p>${title} is a practical ${brand} product for customers who want reliable performance, clear specifications, and straightforward use. ${description}</p>`,
    `<p>This model is useful for ${useCase(row)}. It is listed with model information, brand details, and structured specifications so shoppers can compare it confidently against similar products before buying.</p>`,
    "<hr />",
    "<h3>Key Specifications</h3>",
    "<table>",
    "<thead><tr><th>Specification</th><th>Details</th></tr></thead>",
    `<tbody>${specs}</tbody>`,
    "</table>",
    "<hr />",
    "<h3>Product Highlights</h3>",
    "<table>",
    "<thead><tr><th>Feature</th><th>Why It Matters</th></tr></thead>",
    `<tbody>${highlights}</tbody>`,
    "</table>",
    "<hr />",
    "<h3>Ideal Applications</h3>",
    "<table><tbody>",
    `<tr><td><strong>Recommended Use</strong></td><td>${useCase(row)}</td></tr>`,
    "</tbody></table>",
    "<hr />",
    "<h3>Buying Notes</h3>",
    `<p>Before purchase, confirm that ${brand} model ${model} matches your space, installation requirements, and intended use. If the item is being fitted into an existing setup, check the measurements, power needs, and connection points before checkout.</p>`,
  ].join("\n");
}

function imagePayload(row) {
  const images = normalizeText(row.Images)
    .split(",")
    .map((src) => normalizeText(src))
    .filter(Boolean)
    .slice(0, 4);
  return images.map((src) => ({ src, name: normalizeText(row.Name), alt: normalizeText(row.Name) }));
}

function productPayload(row, category) {
  const brand = normalizeText(row["Meta: _brand"]) || "HomesKitsPro";
  const mpn = normalizeText(row["Meta: _mpn"]) || normalizeText(row.SKU);
  const gtin = validGtin(row["Meta: _gtin"]) ? gtinDigits(row["Meta: _gtin"]) : "";
  const payload = {
    name: normalizeText(row.Name),
    type: "simple",
    status: "publish",
    catalog_visibility: "visible",
    sku: normalizeText(row.SKU),
    regular_price: money(row["Regular price"]),
    sale_price: money(row["Sale price"]),
    tax_status: normalizeText(row["Tax status"]) || "taxable",
    stock_status: "instock",
    manage_stock: true,
    stock_quantity: Number(row.Stock) > 0 ? Number(row.Stock) : 10,
    backorders: "no",
    sold_individually: false,
    reviews_allowed: true,
    description: buildLongDescription(row),
    short_description: buildShortDescription(row),
    categories: [{ id: Number(category.id) }],
    images: imagePayload(row),
    weight: normalizeText(row["Weight (kg)"]),
    dimensions: {
      length: normalizeText(row["Length (cm)"]),
      width: normalizeText(row["Width (cm)"]),
      height: normalizeText(row["Height (cm)"]),
    },
    attributes: [
      { name: "Brand", visible: true, variation: false, options: [brand] },
      { name: "Model", visible: true, variation: false, options: [mpn] },
    ],
    meta_data: [
      { key: "_brand", value: brand },
      { key: "_mpn", value: mpn },
      { key: "_gtin", value: gtin },
      { key: "_wc_gla_brand", value: brand },
      { key: "_wc_gla_mpn", value: mpn },
      { key: "_wc_gla_gtin", value: gtin },
      { key: "_wc_gla_identifier_exists", value: brand && mpn ? "yes" : "no" },
      { key: "_wc_gla_condition", value: "new" },
      { key: "fb_brand", value: brand },
      { key: "fb_mpn", value: mpn },
      { key: "fb_gtin", value: gtin },
      { key: "gmc_identifier_note", value: gtin ? "Valid GTIN supplied by import CSV" : "No verified GTIN; brand and MPN supplied" },
      { key: "source_import_csv", value: path.basename(sourceCsvPath) },
      { key: "source_google_product_category", value: normalizeText(row["Meta: _google_product_category"]) },
    ],
  };

  if (gtin) payload.global_unique_id = gtin;
  return payload;
}

function rowBySku(rows) {
  return new Map(rows.map((row) => [normalizeText(row.SKU || row.sku), row]));
}

const sourceRows = parseCsv(readFileSync(sourceCsvPath, "utf8"));
const missingRows = parseCsv(readFileSync(missingCsvPath, "utf8"));
const missingSkuSet = new Set(missingRows.map((row) => normalizeText(row.sku)));
const rowsToImport = sourceRows.filter((row) => missingSkuSet.has(normalizeText(row.SKU)));

const liveProducts = fetchAllProducts();
const productBySku = new Map(liveProducts.filter((product) => normalizeText(product.sku)).map((product) => [normalizeText(product.sku), product]));
const categoryStore = buildCategoryStore(fetchAllCategories());

const planRows = rowsToImport.map((row) => {
  const categoryPath = categoryPathFromRow(row);
  const category = getCategoryByPath(categoryStore, categoryPath, false);
  const existingProduct = productBySku.get(normalizeText(row.SKU));
  return {
    sku: normalizeText(row.SKU),
    name: normalizeText(row.Name),
    category_path: categoryPath.join(" > "),
    category_exists: category ? "yes" : "no",
    action: existingProduct ? "already_exists_skip" : "create",
    valid_gtin: validGtin(row["Meta: _gtin"]) ? "yes" : "no",
    has_image: imagePayload(row).length ? "yes" : "no",
    has_short_description: stripHtml(buildShortDescription(row)) ? "yes" : "no",
    has_long_description: stripHtml(buildLongDescription(row)) ? "yes" : "no",
  };
});

const planPath = path.resolve(outputDir, `hsp-missing-products-import-plan-${stamp}.csv`);
const resultsPath = path.resolve(outputDir, `hsp-missing-products-import-results-${stamp}.csv`);
const verifyPath = path.resolve(outputDir, `hsp-missing-products-import-verify-${stamp}.csv`);
const summaryPath = path.resolve(outputDir, `hsp-missing-products-import-summary-${stamp}.json`);

writeCsv(planPath, ["sku", "name", "category_path", "category_exists", "action", "valid_gtin", "has_image", "has_short_description", "has_long_description"], planRows);

if (mode === "preview") {
  const summary = {
    mode,
    sourceCsvPath,
    missingCsvPath,
    rowsToImport: rowsToImport.length,
    alreadyExists: planRows.filter((row) => row.action === "already_exists_skip").length,
    toCreate: planRows.filter((row) => row.action === "create").length,
    missingCategories: planRows.filter((row) => row.category_exists === "no").length,
    validGtins: planRows.filter((row) => row.valid_gtin === "yes").length,
    planPath,
  };
  writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(summary, null, 2));
  process.exit(0);
}

if (mode === "apply") {
  const results = [];
  for (const row of rowsToImport) {
    const sku = normalizeText(row.SKU);
    const categoryPath = categoryPathFromRow(row);
    const category = getCategoryByPath(categoryStore, categoryPath, true);
    const existingProduct = productBySku.get(sku);

    if (existingProduct) {
      results.push({ sku, name: normalizeText(row.Name), action: "skipped_existing", product_id: existingProduct.id, category_path: categoryPath.join(" > "), status: "ok", message: "" });
      continue;
    }

    const payload = productPayload(row, category);
    try {
      const created = request("/wp-json/wc/v3/products", "POST", payload, [201]);
      productBySku.set(sku, created);
      results.push({ sku, name: normalizeText(row.Name), action: "created", product_id: created.id, category_path: categoryPath.join(" > "), status: "ok", message: "" });
    } catch (error) {
      try {
        const fallbackPayload = { ...payload, images: [] };
        const created = request("/wp-json/wc/v3/products", "POST", fallbackPayload, [201]);
        productBySku.set(sku, created);
        results.push({ sku, name: normalizeText(row.Name), action: "created_without_image", product_id: created.id, category_path: categoryPath.join(" > "), status: "ok", message: error.bodyText || error.message });
      } catch (fallbackError) {
        results.push({ sku, name: normalizeText(row.Name), action: "create", product_id: "", category_path: categoryPath.join(" > "), status: "failed", message: fallbackError.bodyText || fallbackError.message });
      }
    }
  }

  writeCsv(resultsPath, ["sku", "name", "action", "product_id", "category_path", "status", "message"], results);
  const summary = {
    mode,
    rowsToImport: rowsToImport.length,
    created: results.filter((row) => row.action === "created" || row.action === "created_without_image").length,
    skippedExisting: results.filter((row) => row.action === "skipped_existing").length,
    failed: results.filter((row) => row.status === "failed").length,
    planPath,
    resultsPath,
  };
  writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(summary, null, 2));
  process.exit(0);
}

const freshProducts = fetchAllProducts();
const freshBySku = rowBySku(freshProducts.map((product) => ({ SKU: product.sku, product })));
const verifyRows = rowsToImport.map((row) => {
  const live = freshBySku.get(normalizeText(row.SKU))?.product;
  return {
    sku: normalizeText(row.SKU),
    name: normalizeText(row.Name),
    product_id: live?.id || "",
    live_status: live?.status || "",
    live_category: (live?.categories || []).map((category) => normalizeText(category.name)).join(" > "),
    expected_category_path: categoryPathFromRow(row).join(" > "),
    has_short_description: stripHtml(live?.short_description || "") ? "yes" : "no",
    has_long_description: stripHtml(live?.description || "") ? "yes" : "no",
    has_image: live?.images?.length ? "yes" : "no",
    status: live ? "found" : "missing",
  };
});

writeCsv(verifyPath, ["sku", "name", "product_id", "live_status", "live_category", "expected_category_path", "has_short_description", "has_long_description", "has_image", "status"], verifyRows);
const summary = {
  mode,
  expected: rowsToImport.length,
  found: verifyRows.filter((row) => row.status === "found").length,
  missing: verifyRows.filter((row) => row.status === "missing").length,
  missingShortDescriptions: verifyRows.filter((row) => row.has_short_description !== "yes").length,
  missingLongDescriptions: verifyRows.filter((row) => row.has_long_description !== "yes").length,
  missingImages: verifyRows.filter((row) => row.has_image !== "yes").length,
  verifyPath,
};
writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
console.log(JSON.stringify(summary, null, 2));
