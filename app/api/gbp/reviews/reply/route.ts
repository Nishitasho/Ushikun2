import { NextResponse } from "next/server";
import { z } from "zod";
import { gbpFetch, getAccessToken, getGoogleAccountById, getPrimaryGoogleAccount, toGbpV4LocationName } from "@/lib/gbp/client";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  reviewId: z.string().uuid(),
  body: z.string().min(1)
});

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabaseの環境変数が設定されていません。" }, { status: 500 });
  }

  try {
    const input = schema.parse(await request.json());
    const { data: review, error: reviewError } = await supabase
      .from("google_reviews")
      .select("id,store_id,google_review_id,reply_body,stores(gbp_account_name,gbp_location_name)")
      .eq("id", input.reviewId)
      .single();
    if (reviewError) throw new Error(reviewError.message);

    const { data: linkedLocation } = await supabase
      .from("store_gbp_locations")
      .select("google_account_id,google_account_name,location_name")
      .eq("store_id", review.store_id)
      .maybeSingle();
    const store = Array.isArray(review.stores) ? review.stores[0] : review.stores;
    const gbpLocationName = toGbpV4LocationName({
      googleAccountName: linkedLocation?.google_account_name || store?.gbp_account_name,
      locationName: linkedLocation?.location_name || store?.gbp_location_name
    });

    const account = linkedLocation?.google_account_id
      ? await getGoogleAccountById(linkedLocation.google_account_id)
      : await getPrimaryGoogleAccount();
    if (!account) throw new Error("Google Business Profileアカウントが未連携です。");
    const accessToken = await getAccessToken(account);
    const replied = await gbpFetch<{ comment?: string; updateTime?: string }>(
      `/v4/${gbpLocationName}/reviews/${review.google_review_id}/reply`,
      accessToken,
      {
        method: "PUT",
        body: JSON.stringify({ comment: input.body })
      }
    );

    const repliedAt = replied.updateTime || new Date().toISOString();
    const { data, error } = await supabase
      .from("google_reviews")
      .update({
        reply_status: "replied",
        reply_body: input.body,
        replied_at: repliedAt,
        updated_at: new Date().toISOString()
      })
      .eq("id", review.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    return NextResponse.json({ review: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "GBP口コミ返信に失敗しました。" },
      { status: 400 }
    );
  }
}
