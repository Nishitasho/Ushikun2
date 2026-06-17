import type { RankDetectionSource, RankProvider, RankResultStatus, Store } from "@/features/core/types";

export type RankLookupInput = {
  store: Store;
  keyword: string;
  maxResults?: number;
};

export type RankLookupOutput = {
  keyword: string;
  position?: number;
  matchedStoreName?: string;
  status: RankResultStatus;
  source: RankDetectionSource;
  confidence: number;
  resultCount: number;
  error?: string;
};

export type StoreMetricsOutput = {
  rating?: number;
  reviewCount?: number;
  status: "succeeded" | "failed";
  source: "google_maps_dom" | "gemini_vision" | "none";
  error?: string;
};

export interface RankTrackingProvider {
  readonly name: RankProvider;
  lookup(input: RankLookupInput): Promise<RankLookupOutput>;
  lookupStoreMetrics?(store: Store): Promise<StoreMetricsOutput>;
  close?(): Promise<void>;
}
