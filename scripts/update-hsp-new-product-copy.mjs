#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";

const baseUrl = process.env.WC_URL || "https://homeskitspro.com";
const key = process.env.WC_KEY;
const secret = process.env.WC_SECRET;
const sourceCsvPath = process.argv[2] || "C:/Users/Eric/Downloads/New products to be added.csv";
const stamp = process.env.RUN_STAMP || "20260416-hsp-new-copy-polish";
const outputDir = path.resolve("outputs");

if (!key || !secret) {
  console.error("Missing WC_KEY or WC_SECRET environment variables.");
  process.exit(1);
}

mkdirSync(outputDir, { recursive: true });

const resultsOutputPath = path.resolve(outputDir, `hsp-new-product-copy-results-${stamp}.csv`);
const summaryOutputPath = path.resolve(outputDir, `hsp-new-product-copy-summary-${stamp}.json`);

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

function categoryLabel(row) {
  const label = normalizeText(row.custom_label_0);
  const type = normalizeText(row.product_type);
  const source = `${label} ${type} ${row.title}`.toLowerCase();

  if (/washing machine|steam iron|laundry/.test(source)) return "Laundry";
  if (/refrigerator|fridge/.test(source)) return "Refrigerators";
  if (/tv|television/.test(source)) return "TVs & Home Entertainment";
  if (/fan|air cooler|air purifier/.test(source)) return "Fans & Air Treatment";
  if (/generator/.test(source)) return "Generators";
  if (/solar water pump|water pump/.test(source)) return "Water Pumps";
  if (/solar/.test(source)) return "Solar";
  if (/cooker|microwave|blender|mixer|kettle|water dispenser|cooking|kitchen/.test(source)) return "Cooking & Kitchen";
  if (/vacuum/.test(source)) return "Cleaning Appliances";
  if (/audio|speaker|home theatre|theatre/.test(source)) return "Audio";
  return label || "Home Appliances";
}

function useCase(row) {
  const category = categoryLabel(row);
  const title = normalizeText(row.title).toLowerCase();

  if (category === "Laundry") return title.includes("iron") ? "daily garment care, ironing shirts, school uniforms, and household laundry" : "family laundry, rentals, hostels, and busy homes that need reliable washing performance";
  if (category === "Refrigerators") return "keeping groceries, drinks, leftovers, and fresh produce organised in homes, offices, and small shops";
  if (category === "TVs & Home Entertainment") return "movies, sports, streaming, gaming, and everyday family entertainment";
  if (category === "Fans & Air Treatment") return title.includes("purifier") ? "bedrooms, offices, and living spaces where cleaner air and quieter operation matter" : "bedrooms, offices, shops, and living rooms during warm weather";
  if (category === "Generators") return "backup power for homes, small offices, shops, events, and essential appliances";
  if (category === "Solar") return "solar backup systems, off-grid setups, battery charging, and energy-saving installations";
  if (category === "Water Pumps") return "borehole supply, irrigation, livestock watering, and off-grid water movement";
  if (category === "Cooking & Kitchen") return "daily cooking, meal preparation, hot drinks, and practical kitchen routines";
  if (category === "Cleaning Appliances") return "cleaning carpets, tiles, hard floors, dust, and everyday household mess";
  if (category === "Audio") return "music, movies, parties, home entertainment, and wireless everyday listening";
  return "daily household use where reliability and simple operation matter";
}

function benefitSentence(row) {
  const category = categoryLabel(row);
  const title = normalizeText(row.title).toLowerCase();

  if (category === "Laundry" && title.includes("front load")) return "The front-load design is efficient with water and power, while the programme options help match different fabric types.";
  if (category === "Laundry" && title.includes("twin tub")) return "The twin-tub layout lets you wash and spin separately, which is useful for quick laundry cycles and controlled water use.";
  if (category === "Laundry" && title.includes("top load")) return "The top-load format is easy to access and practical for small homes that need a compact washing setup.";
  if (category === "Refrigerators") return "The storage layout helps separate drinks, fresh produce, and everyday food items while keeping access simple.";
  if (category === "TVs & Home Entertainment") return "The display and connectivity features make it easy to enjoy streaming devices, set-top boxes, consoles, and USB media.";
  if (category === "Fans & Air Treatment" && title.includes("purifier")) return "The filtration stages help reduce dust, fine particles, odours, and common indoor air pollutants.";
  if (category === "Fans & Air Treatment") return "The airflow controls make it easier to cool a room without complicated setup or heavy installation.";
  if (category === "Generators") return "The generator setup is useful where power interruptions affect lighting, tools, electronics, or business continuity.";
  if (category === "Solar") return "The solar-ready design supports energy-saving installations where stable daytime power or backup power is important.";
  if (category === "Water Pumps") return "The pump kit is useful where reliable water movement is needed without depending fully on grid electricity.";
  if (category === "Cooking & Kitchen") return "The design focuses on convenient daily use, easy handling, and straightforward cleaning after meals.";
  if (category === "Cleaning Appliances") return "The suction and filtration setup helps remove dust from common household surfaces with less effort.";
  if (category === "Audio") return "The audio setup is designed for clear listening, easy connection, and enjoyable everyday sound.";
  return "The product is built for practical everyday use with clear controls and dependable operation.";
}

function keyHighlights(row) {
  const description = normalizeText(row.description);
  return description
    .split(/[.,;:]/)
    .map((item) => normalizeText(item))
    .filter((item) => item.length > 2)
    .slice(0, 5);
}

function specRows(row, sku) {
  const rows = [
    ["Brand", normalizeText(row.brand) || "HomesKitsPro"],
    ["Model / MPN", normalizeText(row.mpn) || sku],
    ["SKU", sku],
    ["Product Type", normalizeText(row.product_type) || categoryLabel(row)],
  ];

  if (normalizeText(row.size)) rows.push(["Capacity / Size", normalizeText(row.size)]);
  if (normalizeText(row.color)) rows.push(["Colour", normalizeText(row.color)]);
  if (normalizeText(row.material)) rows.push(["Material", normalizeText(row.material)]);
  if (normalizeText(row.shipping_weight)) rows.push(["Approx. Weight", normalizeText(row.shipping_weight)]);
  if (gtinValue(row.gtin)) rows.push(["GTIN / EAN", gtinValue(row.gtin)]);
  rows.push(["Availability", "in stock"]);
  rows.push(["Condition", "new"]);

  return rows;
}

function table(headers, rows) {
  return [
    "<table>",
    "<thead>",
    "<tr>",
    ...headers.map((header) => `<th>${header}</th>`),
    "</tr>",
    "</thead>",
    "<tbody>",
    ...rows.flatMap((row) => [
      "<tr>",
      ...row.map((cell) => `<td>${cell}</td>`),
      "</tr>",
    ]),
    "</tbody>",
    "</table>",
  ].join("\n");
}

function buildShortDescription(row) {
  const title = normalizeText(row.title);
  const brand = normalizeText(row.brand) || "HomesKitsPro";
  const highlights = keyHighlights(row).slice(0, 2).join("; ");
  return `<p>${title} from ${brand} is built for ${useCase(row)}. ${highlights ? `Key highlights include ${highlights.toLowerCase()}.` : benefitSentence(row)}</p>`;
}

function buildLongDescription(row, sku) {
  const title = normalizeText(row.title);
  const brand = normalizeText(row.brand) || "HomesKitsPro";
  const description = normalizeText(row.description);
  const highlights = keyHighlights(row);
  const highlightsRows = highlights.map((highlight) => [`<strong>${highlight}</strong>`, "Practical feature for everyday use"]);
  const specTable = table(["Specification", "Details"], specRows(row, sku).map(([label, value]) => [`<strong>${label}</strong>`, value]));
  const applicationTable = table(["Use Case", "Description"], [["<strong>Recommended Use</strong>", useCase(row)]]);
  const featureTable = highlightsRows.length ? table(["Feature", "Why It Matters"], highlightsRows) : "";

  return [
    `<p>The ${title} is selected for customers who want dependable ${categoryLabel(row).toLowerCase()} performance with practical features for real home and light commercial use.</p>`,
    `<p>${description}</p>`,
    `<p>${benefitSentence(row)} This makes it a useful choice for ${useCase(row)}, especially where reliability, easy operation, and clear product specifications are important.</p>`,
    "<hr />",
    "<h3>Key Specifications</h3>",
    specTable,
    ...(featureTable ? ["<hr />", "<h3>Product Highlights</h3>", featureTable] : []),
    "<hr />",
    "<h3>Ideal Applications</h3>",
    applicationTable,
    "<hr />",
    "<h3>Buying Notes</h3>",
    `<p>Before purchase, confirm that the ${normalizeText(row.size) || "capacity"} size and power requirements match your space, usage needs, and installation setup. For ${brand} model ${normalizeText(row.mpn) || sku}, the listed specifications are provided to make comparison easier before checkout.</p>`,
  ].join("\n");
}

const sourceRows = parseCsv(readFileSync(sourceCsvPath, "utf8"));
const liveProducts = fetchAllProducts();
const liveBySku = new Map(liveProducts.filter((product) => normalizeText(product.sku)).map((product) => [normalizeText(product.sku), product]));
const results = [];

for (const row of sourceRows) {
  const sku = hspSkuFromSource(row.sku);
  const product = liveBySku.get(sku);

  if (!product) {
    results.push({ sku, title: normalizeText(row.title), product_id: "", status: "missing", bad_phrase_present: "", short_length: 0, long_length: 0 });
    continue;
  }

  const shortDescription = buildShortDescription(row);
  const description = buildLongDescription(row, sku);
  const updated = request(`/wp-json/wc/v3/products/${product.id}`, "PUT", {
    short_description: shortDescription,
    description,
  });
  const combined = `${updated.short_description || ""} ${updated.description || ""}`.toLowerCase();

  results.push({
    sku,
    title: normalizeText(updated.name),
    product_id: updated.id,
    status: "updated",
    bad_phrase_present: combined.includes("aligned under") || combined.includes("for easier browsing") || combined.includes("gmc-friendly") ? "yes" : "no",
    short_length: normalizeText(updated.short_description).length,
    long_length: normalizeText(updated.description).length,
  });
}

writeCsv(resultsOutputPath, ["sku", "title", "product_id", "status", "bad_phrase_present", "short_length", "long_length"], results);

const summary = {
  sourceCsvPath,
  totalRows: sourceRows.length,
  updated: results.filter((row) => row.status === "updated").length,
  missing: results.filter((row) => row.status === "missing").length,
  badPhraseCount: results.filter((row) => row.bad_phrase_present === "yes").length,
  resultsOutputPath,
};
writeFileSync(summaryOutputPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
console.log(JSON.stringify(summary, null, 2));
