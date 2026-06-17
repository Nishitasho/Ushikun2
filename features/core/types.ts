export type ProposalStatus = "draft" | "approved" | "rejected" | "posted";

export type ProposalCategory =
  | "google_business_profile_post"
  | "note_article"
  | "line_message"
  | "review_reply"
  | "faq_aeo_article"
  | "store_improvement"
  | "gbp_review_reply"
  | "gbp_post";

export type ProposalPlatform =
  | "google_business_profile"
  | "note"
  | "line"
  | "website"
  | "internal";

export type AutomationMode = "approval" | "semi_auto" | "full_auto";

export type ReviewReplyStatus =
  | "unprocessed"
  | "draft"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "replied"
  | "failed"
  | "skipped";

export type GbpPostStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "scheduled"
  | "posted"
  | "rejected"
  | "failed";

export type RankProvider = "playwright" | "serpapi" | "dataforseo" | "disabled";
export type RankBatchStatus = "running" | "succeeded" | "partial" | "failed";
export type RankResultStatus = "succeeded" | "not_found" | "failed";
export type RankDetectionSource = "dom" | "gemini_vision" | "none";

export type Store = {
  id: string;
  name: string;
  industry: string;
  address: string;
  phoneNumber: string;
  businessHours: string;
  regularHolidays: string;
  services: string;
  strengths: string;
  targetCustomers: string;
  keywords: string[];
  competitors: string[];
  postTone: string;
  ngExpressions: string[];
  postAutomationMode: AutomationMode;
  reviewAutomationMode: AutomationMode;
  postFrequencyPerMonth: number;
  gbpLocationName?: string;
  createdAt: string;
  updatedAt: string;
};

export type AiProposal = {
  id: string;
  storeId: string;
  title: string;
  category: ProposalCategory;
  body: string;
  platform: ProposalPlatform;
  goal: string;
  targetKeywords: string[];
  status: ProposalStatus;
  sourceType: "ai" | "manual" | "gbp_review" | "gbp_post" | "template_auto";
  riskNotes: string[];
  approvedAt?: string;
  rejectedReason?: string;
  postedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type ProposalRevision = {
  id: string;
  proposalId: string;
  title: string;
  body: string;
  goal: string;
  targetKeywords: string[];
  createdAt: string;
};

export type StatusEvent = {
  id: string;
  proposalId: string;
  fromStatus?: ProposalStatus;
  toStatus: ProposalStatus;
  reason?: string;
  createdAt: string;
};

export type ReviewReplyTemplate = {
  id: string;
  storeId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  industry: string;
  templateName: string;
  templateBody: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type GoogleReview = {
  id: string;
  storeId: string;
  googleReviewId: string;
  reviewerName: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment: string;
  reviewCreatedAt: string;
  replyStatus: ReviewReplyStatus;
  replyBody?: string;
  repliedAt?: string;
  riskFlags: string[];
  createdAt: string;
  updatedAt: string;
};

export type GbpPost = {
  id: string;
  storeId: string;
  proposalId?: string;
  title: string;
  body: string;
  category: string;
  targetKeywords: string[];
  imageUrl?: string;
  googlePostId?: string;
  status: GbpPostStatus;
  scheduledAt?: string;
  postedAt?: string;
  riskFlags: string[];
  createdAt: string;
  updatedAt: string;
};

export type RankResult = {
  id: string;
  batchId: string;
  storeId: string;
  keyword: string;
  position?: number;
  matchedStoreName?: string;
  status: RankResultStatus;
  source: RankDetectionSource;
  confidence: number;
  resultCount: number;
  attemptCount: number;
  error?: string;
  checkedAt: string;
};

export type RankBatch = {
  id: string;
  storeId: string;
  provider: RankProvider;
  status: RankBatchStatus;
  requestedCount: number;
  succeededCount: number;
  failedCount: number;
  retryOf?: string;
  startedAt: string;
  completedAt: string;
};

export type StoreMetricSnapshot = {
  id: string;
  batchId: string;
  storeId: string;
  rating?: number;
  reviewCount?: number;
  status: "succeeded" | "failed";
  source: "google_maps_dom" | "gemini_vision" | "none";
  error?: string;
  checkedAt: string;
};

export type MarketingReportAction = {
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
};

export type MarketingReport = {
  id: string;
  storeId: string;
  summary: string;
  rankingSummary: string;
  reviewSummary: string;
  recommendedKeywords: string[];
  actions: MarketingReportAction[];
  createdAt: string;
};

export type KurokoState = {
  stores: Store[];
  proposals: AiProposal[];
  revisions: ProposalRevision[];
  statusEvents: StatusEvent[];
  reviewTemplates: ReviewReplyTemplate[];
  googleReviews: GoogleReview[];
  gbpPosts: GbpPost[];
  rankBatches: RankBatch[];
  rankResults: RankResult[];
  storeMetricSnapshots: StoreMetricSnapshot[];
  marketingReports: MarketingReport[];
};

export type StoreInput = Omit<Store, "id" | "createdAt" | "updatedAt">;

export type ProposalInput = Pick<
  AiProposal,
  "title" | "body" | "goal" | "targetKeywords"
>;
