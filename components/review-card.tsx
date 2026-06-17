"use client";

import { useEffect, useState } from "react";
import { Check, FileText, SkipForward, Star } from "lucide-react";
import { Button, Textarea } from "./ui";
import type { GoogleReview, Store } from "@/features/core/types";
import { formatDateTime } from "@/features/core/utils";

const replyStatusLabels: Record<GoogleReview["replyStatus"], string> = {
  unprocessed: "未処理",
  draft: "下書き",
  pending_approval: "承認待ち",
  approved: "承認済み",
  rejected: "却下",
  replied: "返信済み",
  failed: "失敗",
  skipped: "対応不要"
};

export function ReviewCard({
  review,
  store,
  onPrepare,
  onComplete,
  onSkip
}: {
  review: GoogleReview;
  store?: Store;
  onPrepare: () => void;
  onComplete: (body: string) => void;
  onSkip: () => void;
}) {
  const [body, setBody] = useState(review.replyBody || "");

  useEffect(() => {
    setBody(review.replyBody || "");
  }, [review.replyBody]);

  return (
    <article className="rounded-lg border border-line bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-ink">{review.reviewerName}</span>
            <span className="flex items-center gap-1 text-sm font-bold text-brass">
              <Star className="size-4 fill-current" /> {review.rating}
            </span>
            <span className="rounded-full bg-paper px-2.5 py-1 text-xs font-bold text-ink/60">
              {replyStatusLabels[review.replyStatus]}
            </span>
            {review.riskFlags.length ? (
              <span className="rounded-full bg-coral/10 px-2.5 py-1 text-xs font-bold text-coral">
                要確認
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs font-semibold text-ink/45">
            {store?.name} / {formatDateTime(review.reviewCreatedAt)}
          </p>
        </div>
      </div>

      <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-ink/72">
        {review.comment || "本文なし"}
      </p>

      {review.replyBody || review.replyStatus === "pending_approval" ? (
        <div className="mt-4 grid gap-3 rounded-md bg-paper/70 p-3">
          <span className="text-xs font-bold text-ink/55">返信案</span>
          <Textarea value={body} onChange={(event) => setBody(event.target.value)} />
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" onClick={onSkip}>
              <SkipForward className="size-4" /> 対応不要
            </Button>
            <Button disabled={!body.trim()} onClick={() => onComplete(body)}>
              <Check className="size-4" /> 返信済みにする
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex justify-end">
          <Button variant="secondary" onClick={onPrepare}>
            <FileText className="size-4" /> テンプレート案を作成
          </Button>
        </div>
      )}
    </article>
  );
}
