import type {
  AutomationMode,
  ProposalCategory,
  ProposalPlatform,
  ProposalStatus
} from "./types";

export const statusLabels: Record<ProposalStatus, string> = {
  draft: "下書き",
  approved: "承認済み",
  rejected: "却下",
  posted: "投稿済み"
};

export const categoryLabels: Record<ProposalCategory, string> = {
  google_business_profile_post: "GBP投稿案",
  note_article: "note記事案",
  line_message: "LINE配信案",
  review_reply: "口コミ返信案",
  faq_aeo_article: "FAQ型AEO記事案",
  store_improvement: "店舗情報改善案",
  gbp_review_reply: "GBP口コミ返信",
  gbp_post: "GBP投稿"
};

export const platformLabels: Record<ProposalPlatform, string> = {
  google_business_profile: "Googleビジネスプロフィール",
  note: "note",
  line: "公式LINE",
  website: "Webサイト",
  internal: "内部改善"
};

export const automationModeLabels: Record<AutomationMode, string> = {
  approval: "承認制",
  semi_auto: "半自動",
  full_auto: "完全自動"
};

export const platformOptions: ProposalPlatform[] = [
  "google_business_profile",
  "note",
  "line",
  "website",
  "internal"
];

export const categoryOptions: ProposalCategory[] = [
  "google_business_profile_post",
  "note_article",
  "line_message",
  "review_reply",
  "faq_aeo_article",
  "store_improvement",
  "gbp_review_reply",
  "gbp_post"
];
