#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const baseUrl = process.env.WP_URL || "https://homeskitspro.com";
const wpUser = process.env.WP_USER || "admin";
const wpAppPassword = process.env.WP_APP_PASSWORD;
const stamp = process.env.RUN_STAMP || "20260417-content-fix";
const outputDir = path.resolve("outputs");
const backupDir = path.resolve(outputDir, `hsp-content-backups-${stamp}`);

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

function fetchPost(restBase, id) {
  return curlJson([`${baseUrl}/wp-json/wp/v2/${restBase}/${id}?context=edit`]);
}

function updatePost(restBase, id, payload) {
  return curlJson([`${baseUrl}/wp-json/wp/v2/${restBase}/${id}`], "POST", payload);
}

function deepMap(value, mapper) {
  const mapped = mapper(value);
  if (mapped !== value) return mapped;
  if (Array.isArray(value)) return value.map((item) => deepMap(item, mapper));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, deepMap(child, mapper)]));
  }
  return value;
}

function replaceAll(value, replacements) {
  let output = String(value ?? "");
  for (const [from, to] of replacements) {
    output = output.split(from).join(to);
  }
  return output;
}

function elementorData(post) {
  const raw = post.meta?._elementor_data || "[]";
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function patchElementor(post, replacements, transform = (data) => data) {
  const data = transform(deepMap(elementorData(post), (value) => (typeof value === "string" ? replaceAll(value, replacements) : value)));
  return JSON.stringify(data);
}

function backupPost(restBase, post) {
  writeFileSync(path.resolve(backupDir, `${restBase}-${post.id}-${post.slug || "post"}.json`), `${JSON.stringify(post, null, 2)}\n`, "utf8");
}

function stripHomePlaceholderSection(data) {
  return data.filter((section) => section?.id !== "b0414e1");
}

function removeElementorIds(ids) {
  const blocked = new Set(ids);
  const walk = (items) => (Array.isArray(items)
    ? items
        .filter((item) => !blocked.has(item?.id))
        .map((item) => ({ ...item, elements: walk(item.elements || []) }))
    : items);
  return walk;
}

function withFooterUiOverride(data) {
  const cleaned = removeElementorIds(["ebdbe5e", "4222fda", "hsp-search-requests-override"])(data);
  const script = `<script>
document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.wd-search-requests').forEach(function (box) {
    box.innerHTML = '<span class="wd-search-requests-text title">Popular requests: </span><ul><li><a href="https://homeskitspro.com/?s=water+pumps&post_type=product">water pumps</a></li><li><a href="https://homeskitspro.com/?s=water+filters&post_type=product">water filters</a></li><li><a href="https://homeskitspro.com/?s=tools&post_type=product">tools</a></li><li><a href="https://homeskitspro.com/?s=home+appliances&post_type=product">home appliances</a></li><li><a href="https://homeskitspro.com/?s=electronics&post_type=product">electronics</a></li></ul>';
  });
  document.querySelectorAll('.wd-promo-popup').forEach(function (popup) {
    popup.remove();
  });
});
</script>`;
  cleaned.push({
    id: "hsp-search-requests-override",
    elType: "container",
    settings: {},
    elements: [
      {
        id: "hsp-search-requests-override-html",
        elType: "widget",
        settings: { html: script, content: script, text: script },
        elements: [],
        widgetType: "html",
      },
    ],
    isInner: false,
  });
  return cleaned;
}

const homeReplacements = [
  ["Projects & Ideas", "Buying Guides"],
  ["Similar Products", "Recommended Products"],
  ["Here's what we can do", "How HomesKitsPro Helps"],
  ["With us you will build a house from scratch, perform the necessary finishing work and fully complete.", "HomesKitsPro helps you choose reliable appliances, water and plumbing supplies, electronics, tools, and home essentials for everyday Kenyan homes and businesses."],
  ["Must-have Products and more", "Shop Core Categories"],
  ["Everything you need for repairs in one place", "Browse active HomesKitsPro categories in one place"],
  ["Hand instruments", "Water Pumps"],
  ["Lighting", "Home Appliances"],
  ["Flooring", "Electronics"],
  ["Plumbing pipe", "Plumbing & Fittings"],
  ["Accessories", "Tools & Hardware"],
  ["Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.", "Browse practical buying tips and product recommendations for Kenyan homes, offices, and small businesses."],
  ["Title, click to edit.", "HomesKitsPro buying tip"],
  ["Button", "View products"],
];

const aboutReplacements = [
  ["HomesKitsPro is Kenya's trusted online home store, built to give every household access to quality appliances, electronics, bathroom fittings, tools, flooring, and smart home products — all in one place, at fair prices. We believe that equipping and upgrading your home should be simple, affordable, and stress-free. Whether you are setting up a new home, renovating a bathroom, or replacing a kitchen appliance, we stock what you need and deliver it to your door.", "HomesKitsPro is a Kenya-focused online store for practical home and business essentials. We help customers find reliable water and plumbing products, tools and hardware, home appliances, electronics, energy solutions, security items, and everyday accessories at fair prices. Whether you are setting up a new home, replacing an appliance, upgrading water supply, or buying tools for a job, we make it easier to compare useful products and order with confidence."],
  ["We also supply small businesses and offices equipping their workspaces, contractors and DIY enthusiasts sourcing tools and building materials, and gift buyers looking for practical, high-quality presents from our home and electronics range.", "We also serve small businesses and offices equipping their workspaces, contractors and DIY buyers sourcing reliable tools and fittings, and gift buyers looking for practical, high-quality products from our home and electronics range."],
  ["HomesKitsPro stocks products across ten categories: Home Appliances, Kitchen Appliances, TVs and Entertainment, Audio and Speakers, Security Cameras, Electrical and Power Accessories, Bathroom and Plumbing, Flooring, Tools and Hardware, and Lighting. Our catalogue includes trusted brands such as Philips, TCL, Hisense, Skyworth, Sonar, Premier, and Ailyons, giving customers the choice of branded reliability and competitive alternatives side by side. Every product on the site is in stock and ready to ship. We handle delivery across Kenya, and our team is available seven days a week to help with any questions before or after your purchase.", "HomesKitsPro is organized around the categories customers currently shop most: Water & Plumbing, Tools & Hardware, Home Appliances, Electronics, Energy & Power, Security & Smart Home, and practical home accessories. Our catalogue includes water pumps, fittings, filters, appliances, TVs, audio products, power solutions, CCTV items, and useful tools for home and light commercial use. We focus on clear specifications, fair pricing, and helpful product information so customers can choose the right item before ordering."],
];

const servicesReplacements = [
  ["Your Home, Fully Equippedr", "Your Home, Fully Equipped"],
  ["InstallinSecurity & CCTV", "Security & CCTV"],
  ["tel:(245)746334492", "tel:+254746334492"],
  ["Call Now", "Call HomesKitsPro"],
];

const footerReplacements = [
  ["Social Links:", ""],
  ["<p>Social Links:<\\/p>", ""],
  ["https:\\/\\/homeskitspro.com\\/refund_returns\\/", "https:\\/\\/homeskitspro.com\\/returns-and-refunds\\/"],
  ["https://homeskitspro.com/refund_returns/", "https://homeskitspro.com/returns-and-refunds/"],
  ["Return and Refunds", "Returns & Refunds"],
];

const headerStoreReplacements = [
  ["tel:(406) 555-0120", "tel:+254746334492"],
  ["(254) 746-334-492", "+254 746 334 492"],
  ["Mon. – SAT:", "Mon. - Sat:"],
];

const popupContactReplacements = [
  ["50 East 52nd Street<br />Brooklyn, NY 10022<br />United States", "CBD Nairobi<br />Kenya"],
  ["50 East 52nd Street<br \\/>Brooklyn, NY 10022<br \\/>United States", "CBD Nairobi<br \\/>Kenya"],
  ["+1322224332<br />+4643758533", "+254 746 334 492"],
  ["+1322224332<br \\/>+4643758533", "+254 746 334 492"],
  ["info@google.com<br />support@google.com", "support@homeskitspro.com"],
  ["info@google.com<br \\/>support@google.com", "support@homeskitspro.com"],
  ["Do you have questions about how we can help your company? Send us an email and we’ll get in touch shortly.", "Questions about an order or product? Contact HomesKitsPro and we will help you choose the right item or track your order."],
  ["Do you have questions about how we can help your company? Send us an email and we\\u2019ll get in touch shortly.", "Questions about an order or product? Contact HomesKitsPro and we will help you choose the right item or track your order."],
  ["Share: ", ""],
];

const updates = [];

function updateElementorContent({ restBase, id, replacements, transform }) {
  const post = fetchPost(restBase, id);
  backupPost(restBase, post);
  const content = replaceAll(post.content?.raw || "", replacements);
  const meta = {
    ...(post.meta || {}),
    _elementor_data: patchElementor(post, replacements, transform),
  };
  const updated = updatePost(restBase, id, { content, meta });
  updates.push({ restBase, id, slug: updated.slug, status: updated.status, title: updated.title?.raw || updated.title?.rendered || "" });
}

updateElementorContent({ restBase: "pages", id: 15, replacements: homeReplacements, transform: stripHomePlaceholderSection });
updateElementorContent({ restBase: "pages", id: 275, replacements: aboutReplacements });
updateElementorContent({ restBase: "pages", id: 287, replacements: servicesReplacements });
updateElementorContent({ restBase: "cms_block", id: 684, replacements: popupContactReplacements });
updateElementorContent({ restBase: "cms_block", id: 489, replacements: footerReplacements, transform: withFooterUiOverride });
updateElementorContent({ restBase: "cms_block", id: 514, replacements: headerStoreReplacements });

const popup = fetchPost("cms_block", 677);
backupPost("cms_block", popup);
const popupMeta = {
  ...(popup.meta || {}),
  _elementor_data: JSON.stringify([
    {
      id: "hsp-disabled-popup",
      elType: "container",
      settings: {},
      elements: [
        {
          id: "hsp-disabled-popup-text",
          elType: "widget",
          settings: { text: "<p>Popup disabled.</p>" },
          elements: [],
          widgetType: "wd_text_block",
        },
      ],
      isInner: false,
    },
  ]),
};
const disabledPopup = updatePost("cms_block", 677, { status: "draft", content: "<p>Popup disabled.</p>", meta: popupMeta });
updates.push({ restBase: "cms_block", id: 677, slug: disabledPopup.slug, status: disabledPopup.status, title: disabledPopup.title?.raw || disabledPopup.title?.rendered || "" });

const outputPath = path.resolve(outputDir, `hsp-content-fix-results-${stamp}.json`);
writeFileSync(outputPath, `${JSON.stringify({ backupDir, updates }, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ outputPath, backupDir, updates }, null, 2));
