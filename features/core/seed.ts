import type { KurokoState, ReviewReplyTemplate, Store } from "./types";
import { nowIso, uid } from "./utils";

const createdAt = "2026-06-07T00:00:00.000Z";

export const demoStore: Store = {
  id: "store_demo_ginza",
  name: "GINZA SAKURA DINING",
  industry: "高級飲食",
  address: "東京都中央区銀座1-1-1",
  phoneNumber: "03-1234-5678",
  businessHours: "17:00-23:00",
  regularHolidays: "月曜日",
  services:
    "季節の会席コース、記念日ディナー、個室接待、英語メニュー対応、ワインペアリング",
  strengths:
    "銀座駅から徒歩3分。和食とワインを合わせる体験価値、落ち着いた個室、海外ゲスト対応が強み。",
  targetCustomers:
    "記念日利用の30代から50代、接待利用の法人担当者、訪日観光客",
  keywords: [
    "銀座 和食",
    "銀座 個室 ディナー",
    "銀座 接待",
    "東京 インバウンド 和食",
    "記念日 レストラン 銀座"
  ],
  competitors: ["銀座 花乃井", "割烹 月灯", "GINZA WA TABLE"],
  postTone: "上質、落ち着き、押し売り感を出さない",
  ngExpressions: ["絶対", "必ず効果", "日本一", "最安"],
  postAutomationMode: "approval",
  reviewAutomationMode: "approval",
  postFrequencyPerMonth: 20,
  gbpLocationName: "accounts/demo/locations/ginza-sakura-dining",
  createdAt,
  updatedAt: createdAt
};

export function buildDefaultReviewTemplates(store: Store): ReviewReplyTemplate[] {
  const bodyByRating = {
    5: "{reviewer_name}様、この度はご来店いただき、温かいお言葉をありがとうございます。次回も季節の味わいと落ち着いた時間をお楽しみいただけるよう準備してお待ちしております。",
    4: "{reviewer_name}様、ご来店とご評価をありがとうございます。より心地よいお食事の時間をお届けできるよう、いただいたお声を日々の改善に活かしてまいります。",
    3: "{reviewer_name}様、ご来店いただきありがとうございます。さらにご満足いただけるよう、料理・空間・接客の改善点を店舗内で確認してまいります。",
    2: "{reviewer_name}様、この度はご期待に沿えず申し訳ございません。差し支えなければ、詳細を店舗までお知らせいただけますと幸いです。真摯に確認し改善に努めます。",
    1: "{reviewer_name}様、ご不快な思いをおかけし申し訳ございません。事実確認のうえ改善に努めますので、恐れ入りますが店舗まで個別にご連絡ください。"
  } as const;

  return ([5, 4, 3, 2, 1] as const).map((rating) => ({
    id: uid("tpl"),
    storeId: store.id,
    rating,
    industry: store.industry,
    templateName: `星${rating} 標準返信`,
    templateBody: bodyByRating[rating],
    isActive: true,
    createdAt: nowIso(),
    updatedAt: nowIso()
  }));
}

export const demoState: KurokoState = {
  stores: [demoStore],
  proposals: [],
  revisions: [],
  statusEvents: [],
  reviewTemplates: buildDefaultReviewTemplates(demoStore),
  googleReviews: [
    {
      id: "review_demo_1",
      storeId: demoStore.id,
      googleReviewId: "google_review_demo_1",
      reviewerName: "Tanaka",
      rating: 5,
      comment: "海外からの友人との食事で利用しました。個室が落ち着いていて料理も丁寧でした。",
      reviewCreatedAt: "2026-06-06T12:00:00.000Z",
      replyStatus: "unprocessed",
      riskFlags: [],
      createdAt,
      updatedAt: createdAt
    },
    {
      id: "review_demo_2",
      storeId: demoStore.id,
      googleReviewId: "google_review_demo_2",
      reviewerName: "Sato",
      rating: 2,
      comment: "料理は良かったですが提供までかなり待ちました。",
      reviewCreatedAt: "2026-06-06T10:00:00.000Z",
      replyStatus: "unprocessed",
      riskFlags: ["complaint"],
      createdAt,
      updatedAt: createdAt
    }
  ],
  gbpPosts: [],
  rankBatches: [],
  rankResults: [],
  storeMetricSnapshots: [],
  marketingReports: []
};

export const initialState: KurokoState = {
  stores: [],
  proposals: [],
  revisions: [],
  statusEvents: [],
  reviewTemplates: [],
  googleReviews: [],
  gbpPosts: [],
  rankBatches: [],
  rankResults: [],
  storeMetricSnapshots: [],
  marketingReports: []
};
