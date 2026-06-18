import { NextResponse } from "next/server";
import { z } from "zod";
import {
  gbpFetch,
  getAccessToken,
  getGoogleAccountById,
  getPrimaryGoogleAccount,
  googleReviewId,
  ratingFromGoogle,
  toGbpV4LocationName
} from "@/lib/gbp/client";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({ storeId: z.string().uuid() });
const riskWords = ["待ち", "遅", "悪い", "不満", "返金", "クレーム", "最悪"];

type ReviewsResponse = {
  reviews?: Array<{
    name: string;
    reviewId?: string;
    reviewer?: { displayName?: string };
    starRating?: string;
    comment?: string;
    createTime?: string;
    reviewReply?: { comment?: string; updateTime?: string };
  }>;
};

function applyTemplate(template: string, reviewerName: string, rating: number) {
  return template
    .replaceAll("{reviewer_name}", reviewerName || "お客様")
    .replaceAll("{rating}", String(rating));
}

function riskFlags(input: { rating: number; comment: string; ngExpressions: string[]; industry: string }) {
  const flags = [];
  if (input.rating <= 3) flags.push("low_rating");
  if (riskWords.some((word) => input.comment.includes(word))) flags.push("complaint");
  if (input.ngExpressions.some((word) => word && input.comment.includes(word))) flags.push("ng_expression");
  if (["医療", "美容", "士業"].some((word) => input.industry.includes(word))) flags.push("regulated_industry");
  return flags;
}

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabaseの環境変数が設定されていません。" }, { status: 500 });
  }

  try {
    const { storeId } = schema.parse(await request.json());
    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("id,name,industry,ng_expressions,review_automation_mode,gbp_account_name,gbp_location_name")
      .eq("id", storeId)
      .single();
    if (storeError) throw new Error(storeError.message);
    const { data: linkedLocation } = await supabase
      .from("store_gbp_locations")
      .select("google_account_id,google_account_name,location_name")
      .eq("store_id", storeId)
      .maybeSingle();
    const gbpLocationName = toGbpV4LocationName({
      googleAccountName: linkedLocation?.google_account_name || store.gbp_account_name,
      locationName: linkedLocation?.location_name || store.gbp_location_name
    });

    const account = linkedLocation?.google_account_id
      ? await getGoogleAccountById(linkedLocation.google_account_id)
      : await getPrimaryGoogleAccount();
    if (!account) throw new Error("Google Business Profileアカウントが未連携です。");
    const accessToken = await getAccessToken(account);
    const response = await gbpFetch<ReviewsResponse>(
      `/v4/${gbpLocationName}/reviews?pageSize=50`,
      accessToken
    );
    const { data: templates, error: templateError } = await supabase
      .from("review_reply_templates")
      .select("*")
      .eq("store_id", storeId)
      .eq("is_active", true);
    if (templateError) throw new Error(templateError.message);

    const synced = [];
    for (const review of response.reviews || []) {
      const rating = ratingFromGoogle(review.starRating) as number;
      const reviewerName = review.reviewer?.displayName || "お客様";
      const flags = riskFlags({
        rating,
        comment: review.comment || "",
        ngExpressions: store.ng_expressions || [],
        industry: store.industry || ""
      });
      const template = templates?.find((item) => item.rating === rating);
      const replyBody = template ? applyTemplate(template.template_body, reviewerName, rating) : null;
      const safeAuto =
        replyBody &&
        (store.review_automation_mode === "full_auto" ||
          (store.review_automation_mode === "semi_auto" && rating >= 4 && flags.length === 0));

      if (safeAuto) {
        await gbpFetch(`/v4/${gbpLocationName}/reviews/${googleReviewId(review)}/reply`, accessToken, {
          method: "PUT",
          body: JSON.stringify({ comment: replyBody })
        });
      }
      const hasReply = Boolean(review.reviewReply?.comment || safeAuto);

      const row = {
        store_id: storeId,
        google_review_id: googleReviewId(review),
        reviewer_name: reviewerName,
        rating,
        comment: review.comment || "",
        review_created_at: review.createTime || new Date().toISOString(),
        reply_status: hasReply ? "replied" : replyBody ? "pending_approval" : "unprocessed",
        reply_body: review.reviewReply?.comment || replyBody,
        replied_at: review.reviewReply?.updateTime || (safeAuto ? new Date().toISOString() : null),
        risk_flags: flags,
        updated_at: new Date().toISOString()
      };
      const { data, error } = await supabase
        .from("google_reviews")
        .upsert(row, { onConflict: "store_id,google_review_id" })
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      synced.push(data);
    }

    return NextResponse.json({ reviews: synced });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "GBP口コミ同期に失敗しました。" },
      { status: 400 }
    );
  }
}
