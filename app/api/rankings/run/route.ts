import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import type {
  RankBatch,
  RankResult,
  Store,
  StoreMetricSnapshot
} from "@/features/core/types";
import type { RankTrackingProvider } from "@/features/rank-tracking/types";

export const maxDuration = 300;

const requestSchema = z.object({
  store: z.custom<Store>(),
  keywords: z.array(z.string().trim().min(1)).min(1).max(20),
  lastSuccessfulAt: z.string().datetime().optional(),
  retryOf: z.string().optional()
});

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_ATTEMPTS = 2;

async function getRankTrackingProvider(): Promise<RankTrackingProvider> {
  const providerName = process.env.RANK_TRACKING_PROVIDER || "playwright";
  if (providerName === "disabled") {
    throw new Error("Cloudflare Workers本番では順位取得バッチを無効化しています。");
  }
  if (providerName === "playwright") {
    const modulePath = "@/features/rank-tracking/providers/" + "playwright-provider";
    const { PlaywrightRankProvider } = (await import(modulePath)) as {
      PlaywrightRankProvider: new () => RankTrackingProvider;
    };
    return new PlaywrightRankProvider();
  }
  throw new Error(`${providerName} プロバイダーはまだ実装されていません。`);
}

export async function POST(request: Request) {
  try {
    const body = requestSchema.parse(await request.json());
    if (!body.retryOf && body.lastSuccessfulAt) {
      const elapsed = Date.now() - new Date(body.lastSuccessfulAt).getTime();
      if (elapsed < SEVEN_DAYS_MS) {
        const nextRunAt = new Date(new Date(body.lastSuccessfulAt).getTime() + SEVEN_DAYS_MS);
        return NextResponse.json(
          {
            error: `次回取得は${nextRunAt.toLocaleDateString("ja-JP")}以降です。`,
            nextRunAt: nextRunAt.toISOString()
          },
          { status: 429 }
        );
      }
    }

    const provider = await getRankTrackingProvider();
    try {
      const batchId = randomUUID();
      const startedAt = new Date().toISOString();
      const results: RankResult[] = [];
      let storeMetric: StoreMetricSnapshot | undefined;

      if (!body.retryOf && provider.lookupStoreMetrics) {
        const metric = await provider.lookupStoreMetrics(body.store);
        storeMetric = {
          id: randomUUID(),
          batchId,
          storeId: body.store.id,
          rating: metric.rating,
          reviewCount: metric.reviewCount,
          status: metric.status,
          source: metric.source,
          error: metric.error,
          checkedAt: new Date().toISOString()
        };
      }

      for (const keyword of body.keywords.slice(0, 20)) {
        let lookup = await provider.lookup({ store: body.store, keyword, maxResults: 20 });
        let attemptCount = 1;
        while (lookup.status === "failed" && attemptCount < MAX_ATTEMPTS) {
          attemptCount += 1;
          await new Promise((resolve) => setTimeout(resolve, 900));
          lookup = await provider.lookup({ store: body.store, keyword, maxResults: 20 });
        }
        results.push({
          id: randomUUID(),
          batchId,
          storeId: body.store.id,
          keyword,
          position: lookup.position,
          matchedStoreName: lookup.matchedStoreName,
          status: lookup.status,
          source: lookup.source,
          confidence: lookup.confidence,
          resultCount: lookup.resultCount,
          attemptCount,
          error: lookup.error,
          checkedAt: new Date().toISOString()
        });
      }

      const succeededCount = results.filter((result) => result.status !== "failed").length;
      const failedCount = results.length - succeededCount;
      const completedAt = new Date().toISOString();
      const batch: RankBatch = {
        id: batchId,
        storeId: body.store.id,
        provider: provider.name,
        status:
          failedCount === 0 ? "succeeded" : succeededCount === 0 ? "failed" : "partial",
        requestedCount: results.length,
        succeededCount,
        failedCount,
        retryOf: body.retryOf,
        startedAt,
        completedAt
      };

      return NextResponse.json({ batch, results, storeMetric });
    } finally {
      await provider.close?.();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "順位取得に失敗しました。";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
