import { chromium, type Browser } from "playwright";
import {
  detectRankFromScreenshot,
  detectStoreMetricsFromScreenshot
} from "../gemini-vision";
import { findBestStoreMatch } from "../matching";
import type { RankLookupInput, RankTrackingProvider } from "../types";

const DEFAULT_CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

function parseMetricText(text: string) {
  const normalized = text.replaceAll("，", ",").replaceAll("．", ".");
  const ratingMatch =
    normalized.match(/(?:^|\s)([1-5]\.\d)(?:\s|$|\()/) ||
    normalized.match(/([1-5](?:\.\d)?)\s*(?:つ星|stars?)/i);
  const reviewMatch =
    normalized.match(/[1-5]\.\d\s*\(([0-9][0-9,]*)\)/) ||
    normalized.match(
      /([0-9][0-9,]*)\s*(?:件のクチコミ|件の口コミ|クチコミ|口コミ|reviews?)/i
    );
  return {
    rating: ratingMatch ? Number(ratingMatch[1]) : undefined,
    reviewCount: reviewMatch
      ? Number(reviewMatch[1].replaceAll(",", ""))
      : undefined
  };
}

async function extractResultNames(page: import("playwright").Page, maxResults: number) {
  const feed = page.locator('[role="feed"]');
  if (await feed.count()) {
    let previousCount = 0;
    for (let i = 0; i < 8; i += 1) {
      const links = feed.locator('a[href*="/maps/place/"]');
      const count = await links.count();
      if (count >= maxResults || (count === previousCount && i >= 2)) break;
      previousCount = count;
      await feed.evaluate((element) => element.scrollBy(0, element.scrollHeight));
      await page.waitForTimeout(650);
    }
  }

  const names = await page.locator('a[href*="/maps/place/"]').evaluateAll((links) =>
    links.map((link) => link.getAttribute("aria-label") || link.textContent || "")
  );
  return Array.from(new Set(names.map((name) => name.trim()).filter(Boolean))).slice(0, maxResults);
}

export class PlaywrightRankProvider implements RankTrackingProvider {
  readonly name = "playwright" as const;
  private browser?: Browser;

  private async getBrowser() {
    if (!this.browser) {
      const executablePath = process.env.RANK_BROWSER_EXECUTABLE_PATH || undefined;
      this.browser = await chromium.launch({
        headless: process.env.RANK_BROWSER_HEADLESS !== "false",
        ...(executablePath ? { executablePath } : {})
      });
    }
    return this.browser;
  }

  async close() {
    await this.browser?.close();
    this.browser = undefined;
  }

  async lookupStoreMetrics(store: RankLookupInput["store"]) {
    let page: import("playwright").Page | undefined;
    try {
      const browser = await this.getBrowser();
      page = await browser.newPage({
        locale: "ja-JP",
        viewport: { width: 1440, height: 1100 }
      });
      const query = `${store.name} ${store.address}`.trim();
      await page.goto(`https://www.google.com/maps/search/${encodeURIComponent(query)}?hl=ja`, {
        waitUntil: "domcontentloaded",
        timeout: 45_000
      });
      await page.waitForTimeout(1800);

      const bodyText = await page.locator("body").innerText().catch(() => "");
      if (/unusual traffic|captcha|ロボットではありません/i.test(bodyText)) {
        throw new Error("Google Maps側で追加確認が必要なため取得を停止しました。");
      }

      const ariaTexts = await page
        .locator('[aria-label*="クチコミ"], [aria-label*="口コミ"], [aria-label*="つ星"], [aria-label*="reviews"], [aria-label*="stars"]')
        .evaluateAll((elements) =>
          elements.map((element) => element.getAttribute("aria-label") || "")
        );
      const detailTexts = await page
        .locator("div.F7nice")
        .evaluateAll((elements) => elements.map((element) => element.textContent || ""))
        .catch(() => [] as string[]);
      const parsed = [...ariaTexts, ...detailTexts, bodyText]
        .map(parseMetricText)
        .reduce(
          (current, item) => ({
            rating: current.rating ?? item.rating,
            reviewCount: current.reviewCount ?? item.reviewCount
          }),
          {} as { rating?: number; reviewCount?: number }
        );

      let source: "google_maps_dom" | "gemini_vision" = "google_maps_dom";
      if (parsed.rating === undefined || parsed.reviewCount === undefined) {
        const vision = await page
          .screenshot({ type: "png", fullPage: false })
          .then((image) => detectStoreMetricsFromScreenshot({ image, storeName: store.name }))
          .catch(() => null);
        if (vision && vision.confidence >= 0.6) {
          parsed.rating ??= vision.rating ?? undefined;
          parsed.reviewCount ??= vision.reviewCount ?? undefined;
          source = "gemini_vision";
        }
      }

      if (parsed.rating === undefined && parsed.reviewCount === undefined) {
        throw new Error("店舗の評価・口コミ件数を画面から確認できませんでした。");
      }
      return {
        ...parsed,
        status: "succeeded" as const,
        source
      };
    } catch (error) {
      return {
        status: "failed" as const,
        source: "none" as const,
        error: error instanceof Error ? error.message : "口コミ指標の取得に失敗しました。"
      };
    } finally {
      await page?.close();
    }
  }

  async lookup({ store, keyword, maxResults = 20 }: RankLookupInput) {
    let page: import("playwright").Page | undefined;
    try {
      const browser = await this.getBrowser();
      page = await browser.newPage({
        locale: "ja-JP",
        viewport: { width: 1440, height: 1100 }
      });
      const area = store.address.replace(/[0-9０-９].*$/, "").trim();
      const query = [keyword, area].filter(Boolean).join(" ");
      await page.goto(`https://www.google.com/maps/search/${encodeURIComponent(query)}?hl=ja`, {
        waitUntil: "domcontentloaded",
        timeout: 45_000
      });
      await page.waitForTimeout(1800);

      const bodyText = await page.locator("body").innerText().catch(() => "");
      if (/unusual traffic|captcha|ロボットではありません/i.test(bodyText)) {
        throw new Error("Google Maps側で追加確認が必要なため取得を停止しました。");
      }

      const names = await extractResultNames(page, maxResults);
      const best = findBestStoreMatch(store.name, names);
      if (best.index >= 0 && best.score >= 0.82) {
        return {
          keyword,
          position: best.index + 1,
          matchedStoreName: best.candidate,
          status: "succeeded" as const,
          source: "dom" as const,
          confidence: best.score,
          resultCount: names.length
        };
      }

      const shouldUseVision = names.length === 0 || best.score >= 0.45;
      const vision = shouldUseVision
        ? await page
            .screenshot({ type: "png", fullPage: false })
            .then((screenshot) =>
              detectRankFromScreenshot({
                image: screenshot,
                storeName: store.name,
                address: store.address,
                keyword,
                visibleResultCount: names.length
              })
            )
            .catch(() => null)
        : null;
      if (vision?.position && vision.position <= maxResults && vision.confidence >= 0.55) {
        return {
          keyword,
          position: vision.position,
          matchedStoreName: vision.matchedStoreName || undefined,
          status: "succeeded" as const,
          source: "gemini_vision" as const,
          confidence: vision.confidence,
          resultCount: names.length
        };
      }

      return {
        keyword,
        status: "not_found" as const,
        source: vision ? ("gemini_vision" as const) : ("none" as const),
        confidence: vision?.confidence || 0,
        resultCount: names.length
      };
    } catch (error) {
      return {
        keyword,
        status: "failed" as const,
        source: "none" as const,
        confidence: 0,
        resultCount: 0,
        error: error instanceof Error ? error.message : "順位取得に失敗しました。"
      };
    } finally {
      await page?.close();
    }
  }
}
