import { NextResponse } from "next/server";
import { z } from "zod";
import { gbpFetch, getAccessToken, getGoogleAccountById, getPrimaryGoogleAccount, toGbpV4LocationName } from "@/lib/gbp/client";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z
  .object({
    proposalId: z.string().uuid().optional(),
    gbpPostId: z.string().uuid().optional()
  })
  .refine((value) => value.proposalId || value.gbpPostId, {
    message: "proposalId または gbpPostId が必要です。"
  });

type LocalPostResponse = {
  name?: string;
  summary?: string;
  createTime?: string;
};

async function resolveLinkedLocation(supabase: NonNullable<ReturnType<typeof createSupabaseServerClient>>, storeId: string) {
  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("id,gbp_account_name,gbp_location_name")
    .eq("id", storeId)
    .single();
  if (storeError) throw new Error(storeError.message);

  const { data: linkedLocation } = await supabase
    .from("store_gbp_locations")
    .select("google_account_id,google_account_name,location_name")
    .eq("store_id", storeId)
    .maybeSingle();

  return {
    gbpLocationName: toGbpV4LocationName({
      googleAccountName: linkedLocation?.google_account_name || store.gbp_account_name,
      locationName: linkedLocation?.location_name || store.gbp_location_name
    }),
    googleAccountId: linkedLocation?.google_account_id || null
  };
}

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabaseの環境変数が設定されていません。" }, { status: 500 });
  }

  try {
    const input = schema.parse(await request.json());
    let postRecordId = input.gbpPostId || null;
    let proposalId = input.proposalId || null;
    let storeId = "";
    let title = "";
    let body = "";
    let category = "最新情報";
    let targetKeywords: string[] = [];

    if (input.gbpPostId) {
      const { data: post, error } = await supabase
        .from("gbp_posts")
        .select("id,store_id,proposal_id,title,body,category,target_keywords,status")
        .eq("id", input.gbpPostId)
        .single();
      if (error) throw new Error(error.message);
      postRecordId = post.id;
      proposalId = post.proposal_id;
      storeId = post.store_id;
      title = post.title;
      body = post.body;
      category = post.category;
      targetKeywords = post.target_keywords || [];
    } else if (input.proposalId) {
      const { data: proposal, error } = await supabase
        .from("ai_proposals")
        .select("id,store_id,title,body,category,target_keywords,status")
        .eq("id", input.proposalId)
        .single();
      if (error) throw new Error(error.message);
      if (!["approved", "posted"].includes(proposal.status)) {
        throw new Error("GBP投稿は承認済みの提案だけ実投稿できます。");
      }
      proposalId = proposal.id;
      storeId = proposal.store_id;
      title = proposal.title;
      body = proposal.body;
      category = proposal.category;
      targetKeywords = proposal.target_keywords || [];

      const { data: post, error: upsertError } = await supabase
        .from("gbp_posts")
        .upsert(
          {
            store_id: storeId,
            proposal_id: proposalId,
            title,
            body,
            category,
            target_keywords: targetKeywords,
            status: "approved",
            updated_at: new Date().toISOString()
          },
          { onConflict: "proposal_id" }
        )
        .select("id")
        .single();
      if (upsertError) throw new Error(upsertError.message);
      postRecordId = post.id;
    }

    const linked = await resolveLinkedLocation(supabase, storeId);
    const account = linked.googleAccountId
      ? await getGoogleAccountById(linked.googleAccountId)
      : await getPrimaryGoogleAccount();
    if (!account) throw new Error("Google Business Profileアカウントが未連携です。");
    const accessToken = await getAccessToken(account);
    const localPost = await gbpFetch<LocalPostResponse>(`/v4/${linked.gbpLocationName}/localPosts`, accessToken, {
      method: "POST",
      body: JSON.stringify({
        languageCode: "ja",
        summary: body,
        topicType: "STANDARD"
      })
    });

    const now = localPost.createTime || new Date().toISOString();
    const { data: publishedPost, error: postError } = await supabase
      .from("gbp_posts")
      .update({
        google_post_id: localPost.name || null,
        status: "posted",
        posted_at: now,
        updated_at: new Date().toISOString()
      })
      .eq("id", postRecordId)
      .select("*")
      .single();
    if (postError) throw new Error(postError.message);

    if (proposalId) {
      await supabase
        .from("ai_proposals")
        .update({
          status: "posted",
          posted_at: now,
          updated_at: new Date().toISOString()
        })
        .eq("id", proposalId);
    }

    return NextResponse.json({ post: publishedPost, googlePost: localPost });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "GBP投稿に失敗しました。" },
      { status: 400 }
    );
  }
}
