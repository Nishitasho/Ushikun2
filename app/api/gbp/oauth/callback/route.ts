import { NextResponse } from "next/server";
import { exchangeGoogleCode, gbpFetch } from "@/lib/gbp/client";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type AccountsResponse = {
  accounts?: Array<{
    name: string;
    accountName?: string;
    type?: string;
  }>;
};

export async function GET(request: Request) {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabaseの環境変数が設定されていません。" }, { status: 500 });
  }

  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    if (!code) throw new Error("Google OAuth codeがありません。");

    const token = await exchangeGoogleCode(code);
    const expiresAt = token.expires_in
      ? new Date(Date.now() + token.expires_in * 1000).toISOString()
      : null;
    let accounts: AccountsResponse = {};
    let accountFetchError = "";
    try {
      accounts = await gbpFetch<AccountsResponse>(
        "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
        token.access_token
      );
    } catch (error) {
      accountFetchError = error instanceof Error ? error.message : "GBPアカウント一覧取得に失敗しました。";
      console.warn("[GBP OAuth] account list fetch failed", { accountFetchError });
    }
    const account = accounts.accounts?.[0];

    const row = {
      google_account_name: account?.name || null,
      account_name: account?.accountName || account?.name || "Google OAuth連携済み",
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      expires_at: expiresAt,
      scopes: token.scope ? token.scope.split(" ") : [],
      is_active: true,
      updated_at: new Date().toISOString()
    };
    const query = supabase.from("google_accounts");
    const { error } = account?.name
      ? await query.upsert(row, { onConflict: "google_account_name" })
      : await query.insert(row);
    if (error) throw new Error(error.message);
    console.info("[GBP OAuth] account saved", {
      hasGoogleAccountName: Boolean(account?.name),
      hasRefreshToken: Boolean(token.refresh_token),
      expiresAt,
      scopesCount: row.scopes.length,
      accountFetchError: Boolean(accountFetchError)
    });

    const redirectUrl = new URL("/gbp", request.url);
    redirectUrl.searchParams.set("connected", "1");
    redirectUrl.searchParams.set("accounts", String(accounts.accounts?.length || 0));
    if (accountFetchError) redirectUrl.searchParams.set("accountFetch", "failed");
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error("[GBP OAuth] callback failed", error);
    const message = encodeURIComponent(
      error instanceof Error ? error.message : "Google OAuth連携に失敗しました。"
    );
    return NextResponse.redirect(new URL(`/gbp?error=${message}`, request.url));
  }
}
