// Buat ulang gambar PNG logo dari bentuk SVG di src/components/logo.tsx:
//   npm run brand:assets
// Menghasilkan public/apple-touch-icon.png (180), public/icon-192.png,
// public/icon-512.png (ikon layar utama HP & manifest), dan
// public/og-image.png (1200×630, pratinjau saat link booking dibagikan).
// Memakai Chromium milik Playwright (npx playwright install chromium).
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";
import { root } from "./lib.mjs";

const source = readFileSync(resolve(root, "src/components/logo.tsx"), "utf8");
const pick = (name) => new RegExp(`${name} =\\s*"([^"]+)"`).exec(source)[1];
const TOOTH = pick("TOOTH_PATH");
const CHECK = pick("CHECK_PATH");
const SPARK = pick("SPARKLE_PATH");

const DEEP = "#0d3f37";
const PRIMARY = "#0f6b5c";
const SOFT = "#e1efeb";

// Ikon aplikasi: latar penuh (sistem operasi membulatkan sudutnya sendiri),
// gigi diperkecil sedikit agar aman untuk ikon "maskable".
function appIcon(scale) {
  const offset = (48 - 48 * scale) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="100%" height="100%">
    <rect width="48" height="48" fill="${DEEP}"/>
    <g transform="translate(${offset} ${offset}) scale(${scale})">
      <path d="${TOOTH}" fill="#fff"/>
      <path d="${CHECK}" fill="none" stroke="${PRIMARY}" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="${SPARK}" fill="${SOFT}"/>
    </g></svg>`;
}

const mark = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="168" height="168">
  <rect width="48" height="48" rx="13" fill="rgba(255,255,255,0.14)"/>
  <path d="${TOOTH}" fill="#fff"/>
  <path d="${CHECK}" fill="none" stroke="${PRIMARY}" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="${SPARK}" fill="${SOFT}"/></svg>`;

const ogHtml = `<!doctype html><html><head>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;700&display=swap" rel="stylesheet">
<style>
  body { margin:0; width:1200px; height:630px; background:${DEEP}; color:#fff;
    font-family:'Plus Jakarta Sans', Arial, sans-serif; display:flex; align-items:center; }
  .wrap { display:flex; align-items:center; gap:56px; padding:0 96px; }
  h1 { margin:0; font-size:84px; letter-spacing:-2px; line-height:1; }
  p { margin:22px 0 0; font-size:34px; line-height:1.35; color:#b9d4cc; max-width:760px; }
  .tag { margin-top:34px; display:inline-block; padding:12px 22px; border-radius:999px;
    background:rgba(255,255,255,0.12); font-size:26px; font-weight:500; }
</style></head><body><div class="wrap">${mark}<div>
  <h1>Klinik Gigi</h1>
  <p>Booking janji temu dari HP: pilih layanan, dokter, dan jam yang masih kosong.</p>
  <span class="tag">Tanpa daftar akun · Tanpa antre chat</span>
</div></div></body></html>`;

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  for (const [file, size, scale] of [
    ["apple-touch-icon.png", 180, 0.78],
    ["icon-192.png", 192, 0.72],
    ["icon-512.png", 512, 0.72],
  ]) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(
      `<body style="margin:0;width:${size}px;height:${size}px">${appIcon(scale)}</body>`,
    );
    await page.screenshot({ path: resolve(root, "public", file) });
  }
  await page.setViewportSize({ width: 1200, height: 630 });
  await page.setContent(ogHtml, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: resolve(root, "public/og-image.png") });
  console.log("Gambar logo dibuat di public/.");
} finally {
  await browser.close();
}
