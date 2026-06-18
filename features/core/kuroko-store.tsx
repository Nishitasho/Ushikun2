"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import type { ReactNode } from "react";
import { generateDailyProposals } from "./proposal-generator";
import { buildDefaultReviewTemplates, initialState } from "./seed";
import type {
  AiProposal,
  AutomationMode,
  GoogleReview,
  KurokoState,
  ProposalInput,
  ProposalStatus,
  RankBatch,
  RankResult,
  MarketingReport,
  ReviewReplyTemplate,
  Store,
  StoreInput,
  GbpPost
} from "./types";
import { includesAny, nowIso, uid } from "./utils";

type UserSession = {
  email: string;
  name: string;
};

type KurokoContextValue = {
  state: KurokoState;
  session?: UserSession;
  isReady: boolean;
  login: (email: string) => void;
  logout: () => void;
  resetDemo: () => void;
  createStore: (input: StoreInput) => Store;
  updateStore: (storeId: string, input: StoreInput) => void;
  generateProposals: (storeId?: string) => Promise<number>;
  updateProposal: (proposalId: string, input: ProposalInput) => void;
  changeProposalStatus: (
    proposalId: string,
    status: ProposalStatus,
    reason?: string
  ) => void;
  autoReplySafeReviews: (storeId?: string) => number;
  prepareReviewReply: (reviewId: string) => void;
  completeReviewReply: (reviewId: string, body: string) => void;
  skipReviewReply: (reviewId: string) => void;
  autoCreateLowRiskGbpPosts: (storeId?: string) => number;
  updateReviewTemplate: (template: ReviewReplyTemplate) => void;
  runRankTracking: (storeId: string, retryBatchId?: string) => Promise<RankBatch>;
  generateMarketingReport: (storeId: string) => Promise<MarketingReport>;
};

const STORAGE_KEY = "kuroko-ai-mvp-state-v1";
const SESSION_KEY = "kuroko-ai-mvp-session-v1";

const KurokoContext = createContext<KurokoContextValue | null>(null);

function safeReadState(): KurokoState {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return initialState;
  try {
    const parsed = JSON.parse(raw) as Omit<KurokoState, "stores"> & {
      stores: Array<
        Omit<Store, "postAutomationMode" | "reviewAutomationMode"> & {
          postAutomationMode?: AutomationMode;
          reviewAutomationMode?: AutomationMode;
          automationMode?: AutomationMode;
          allowTemplateReviewAutoReply?: boolean;
          allowLowRiskGbpAutoPost?: boolean;
        }
      >;
    };
    return {
      ...parsed,
      rankBatches: parsed.rankBatches || [],
      rankResults: parsed.rankResults || [],
      storeMetricSnapshots: parsed.storeMetricSnapshots || [],
      marketingReports: parsed.marketingReports || [],
      stores: parsed.stores.map((store) => ({
        ...store,
        postAutomationMode:
          store.postAutomationMode ||
          (store.allowLowRiskGbpAutoPost ? store.automationMode || "semi_auto" : "approval"),
        reviewAutomationMode:
          store.reviewAutomationMode ||
          (store.allowTemplateReviewAutoReply
            ? store.automationMode === "full_auto"
              ? "full_auto"
              : "semi_auto"
            : "approval")
      }))
    };
  } catch {
    return initialState;
  }
}

function safeReadSession(): UserSession | undefined {
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as UserSession;
  } catch {
    return undefined;
  }
}

function templateReply(template: ReviewReplyTemplate, review: GoogleReview) {
  return template.templateBody
    .replaceAll("{reviewer_name}", review.reviewerName)
    .replaceAll("{rating}", String(review.rating));
}

function hasReviewRisk(review: GoogleReview, store: Store) {
  const riskWords = ["待ち", "遅", "悪い", "不満", "返金", "クレーム", "最悪"];
  return (
    review.rating <= 3 ||
    review.riskFlags.length > 0 ||
    includesAny(review.comment, riskWords) ||
    includesAny(review.comment, store.ngExpressions) ||
    ["医療", "美容", "士業"].some((word) => store.industry.includes(word))
  );
}

function isGbpPostProposal(proposal: AiProposal) {
  return (
    proposal.platform === "google_business_profile" &&
    (proposal.category === "google_business_profile_post" || proposal.category === "gbp_post")
  );
}

function gbpPostFromProposal(proposal: AiProposal, stampedAt: string): GbpPost {
  return {
    id: uid("gbp_post"),
    storeId: proposal.storeId,
    proposalId: proposal.id,
    title: proposal.title,
    body: proposal.body,
    category: proposal.category,
    targetKeywords: proposal.targetKeywords,
    status: "posted",
    postedAt: stampedAt,
    riskFlags: proposal.riskNotes,
    createdAt: stampedAt,
    updatedAt: stampedAt
  };
}

function upsertGbpPostFromProposal(posts: GbpPost[], proposal: AiProposal, stampedAt: string) {
  const nextPost = gbpPostFromProposal(proposal, stampedAt);
  const exists = posts.some((post) => post.proposalId === proposal.id);
  if (!exists) return [nextPost, ...posts];
  return posts.map((post) =>
    post.proposalId === proposal.id
      ? {
          ...post,
          title: proposal.title,
          body: proposal.body,
          category: proposal.category,
          targetKeywords: proposal.targetKeywords,
          status: "posted" as const,
          postedAt: stampedAt,
          updatedAt: stampedAt
        }
      : post
  );
}

export function KurokoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<KurokoState>(initialState);
  const [session, setSession] = useState<UserSession | undefined>();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setState(safeReadState());
    setSession(safeReadSession());
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [isReady, state]);

  useEffect(() => {
    if (!isReady) return;
    if (session) {
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } else {
      window.localStorage.removeItem(SESSION_KEY);
    }
  }, [isReady, session]);

  const login = useCallback((email: string) => {
    setSession({
      email,
      name: email.split("@")[0] || "牛くんずAIユーザー"
    });
  }, []);

  const logout = useCallback(() => {
    setSession(undefined);
  }, []);

  const resetDemo = useCallback(() => {
    setState(initialState);
  }, []);

  const createStore = useCallback((input: StoreInput) => {
    const createdAt = nowIso();
    const store: Store = {
      ...input,
      id: uid("store"),
      createdAt,
      updatedAt: createdAt
    };
    setState((current) => ({
      ...current,
      stores: [store, ...current.stores],
      reviewTemplates: [
        ...buildDefaultReviewTemplates(store),
        ...current.reviewTemplates
      ]
    }));
    return store;
  }, []);

  const updateStore = useCallback((storeId: string, input: StoreInput) => {
    setState((current) => ({
      ...current,
      stores: current.stores.map((store) =>
        store.id === storeId
          ? {
              ...store,
              ...input,
              updatedAt: nowIso()
            }
          : store
      )
    }));
  }, []);

  const generateProposals = useCallback(
    async (storeId?: string) => {
      const targetStores = storeId
        ? state.stores.filter((store) => store.id === storeId)
        : state.stores;
      if (!targetStores.length) return 0;

      let proposals: AiProposal[];
      try {
        const response = await fetch("/api/ai/proposals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stores: targetStores })
        });
        const data = (await response.json()) as {
          proposals?: AiProposal[];
          error?: string;
        };
        if (!response.ok || !data.proposals) {
          throw new Error(data.error || "提案生成に失敗しました。");
        }
        proposals = data.proposals;
      } catch (error) {
        console.error("Gemini proposal generation failed; using mock proposals.", error);
        proposals = generateDailyProposals(targetStores);
      }

      setState((current) => ({
        ...current,
        proposals: [...proposals, ...current.proposals]
      }));
      return proposals.length;
    },
    [state.stores]
  );

  const updateProposal = useCallback((proposalId: string, input: ProposalInput) => {
    setState((current) => {
      const target = current.proposals.find((proposal) => proposal.id === proposalId);
      if (!target) return current;

      return {
        ...current,
        proposals: current.proposals.map((proposal) =>
          proposal.id === proposalId
            ? {
                ...proposal,
                ...input,
                updatedAt: nowIso()
              }
            : proposal
        ),
        revisions: [
          {
            id: uid("revision"),
            proposalId,
            title: input.title,
            body: input.body,
            goal: input.goal,
            targetKeywords: input.targetKeywords,
            createdAt: nowIso()
          },
          ...current.revisions
        ]
      };
    });
  }, []);

  const changeProposalStatus = useCallback(
    (proposalId: string, status: ProposalStatus, reason?: string) => {
      setState((current) => {
        const target = current.proposals.find((proposal) => proposal.id === proposalId);
        if (!target) return current;
        const stampedAt = nowIso();
        const store = current.stores.find((item) => item.id === target.storeId);
        const shouldAutoPost =
          status === "approved" &&
          isGbpPostProposal(target) &&
          store?.postAutomationMode !== "approval";
        const nextStatus = shouldAutoPost ? "posted" : status;
        const postedAt =
          nextStatus === "posted" && isGbpPostProposal(target)
            ? stampedAt
            : target.postedAt;

        const proposals = current.proposals.map((proposal) =>
          proposal.id === proposalId
            ? {
                ...proposal,
                status: nextStatus,
                approvedAt:
                  nextStatus === "approved" || nextStatus === "posted"
                    ? stampedAt
                    : proposal.approvedAt,
                postedAt,
                rejectedReason: nextStatus === "rejected" ? reason : proposal.rejectedReason,
                updatedAt: stampedAt
              }
            : proposal
        );
        const updatedTarget = proposals.find((proposal) => proposal.id === proposalId) || target;
        return {
          ...current,
          proposals,
          gbpPosts:
            nextStatus === "posted" && isGbpPostProposal(updatedTarget)
              ? upsertGbpPostFromProposal(current.gbpPosts, updatedTarget, stampedAt)
              : current.gbpPosts,
          statusEvents: [
            {
              id: uid("event"),
              proposalId,
              fromStatus: target.status,
              toStatus: nextStatus,
              reason: shouldAutoPost ? "投稿自動化設定により承認後に自動投稿" : reason,
              createdAt: stampedAt
            },
            ...current.statusEvents
          ]
        };
      });
    },
    []
  );

  const autoReplySafeReviews = useCallback((storeId?: string) => {
    let repliedCount = 0;
    setState((current) => {
      const storesById = new Map(current.stores.map((store) => [store.id, store]));
      const templates = current.reviewTemplates.filter((template) => template.isActive);

      const googleReviews = current.googleReviews.map((review) => {
        if (storeId && review.storeId !== storeId) return review;
        if (review.replyStatus === "replied") return review;

        const store = storesById.get(review.storeId);
        if (!store || store.reviewAutomationMode === "approval") return review;
        if (store.reviewAutomationMode === "semi_auto" && hasReviewRisk(review, store)) {
          return review;
        }

        const template = templates.find(
          (item) => item.storeId === review.storeId && item.rating === review.rating
        );
        if (!template) return review;

        repliedCount += 1;
        const repliedAt = nowIso();
        return {
          ...review,
          replyStatus: "replied" as const,
          replyBody: templateReply(template, review),
          repliedAt,
          updatedAt: repliedAt
        };
      });

      return {
        ...current,
        googleReviews
      };
    });
    return repliedCount;
  }, []);

  const prepareReviewReply = useCallback((reviewId: string) => {
    setState((current) => {
      const review = current.googleReviews.find((item) => item.id === reviewId);
      if (!review) return current;
      const template = current.reviewTemplates.find(
        (item) =>
          item.storeId === review.storeId &&
          item.rating === review.rating &&
          item.isActive
      );
      if (!template) return current;

      return {
        ...current,
        googleReviews: current.googleReviews.map((item) =>
          item.id === reviewId
            ? {
                ...item,
                replyStatus: "pending_approval" as const,
                replyBody: templateReply(template, item),
                updatedAt: nowIso()
              }
            : item
        )
      };
    });
  }, []);

  const completeReviewReply = useCallback((reviewId: string, body: string) => {
    setState((current) => {
      const repliedAt = nowIso();
      return {
        ...current,
        googleReviews: current.googleReviews.map((review) =>
          review.id === reviewId
            ? {
                ...review,
                replyStatus: "replied" as const,
                replyBody: body,
                repliedAt,
                updatedAt: repliedAt
              }
            : review
        )
      };
    });
  }, []);

  const skipReviewReply = useCallback((reviewId: string) => {
    setState((current) => ({
      ...current,
      googleReviews: current.googleReviews.map((review) =>
        review.id === reviewId
          ? {
              ...review,
              replyStatus: "skipped" as const,
              updatedAt: nowIso()
            }
          : review
      )
    }));
  }, []);

  const autoCreateLowRiskGbpPosts = useCallback((storeId?: string) => {
    let createdCount = 0;
    setState((current) => {
      const eligibleStores = current.stores.filter(
        (store) =>
          (!storeId || store.id === storeId) &&
          store.postAutomationMode !== "approval"
      );

      const created = eligibleStores.flatMap((store) => {
        const keywords = store.keywords.slice(0, 3);
        const createdAt = nowIso();
        createdCount += 1;
        return [
          {
            id: uid("proposal"),
            storeId: store.id,
            title: `${store.name} よくある質問のGBP自動投稿`,
            category: "gbp_post" as const,
            body: `${store.name}では、初めての方にも安心してご利用いただけるよう、${store.services.split("、").slice(0, 2).join("、")}について事前のご相談を承っています。\n\n${keywords.join("、")}でお探しの方は、営業時間をご確認のうえお気軽にお問い合わせください。`,
            platform: "google_business_profile" as const,
            goal: "低リスクなFAQ型投稿でMEO接点を増やし、来店前の不安を減らす。",
            targetKeywords: keywords,
            status: "posted" as const,
            sourceType: "template_auto" as const,
            riskNotes: [],
            approvedAt: createdAt,
            postedAt: createdAt,
            createdAt,
            updatedAt: createdAt
          }
        ];
      });
      const createdPosts = created
        .filter(isGbpPostProposal)
        .map((proposal) => gbpPostFromProposal(proposal, proposal.postedAt || proposal.createdAt));

      return {
        ...current,
        proposals: [...created, ...current.proposals],
        gbpPosts: [...createdPosts, ...current.gbpPosts]
      };
    });
    return createdCount;
  }, []);

  const updateReviewTemplate = useCallback((template: ReviewReplyTemplate) => {
    setState((current) => ({
      ...current,
      reviewTemplates: current.reviewTemplates.map((item) =>
        item.id === template.id
          ? {
              ...template,
              updatedAt: nowIso()
            }
          : item
      )
    }));
  }, []);

  const runRankTracking = useCallback(
    async (storeId: string, retryBatchId?: string) => {
      const store = state.stores.find((item) => item.id === storeId);
      if (!store) throw new Error("店舗が見つかりません。");

      const retryKeywords = retryBatchId
        ? state.rankResults
            .filter(
              (result) => result.batchId === retryBatchId && result.status === "failed"
            )
            .map((result) => result.keyword)
        : [];
      const keywords = (retryKeywords.length ? retryKeywords : store.keywords).slice(0, 20);
      if (!keywords.length) throw new Error("対策キーワードを1件以上登録してください。");

      const lastSuccessfulAt = state.rankBatches
        .filter(
          (batch) =>
            batch.storeId === storeId &&
            (batch.status === "succeeded" || batch.status === "partial") &&
            !batch.retryOf
        )
        .sort((a, b) => b.completedAt.localeCompare(a.completedAt))[0]?.completedAt;

      const response = await fetch("/api/rankings/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store,
          keywords,
          lastSuccessfulAt,
          retryOf: retryBatchId
        })
      });
      const data = (await response.json()) as {
        batch?: RankBatch;
        results?: RankResult[];
        storeMetric?: KurokoState["storeMetricSnapshots"][number];
        error?: string;
      };
      if (!response.ok || !data.batch || !data.results) {
        throw new Error(data.error || "順位取得に失敗しました。");
      }

      setState((current) => ({
        ...current,
        rankBatches: [data.batch as RankBatch, ...current.rankBatches],
        rankResults: [...(data.results as RankResult[]), ...current.rankResults],
        storeMetricSnapshots: data.storeMetric
          ? [data.storeMetric, ...current.storeMetricSnapshots]
          : current.storeMetricSnapshots
      }));
      return data.batch;
    },
    [state.rankBatches, state.rankResults, state.stores]
  );

  const generateMarketingReport = useCallback(
    async (storeId: string) => {
      const store = state.stores.find((item) => item.id === storeId);
      if (!store) throw new Error("店舗が見つかりません。");
      const response = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store,
          rankResults: state.rankResults.filter((result) => result.storeId === storeId),
          storeMetrics: state.storeMetricSnapshots.filter(
            (snapshot) => snapshot.storeId === storeId
          )
        })
      });
      const data = (await response.json()) as {
        report?: MarketingReport;
        error?: string;
      };
      if (!response.ok || !data.report) {
        throw new Error(data.error || "レポート生成に失敗しました。");
      }
      setState((current) => ({
        ...current,
        marketingReports: [data.report as MarketingReport, ...current.marketingReports]
      }));
      return data.report;
    },
    [state.rankResults, state.storeMetricSnapshots, state.stores]
  );

  const value = useMemo(
    () => ({
      state,
      session,
      isReady,
      login,
      logout,
      resetDemo,
      createStore,
      updateStore,
      generateProposals,
      updateProposal,
      changeProposalStatus,
      autoReplySafeReviews,
      prepareReviewReply,
      completeReviewReply,
      skipReviewReply,
      autoCreateLowRiskGbpPosts,
      updateReviewTemplate,
      runRankTracking,
      generateMarketingReport
    }),
    [
      state,
      session,
      isReady,
      login,
      logout,
      resetDemo,
      createStore,
      updateStore,
      generateProposals,
      updateProposal,
      changeProposalStatus,
      autoReplySafeReviews,
      prepareReviewReply,
      completeReviewReply,
      skipReviewReply,
      autoCreateLowRiskGbpPosts,
      updateReviewTemplate,
      runRankTracking,
      generateMarketingReport
    ]
  );

  return <KurokoContext.Provider value={value}>{children}</KurokoContext.Provider>;
}

export function useKuroko() {
  const context = useContext(KurokoContext);
  if (!context) {
    throw new Error("useKuroko must be used inside KurokoProvider");
  }
  return context;
}
