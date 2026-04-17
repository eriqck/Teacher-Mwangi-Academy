#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const baseUrl = process.env.WC_URL || "https://homeskitspro.com";
const wcKey = process.env.WC_KEY;
const wcSecret = process.env.WC_SECRET;
const stamp = process.env.RUN_STAMP || "20260417-product-identifiers-audit";
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

function csvEscape(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function writeCsv(filePath, headers, rows) {
  const lines = [headers.map(csvEscape).join(",")];
  for (const row of rows) lines.push(headers.map((header) => csvEscape(row[header])).join(","));
  writeFileSync(filePath, `${lines.join("\r\n")}\r\n`, "utf8");
}

function metaValue(product, keys) {
  for (const key of keys) {
    const found = (product.meta_data || []).find((meta) => meta.key === key);
    if (found && found.value !== "" && found.value !== null && found.value !== undefined) return found.value;
  }
  return "";
}

function attributeValue(product, names) {
  const wanted = names.map((name) => name.toLowerCase());
  const found = (product.attributes || []).find((attribute) => wanted.includes(String(attribute.name || "").toLowerCase()));
  return found ? (found.options || []).join("|") : "";
}

const products = [];
for (let page = 1; page < 1000; page += 1) {
  const batch = requestWoo(`/wp-json/wc/v3/products?per_page=100&page=${page}&status=publish`);
  if (!Array.isArray(batch) || batch.length === 0) break;
  products.push(...batch);
  if (batch.length < 100) break;
}

const rows = products.map((product) => {
  const categories = (product.categories || []).map((category) => category.name).join(" > ");
  const brand = metaValue(product, ["_wc_gla_brand", "brand", "_brand"]) || attributeValue(product, ["Brand", "brand"]);
  const mpn = metaValue(product, ["_wc_gla_mpn", "mpn", "_mpn"]) || attributeValue(product, ["MPN", "Model", "Model Number"]);
  const gtin = product.global_unique_id || metaValue(product, ["_wc_gla_gtin", "_global_unique_id", "_wpm_gtin_code", "_alg_ean", "_ts_gtin"]);
  const upc = metaValue(product, ["_wc_gla_upc", "upc", "_upc"]);
  const ean = metaValue(product, ["_wc_gla_ean", "ean", "_ean"]);
  const isbn = metaValue(product, ["_wc_gla_isbn", "isbn", "_isbn"]);
  const identifierExists = metaValue(product, ["_wc_gla_identifier_exists", "identifier_exists"]);
  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    categories,
    brand,
    mpn,
    global_unique_id: product.global_unique_id || "",
    gtin,
    upc,
    ean,
    isbn,
    identifier_exists: identifierExists,
    meta_keys: (product.meta_data || []).map((meta) => meta.key).filter((key) => /gtin|upc|ean|isbn|gla|brand|mpn|identifier/i.test(key)).join("|"),
  };
});

const outputPath = path.resolve(outputDir, `hsp-product-identifiers-audit-${stamp}.csv`);
const samplePath = path.resolve(outputDir, `hsp-product-identifiers-sample-${stamp}.json`);
writeCsv(outputPath, ["id", "sku", "name", "categories", "brand", "mpn", "global_unique_id", "gtin", "upc", "ean", "isbn", "identifier_exists", "meta_keys"], rows);
writeFileSync(samplePath, `${JSON.stringify(products.slice(0, 5), null, 2)}\n`, "utf8");

console.log(JSON.stringify({
  totalProducts: products.length,
  withAnyIdentifier: rows.filter((row) => row.gtin || row.upc || row.ean || row.isbn || row.global_unique_id).length,
  withBrand: rows.filter((row) => row.brand).length,
  withMpn: rows.filter((row) => row.mpn).length,
  outputPath,
  samplePath,
}, null, 2));
