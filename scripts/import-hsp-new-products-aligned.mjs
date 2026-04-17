#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";

const baseUrl = process.env.WC_URL || "https://homeskitspro.com";
const key = process.env.WC_KEY;
const secret = process.env.WC_SECRET;
const mode = (process.argv[2] || "preview").toLowerCase();
const sourceCsvPath = process.argv[3] || "C:/Users/Eric/Downloads/New products to be added.csv";
const stamp = process.env.RUN_STAMP || "20260416-hsp-new-products";
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

const planOutputPath = path.resolve(outputDir, `hsp-new-products-plan-${stamp}.csv`);
const resultsOutputPath = path.resolve(outputDir, `hsp-new-products-results-${stamp}.csv`);
const categoriesOutputPath = path.resolve(outputDir, `hsp-new-products-categories-${stamp}.csv`);
const summaryOutputPath = path.resolve(outputDir, `hsp-new-products-summary-${stamp}.json`);

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
  if (boundary === -1) {
    throw new Error("Unexpected curl response format.");
  }

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
  for (let page = 1; page <= 20; page += 1) {
    const batch = request(`/wp-json/wc/v3/products?per_page=100&page=${page}`);
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

function hspSkuFromSource(sourceSku) {
  const number = normalizeText(sourceSku).match(/(\d+)/)?.[1] || "";
  return number ? `HSP-${number.padStart(3, "0")}` : normalizeText(sourceSku).replace(/^SKU-/i, "HSP-");
}

function money(value) {
  const numeric = Number(String(value || "").replace(/[^\d.]/g, ""));
  return Number.isFinite(numeric) && numeric > 0 ? String(Math.round(numeric)) : "";
}

function gtinValue(value) {
  const raw = normalizeText(value);
  if (!raw) {
    return "";
  }
  if (/e\+/i.test(raw)) {
    const numeric = Number(raw);
    return Number.isFinite(numeric) ? String(Math.round(numeric)) : raw;
  }
  return raw.replace(/[^\d]/g, "") || raw;
}

function categoryPathForRow(row) {
  const label = normalizeText(row.custom_label_0);
  const productType = normalizeText(row.product_type);
  const title = normalizeText(row.title);
  const combined = `${label} ${productType} ${title}`.toLowerCase();

  if (/solar water pump|water pump/.test(combined)) {
    return ["Water & Plumbing", "Water Pumps"];
  }

  if (/tv|television/.test(combined)) {
    return ["Electronics", "TVs & Home Entertainment"];
  }

  if (/audio|speaker|home theatre|theatre/.test(combined)) {
    return ["Electronics", "Audio"];
  }

  if (/generator/.test(combined)) {
    return ["Energy", "Generators"];
  }

  if (/solar panel|solar inverter|solar/.test(combined)) {
    return ["Energy", "Solar"];
  }

  if (/washing machine|washer|laundry|iron|steam iron/.test(combined)) {
    return ["Home Appliances", "Laundry"];
  }

  if (/refrigerator|fridge/.test(combined)) {
    return ["Home Appliances", "Refrigerators"];
  }

  if (/fan|air cooler|air purifier/.test(combined)) {
    return ["Home Appliances", "Fans & Air Treatment"];
  }

  if (/vacuum/.test(combined)) {
    return ["Home Appliances", "Cleaning Appliances"];
  }

  if (/cooker|microwave|blender|mixer|kettle|water dispenser|kitchen|cooking/.test(combined)) {
    return ["Home Appliances", "Cooking & Kitchen"];
  }

  return ["Home Appliances"];
}

function buildCategoryStore(categories) {
  const store = {
    list: [...categories],
    byKey: new Map(),
  };

  for (const category of categories) {
    store.byKey.set(`${Number(category.parent || 0)}:${normalizeText(category.name).toLowerCase()}`, category);
  }

  return store;
}

function getCategoryByPath(categoryStore, pathParts, createMissing) {
  let parentId = 0;
  let current = null;

  for (const part of pathParts) {
    const keyForPart = `${parentId}:${normalizeText(part).toLowerCase()}`;
    current = categoryStore.byKey.get(keyForPart) || null;

    if (!current && createMissing) {
      current = request(
        "/wp-json/wc/v3/products/categories",
        "POST",
        {
          name: part,
          slug: parentId ? slugify(`${categoryStore.list.find((item) => Number(item.id) === parentId)?.name || ""}-${part}`) : slugify(part),
          parent: parentId,
        },
        [201],
      );
      categoryStore.list.push(current);
      categoryStore.byKey.set(keyForPart, current);
    }

    if (!current) {
      return null;
    }

    parentId = Number(current.id);
  }

  return current;
}

function valueOrFallback(value, fallback) {
  return normalizeText(value) || fallback;
}

function buildSpecRows(row, sku) {
  const rows = [
    ["Brand", valueOrFallback(row.brand, "HomesKitsPro")],
    ["Model / MPN", valueOrFallback(row.mpn, sku)],
    ["SKU", sku],
  ];

  if (normalizeText(row.size)) {
    rows.push(["Capacity / Size", normalizeText(row.size)]);
  }
  if (normalizeText(row.color)) {
    rows.push(["Colour", normalizeText(row.color)]);
  }
  if (normalizeText(row.material)) {
    rows.push(["Material", normalizeText(row.material)]);
  }
  if (normalizeText(row.shipping_weight)) {
    rows.push(["Approx. Weight", normalizeText(row.shipping_weight)]);
  }
  if (gtinValue(row.gtin)) {
    rows.push(["GTIN / EAN", gtinValue(row.gtin)]);
  }

  return rows;
}

function buildShortDescription(row) {
  const title = normalizeText(row.title);
  const brand = valueOrFallback(row.brand, "HomesKitsPro");
  const description = stripHtml(row.description);
  const firstSentence = description.split(/(?<=[.!?])\s+/)[0] || description;
  return `<p><strong>${title}</strong> is a ${brand} product selected for reliable daily use in Kenyan homes and small businesses. ${firstSentence}</p>`;
}

function buildLongDescription(row, sku, categoryPath) {
  const title = normalizeText(row.title);
  const brand = valueOrFallback(row.brand, "HomesKitsPro");
  const description = stripHtml(row.description);
  const category = categoryPath.join(" > ");
  const specs = buildSpecRows(row, sku)
    .map(([label, value]) => `<tr><th>${label}</th><td>${value}</td></tr>`)
    .join("");

  return [
    `<p>${title} brings practical ${brand} performance to the ${normalizeText(row.custom_label_0).toLowerCase() || "home essentials"} category. ${description}</p>`,
    `<p>It is suitable for customers who want a dependable option with clear specifications, straightforward setup, and value-focused pricing. The product is aligned under <strong>${category}</strong> for easier browsing on HomesKitsPro.</p>`,
    "<h3>Key Specifications</h3>",
    `<table class="shop_attributes"><tbody>${specs}</tbody></table>`,
    "<h3>Why Choose This Product?</h3>",
    `<ul><li>Suitable for regular household or light commercial use.</li><li>Clear model and brand information for easier comparison.</li><li>Listed with GMC-friendly product data including brand, MPN, and category mapping.</li></ul>`,
  ].join("\n");
}

function buildProductPayload(row, category, existingProduct = null) {
  const sku = hspSkuFromSource(row.sku);
  const categoryPath = categoryPathForRow(row);
  const images = [normalizeText(row.image_link), normalizeText(row.additional_image_link)]
    .filter(Boolean)
    .map((src) => ({
      src,
      name: normalizeText(row.title),
      alt: normalizeText(row.title),
    }));

  return {
    name: normalizeText(row.title),
    type: "simple",
    status: "publish",
    catalog_visibility: "visible",
    sku,
    regular_price: money(row.price),
    sale_price: money(row.sale_price),
    description: buildLongDescription(row, sku, categoryPath),
    short_description: buildShortDescription(row),
    categories: category ? [{ id: Number(category.id) }] : existingProduct?.categories || [],
    images,
    manage_stock: true,
    stock_quantity: 10,
    stock_status: "instock",
    weight: normalizeText(row.shipping_weight).replace(/kg$/i, ""),
    attributes: [
      { name: "Brand", visible: true, variation: false, options: [valueOrFallback(row.brand, "HomesKitsPro")] },
      ...(normalizeText(row.color) ? [{ name: "Colour", visible: true, variation: false, options: [normalizeText(row.color)] }] : []),
      ...(normalizeText(row.size) ? [{ name: "Size", visible: true, variation: false, options: [normalizeText(row.size)] }] : []),
      ...(normalizeText(row.material) ? [{ name: "Material", visible: true, variation: false, options: [normalizeText(row.material)] }] : []),
    ],
    meta_data: [
      { key: "source_gmc_id", value: sku },
      { key: "source_original_sku", value: normalizeText(row.sku) },
      { key: "source_google_product_category", value: normalizeText(row.google_product_category) },
      { key: "source_product_type", value: normalizeText(row.product_type) },
      { key: "fb_brand", value: valueOrFallback(row.brand, "HomesKitsPro") },
      { key: "fb_mpn", value: valueOrFallback(row.mpn, sku) },
      { key: "fb_gtin", value: gtinValue(row.gtin) },
    ],
  };
}

const sourceRows = parseCsv(readFileSync(sourceCsvPath, "utf8"));
const liveProducts = fetchAllProducts();
const productBySku = new Map(liveProducts.filter((product) => normalizeText(product.sku)).map((product) => [normalizeText(product.sku), product]));
const liveCategories = fetchAllCategories();
const categoryStore = buildCategoryStore(liveCategories);

const planRows = sourceRows.map((row) => {
  const sku = hspSkuFromSource(row.sku);
  const categoryPath = categoryPathForRow(row);
  const category = getCategoryByPath(categoryStore, categoryPath, false);
  const existingProduct = productBySku.get(sku) || null;
  return {
    source_id: normalizeText(row.id),
    title: normalizeText(row.title),
    source_sku: normalizeText(row.sku),
    target_sku: sku,
    category_path: categoryPath.join(" > "),
    category_exists: category ? "yes" : "no",
    action: existingProduct ? "update" : "create",
    existing_product_id: existingProduct?.id || "",
    has_short_description: buildShortDescription(row).length > 0 ? "yes" : "no",
    has_long_description: buildLongDescription(row, sku, categoryPath).length > 0 ? "yes" : "no",
  };
});

writeCsv(
  planOutputPath,
  ["source_id", "title", "source_sku", "target_sku", "category_path", "category_exists", "action", "existing_product_id", "has_short_description", "has_long_description"],
  planRows,
);

if (mode === "preview") {
  const summary = {
    mode,
    sourceCsvPath,
    totalRows: sourceRows.length,
    createCount: planRows.filter((row) => row.action === "create").length,
    updateCount: planRows.filter((row) => row.action === "update").length,
    missingCategories: planRows.filter((row) => row.category_exists === "no").length,
    planOutputPath,
  };
  writeFileSync(summaryOutputPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(summary, null, 2));
  process.exit(0);
}

if (mode === "verify") {
  const freshProducts = fetchAllProducts();
  const freshBySku = new Map(freshProducts.filter((product) => normalizeText(product.sku)).map((product) => [normalizeText(product.sku), product]));
  const verifyRows = planRows.map((row) => {
    const product = freshBySku.get(row.target_sku);
    return {
      target_sku: row.target_sku,
      title: row.title,
      product_id: product?.id || "",
      live_category: normalizeText(product?.categories?.[0]?.name || ""),
      expected_category_path: row.category_path,
      has_short_description: stripHtml(product?.short_description || "") ? "yes" : "no",
      has_long_description: stripHtml(product?.description || "") ? "yes" : "no",
      status: product ? "found" : "missing",
    };
  });
  writeCsv(
    resultsOutputPath,
    ["target_sku", "title", "product_id", "live_category", "expected_category_path", "has_short_description", "has_long_description", "status"],
    verifyRows,
  );
  const summary = {
    mode,
    expectedRows: planRows.length,
    foundProducts: verifyRows.filter((row) => row.status === "found").length,
    missingProducts: verifyRows.filter((row) => row.status === "missing").length,
    missingShortDescriptions: verifyRows.filter((row) => row.has_short_description !== "yes").length,
    missingLongDescriptions: verifyRows.filter((row) => row.has_long_description !== "yes").length,
    resultsOutputPath,
  };
  writeFileSync(summaryOutputPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(summary, null, 2));
  process.exit(0);
}

const categoryResults = [];
for (const row of sourceRows) {
  const categoryPath = categoryPathForRow(row);
  const existing = getCategoryByPath(categoryStore, categoryPath, false);
  const category = existing || getCategoryByPath(categoryStore, categoryPath, true);
  categoryResults.push({
    category_path: categoryPath.join(" > "),
    category_id: category?.id || "",
    status: existing ? "existing" : "created",
  });
}

writeCsv(categoriesOutputPath, ["category_path", "category_id", "status"], categoryResults);

const results = [];
for (const row of sourceRows) {
  const sku = hspSkuFromSource(row.sku);
  const existingProduct = productBySku.get(sku) || null;
  const category = getCategoryByPath(categoryStore, categoryPathForRow(row), false);
  const fullPayload = buildProductPayload(row, category, existingProduct);
  const endpoint = existingProduct ? `/wp-json/wc/v3/products/${existingProduct.id}` : "/wp-json/wc/v3/products";
  const method = existingProduct ? "PUT" : "POST";

  let product = null;
  let status = existingProduct ? "updated" : "created";
  let imageStatus = "with_images";
  let message = "";

  try {
    product = request(endpoint, method, fullPayload, existingProduct ? [200] : [201]);
  } catch (error) {
    const fallbackPayload = {
      ...fullPayload,
      images: existingProduct?.images || [],
    };
    try {
      product = request(endpoint, method, fallbackPayload, existingProduct ? [200] : [201]);
      imageStatus = "image_import_failed_product_saved";
      message = normalizeText(error.bodyText || error.message);
    } catch (fallbackError) {
      status = "failed";
      imageStatus = "failed";
      message = normalizeText(fallbackError.bodyText || fallbackError.message);
    }
  }

  results.push({
    source_sku: normalizeText(row.sku),
    target_sku: sku,
    product_id: product?.id || existingProduct?.id || "",
    title: normalizeText(row.title),
    action: existingProduct ? "update" : "create",
    status,
    category: normalizeText(product?.categories?.[0]?.name || category?.name || ""),
    image_status: imageStatus,
    message,
  });
}

writeCsv(resultsOutputPath, ["source_sku", "target_sku", "product_id", "title", "action", "status", "category", "image_status", "message"], results);

const summary = {
  mode,
  sourceCsvPath,
  totalRows: sourceRows.length,
  created: results.filter((row) => row.status === "created").length,
  updated: results.filter((row) => row.status === "updated").length,
  failed: results.filter((row) => row.status === "failed").length,
  imageFallbacks: results.filter((row) => row.image_status === "image_import_failed_product_saved").length,
  categoriesCreated: categoryResults.filter((row) => row.status === "created").length,
  planOutputPath,
  categoriesOutputPath,
  resultsOutputPath,
};
writeFileSync(summaryOutputPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
console.log(JSON.stringify(summary, null, 2));
