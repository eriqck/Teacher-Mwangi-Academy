#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const baseUrl = process.env.WP_URL || "https://homeskitspro.com";
const wpUser = process.env.WP_USER || "admin";
const wpAppPassword = process.env.WP_APP_PASSWORD;
const stamp = process.env.RUN_STAMP || "20260417-about-testimonial-name";
const outputDir = path.resolve("outputs");
const backupDir = path.resolve(outputDir, `hsp-about-testimonial-backups-${stamp}`);

if (!wpAppPassword) {
  console.error("Missing WP_APP_PASSWORD environment variable.");
  process.exit(1);
}

mkdirSync(outputDir, { recursive: true });
mkdirSync(backupDir, { recursive: true });

function request(apiPath, method = "GET", body = null) {
  const args = ["-s", "-S", "-L", "--http1.1", "--ssl-no-revoke", "-u", `${wpUser}:${wpAppPassword}`, "-X", method];
  let bodyPath = null;
  if (body) {
    bodyPath = path.resolve(outputDir, `wp-body-${process.pid}-${Date.now()}.json`);
    writeFileSync(bodyPath, JSON.stringify(body), "utf8");
    args.push("-H", "Content-Type: application/json; charset=utf-8", "--data-binary", `@${bodyPath}`);
  }
  args.push(`${baseUrl}${apiPath}`);
  const raw = execFileSync("curl.exe", args, { encoding: "utf8", maxBuffer: 1024 * 1024 * 50 });
  return raw ? JSON.parse(raw) : null;
}

function replaceDeep(value) {
  if (typeof value === "string") return value.split("Peter Kingsley").join("Peter Odhiambo");
  if (Array.isArray(value)) return value.map(replaceDeep);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, replaceDeep(child)]));
  return value;
}

const page = request("/wp-json/wp/v2/pages/275?context=edit");
writeFileSync(path.resolve(backupDir, `page-275-${page.slug}.json`), `${JSON.stringify(page, null, 2)}\n`, "utf8");

const content = String(page.content?.raw || "").split("Peter Kingsley").join("Peter Odhiambo");
const elementor = replaceDeep(JSON.parse(page.meta?._elementor_data || "[]"));
const updated = request("/wp-json/wp/v2/pages/275", "POST", {
  content,
  meta: {
    ...(page.meta || {}),
    _elementor_data: JSON.stringify(elementor),
  },
});

const outputPath = path.resolve(outputDir, `hsp-about-testimonial-name-${stamp}.json`);
writeFileSync(outputPath, `${JSON.stringify({ backupDir, pageId: updated.id, slug: updated.slug, status: updated.status }, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ outputPath, backupDir, pageId: updated.id, slug: updated.slug, status: updated.status }, null, 2));
