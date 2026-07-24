#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";

const baseUrl = process.env.WC_URL || "https://homeskitspro.com";
const wcKey = process.env.WC_KEY;
const wcSecret = process.env.WC_SECRET;
const wpUser = process.env.WP_USER;
const wpAppPassword = process.env.WP_APP_PASSWORD;
const stamp = process.env.RUN_STAMP || "20260418-replace-imported-product-images-from-sources";
const mode = (process.argv[2] || "preview").toLowerCase();
const outputDir = path.resolve("outputs");

if (!wcKey || !wcSecret) {
  console.error("Missing WC_KEY or WC_SECRET environment variables.");
  process.exit(1);
}

if (mode === "apply" && (!wpUser || !wpAppPassword)) {
  console.error("Apply mode needs WP_USER and WP_APP_PASSWORD environment variables for media upload.");
  process.exit(1);
}

if (!["preview", "apply", "verify"].includes(mode)) {
  console.error("Mode must be one of: preview, apply, verify");
  process.exit(1);
}

mkdirSync(outputDir, { recursive: true });

const replacements = [
  {
    sku: "HSP-WH001",
    productId: 47201,
    sourcePage: "https://www.jumia.co.ke/enerbras-electric-shower-head-instant-hot-water-4-temperature-levels-324599996.html",
    note: "Similar instant electric shower head.",
  },
  {
    sku: "HSP-EXT001",
    productId: 47203,
    sourcePage:
      "https://www.jumia.co.ke/addigoes-power-strip-with-surge-protection-4-power-socket-outlets-4-usb-ports3-usb-1-type-coverload-protection-led-indicator-child-proof-safety-covers-2m-all-in-one-power-extension-cord-for-home-office-use-314486134.html",
    note: "Similar surge-protected extension with USB ports.",
  },
  {
    sku: "HSP-RUG001",
    productId: 47207,
    sourcePage: "https://www.jumia.co.ke/mac-carpet-carpet-160-cm-x-230-cm-carpets-living-room-sabha-modern-home-decor-carpets-315107085.html",
    note: "Similar 160cm x 230cm living-room carpet.",
  },
  {
    sku: "HSP-WBENCH001",
    productId: 47209,
    sourcePage: "https://www.bosch-professional.com/gb/en/products/gta-3800-0601B24000",
    note: "Official Bosch GTA 3800 product page.",
  },
  {
    sku: "HSP-SMIRR001",
    productId: 47211,
    sourcePage:
      "https://gralia.en.made-in-china.com/product/dwlTumzGChWj/China-Factory-Wholesale-Salon-Mirror-Light-Bathroom-Mirror-with-LED-Light.html",
    note: "Similar 60x80cm LED bathroom mirror cabinet.",
  },
  {
    sku: "HSP-SINK001",
    productId: 47213,
    sourcePage: "https://kitchenwarehouse.lk/products/euro-60-x-50-single-bowl-black-sink-with-drainer",
    note: "Similar 60cm x 45cm stainless-steel single-bowl sink.",
  },
  {
    sku: "HSP-TOI001",
    productId: 47215,
    sourcePage: "https://www.jumia.co.ke/tigers-tigers-italian-s-trap-toilet-with-soft-close-seat-313110384.html",
    note: "Similar dual-flush soft-close toilet suite.",
  },
  {
    sku: "HSP-SHOWER001",
    productId: 47217,
    sourcePage: "https://www.jumia.co.ke/generic-high-end-brass-bathroom-system-shower-matt-chrome-wall-mounted-rain-mixer-shower-head-set-326105845.html",
    note: "Similar wall-mounted rain mixer shower set.",
  },
  {
    sku: "HSP-TAPEF001",
    productId: 47219,
    sourcePage: "https://www.jumia.co.ke/lirlee-kitchen-sink-mixer-tap-stylish-durable-325443300.html",
    note: "Similar chrome kitchen mixer tap.",
  },
  {
    sku: "HSP-DRAIN001",
    productId: 47221,
    sourcePage:
      "https://www.jumia.co.ke/generic-ywzx-sus304-stainless-steel-self-sealing-dual-purpose-floor-drain-10x10cm-2mm-thick-odor-insect-proof-for-bathroomkitchenbalcony-326357314.html",
    note: "Similar 10x10cm stainless-steel floor drain.",
  },
  {
    sku: "HSP-PROJ001",
    productId: 47223,
    sourcePage:
      "https://www.jumia.co.ke/generic-hy320-mini-portable-projector-4k-300-ansi-with-wifi-and-bluetooth-native-1080p-smart-projector-with-android11-support-wifi-6-bt5.0-auto-keystone-correction-325702743.html",
    note: "Similar portable 1080p Wi-Fi Bluetooth projector.",
  },
  {
    sku: "HSP-POWERBANK001",
    productId: 47225,
    sourcePage: "https://www.jumia.co.ke/oraimo-traveler-22.5-pd-20000mah-22.5w-power-bank-with-type-c-cables-297773505.html",
    note: "Similar 20000mAh 22.5W PD power bank.",
  },
  {
    sku: "HSP-USBC001",
    productId: 47227,
    sourcePage: "https://www.jumia.co.ke/ugreen-usb-3.1-usb-c-male-to-male-data-cable-60w-100w-power-delivery-pd-gen-1-for-monitor-laptop-smartphone-1.5m-325270799.html",
    note: "Similar 1.5m USB-C to USB-C 100W cable.",
  },
  {
    sku: "HSP-SDCARD001",
    productId: 47229,
    sourcePage:
      "https://www.jumia.co.ke/sandisk-ultra-64gb-128gb-microsd-memory-card-with-sd-adapter-high-speed-a1-class-10-waterproof-shockproof-ideal-for-smartphones-and-tablets-325454849.html",
    note: "Similar 64GB microSD card with SD adapter.",
  },
];

function csvEscape(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function writeCsv(filePath, headers, rows) {
  const lines = [headers.map(csvEscape).join(",")];
  for (const row of rows) lines.push(headers.map((header) => csvEscape(row[header] ?? "")).join(","));
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

function slugify(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function shell(args, options = {}) {
  return execFileSync("curl.exe", args, {
    encoding: options.encoding ?? "utf8",
    maxBuffer: options.maxBuffer ?? 1024 * 1024 * 80,
    stdio: options.stdio,
  });
}

function fetchText(url) {
  return shell(["-L", "-s", "-S", "--http1.1", "--ssl-no-revoke", url]);
}

function extractMetaContent(html, names) {
  for (const name of names) {
    const patterns = [
      new RegExp(`<meta[^>]+property=["']${name}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
      new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${name}["'][^>]*>`, "i"),
      new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
      new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["'][^>]*>`, "i"),
    ];
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match?.[1]) return normalizeText(match[1]);
    }
  }
  return "";
}

function absolutizeUrl(url, pageUrl) {
  if (!url) return "";
  try {
    return new URL(url, pageUrl).href;
  } catch {
    return url;
  }
}

function preferLargerImage(url) {
  if (!url.includes("ke.jumia.is/unsafe/fit-in/")) return url;
  return url.replace(/\/fit-in\/\d+x\d+\//, "/fit-in/900x900/");
}

function imageFromPage(sourcePage) {
  const html = fetchText(sourcePage);
  let imageUrl = extractMetaContent(html, ["og:image:secure_url", "og:image", "twitter:image", "twitter:image:src"]);

  if (!imageUrl) {
    const jsonLdImage = html.match(/"image"\s*:\s*"([^"]+\.(?:jpe?g|png|webp)(?:\?[^"]*)?)"/i)?.[1];
    imageUrl = jsonLdImage || "";
  }

  if (!imageUrl) {
    const firstImage = html.match(/<img[^>]+src=["']([^"']+\.(?:jpe?g|png|webp)(?:\?[^"']*)?)["']/i)?.[1];
    imageUrl = firstImage || "";
  }

  return preferLargerImage(absolutizeUrl(imageUrl, sourcePage));
}

function requestJson(apiPath, method = "GET", body = null, allowedStatusCodes = [200]) {
  const args = ["-s", "-S", "-L", "--http1.1", "--ssl-no-revoke", "-D", "-", "-u", `${wcKey}:${wcSecret}`, "-X", method];
  let tempBodyPath = "";

  if (body !== null) {
    tempBodyPath = path.resolve(outputDir, `curl-body-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
    writeFileSync(tempBodyPath, JSON.stringify(body), "utf8");
    args.push("-H", "Content-Type: application/json; charset=utf-8", "--data-binary", `@${tempBodyPath}`);
  }

  args.push(`${baseUrl}${apiPath}`);

  let raw;
  try {
    raw = shell(args);
  } finally {
    if (tempBodyPath) {
      try {
        unlinkSync(tempBodyPath);
      } catch {
        // Ignore cleanup failures.
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

function wpRequestJson(apiPath, method = "GET", body = null, allowedStatusCodes = [200]) {
  const args = ["-s", "-S", "-L", "--http1.1", "--ssl-no-revoke", "-D", "-", "-u", `${wpUser}:${wpAppPassword}`, "-X", method];
  let tempBodyPath = "";

  if (body !== null) {
    tempBodyPath = path.resolve(outputDir, `wp-body-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
    writeFileSync(tempBodyPath, JSON.stringify(body), "utf8");
    args.push("-H", "Content-Type: application/json; charset=utf-8", "--data-binary", `@${tempBodyPath}`);
  }

  args.push(`${baseUrl}${apiPath}`);

  let raw;
  try {
    raw = shell(args);
  } finally {
    if (tempBodyPath) {
      try {
        unlinkSync(tempBodyPath);
      } catch {
        // Ignore cleanup failures.
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
    const error = new Error(`WP request failed: ${statusLine || bodyText}`);
    error.statusCode = statusCode;
    error.bodyText = bodyText;
    throw error;
  }

  return bodyText ? JSON.parse(bodyText) : null;
}

function contentTypeFromHeader(headerText) {
  return normalizeText(headerText.match(/content-type:\s*([^\r\n;]+)/i)?.[1] || "image/jpeg").toLowerCase();
}

function extensionForContentType(contentType) {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  return "jpg";
}

function downloadImage(imageUrl, sku) {
  const probe = shell(["-I", "-L", "-s", "-S", "--http1.1", "--ssl-no-revoke", imageUrl]);
  const contentType = contentTypeFromHeader(probe);
  const extension = extensionForContentType(contentType);
  const filePath = path.resolve(outputDir, `${slugify(sku)}-${Date.now()}.${extension}`);
  execFileSync("curl.exe", ["-L", "-s", "-S", "--fail", "--http1.1", "--ssl-no-revoke", "-o", filePath, imageUrl], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 20,
  });
  return { filePath, contentType, extension };
}

function uploadMedia(filePath, contentType, filename, title, sourcePage) {
  const raw = shell(
    [
      "-s",
      "-S",
      "-L",
      "--http1.1",
      "--ssl-no-revoke",
      "-D",
      "-",
      "-u",
      `${wpUser}:${wpAppPassword}`,
      "-X",
      "POST",
      "-H",
      `Content-Disposition: attachment; filename="${filename}"`,
      "-H",
      `Content-Type: ${contentType}`,
      "-H",
      `X-HSP-Image-Source: ${sourcePage}`,
      "--data-binary",
      `@${filePath}`,
      `${baseUrl}/wp-json/wp/v2/media`,
    ],
    { maxBuffer: 1024 * 1024 * 80 },
  );

  const boundary = raw.lastIndexOf("\r\n\r\n");
  const headerText = raw.slice(0, boundary);
  const bodyText = raw.slice(boundary + 4).trim();
  const statusLine = headerText
    .split(/\r\n/)
    .reverse()
    .find((line) => line.startsWith("HTTP/"));
  const statusCode = Number(statusLine?.match(/HTTP\/\S+\s+(\d{3})/)?.[1] || 0);
  if (![200, 201].includes(statusCode)) throw new Error(`Media upload failed: ${statusLine || bodyText}`);

  const media = JSON.parse(bodyText);
  wpRequestJson(
    `/wp-json/wp/v2/media/${media.id}`,
    "POST",
    {
      title,
      alt_text: title,
      caption: "",
      description: `Product image sourced from ${sourcePage}`,
    },
    [200],
  );
  return media;
}

function productTitle(productId) {
  const product = requestJson(`/wp-json/wc/v3/products/${productId}`);
  return normalizeText(product.name);
}

const planRows = [];
const applyRows = [];
const verifyRows = [];

for (const replacement of replacements) {
  if (mode === "verify") {
    try {
      const product = requestJson(`/wp-json/wc/v3/products/${replacement.productId}`);
      const image = product.images?.[0] || {};
      verifyRows.push({
        sku: replacement.sku,
        product_id: replacement.productId,
        product_name: product.name,
        image_id: image.id || "",
        image_src: image.src || "",
        alt: image.alt || "",
        status: "checked",
      });
    } catch (error) {
      verifyRows.push({
        sku: replacement.sku,
        product_id: replacement.productId,
        product_name: "",
        image_id: "",
        image_src: "",
        alt: "",
        status: `failed: ${error.message}`,
      });
    }
    continue;
  }

  let imageUrl = "";
  let status = "ready";
  let message = "";

  try {
    imageUrl = imageFromPage(replacement.sourcePage);
    if (!imageUrl) throw new Error("Could not extract a source image URL.");
  } catch (error) {
    status = "failed";
    message = error.message;
  }

  planRows.push({
    sku: replacement.sku,
    product_id: replacement.productId,
    source_page: replacement.sourcePage,
    source_image: imageUrl,
    status,
    message,
    note: replacement.note,
  });

  if (mode !== "apply") continue;

  let tempFile = "";
  try {
    if (!imageUrl) throw new Error("Missing image URL.");
    const productName = productTitle(replacement.productId);
    const downloaded = downloadImage(imageUrl, replacement.sku);
    tempFile = downloaded.filePath;
    const filename = `${slugify(replacement.sku)}-${slugify(productName)}.${downloaded.extension}`;
    const media = uploadMedia(downloaded.filePath, downloaded.contentType, filename, productName, replacement.sourcePage);
    const updated = requestJson(`/wp-json/wc/v3/products/${replacement.productId}`, "PUT", {
      images: [
        {
          id: media.id,
          alt: productName,
          name: productName,
        },
      ],
      meta_data: [
        { key: "hsp_image_replacement_source", value: replacement.sourcePage },
        { key: "hsp_image_replacement_date", value: stamp },
        { key: "hsp_image_replacement_note", value: replacement.note },
      ],
    });

    applyRows.push({
      sku: replacement.sku,
      product_id: replacement.productId,
      product_name: updated.name,
      media_id: media.id,
      image_src: updated.images?.[0]?.src || media.source_url || "",
      source_page: replacement.sourcePage,
      source_image: imageUrl,
      status: "updated",
      message: "",
    });
  } catch (error) {
    applyRows.push({
      sku: replacement.sku,
      product_id: replacement.productId,
      product_name: "",
      media_id: "",
      image_src: "",
      source_page: replacement.sourcePage,
      source_image: imageUrl,
      status: "failed",
      message: error.message,
    });
  } finally {
    if (tempFile) {
      try {
        unlinkSync(tempFile);
      } catch {
        // Ignore cleanup failures.
      }
    }
  }
}

let planPath = "";
if (mode !== "verify") {
  planPath = path.resolve(outputDir, `hsp-source-image-replacement-plan-${stamp}.csv`);
  writeCsv(planPath, ["sku", "product_id", "source_page", "source_image", "status", "message", "note"], planRows);
}

let applyPath = "";
if (mode === "apply") {
  applyPath = path.resolve(outputDir, `hsp-source-image-replacement-results-${stamp}.csv`);
  writeCsv(
    applyPath,
    ["sku", "product_id", "product_name", "media_id", "image_src", "source_page", "source_image", "status", "message"],
    applyRows,
  );
}

let verifyPath = "";
if (mode === "verify") {
  verifyPath = path.resolve(outputDir, `hsp-source-image-replacement-verify-${stamp}.csv`);
  writeCsv(verifyPath, ["sku", "product_id", "product_name", "image_id", "image_src", "alt", "status"], verifyRows);
}

console.log(
  JSON.stringify(
    {
      mode,
      products: replacements.length,
      ready: planRows.filter((row) => row.status === "ready").length,
      planFailed: planRows.filter((row) => row.status === "failed").length,
      updated: applyRows.filter((row) => row.status === "updated").length,
      applyFailed: applyRows.filter((row) => row.status === "failed").length,
      verified: verifyRows.filter((row) => row.status === "checked").length,
      verifyFailed: verifyRows.filter((row) => row.status !== "checked").length,
      planPath,
      applyPath,
      verifyPath,
    },
    null,
    2,
  ),
);
