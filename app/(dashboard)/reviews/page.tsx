"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, MessageSquareReply, RefreshCcw, Star } from "lucide-react";
import { ReviewCard } from "@/components/review-card";
import { Button, Panel, Select, Textarea } from "@/components/ui";
import { useKuroko } from "@/features/core/kuroko-store";
import { formatDateTime } from "@/features/core/utils";

type RemoteReview = {
  id: string;
  store_id: string;
  google_review_id: string;
  reviewer_name: string | null;
  rating: 1 | 2 | 3 | 4 | 5;
  comment: string | null;
  review_created_at: string;
  reply_status: string;
  reply_body: string | null;
  replied_at: string | null;
  risk_flags: string[] | null;
  stores?: { id: string; name: string } | { id: string; name: string }[] | null;
};

type ReviewsApiResponse = {
  error?: string;
  reviews?: RemoteReview[];
};

type MutationApiResponse = {
  error?: string;
};

const replyStatusLabels: Record<string, string> = {
  unprocessed: "未処理",
  draft: "下書き",
  pending_approval: "承認待ち",
  approved: "承認済み",
  rejected: "却下",
  replied: "返信済み",
  failed: "失敗",
  skipped: "対応不要"
};

export default function ReviewsPage() {
  const {
    state,
    autoReplySafeReviews,
    prepareReviewReply,
    completeReviewReply,
    skipReviewReply,
    updateReviewTemplate
  } = useKuroko();
  const [storeId, setStoreId] = useState("all");

  const reviews = useMemo(
    () =>
      state.googleReviews.filter(
        (review) => storeId === "all" || review.storeId === storeId
      ),
    [state.googleReviews, storeId]
  );
  const templates = state.reviewTemplates.filter(
    (template) => storeId === "all" || template.storeId === storeId
  );
  const [remoteReviews, setRemoteReviews] = useState<RemoteReview[]>([]);
  const [remoteBodies, setRemoteBodies] = useState<Record<string, string>>({});
  const [remoteMessage, setRemoteMessage] = useState("");
  const [isRemoteLoading, setIsRemoteLoading] = useState(false);

  async function loadRemoteReviews() {
    setIsRemoteLoading(true);
    setRemoteMessage("");
    try {
      const response = await fetch(`/api/gbp/reviews?storeId=${storeId}`, { cache: "no-store" });
      const data = (await response.json()) as ReviewsApiResponse;
      if (!response.ok) throw new Error(data.error || "本番GBP口コミの取得に失敗しました。");
      const nextReviews = (data.reviews || []) as RemoteReview[];
      setRemoteReviews(nextReviews);
      setRemoteBodies(
        Object.fromEntries(nextReviews.map((review) => [review.id, review.reply_body || ""]))
      );
    } catch (error) {
      setRemoteMessage(error instanceof Error ? error.message : "本番GBP口コミの取得に失敗しました。");
    } finally {
      setIsRemoteLoading(false);
    }
  }

  useEffect(() => {
    loadRemoteReviews().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  async function publishRemoteReply(reviewId: string) {
    const body = remoteBodies[reviewId]?.trim();
    if (!body) return;
    setIsRemoteLoading(true);
    setRemoteMessage("");
    try {
      const response = await fetch("/api/gbp/reviews/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId, body })
      });
      const data = (await response.json()) as MutationApiResponse;
      if (!response.ok) throw new Error(data.error || "GBP口コミ返信に失敗しました。");
      setRemoteMessage("GBPへ口コミ返信を投稿しました。");
      await loadRemoteReviews();
    } catch (error) {
      setRemoteMessage(error instanceof Error ? error.message : "GBP口コミ返信に失敗しました。");
    } finally {
      setIsRemoteLoading(false);
    }
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-bold text-brass">Google reviews</p>
          <h1 className="mt-1 text-3xl font-black text-ink">口コミ返信</h1>
          <p className="mt-2 text-sm text-ink/62">
            高評価・低リスクのみ自動化し、クレームや低評価は承認してから返信します。
          </p>
        </div>
        <Button onClick={() => autoReplySafeReviews(storeId === "all" ? undefined : storeId)}>
          <MessageSquareReply className="size-4" /> 安全な口コミへ自動返信
        </Button>
      </div>

      <Panel>
        <Select value={storeId} onChange={(event) => setStoreId(event.target.value)}>
          <option value="all">全店舗</option>
          {state.stores.map((store) => (
            <option key={store.id} value={store.id}>{store.name}</option>
          ))}
        </Select>
      </Panel>

      <Panel title={`口コミ一覧 (${reviews.length}件)`}>
        <div className="grid gap-3">
          {reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              store={state.stores.find((store) => store.id === review.storeId)}
              onPrepare={() => prepareReviewReply(review.id)}
              onComplete={(body) => completeReviewReply(review.id, body)}
              onSkip={() => skipReviewReply(review.id)}
            />
          ))}
        </div>
      </Panel>

      <Panel
        title={`本番GBP口コミ (${remoteReviews.length}件)`}
        description="GBP連携画面で口コミ取得したデータです。返信案を承認するとGoogle Business Profileへ投稿します。"
        action={
          <Button variant="secondary" disabled={isRemoteLoading} onClick={loadRemoteReviews}>
            <RefreshCcw className="size-4" />
            更新
          </Button>
        }
      >
        {remoteMessage ? (
          <div className="mb-3 rounded-md border border-line bg-paper px-4 py-3 text-sm font-semibold text-ink/65">
            {remoteMessage}
          </div>
        ) : null}
        <div className="grid gap-3">
          {remoteReviews.map((review) => {
            const store = Array.isArray(review.stores) ? review.stores[0] : review.stores;
            return (
              <article key={review.id} className="rounded-lg border border-line bg-white p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-ink">{review.reviewer_name || "お客様"}</span>
                      <span className="flex items-center gap-1 text-sm font-bold text-brass">
                        <Star className="size-4 fill-current" /> {review.rating}
                      </span>
                      <span className="rounded-full bg-paper px-2.5 py-1 text-xs font-bold text-ink/60">
                        {replyStatusLabels[review.reply_status] || review.reply_status}
                      </span>
                      {review.risk_flags?.length ? (
                        <span className="rounded-full bg-coral/10 px-2.5 py-1 text-xs font-bold text-coral">
                          要確認
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs font-semibold text-ink/45">
                      {store?.name || "店舗未取得"} / {formatDateTime(review.review_created_at)}
                    </p>
                  </div>
                </div>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-ink/72">
                  {review.comment || "本文なし"}
                </p>
                <div className="mt-4 grid gap-3 rounded-md bg-paper/70 p-3">
                  <span className="text-xs font-bold text-ink/55">返信案</span>
                  <Textarea
                    value={remoteBodies[review.id] || ""}
                    onChange={(event) =>
                      setRemoteBodies((current) => ({
                        ...current,
                        [review.id]: event.target.value
                      }))
                    }
                  />
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      disabled={isRemoteLoading || review.reply_status === "replied" || !remoteBodies[review.id]?.trim()}
                      onClick={() => publishRemoteReply(review.id)}
                    >
                      <Check className="size-4" />
                      承認してGBP返信
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
          {!remoteReviews.length ? (
            <p className="rounded-md bg-paper px-4 py-3 text-sm leading-6 text-ink/60">
              GBP連携後、GBP連携画面で口コミ取得を実行するとここに表示されます。
            </p>
          ) : null}
        </div>
      </Panel>

      <Panel title="星評価別返信テンプレート" description="{reviewer_name} を口コミ投稿者名に置換します。">
        <div className="grid gap-4 lg:grid-cols-2">
          {templates.map((template) => (
            <label key={template.id} className="grid gap-2 rounded-lg border border-line bg-white p-4">
              <span className="text-sm font-bold">星{template.rating} / {template.templateName}</span>
              <Textarea
                value={template.templateBody}
                onChange={(event) => updateReviewTemplate({ ...template, templateBody: event.target.value })}
              />
            </label>
          ))}
        </div>
      </Panel>
    </div>
  );
}
