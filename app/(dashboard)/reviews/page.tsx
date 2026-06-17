"use client";

import { useMemo, useState } from "react";
import { MessageSquareReply } from "lucide-react";
import { ReviewCard } from "@/components/review-card";
import { Button, Panel, Select, Textarea } from "@/components/ui";
import { useKuroko } from "@/features/core/kuroko-store";

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
