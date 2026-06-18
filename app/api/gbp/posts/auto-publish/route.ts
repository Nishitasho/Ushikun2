import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabaseの環境変数が設定されていません。" }, { status: 500 });
  }

  try {
    const { data: posts, error } = await supabase
      .from("gbp_posts")
      .select("id,stores(post_automation_mode)")
      .in("status", ["approved", "scheduled"])
      .limit(10);
    if (error) throw new Error(error.message);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:3000";
    const results = [];
    for (const post of posts || []) {
      const store = Array.isArray(post.stores) ? post.stores[0] : post.stores;
      if (!store || store.post_automation_mode === "approval") continue;

      const response = await fetch(`${baseUrl}/api/gbp/posts/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gbpPostId: post.id })
      });
      const data = await response.json();
      results.push({ gbpPostId: post.id, ok: response.ok, data });
    }

    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "GBP自動投稿に失敗しました。" },
      { status: 400 }
    );
  }
}
