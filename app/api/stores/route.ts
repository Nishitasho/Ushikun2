import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const storeInputSchema = z.object({
  name: z.string().trim().min(1),
  industry: z.string().trim().min(1),
  address: z.string().optional().default(""),
  phoneNumber: z.string().optional().default(""),
  businessHours: z.string().optional().default(""),
  regularHolidays: z.string().optional().default(""),
  services: z.string().optional().default(""),
  strengths: z.string().optional().default(""),
  targetCustomers: z.string().optional().default(""),
  keywords: z.array(z.string().trim().min(1)).max(20).default([]),
  competitors: z.array(z.string().trim().min(1)).default([]),
  postTone: z.string().optional().default(""),
  ngExpressions: z.array(z.string().trim().min(1)).default([]),
  postAutomationMode: z.enum(["approval", "semi_auto", "full_auto"]).default("approval"),
  reviewAutomationMode: z.enum(["approval", "semi_auto", "full_auto"]).default("approval"),
  postFrequencyPerMonth: z.number().int().min(0).max(31).default(20),
  gbpLocationName: z.string().optional().default("")
});

const defaultTemplateBodyByRating = {
  5: "{reviewer_name}様、この度はご来店いただき、温かいお言葉をありがとうございます。次回もご満足いただけるよう準備してお待ちしております。",
  4: "{reviewer_name}様、ご来店とご評価をありがとうございます。より心地よい時間をお届けできるよう、いただいたお声を日々の改善に活かしてまいります。",
  3: "{reviewer_name}様、ご来店いただきありがとうございます。さらにご満足いただけるよう、改善点を店舗内で確認してまいります。",
  2: "{reviewer_name}様、この度はご期待に沿えず申し訳ございません。差し支えなければ、詳細を店舗までお知らせいただけますと幸いです。真摯に確認し改善に努めます。",
  1: "{reviewer_name}様、ご不快な思いをおかけし申し訳ございません。事実確認のうえ改善に努めますので、恐れ入りますが店舗まで個別にご連絡ください。"
} as const;

async function getOrCreateDefaultOrganization() {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    throw new Error("Supabaseの環境変数が設定されていません。");
  }

  const organizationName = "牛くんずAI 初期運用";
  const { data: existing, error: selectError } = await supabase
    .from("organizations")
    .select("id")
    .eq("name", organizationName)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (selectError) {
    throw new Error(selectError.message);
  }
  if (existing?.id) {
    return existing.id as string;
  }

  const { data: inserted, error: insertError } = await supabase
    .from("organizations")
    .insert({ name: organizationName })
    .select("id")
    .single();

  if (insertError) {
    throw new Error(insertError.message);
  }

  return inserted.id as string;
}

export async function GET() {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabaseの環境変数が設定されていません。" },
      { status: 500 }
    );
  }

  const { data, error } = await supabase
    .from("stores")
    .select("id,name,industry,address,created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ stores: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabaseの環境変数が設定されていません。" },
      { status: 500 }
    );
  }

  try {
    const input = storeInputSchema.parse(await request.json());
    const organizationId = await getOrCreateDefaultOrganization();

    const { data: store, error: storeError } = await supabase
      .from("stores")
      .insert({
        organization_id: organizationId,
        name: input.name,
        industry: input.industry,
        address: input.address,
        phone_number: input.phoneNumber,
        business_hours: input.businessHours ? { text: input.businessHours } : null,
        regular_holidays: input.regularHolidays,
        services: input.services,
        strengths: input.strengths,
        target_customers: input.targetCustomers,
        competitors: input.competitors,
        post_tone: input.postTone,
        ng_expressions: input.ngExpressions,
        post_automation_mode: input.postAutomationMode,
        review_automation_mode: input.reviewAutomationMode,
        post_frequency_per_month: input.postFrequencyPerMonth,
        gbp_location_name: input.gbpLocationName || null
      })
      .select("id,name,industry,created_at")
      .single();

    if (storeError) {
      throw new Error(storeError.message);
    }

    if (input.keywords.length > 0) {
      const { error: keywordError } = await supabase.from("store_keywords").insert(
        input.keywords.map((keyword, index) => ({
          store_id: store.id,
          keyword,
          priority: index + 1,
          is_active: true
        }))
      );

      if (keywordError) {
        throw new Error(keywordError.message);
      }
    }

    const { error: templateError } = await supabase.from("review_reply_templates").insert(
      ([5, 4, 3, 2, 1] as const).map((rating) => ({
        store_id: store.id,
        rating,
        industry: input.industry,
        template_name: `星${rating} 標準返信`,
        template_body: defaultTemplateBodyByRating[rating],
        is_active: true
      }))
    );

    if (templateError) {
      throw new Error(templateError.message);
    }

    return NextResponse.json({ store }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "店舗情報の保存に失敗しました。"
      },
      { status: 400 }
    );
  }
}
