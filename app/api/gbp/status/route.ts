import { NextResponse } from "next/server";
import { isGbpConfigured } from "@/lib/gbp/client";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabaseの環境変数が設定されていません。" }, { status: 500 });
  }

  const [accounts, locations, stores] = await Promise.all([
    supabase.from("google_accounts").select("id,google_account_name,account_name,is_active,created_at").order("created_at", { ascending: false }),
    supabase.from("store_gbp_locations").select("*").order("created_at", { ascending: false }),
    supabase.from("stores").select("id,name,gbp_account_name,gbp_location_name").is("deleted_at", null).order("created_at", { ascending: false })
  ]);

  if (accounts.error || locations.error) {
    const message = accounts.error?.message || locations.error?.message || "";
    if (message.includes("Could not find the table") || message.includes("does not exist")) {
      return NextResponse.json({
        configured: isGbpConfigured(),
        setupRequired: true,
        accounts: [],
        locations: [],
        stores: stores.data || []
      });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
  if (stores.error) return NextResponse.json({ error: stores.error.message }, { status: 500 });

  return NextResponse.json({
    configured: isGbpConfigured(),
    setupRequired: false,
    accounts: accounts.data || [],
    locations: locations.data || [],
    stores: stores.data || []
  });
}
