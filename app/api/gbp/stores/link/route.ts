import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  storeId: z.string().uuid(),
  locationId: z.string().uuid()
});

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabaseの環境変数が設定されていません。" }, { status: 500 });
  }

  try {
    const body = schema.parse(await request.json());
    const { data: location, error: locationError } = await supabase
      .from("store_gbp_locations")
      .select("*")
      .eq("id", body.locationId)
      .single();
    if (locationError) throw new Error(locationError.message);

    const { error: updateError } = await supabase
      .from("stores")
      .update({
        gbp_account_name: location.google_account_name,
        gbp_location_name: location.location_name,
        gbp_place_id: location.place_id,
        updated_at: new Date().toISOString()
      })
      .eq("id", body.storeId);
    if (updateError) throw new Error(updateError.message);

    const { error: linkError } = await supabase
      .from("store_gbp_locations")
      .update({ store_id: body.storeId, updated_at: new Date().toISOString() })
      .eq("id", body.locationId);
    if (linkError) throw new Error(linkError.message);

    return NextResponse.json({ linked: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "店舗とGBPロケーションの紐付けに失敗しました。" },
      { status: 400 }
    );
  }
}
