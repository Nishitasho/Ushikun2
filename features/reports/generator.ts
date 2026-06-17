import type {
  MarketingReport,
  RankResult,
  Store,
  StoreMetricSnapshot
} from "@/features/core/types";
import { uid } from "@/features/core/utils";

function latestPerKeyword(results: RankResult[]) {
  const map = new Map<string, RankResult>();
  [...results]
    .sort((a, b) => b.checkedAt.localeCompare(a.checkedAt))
    .forEach((result) => {
      if (!map.has(result.keyword)) map.set(result.keyword, result);
    });
  return [...map.values()];
}

function recommendedKeywords(store: Store) {
  const addressWithoutNumber = store.address.replace(/[0-9０-９].*$/, "").trim();
  const area = addressWithoutNumber.split(/[都道府県市区町村]/).filter(Boolean).at(-1)
    || addressWithoutNumber;
  const service = store.services.split(/[、,\n]/).map((item) => item.trim()).find(Boolean);
  const candidates = [
    `${area} ${store.industry}`,
    service ? `${area} ${service}` : "",
    service ? `${store.industry} ${service}` : "",
    `${area} おすすめ`,
    `${area} 予約`
  ].filter(Boolean);
  return Array.from(new Set(candidates)).filter(
    (keyword) => !store.keywords.some((current) => current === keyword)
  ).slice(0, 5);
}

export function buildFallbackReport(input: {
  store: Store;
  rankResults: RankResult[];
  storeMetrics: StoreMetricSnapshot[];
}): MarketingReport {
  const latestRanks = latestPerKeyword(input.rankResults);
  const ranked = latestRanks.filter((result) => result.position);
  const metrics = [...input.storeMetrics]
    .filter((metric) => metric.status === "succeeded")
    .sort((a, b) => b.checkedAt.localeCompare(a.checkedAt));
  const latestMetric = metrics[0];
  const previousMetric = metrics[1];
  const reviewChange =
    latestMetric?.reviewCount !== undefined && previousMetric?.reviewCount !== undefined
      ? latestMetric.reviewCount - previousMetric.reviewCount
      : undefined;

  return {
    id: uid("report"),
    storeId: input.store.id,
    summary: ranked.length
      ? `${latestRanks.length}キーワード中${ranked.length}件が上位20位以内で確認できました。順位が弱い検索意図から店舗情報と投稿内容を補強します。`
      : "順位データを蓄積しながら、店舗情報、口コミ、投稿内容を検索キーワードと一致させることが最優先です。",
    rankingSummary: ranked.length
      ? `最高順位は${Math.min(...ranked.map((result) => result.position || 99))}位です。圏外キーワードは、サービス説明とGBP投稿で関連性を高めます。`
      : "上位20位以内の順位はまだ確認できていません。店舗名・カテゴリ・サービス・住所情報の整合性を確認してください。",
    reviewSummary: latestMetric
      ? `現在の評価は${latestMetric.rating ?? "未取得"}、口コミ件数は${latestMetric.reviewCount ?? "未取得"}件です。${reviewChange === undefined ? "次回取得後に増減を比較できます。" : `前回から${reviewChange >= 0 ? "+" : ""}${reviewChange}件です。`}`
      : "口コミ件数と評価は未取得です。順位取得時に同時取得し、週次で推移を確認します。",
    recommendedKeywords: recommendedKeywords(input.store),
    actions: [
      {
        priority: "high",
        title: "GBP店舗情報を検索語に合わせて整備",
        description: `サービス欄と説明文に「${input.store.keywords.slice(0, 2).join("」「")}」を自然に反映し、住所・営業時間・カテゴリの欠損を確認します。`
      },
      {
        priority: "high",
        title: "口コミ獲得導線を固定化",
        description: "会計後や来店翌日に口コミ依頼を案内し、具体的なサービス体験を書いてもらいやすい導線を作ります。"
      },
      {
        priority: "medium",
        title: "週1回のGBP投稿を継続",
        description: "主要キーワードを1〜3個に絞り、サービス紹介・FAQ・季節情報を来店導線付きで投稿します。"
      }
    ],
    createdAt: new Date().toISOString()
  };
}
