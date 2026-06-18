import { createSupabaseServerClient } from "@/lib/supabase/server";

const GBP_SCOPES = [
  "https://www.googleapis.com/auth/business.manage"
];

type TokenResponse = {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

type StoredGoogleAccount = {
  id: string;
  google_account_name: string | null;
  account_name: string | null;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | null;
};

type GbpReview = {
  name: string;
  reviewId?: string;
  reviewer?: {
    displayName?: string;
  };
  starRating?: string;
  comment?: string;
  createTime?: string;
  updateTime?: string;
  reviewReply?: {
    comment?: string;
    updateTime?: string;
  };
};

export function isGbpConfigured() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REDIRECT_URI
  );
}

function requireGbpEnv() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Google OAuthの環境変数が不足しています。");
  }
  return { clientId, clientSecret, redirectUri };
}

export function buildGoogleOAuthUrl() {
  const { clientId, redirectUri } = requireGbpEnv();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    scope: GBP_SCOPES.join(" ")
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeGoogleCode(code: string) {
  const { clientId, clientSecret, redirectUri } = requireGbpEnv();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code"
    }),
    cache: "no-store"
  });
  const data = (await response.json()) as TokenResponse;
  if (!response.ok || data.error) {
    throw new Error(data.error_description || data.error || "Google OAuthトークン交換に失敗しました。");
  }
  return data;
}

export async function refreshGoogleAccessToken(refreshToken: string) {
  const { clientId, clientSecret } = requireGbpEnv();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token"
    }),
    cache: "no-store"
  });
  const data = (await response.json()) as TokenResponse;
  if (!response.ok || data.error) {
    throw new Error(data.error_description || data.error || "Google OAuthトークン更新に失敗しました。");
  }
  return data;
}

export function ratingFromGoogle(value?: string): 1 | 2 | 3 | 4 | 5 {
  const map: Record<string, 1 | 2 | 3 | 4 | 5> = {
    ONE: 1,
    TWO: 2,
    THREE: 3,
    FOUR: 4,
    FIVE: 5
  };
  return value ? map[value] || 3 : 3;
}

export function googleReviewId(review: GbpReview) {
  return review.reviewId || review.name.split("/").pop() || review.name;
}

export function toGbpV4LocationName(input: {
  googleAccountName?: string | null;
  locationName?: string | null;
}) {
  if (!input.locationName) {
    throw new Error("GBPロケーションが紐付いていません。");
  }
  if (input.locationName.startsWith("accounts/")) {
    return input.locationName;
  }
  if (!input.googleAccountName) {
    throw new Error("GBPアカウント名が紐付いていません。");
  }
  return `${input.googleAccountName}/${input.locationName}`;
}

export async function getPrimaryGoogleAccount() {
  const supabase = createSupabaseServerClient();
  if (!supabase) throw new Error("Supabaseの環境変数が設定されていません。");
  const { data, error } = await supabase
    .from("google_accounts")
    .select("id,google_account_name,account_name,access_token,refresh_token,expires_at")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data || null) as StoredGoogleAccount | null;
}

export async function getGoogleAccountById(id: string) {
  const supabase = createSupabaseServerClient();
  if (!supabase) throw new Error("Supabaseの環境変数が設定されていません。");
  const { data, error } = await supabase
    .from("google_accounts")
    .select("id,google_account_name,account_name,access_token,refresh_token,expires_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data || null) as StoredGoogleAccount | null;
}

export async function getAccessToken(account: StoredGoogleAccount) {
  const supabase = createSupabaseServerClient();
  if (!supabase) throw new Error("Supabaseの環境変数が設定されていません。");
  if (!account.refresh_token) throw new Error("Google refresh tokenが保存されていません。");

  const expiresAt = account.expires_at ? new Date(account.expires_at).getTime() : 0;
  if (account.access_token && expiresAt > Date.now() + 60_000) {
    return account.access_token;
  }

  const refreshed = await refreshGoogleAccessToken(account.refresh_token);
  const nextExpiresAt = refreshed.expires_in
    ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
    : null;
  const { error } = await supabase
    .from("google_accounts")
    .update({
      access_token: refreshed.access_token,
      expires_at: nextExpiresAt,
      updated_at: new Date().toISOString()
    })
    .eq("id", account.id);
  if (error) throw new Error(error.message);
  return refreshed.access_token;
}

export async function gbpFetch<T>(pathOrUrl: string, accessToken: string, init?: RequestInit) {
  const url = pathOrUrl.startsWith("http") ? pathOrUrl : `https://mybusiness.googleapis.com${pathOrUrl}`;
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers || {})
    },
    cache: "no-store"
  });
  const data = (await response.json().catch(() => ({}))) as T & { error?: { message?: string } };
  if (!response.ok) {
    throw new Error(data.error?.message || `Google Business Profile APIエラー (${response.status})`);
  }
  return data as T;
}
