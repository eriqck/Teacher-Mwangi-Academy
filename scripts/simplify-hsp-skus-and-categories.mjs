#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";

const baseUrl = process.env.WC_URL || "https://homeskitspro.com";
const key = process.env.WC_KEY;
const secret = process.env.WC_SECRET;
const mode = (process.argv[2] || "preview").toLowerCase();
const stamp = process.env.RUN_STAMP || "20260415-hsp-simplify";
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

const planOutputPath = path.resolve(outputDir, `hsp-sku-category-plan-${stamp}.csv`);
const resultsOutputPath = path.resolve(outputDir, `hsp-sku-category-results-${stamp}.csv`);
const categoryResultsOutputPath = path.resolve(outputDir, `hsp-category-cleanup-results-${stamp}.csv`);
const summaryOutputPath = path.resolve(outputDir, `hsp-sku-category-summary-${stamp}.json`);

const CATEGORY = {
  WATER_PLUMBING: 1543,
  WATER_FILTERS: 1587,
  WATER_PUMPS: 1588,
  WATER_ACCESSORIES: 1585,
  TOOLS_HARDWARE: 1551,
  TOOLS_POWER: 1657,
  TOOLS_HAND: 1655,
  TOOLS_SAFETY: 1671,
  TOOLS_LADDERS: 1592,
  TOOLS_WELDING: 1669,
  ELECTRONICS: 1553,
  ELECTRONICS_TV: 1554,
  ELECTRONICS_AUDIO: 1578,
  ELECTRONICS_SECURITY: 1581,
  HOME_APPLIANCES: 1560,
  HOME_PERSONAL: 1568,
  HOME_LAUNDRY: 1686,
  LIGHTING: 1673,
  SPORTS: 1677,
  ENERGY: 1697,
  HOME_GARDEN: 1599,
  PROTECTED_TODELETE: 332,
};

const WATER_PUMP_NAMES = new Set([
  "Water Pumps",
  "Booster Pumps",
  "Petrol Pumps",
  "Pressure Washers",
  "Pump Controllers",
  "Solar Pumps",
  "Submersible Pumps",
  "Surface Pumps",
]);

const WATER_FILTER_NAMES = new Set([
  "Water Filters & Purifiers",
  "Sediment Filters",
]);

const TOOLS_HAND_NAMES = new Set([
  "Hand Tools",
  "Measuring Tools",
  "Fastening Tools",
  "Hammers",
  "Hoisting Equipment",
  "Pipe Cutters",
  "Socket Sets",
  "Spirit Levels",
  "Tape Measures",
  "Tool Sets",
  "Wrench Sets",
]);

const TOOLS_SAFETY_NAMES = new Set([
  "Safety Tools",
  "Eye Protection",
  "Hard Hats",
  "Security Fencing",
  "Work Gloves",
]);

const TOOLS_LADDER_NAMES = new Set([
  "Ladders & Scaffolding",
  "Multipurpose Ladders",
]);

const TOOLS_WELDING_NAMES = new Set([
  "Welding",
  "MMA Welders",
]);

const TOOLS_POWER_NAMES = new Set([
  "Power Tools",
  "Drills & Drivers",
  "Cordless Tools",
  "Angle Grinders",
  "Cordless Grinders",
  "Cordless Screwdrivers",
  "Impact Wrenches",
  "Circular Saw Blades",
  "Combo Kits",
  "Jig Saws",
  "Reciprocating Saws",
  "Rotary Hammers",
  "Polishing Machines",
  "Multimeters",
  "Cordless Drills",
  "Rotary Tools",
  "Accessories",
]);

const ELECTRONICS_TV_NAMES = new Set([
  "TVs & Home Entertainment",
  "Smart TVs",
]);

const ELECTRONICS_AUDIO_NAMES = new Set([
  "Audio",
  "Headphones & Earbuds",
]);

const PERSONAL_CARE_NAMES = new Set([
  "Personal Care",
  "Hair Dryers",
]);

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
    throw new Error(`Request failed: ${statusLine || bodyText}`);
  }

  return bodyText ? JSON.parse(bodyText) : null;
}

function fetchAllProducts() {
  const items = [];
  for (let page = 1; page <= 10; page += 1) {
    const batch = request(`/wp-json/wc/v3/products?per_page=100&page=${page}&status=publish`);
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

function getMetaValue(product, keyName) {
  return (product.meta_data || []).find((item) => normalizeText(item.key) === keyName)?.value || "";
}

function buildMetaData(product, nextSku) {
  const current = Array.isArray(product.meta_data) ? product.meta_data : [];
  let foundSourceId = false;
  return current
    .map((item) => {
      if (!item) {
        return item;
      }
      if (normalizeText(item.key) === "source_gmc_id") {
        foundSourceId = true;
        return {
          id: item.id,
          key: "source_gmc_id",
          value: nextSku,
        };
      }
      return item;
    })
    .concat(
      foundSourceId
        ? []
        : [
            {
              key: "source_gmc_id",
              value: nextSku,
            },
          ],
    );
}

function chunk(items, size) {
  const groups = [];
  for (let index = 0; index < items.length; index += size) {
    groups.push(items.slice(index, index + size));
  }
  return groups;
}

function buildCategoryMaps(categories) {
  const categoryById = new Map(categories.map((category) => [Number(category.id), category]));
  const childrenByParent = new Map();
  for (const category of categories) {
    const parentId = Number(category.parent || 0);
    if (!childrenByParent.has(parentId)) {
      childrenByParent.set(parentId, []);
    }
    childrenByParent.get(parentId).push(category);
  }
  return { categoryById, childrenByParent };
}

function categoryLineage(categoryId, categoryById) {
  const lineage = [];
  let current = categoryById.get(Number(categoryId));
  while (current) {
    lineage.unshift(current);
    if (!current.parent) {
      break;
    }
    current = categoryById.get(Number(current.parent));
  }
  return lineage;
}

function categoryDepth(category, categoryById) {
  return categoryLineage(category.id, categoryById).length - 1;
}

function determineTargetCategory(product, categoryById) {
  const primaryCategory = (product.categories || [])[0];
  const lineage = primaryCategory ? categoryLineage(primaryCategory.id, categoryById) : [];
  const rootId = Number(lineage[0]?.id || primaryCategory?.id || 0);
  const categoryNames = new Set(lineage.map((item) => normalizeText(item.name)));
  const nameText = normalizeText(product.name);

  if (rootId === CATEGORY.WATER_PLUMBING) {
    if ([...categoryNames].some((name) => WATER_FILTER_NAMES.has(name))) {
      return CATEGORY.WATER_FILTERS;
    }
    if ([...categoryNames].some((name) => WATER_PUMP_NAMES.has(name))) {
      return CATEGORY.WATER_PUMPS;
    }
    return CATEGORY.WATER_ACCESSORIES;
  }

  if (rootId === CATEGORY.TOOLS_HARDWARE) {
    if ([...categoryNames].some((name) => TOOLS_WELDING_NAMES.has(name)) || /welder|welding/i.test(nameText)) {
      return CATEGORY.TOOLS_WELDING;
    }
    if ([...categoryNames].some((name) => TOOLS_LADDER_NAMES.has(name)) || /ladder/i.test(nameText)) {
      return CATEGORY.TOOLS_LADDERS;
    }
    if ([...categoryNames].some((name) => TOOLS_POWER_NAMES.has(name)) || /cordless|drill|grinder|jig saw|reciprocating|rotary hammer|impact wrench|sds|polish|multimeter|saw blade/i.test(nameText)) {
      return CATEGORY.TOOLS_POWER;
    }
    if ([...categoryNames].some((name) => TOOLS_SAFETY_NAMES.has(name)) || /glove|helmet|goggle|razor wire|fencing/i.test(nameText)) {
      return CATEGORY.TOOLS_SAFETY;
    }
    if ([...categoryNames].some((name) => TOOLS_HAND_NAMES.has(name)) || /hammer|wrench|socket|tool set|tape measure|spirit level|pipe cutter|staple gun|chain block/i.test(nameText)) {
      return CATEGORY.TOOLS_HAND;
    }
    return CATEGORY.TOOLS_POWER;
  }

  if (rootId === CATEGORY.ELECTRONICS) {
    if ([...categoryNames].some((name) => ELECTRONICS_TV_NAMES.has(name)) || /tv|google smart/i.test(nameText)) {
      return CATEGORY.ELECTRONICS_TV;
    }
    if ([...categoryNames].some((name) => ELECTRONICS_AUDIO_NAMES.has(name)) || /earbud|headphone|audio/i.test(nameText)) {
      return CATEGORY.ELECTRONICS_AUDIO;
    }
    return CATEGORY.ELECTRONICS_SECURITY;
  }

  if (rootId === CATEGORY.ELECTRONICS_SECURITY) {
    return CATEGORY.ELECTRONICS_SECURITY;
  }

  if (rootId === CATEGORY.HOME_APPLIANCES) {
    if ([...categoryNames].some((name) => PERSONAL_CARE_NAMES.has(name)) || /dryer|hair/i.test(nameText)) {
      return CATEGORY.HOME_PERSONAL;
    }
    return CATEGORY.HOME_LAUNDRY;
  }

  if (rootId === CATEGORY.LIGHTING) {
    return CATEGORY.LIGHTING;
  }

  if (rootId === CATEGORY.SPORTS) {
    return CATEGORY.SPORTS;
  }

  if (rootId === CATEGORY.ENERGY) {
    return CATEGORY.ENERGY;
  }

  if (rootId === CATEGORY.HOME_GARDEN) {
    return CATEGORY.HOME_GARDEN;
  }

  return primaryCategory?.id || 0;
}

function buildDeletionPlan(categories) {
  const { categoryById, childrenByParent } = buildCategoryMaps(categories);
  const protectedIds = new Set([
    CATEGORY.WATER_PLUMBING,
    CATEGORY.WATER_FILTERS,
    CATEGORY.WATER_PUMPS,
    CATEGORY.WATER_ACCESSORIES,
    CATEGORY.TOOLS_HARDWARE,
    CATEGORY.TOOLS_POWER,
    CATEGORY.TOOLS_HAND,
    CATEGORY.TOOLS_SAFETY,
    CATEGORY.TOOLS_LADDERS,
    CATEGORY.TOOLS_WELDING,
    CATEGORY.ELECTRONICS,
    CATEGORY.ELECTRONICS_TV,
    CATEGORY.ELECTRONICS_AUDIO,
    CATEGORY.ELECTRONICS_SECURITY,
    CATEGORY.HOME_APPLIANCES,
    CATEGORY.HOME_PERSONAL,
    CATEGORY.HOME_LAUNDRY,
    CATEGORY.LIGHTING,
    CATEGORY.SPORTS,
    CATEGORY.ENERGY,
    CATEGORY.HOME_GARDEN,
    CATEGORY.PROTECTED_TODELETE,
  ]);

  const memo = new Map();
  function subtreeHasProducts(categoryId) {
    if (memo.has(categoryId)) {
      return memo.get(categoryId);
    }
    const category = categoryById.get(Number(categoryId));
    const selfHasProducts = Number(category?.count || 0) > 0;
    const childHasProducts = (childrenByParent.get(Number(categoryId)) || []).some((child) => subtreeHasProducts(child.id));
    const result = selfHasProducts || childHasProducts;
    memo.set(categoryId, result);
    return result;
  }

  return categories
    .filter((category) => !protectedIds.has(Number(category.id)))
    .filter((category) => !subtreeHasProducts(category.id))
    .sort((left, right) => categoryDepth(right, categoryById) - categoryDepth(left, categoryById) || Number(right.id) - Number(left.id));
}

const liveProducts = fetchAllProducts();
const liveCategories = fetchAllCategories();
const { categoryById } = buildCategoryMaps(liveCategories);

const planRows = liveProducts
  .map((product) => {
    const currentCategory = (product.categories || [])[0] || null;
    const targetCategoryId = determineTargetCategory(product, categoryById);
    const targetCategory = categoryById.get(Number(targetCategoryId)) || currentCategory || null;
    const currentSku = normalizeText(product.sku);
    const nextSku = currentSku.startsWith("VOH-") ? currentSku.replace(/^VOH-/, "HSP-") : currentSku;
    return {
      id: product.id,
      name: normalizeText(product.name),
      current_sku: currentSku,
      next_sku: nextSku,
      current_category_id: currentCategory?.id || "",
      current_category: normalizeText(currentCategory?.name || ""),
      target_category_id: targetCategory?.id || "",
      target_category: normalizeText(targetCategory?.name || currentCategory?.name || ""),
      sku_change: currentSku !== nextSku ? "yes" : "no",
      category_change: Number(currentCategory?.id || 0) !== Number(targetCategory?.id || 0) ? "yes" : "no",
    };
  })
  .sort((left, right) => Number(left.id) - Number(right.id));

writeCsv(
  planOutputPath,
  ["id", "name", "current_sku", "next_sku", "current_category_id", "current_category", "target_category_id", "target_category", "sku_change", "category_change"],
  planRows,
);

if (mode === "preview") {
  const summary = {
    mode,
    totalProducts: liveProducts.length,
    totalCategories: liveCategories.length,
    skuChanges: planRows.filter((row) => row.sku_change === "yes").length,
    categoryChanges: planRows.filter((row) => row.category_change === "yes").length,
    planOutputPath,
  };
  writeFileSync(summaryOutputPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(summary, null, 2));
  process.exit(0);
}

if (mode === "verify") {
  const summary = {
    mode,
    totalProducts: liveProducts.length,
    totalCategories: liveCategories.length,
    remainingVohSkus: planRows.filter((row) => row.current_sku.startsWith("VOH-")).length,
    productsNeedingCategorySimplification: planRows.filter((row) => row.category_change === "yes").length,
    planOutputPath,
  };
  writeFileSync(summaryOutputPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(summary, null, 2));
  process.exit(0);
}

request(`/wp-json/wc/v3/products/categories/${CATEGORY.WATER_ACCESSORIES}`, "PUT", {
  name: "Accessories",
  slug: "water-plumbing-accessories",
}, [200]);

const productPayload = planRows
  .filter((row) => row.sku_change === "yes" || row.category_change === "yes")
  .map((row) => {
    const product = liveProducts.find((item) => Number(item.id) === Number(row.id));
    return {
      id: row.id,
      sku: row.next_sku,
      categories: row.target_category_id ? [{ id: Number(row.target_category_id) }] : product.categories,
      meta_data: row.sku_change === "yes" ? buildMetaData(product, row.next_sku) : product.meta_data,
    };
  });

const productResults = [];
for (const group of chunk(productPayload, 20)) {
  const response = request("/wp-json/wc/v3/products/batch", "POST", { update: group });
  const updated = Array.isArray(response?.update) ? response.update : [];
  for (const product of updated) {
    productResults.push({
      id: product.id,
      name: normalizeText(product.name),
      sku: normalizeText(product.sku),
      category: normalizeText(product.categories?.[0]?.name || ""),
      source_gmc_id: normalizeText(getMetaValue(product, "source_gmc_id")),
    });
  }
}

writeCsv(resultsOutputPath, ["id", "name", "sku", "category", "source_gmc_id"], productResults);

const postUpdateCategories = fetchAllCategories();
const categoriesToDelete = buildDeletionPlan(postUpdateCategories);
const categoryResults = [];
for (const category of categoriesToDelete) {
  const response = request(`/wp-json/wc/v3/products/categories/${category.id}?force=true`, "DELETE", null, [200, 400, 404, 500]);
  categoryResults.push({
    id: category.id,
    name: normalizeText(category.name),
    status:
      response?.deleted === true
        ? "deleted"
        : response?.data?.status === 404
          ? "not_found"
          : response?.data?.status === 400
            ? "skipped"
            : response?.data?.status === 500
              ? "error_500"
              : "unknown",
    message: normalizeText(response?.message || ""),
  });
}

writeCsv(categoryResultsOutputPath, ["id", "name", "status", "message"], categoryResults);

const summary = {
  mode,
  totalProducts: liveProducts.length,
  totalCategoriesBefore: liveCategories.length,
  skuChangesApplied: planRows.filter((row) => row.sku_change === "yes").length,
  categoryChangesApplied: planRows.filter((row) => row.category_change === "yes").length,
  deletedEmptyCategories: categoryResults.filter((row) => row.status === "deleted").length,
  skippedEmptyCategories: categoryResults.filter((row) => row.status !== "deleted").length,
  planOutputPath,
  resultsOutputPath,
  categoryResultsOutputPath,
};
writeFileSync(summaryOutputPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
console.log(JSON.stringify(summary, null, 2));
