import type { RankProvider } from "@/features/core/types";
import type { RankTrackingProvider } from "../types";

const disabledProvider: RankTrackingProvider = {
  name: "disabled",
  async lookup() {
    return {
      keyword: "",
      status: "failed",
      source: "none",
      confidence: 0,
      resultCount: 0,
      error: "Cloudflare Workers本番では順位取得バッチを無効化しています。"
    };
  },
  async lookupStoreMetrics() {
    return {
      status: "failed",
      source: "none",
      error: "Cloudflare Workers本番では口コミ指標取得バッチを無効化しています。"
    };
  }
};

export async function createRankTrackingProvider(
  name = (process.env.RANK_TRACKING_PROVIDER || "playwright") as RankProvider
): Promise<RankTrackingProvider> {
  if (name === "disabled") return disabledProvider;
  if (name === "playwright") {
    const modulePath = "./" + "playwright-provider";
    const { PlaywrightRankProvider } = (await import(modulePath)) as {
      PlaywrightRankProvider: new () => RankTrackingProvider;
    };
    return new PlaywrightRankProvider();
  }
  throw new Error(`${name} プロバイダーはまだ実装されていません。`);
}
