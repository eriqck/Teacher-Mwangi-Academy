#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const baseUrl = process.env.WP_URL || "https://homeskitspro.com";
const wpUser = process.env.WP_USER || "admin";
const wpAppPassword = process.env.WP_APP_PASSWORD;
const restBase = process.argv[3] ? process.argv[2] : "pages";
const pageId = process.argv[3] || process.argv[2];

if (!wpAppPassword || !pageId) {
  console.error("Usage: WP_APP_PASSWORD=... node inspect-wp-page.mjs [restBase] <id>");
  process.exit(1);
}

const outputDir = path.resolve("outputs");
mkdirSync(outputDir, { recursive: true });

const raw = execFileSync("curl.exe", ["-s", "-S", "-L", "--http1.1", "--ssl-no-revoke", "-u", `${wpUser}:${wpAppPassword}`, `${baseUrl}/wp-json/wp/v2/${restBase}/${pageId}?context=edit`], {
  encoding: "utf8",
  maxBuffer: 1024 * 1024 * 80,
});

const page = JSON.parse(raw);
const metaKeys = Object.keys(page.meta || {});
const elementorData = page.meta?._elementor_data || page._elementor_data || "";
const contentRaw = page.content?.raw || "";

writeFileSync(path.resolve(outputDir, `${restBase}-${pageId}-${page.slug || "page"}-content.html`), contentRaw, "utf8");
if (elementorData) {
  writeFileSync(path.resolve(outputDir, `${restBase}-${pageId}-${page.slug || "page"}-elementor.json`), typeof elementorData === "string" ? elementorData : JSON.stringify(elementorData, null, 2), "utf8");
}

console.log(JSON.stringify({
  id: page.id,
  slug: page.slug,
  title: page.title?.raw || page.title?.rendered || "",
  status: page.status,
  contentRawLength: contentRaw.length,
  metaKeys,
  elementorDataType: typeof elementorData,
  elementorDataLength: typeof elementorData === "string" ? elementorData.length : JSON.stringify(elementorData || "").length,
}, null, 2));
