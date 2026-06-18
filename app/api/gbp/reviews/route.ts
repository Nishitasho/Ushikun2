import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabaseの環境変数が設定されていません。" }, { status: 500 });
  }

  const url = new URL(request.url);
  const storeId = url.searchParams.get("storeId");
  let query = supabase
    .from("google_reviews")
    .select("*,stores(id,name,industry,address)")
    .order("review_created_at", { ascending: false })
    .limit(100);

  if (storeId && storeId !== "all") {
    query = query.eq("store_id", storeId);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ reviews: data || [] });
}
