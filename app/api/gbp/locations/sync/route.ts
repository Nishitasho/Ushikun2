import { NextResponse } from "next/server";
import { gbpFetch, getAccessToken, getPrimaryGoogleAccount } from "@/lib/gbp/client";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type AccountsResponse = {
  accounts?: Array<{ name: string; accountName?: string }>;
};

type LocationsResponse = {
  locations?: Array<{
    name: string;
    title?: string;
    storeCode?: string;
    metadata?: { placeId?: string };
    storefrontAddress?: { addressLines?: string[]; locality?: string; administrativeArea?: string };
  }>;
};

export async function POST() {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabaseの環境変数が設定されていません。" }, { status: 500 });
  }

  try {
    const stored = await getPrimaryGoogleAccount();
    if (!stored) throw new Error("Google Business Profileアカウントが未連携です。");
    const accessToken = await getAccessToken(stored);
    const accounts = await gbpFetch<AccountsResponse>(
      "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
      accessToken
    );

    const synced = [];
    for (const account of accounts.accounts || []) {
      const locations = await gbpFetch<LocationsResponse>(
        `https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations?readMask=name,title,storeCode,metadata,storefrontAddress`,
        accessToken
      );
      for (const location of locations.locations || []) {
        const address = [
          location.storefrontAddress?.administrativeArea,
          location.storefrontAddress?.locality,
          ...(location.storefrontAddress?.addressLines || [])
        ].filter(Boolean).join(" ");
        const row = {
          google_account_id: stored.id,
          google_account_name: account.name,
          account_name: account.accountName || account.name,
          location_name: location.name,
          title: location.title || location.name,
          store_code: location.storeCode || null,
          place_id: location.metadata?.placeId || null,
          address,
          is_active: true,
          updated_at: new Date().toISOString()
        };
        const { data, error } = await supabase
          .from("store_gbp_locations")
          .upsert(row, { onConflict: "location_name" })
          .select("*")
          .single();
        if (error) throw new Error(error.message);
        synced.push(data);
      }
    }
    return NextResponse.json({ locations: synced });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "GBPロケーション同期に失敗しました。" },
      { status: 400 }
    );
  }
}
