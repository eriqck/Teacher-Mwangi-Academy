#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const baseUrl = process.env.WP_URL || "https://homeskitspro.com";
const wpUser = process.env.WP_USER || "admin";
const wpAppPassword = process.env.WP_APP_PASSWORD;
const stamp = process.env.RUN_STAMP || "20260417-about-contact";
const outputDir = path.resolve("outputs");
const backupDir = path.resolve(outputDir, `hsp-about-contact-backups-${stamp}`);

if (!wpAppPassword) {
  console.error("Missing WP_APP_PASSWORD environment variable.");
  process.exit(1);
}

mkdirSync(outputDir, { recursive: true });
mkdirSync(backupDir, { recursive: true });

function curlJson(args, method = "GET", body = null) {
  const curlArgs = ["-s", "-S", "-L", "--http1.1", "--ssl-no-revoke", "-u", `${wpUser}:${wpAppPassword}`, "-X", method];
  let bodyPath = null;
  if (body) {
    bodyPath = path.resolve(outputDir, `wp-body-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
    writeFileSync(bodyPath, JSON.stringify(body), "utf8");
    curlArgs.push("-H", "Content-Type: application/json; charset=utf-8", "--data-binary", `@${bodyPath}`);
  }
  curlArgs.push(...args);
  const raw = execFileSync("curl.exe", curlArgs, { encoding: "utf8", maxBuffer: 1024 * 1024 * 80 });
  return raw ? JSON.parse(raw) : null;
}

function fetchPage(id) {
  return curlJson([`${baseUrl}/wp-json/wp/v2/pages/${id}?context=edit`]);
}

function updatePage(id, payload) {
  return curlJson([`${baseUrl}/wp-json/wp/v2/pages/${id}`], "POST", payload);
}

function backupPage(page) {
  writeFileSync(path.resolve(backupDir, `page-${page.id}-${page.slug}.json`), `${JSON.stringify(page, null, 2)}\n`, "utf8");
}

function elementorData(page) {
  try {
    return JSON.parse(page.meta?._elementor_data || "[]");
  } catch {
    return [];
  }
}

function walkElements(items, visitor) {
  return items.map((item) => {
    const next = visitor({ ...item, elements: Array.isArray(item.elements) ? walkElements(item.elements, visitor) : [] });
    return next;
  }).filter(Boolean);
}

function removeById(items, ids) {
  const blocked = new Set(ids);
  return walkElements(items, (item) => (blocked.has(item.id) ? null : item));
}

function fixAbout(data) {
  return walkElements(removeById(data, ["3659915", "b1e0ae7"]), (item) => {
    if (item.id === "b9b6a90") {
      item.settings = {
        ...item.settings,
        structure: "10",
        flex_direction: "column",
      };
    }
    if (item.id === "9cbcb1") {
      item.settings = {
        ...item.settings,
        width: { size: 100, unit: "%" },
      };
    }
    if (item.id === "bd2c400") {
      item.settings = {
        ...item.settings,
        width: { unit: "px", size: 780, sizes: [] },
      };
    }
    return item;
  });
}

function mapHtml() {
  return `<div class="hsp-contact-map" style="border-radius:18px;overflow:hidden;border:1px solid #e6e8ef;background:#f6f8fb;">
  <iframe title="HomesKitsPro Nairobi CBD map" src="https://www.openstreetmap.org/export/embed.html?bbox=36.8070%2C-1.2920%2C36.8280%2C-1.2760&layer=mapnik&marker=-1.2833%2C36.8167" style="width:100%;height:500px;border:0;display:block;" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
</div>
<p style="margin-top:10px;"><a href="https://www.openstreetmap.org/?mlat=-1.2833&mlon=36.8167#map=16/-1.2833/36.8167" target="_blank" rel="noopener">Open map directions to Nairobi CBD</a></p>`;
}

function formHtml() {
  return `<div class="hsp-contact-form-card" style="background:#ffffff;border:1px solid #e6e8ef;border-radius:18px;padding:28px;box-shadow:0 12px 32px rgba(18,70,171,0.08);">
  <h3 style="margin-top:0;">Send us a message</h3>
  <p>Need help with an order, product choice, delivery, or returns? Send your details and the HomesKitsPro team will get back to you.</p>
  [contact-form-7 id="14" title="Contact form 1"]
</div>`;
}

function fixContact(data) {
  const mapWidget = {
    id: "hsp-nairobi-map",
    elType: "widget",
    settings: { html: mapHtml(), content: mapHtml(), text: mapHtml() },
    elements: [],
    widgetType: "html",
  };
  const formWidget = {
    id: "hsp-contact-form",
    elType: "widget",
    settings: { shortcode: '[contact-form-7 id="14" title="Contact form 1"]', text: formHtml(), html: formHtml(), content: formHtml() },
    elements: [],
    widgetType: "shortcode",
  };
  const contactInfo = {
    id: "hsp-contact-help",
    elType: "widget",
    settings: {
      text: "<p><strong>Prefer a quick response?</strong><br>Call or WhatsApp: <a href=\"tel:+254746334492\">+254 746 334 492</a><br>Email: <a href=\"mailto:support@homeskitspro.com\">support@homeskitspro.com</a><br>Location: Nairobi CBD, Kenya</p>",
      scroll_y: -80,
    },
    elements: [],
    widgetType: "wd_text_block",
  };

  return walkElements(data, (item) => {
    if (item.id === "2b088e4") {
      item.settings = { ...item.settings, title: "Visit or Contact HomesKitsPro" };
    }
    if (item.id === "2d6540f") return mapWidget;
    if (item.id === "95536c3") {
      item.settings = {
        ...item.settings,
        flex_gap: { size: 30, column: "30", row: "30", unit: "px", isLinked: false },
      };
      item.elements = [
        ...(item.elements || []).filter((child) => child.id !== "63e8018").map((child) => {
          if (child.id === "12f2544") {
            return {
              ...child,
              settings: {
                ...child.settings,
                width: { size: 40, unit: "%" },
                width_tablet: { unit: "%", size: 100, sizes: [] },
                width_mobile: { unit: "%", size: 100, sizes: [] },
              },
              elements: [...(child.elements || []), contactInfo],
            };
          }
          return child;
        }),
        {
          id: "hsp-contact-form-column",
          elType: "container",
          settings: {
            _column_size: 60,
            width: { size: 60, unit: "%" },
            width_tablet: { unit: "%", size: 100, sizes: [] },
            width_mobile: { unit: "%", size: 100, sizes: [] },
            content_width: "full",
            flex_direction: "column",
            scroll_y: -80,
          },
          elements: [formWidget],
          isInner: true,
        },
      ];
    }
    return item;
  });
}

const about = fetchPage(275);
backupPage(about);
const aboutData = fixAbout(elementorData(about));
const aboutContent = String(about.content?.raw || "")
  .replace(/<link[^>]+wd-el-video-css[^>]+>\s*/g, "")
  .replace(/<link[^>]+wd-mfp-popup-css[^>]+>\s*/g, "")
  .replace(/<a href="https:\/\/www\.youtube\.com\/watch\?v=XHOmBV4js_E"><\/a>\s*/g, "");
const updatedAbout = updatePage(275, {
  content: aboutContent,
  meta: { ...(about.meta || {}), _elementor_data: JSON.stringify(aboutData) },
});

const contact = fetchPage(279);
backupPage(contact);
const contactData = fixContact(elementorData(contact));
const contactContent = `<h4>Visit or Contact HomesKitsPro</h4>
${mapHtml()}
<div class="hsp-contact-layout">
  <div>
    <h4>Nairobi CBD</h4>
    <p>Call or WhatsApp: <a href="tel:+254746334492">+254 746 334 492</a><br>Email: <a href="mailto:support@homeskitspro.com">support@homeskitspro.com</a><br>Store Hours: Mon. - Sat: 9:00am - 8:00pm</p>
  </div>
  ${formHtml()}
</div>`;
const updatedContact = updatePage(279, {
  content: contactContent,
  meta: { ...(contact.meta || {}), _elementor_data: JSON.stringify(contactData) },
});

const outputPath = path.resolve(outputDir, `hsp-about-contact-results-${stamp}.json`);
writeFileSync(outputPath, `${JSON.stringify({
  backupDir,
  updates: [
    { id: updatedAbout.id, slug: updatedAbout.slug, status: updatedAbout.status, title: updatedAbout.title?.raw || updatedAbout.title?.rendered || "" },
    { id: updatedContact.id, slug: updatedContact.slug, status: updatedContact.status, title: updatedContact.title?.raw || updatedContact.title?.rendered || "" },
  ],
}, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ outputPath, backupDir }, null, 2));
