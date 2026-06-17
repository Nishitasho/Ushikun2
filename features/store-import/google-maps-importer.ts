import { chromium, type Browser, type Page } from "playwright";
import type { ImportedStoreDraft } from "./types";

const DEFAULT_CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const ALLOWED_HOSTS = [
  "google.com",
  "www.google.com",
  "maps.google.com",
  "maps.app.goo.gl",
  "goo.gl"
];

function assertGoogleMapsUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Google MapsまたはGBPのURLを入力してください。");
  }
  const allowed = ALLOWED_HOSTS.some(
    (host) => url.hostname === host || url.hostname.endsWith(`.${host}`)
  );
  if (!allowed) {
    throw new Error("Google MapsまたはGBPのURLのみ読み取りできます。");
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("URL形式が正しくありません。");
  }
  return url.toString();
}

function normalizeText(value?: string | null) {
  return (value || "").replace(/\s+/g, " ").trim();
}

function parseRating(text: string) {
  const match =
    text.match(/(?:^|\s)([1-5]\.\d)(?:\s|$|\()/) ||
    text.match(/([1-5](?:\.\d)?)\s*(?:つ星|stars?)/i);
  return match ? Number(match[1]) : undefined;
}

function parseReviewCount(text: string) {
  const match =
    text.match(/[1-5]\.\d\s*\(([0-9][0-9,]*)\)/) ||
    text.match(/([0-9][0-9,]*)\s*(?:件のクチコミ|件の口コミ|クチコミ|口コミ|reviews?)/i);
  return match ? Number(match[1].replaceAll(",", "")) : undefined;
}

function areaFromAddress(address: string) {
  const cleaned = address
    .replace(/^〒?\s*\d{3}-?\d{4}\s*/, "")
    .replace(/[0-9０-９].*$/, "")
    .trim();
  const match = cleaned.match(/(?:東京都|北海道|(?:京都|大阪)府|.{2,3}県)?(.+?[市区町村])(.+)?/);
  const city = match?.[1]?.trim() || "";
  const district = match?.[2]?.trim() || "";
  return [city, district].filter(Boolean).join(" ") || cleaned;
}

function buildKeywords(input: {
  name?: string;
  industry?: string;
  address?: string;
}) {
  const area = input.address ? areaFromAddress(input.address) : "";
  const candidates = [
    area && input.industry ? `${area} ${input.industry}` : "",
    area && input.name ? `${area} ${input.name}` : "",
    input.industry ? `${input.industry} おすすめ` : "",
    area ? `${area} 口コミ` : "",
    area ? `${area} 予約` : ""
  ];
  return Array.from(new Set(candidates.filter(Boolean))).slice(0, 8);
}

function queryFromMapsUrl(value: string) {
  const url = new URL(value);
  const queryParam = url.searchParams.get("q") || url.searchParams.get("query");
  if (queryParam) return queryParam;
  const placeMatch = decodeURIComponent(url.pathname).match(/\/place\/([^/]+)/);
  return placeMatch?.[1]?.replaceAll("+", " ").trim() || "";
}

async function clickConsentIfShown(page: Page) {
  const buttons = [
    'button:has-text("同意")',
    'button:has-text("すべて同意")',
    'button:has-text("Accept all")',
    'button:has-text("I agree")'
  ];
  for (const selector of buttons) {
    const button = page.locator(selector);
    if ((await button.count()) === 1 && (await button.isVisible().catch(() => false))) {
      await button.click({ timeout: 1500 }).catch(() => undefined);
      await page.waitForTimeout(800);
      return;
    }
  }
}

async function firstAriaLabel(page: Page, patterns: string[]) {
  return page.evaluate((items) => {
    const elements = Array.from(document.querySelectorAll("[aria-label]"));
    for (const pattern of items) {
      const match = elements
        .map((element) => element.getAttribute("aria-label") || "")
        .find((label) => label.includes(pattern));
      if (match) return match.replace(/\s+/g, " ").trim();
    }
    return "";
  }, patterns);
}

async function headingText(page: Page) {
  const heading = await page.evaluate(() => {
    const h1 = document.querySelector("h1")?.textContent;
    const ariaHeading = document.querySelector('[role="main"] [aria-level="1"]')?.textContent;
    return (h1 || ariaHeading || "").replace(/\s+/g, " ").trim();
  });
  return heading || normalizeText((await page.title()).replace(/- Google.*$/i, ""));
}

async function openFirstPlaceIfNeeded(page: Page) {
  const heading = await headingText(page);
  const address = await firstAriaLabel(page, ["住所", "Address"]);
  if (heading && address) return;

  const placeLinks = page.locator('a[href*="/maps/place/"]');
  if ((await placeLinks.count()) > 0) {
    await placeLinks.first().click({ timeout: 2500 }).catch(() => undefined);
    await page.waitForTimeout(2200);
  }
}

function cleanLabeledValue(value: string, labels: string[]) {
  let cleaned = normalizeText(value);
  labels.forEach((label) => {
    cleaned = cleaned.replace(new RegExp(`^${label}\\s*:?\\s*`), "");
  });
  return cleaned.trim();
}

export async function importGoogleMapsStore(urlValue: string): Promise<ImportedStoreDraft> {
  const sourceUrl = assertGoogleMapsUrl(urlValue);
  let browser: Browser | undefined;
  try {
    browser = await chromium.launch({
      headless: process.env.RANK_BROWSER_HEADLESS !== "false",
      executablePath: process.env.RANK_BROWSER_EXECUTABLE_PATH || DEFAULT_CHROME_PATH
    });
    const page = await browser.newPage({
      locale: "ja-JP",
      viewport: { width: 1440, height: 1100 }
    });
    await page.goto(sourceUrl, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await clickConsentIfShown(page);
    await page.waitForTimeout(2500);
    await openFirstPlaceIfNeeded(page);

    if (!(await firstAriaLabel(page, ["住所", "Address"]))) {
      const query = queryFromMapsUrl(sourceUrl);
      if (query) {
        await page.goto(`https://www.google.com/maps/search/${encodeURIComponent(query)}?hl=ja`, {
          waitUntil: "domcontentloaded",
          timeout: 45_000
        });
        await page.waitForTimeout(2200);
        await openFirstPlaceIfNeeded(page);
      }
    }

    const finalUrl = page.url();
    const bodyText = await page.locator("body").innerText().catch(() => "");
    if (/unusual traffic|captcha|ロボットではありません/i.test(bodyText)) {
      throw new Error("Google側で追加確認が必要なため読み取りを停止しました。");
    }

    const name = await headingText(page);
    const address = cleanLabeledValue(
      await firstAriaLabel(page, ["住所", "Address"]),
      ["住所", "Address"]
    );
    const phoneNumber = cleanLabeledValue(
      await firstAriaLabel(page, ["電話番号", "Phone"]),
      ["電話番号", "Phone"]
    );
    const hours = cleanLabeledValue(
      await firstAriaLabel(page, ["営業時間", "Hours"]),
      ["営業時間", "Hours"]
    );
    const category =
      normalizeText(
        await page.locator('button[jsaction*="category"], button[aria-label*="カテゴリ"]').first().innerText({ timeout: 1200 }).catch(() => "")
      ) ||
      normalizeText(
        await page.locator('button:has-text("レストラン"), button:has-text("美容"), button:has-text("クリニック")').first().innerText({ timeout: 1200 }).catch(() => "")
      );

    const rating = parseRating(bodyText);
    const reviewCount = parseReviewCount(bodyText);
    const industry = category || "";
    const services = industry ? `${industry}としてGoogle Mapsに掲載されています。` : "";
    const strengths = [
      rating ? `Google Maps評価 ${rating.toFixed(1)}` : "",
      reviewCount !== undefined ? `口コミ ${reviewCount}件` : ""
    ].filter(Boolean).join(" / ");

    if (!name && !address) {
      throw new Error("店舗名や住所を読み取れませんでした。Google Mapsの店舗詳細URLを貼ってください。");
    }

    return {
      name,
      industry,
      address,
      phoneNumber,
      businessHours: hours,
      services,
      strengths,
      keywords: buildKeywords({ name, industry, address }),
      gbpUrl: finalUrl,
      rating,
      reviewCount,
      sourceUrl
    };
  } finally {
    await browser?.close();
  }
}
