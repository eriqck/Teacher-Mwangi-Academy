#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";

const baseUrl = process.env.WC_URL || "https://homeskitspro.com";
const key = process.env.WC_KEY;
const secret = process.env.WC_SECRET;
const stamp = process.env.RUN_STAMP || "20260418-live-product-image-quality";
const outputDir = path.resolve("outputs");

if (!key || !secret) {
  console.error("Missing WC_KEY or WC_SECRET environment variables.");
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
  const products = [];
  for (let page = 1; page <= 30; page += 1) {
    const batch = request(`/wp-json/wc/v3/products?per_page=100&page=${page}&status=publish`);
    if (!Array.isArray(batch) || batch.length === 0) break;
    products.push(...batch);
    if (batch.length < 100) break;
  }
  return products;
}

function dimensionsFromImage(image) {
  const src = image?.src || "";
  const srcset = image?.srcset || "";
  const widths = [...srcset.matchAll(/\s(\d+)w/g)].map((match) => Number(match[1])).filter(Boolean);
  const largestWidth = widths.length ? Math.max(...widths) : "";
  const srcWidth = Number(src.match(/-(\d+)x(\d+)(?:-\d+)?\.(?:jpe?g|png|webp)$/i)?.[1] || 0) || "";
  return { largestWidth, srcWidth };
}

const products = fetchAllProducts();
const rows = products.map((product) => {
  const image = product.images?.[0] || {};
  const dims = dimensionsFromImage(image);
  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    categories: (product.categories || []).map((category) => category.name).join(" > "),
    image_id: image.id || "",
    image_src: image.src || "",
    src_width_hint: dims.srcWidth,
    srcset_largest_width: dims.largestWidth,
    looks_low_res:
      /-\d+x\d+(?:-\d+)?\.(?:jpe?g|png|webp)$/i.test(image.src || "") || (dims.largestWidth && dims.largestWidth < 600)
        ? "yes"
        : "unknown",
  };
});

const outputPath = path.resolve(outputDir, `hsp-live-product-image-quality-${stamp}.csv`);
writeCsv(
  outputPath,
  ["id", "sku", "name", "categories", "image_id", "image_src", "src_width_hint", "srcset_largest_width", "looks_low_res"],
  rows,
);

console.log(
  JSON.stringify(
    {
      products: rows.length,
      lowResLikely: rows.filter((row) => row.looks_low_res === "yes").length,
      outputPath,
    },
    null,
    2,
  ),
);
