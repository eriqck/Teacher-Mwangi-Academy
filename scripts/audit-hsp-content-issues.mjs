#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const baseUrl = process.env.WP_URL || "https://homeskitspro.com";
const wpUser = process.env.WP_USER || "admin";
const wpAppPassword = process.env.WP_APP_PASSWORD;
const wcKey = process.env.WC_KEY;
const wcSecret = process.env.WC_SECRET;
const stamp = process.env.RUN_STAMP || "20260417-content-audit";
const outputDir = path.resolve("outputs");
const outputPath = path.resolve(outputDir, `hsp-content-audit-${stamp}.json`);

if (!wpAppPassword) {
  console.error("Missing WP_APP_PASSWORD environment variable.");
  process.exit(1);
}

mkdirSync(outputDir, { recursive: true });

function curlJson(args, auth = `${wpUser}:${wpAppPassword}`) {
  const raw = execFileSync("curl.exe", ["-s", "-S", "-L", "--http1.1", "--ssl-no-revoke", "-u", auth, ...args], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 50,
  });
  return raw ? JSON.parse(raw) : null;
}

function publicStatus(url) {
  const raw = execFileSync("curl.exe", ["-s", "-S", "-L", "--http1.1", "--ssl-no-revoke", "-o", "NUL", "-w", "%{http_code} %{url_effective}", url], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
  });
  const [status, ...rest] = raw.trim().split(/\s+/);
  return { status: Number(status), effectiveUrl: rest.join(" ") };
}

function stripHtml(value) {
  return String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function flagsForText(text) {
  const lower = text.toLowerCase();
  return {
    lorem: lower.includes("lorem ipsum"),
    fakeUsPhone: /\+?1[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/.test(text),
    utcHours: /utc\+?2/i.test(text),
    emailAdressTypo: /email adress/i.test(text),
    tileWoodLaminate: /(tile|wood|laminate|installation|materials)/i.test(text),
    roseYost: /rose yost/i.test(text),
    eastGenefort: /east genefort/i.test(text),
  };
}

async function main() {
  const pageSlugs = ["track-order", "services", "privacy-policy", "returns-and-refunds", "contact-us", "about-us"];
  const postSlugs = ["minimalist-japanese-inspired-furniture", "new-home-decor-from-john-doerson"];
  const categorySlugs = ["headphones-earbuds", "fittings-supply-lines-water-plumbing", "drippers", "cctv-smart-cameras"];

  const settings = curlJson([`${baseUrl}/wp-json/wp/v2/settings`]);
  const frontPageId = Number(settings?.page_on_front || 0);
  const frontPage = frontPageId
    ? curlJson([`${baseUrl}/wp-json/wp/v2/pages/${frontPageId}?context=edit`])
    : null;

  const pages = {};
  for (const slug of pageSlugs) {
    const matches = curlJson([`${baseUrl}/wp-json/wp/v2/pages?slug=${encodeURIComponent(slug)}&context=edit`]);
    const page = Array.isArray(matches) ? matches[0] || null : null;
    const text = stripHtml(page?.content?.raw || page?.content?.rendered || "");
    pages[slug] = {
      id: page?.id || null,
      status: page?.status || null,
      title: page?.title?.raw || page?.title?.rendered || "",
      public: publicStatus(`${baseUrl}/${slug}/`),
      flags: flagsForText(text),
      excerpt: text.slice(0, 1000),
    };
  }

  const posts = {};
  for (const slug of postSlugs) {
    const matches = curlJson([`${baseUrl}/wp-json/wp/v2/posts?slug=${encodeURIComponent(slug)}&context=edit`]);
    const post = Array.isArray(matches) ? matches[0] || null : null;
    posts[slug] = {
      id: post?.id || null,
      status: post?.status || null,
      title: post?.title?.raw || post?.title?.rendered || "",
      public: publicStatus(`${baseUrl}/${slug}/`),
    };
  }

  const wooAuth = wcKey && wcSecret ? `${wcKey}:${wcSecret}` : "";
  const categories = {};
  if (wooAuth) {
    for (const slug of categorySlugs) {
      const matches = curlJson([`${baseUrl}/wp-json/wc/v3/products/categories?slug=${encodeURIComponent(slug)}`], wooAuth);
      const category = Array.isArray(matches) ? matches[0] || null : null;
      categories[slug] = {
        id: category?.id || null,
        name: category?.name || "",
        slug: category?.slug || "",
        count: category?.count ?? null,
        image: category?.image?.src || "",
        public: publicStatus(`${baseUrl}/product-category/${slug}/`),
      };
    }
  }

  const frontText = stripHtml(frontPage?.content?.raw || frontPage?.content?.rendered || "");
  const report = {
    generatedAt: new Date().toISOString(),
    settings: {
      show_on_front: settings?.show_on_front,
      page_on_front: frontPageId,
      front_page_title: frontPage?.title?.raw || frontPage?.title?.rendered || "",
    },
    frontPage: frontPage
      ? {
          id: frontPage.id,
          status: frontPage.status,
          flags: flagsForText(frontText),
          excerpt: frontText.slice(0, 2000),
        }
      : null,
    pages,
    posts,
    categories,
  };

  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ outputPath, pages: Object.keys(pages).length, posts: Object.keys(posts).length, categories: Object.keys(categories).length }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
