#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const baseUrl = process.env.WP_URL || "https://homeskitspro.com";
const wpUser = process.env.WP_USER || "admin";
const wpAppPassword = process.env.WP_APP_PASSWORD;
const stamp = process.env.RUN_STAMP || "20260417-mobile-menu-tabs";
const outputDir = path.resolve("outputs");
const backupDir = path.resolve(outputDir, `hsp-mobile-menu-tabs-backups-${stamp}`);

if (!wpAppPassword) {
  console.error("Missing WP_APP_PASSWORD environment variable.");
  process.exit(1);
}

mkdirSync(outputDir, { recursive: true });
mkdirSync(backupDir, { recursive: true });

function curlJson(args, method = "GET", body = null) {
  const curlArgs = ["-s", "-S", "-L", "--http1.1", "--ssl-no-revoke", "-u", `${wpUser}:${wpAppPassword}`, "-X", method];
  let bodyPath = "";

  if (body) {
    bodyPath = path.resolve(outputDir, `wp-body-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
    writeFileSync(bodyPath, JSON.stringify(body), "utf8");
    curlArgs.push("-H", "Content-Type: application/json; charset=utf-8", "--data-binary", `@${bodyPath}`);
  }

  curlArgs.push(...args);
  const raw = execFileSync("curl.exe", curlArgs, { encoding: "utf8", maxBuffer: 1024 * 1024 * 80 });
  return raw ? JSON.parse(raw) : null;
}

function fetchPost(restBase, id) {
  return curlJson([`${baseUrl}/wp-json/wp/v2/${restBase}/${id}?context=edit`]);
}

function updatePost(restBase, id, payload) {
  return curlJson([`${baseUrl}/wp-json/wp/v2/${restBase}/${id}`], "POST", payload);
}

function elementorData(post) {
  const raw = post.meta?._elementor_data || "[]";
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function removeElementorId(data, id) {
  const walk = (items) => (Array.isArray(items)
    ? items
        .filter((item) => item?.id !== id)
        .map((item) => ({ ...item, elements: walk(item.elements || []) }))
    : items);
  return walk(data);
}

const overrideHtml = `<style id="hsp-mobile-menu-only-css">
.mobile-nav .wd-nav-mob-tab .mobile-categories-title,
.mobile-nav .mobile-categories-menu {
  display: none !important;
}

.mobile-nav .wd-nav-mob-tab .mobile-pages-title {
  display: flex !important;
  flex: 1 1 100% !important;
  max-width: none !important;
  width: 100% !important;
}

.mobile-nav .wd-nav-mob-tab .mobile-pages-title > a {
  justify-content: center !important;
  width: 100% !important;
}

.mobile-nav .mobile-pages-menu {
  display: block !important;
  opacity: 1 !important;
  visibility: visible !important;
  height: auto !important;
  transform: none !important;
}
</style>
<script id="hsp-mobile-menu-only-js">
(function () {
  function forceMenuOnly() {
    document.querySelectorAll('.mobile-nav').forEach(function (nav) {
      var pagesTitle = nav.querySelector('.mobile-pages-title');
      var pagesMenu = nav.querySelector('.mobile-pages-menu');

      nav.querySelectorAll('.mobile-categories-title, .mobile-categories-menu').forEach(function (element) {
        element.classList.remove('wd-active');
        element.setAttribute('aria-hidden', 'true');
        element.hidden = true;
      });

      if (pagesTitle) {
        pagesTitle.classList.add('wd-active');
        pagesTitle.removeAttribute('aria-hidden');
        pagesTitle.hidden = false;
      }

      if (pagesMenu) {
        pagesMenu.classList.add('wd-active');
        pagesMenu.removeAttribute('aria-hidden');
        pagesMenu.hidden = false;
      }
    });
  }

  document.addEventListener('DOMContentLoaded', forceMenuOnly);
  document.addEventListener('click', function (event) {
    if (event.target.closest('.mobile-nav-icon, .wd-header-mobile-nav, .wd-tools-icon, .wd-nav-opener')) {
      setTimeout(forceMenuOnly, 80);
      setTimeout(forceMenuOnly, 250);
    }
  }, true);

  new MutationObserver(forceMenuOnly).observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();
</script>`;

function patchBlockContent(rawContent) {
  const start = "<!-- hsp-mobile-menu-only-start -->";
  const end = "<!-- hsp-mobile-menu-only-end -->";
  const withoutOld = String(rawContent || "").replace(new RegExp(`${start}[\\s\\S]*?${end}`, "g"), "").trim();
  return `${withoutOld}\n${start}\n${overrideHtml}\n${end}`;
}

const footerBlock = fetchPost("cms_block", 489);
writeFileSync(path.resolve(backupDir, `cms_block-489-${footerBlock.slug || "footer"}.json`), `${JSON.stringify(footerBlock, null, 2)}\n`, "utf8");

const data = removeElementorId(elementorData(footerBlock), "hsp-mobile-menu-only-override");
data.push({
  id: "hsp-mobile-menu-only-override",
  elType: "container",
  settings: {},
  elements: [
    {
      id: "hsp-mobile-menu-only-html",
      elType: "widget",
      settings: {
        html: overrideHtml,
        content: overrideHtml,
        text: overrideHtml,
      },
      elements: [],
      widgetType: "html",
    },
  ],
  isInner: false,
});

const updated = updatePost("cms_block", 489, {
  content: patchBlockContent(footerBlock.content?.raw || ""),
  meta: {
    ...(footerBlock.meta || {}),
    _elementor_data: JSON.stringify(data),
  },
});

const outputPath = path.resolve(outputDir, `hsp-mobile-menu-tabs-results-${stamp}.json`);
writeFileSync(outputPath, `${JSON.stringify({
  backupDir,
  outputPath,
  updated: {
    id: updated.id,
    slug: updated.slug,
    status: updated.status,
    title: updated.title?.raw || updated.title?.rendered || "",
  },
}, null, 2)}\n`, "utf8");

console.log(JSON.stringify({ outputPath, backupDir, updated: updated.id }, null, 2));
