import { NextResponse } from "next/server";

export function GET() {
  const googleOAuthEnv = {
    googleClientId: Boolean(process.env.GOOGLE_CLIENT_ID),
    googleClientSecret: Boolean(process.env.GOOGLE_CLIENT_SECRET),
    googleRedirectUri: Boolean(process.env.GOOGLE_REDIRECT_URI)
  };
  const credentials = {
    supabase: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
        process.env.SUPABASE_SERVICE_ROLE_KEY
    ),
    gemini: Boolean(process.env.GEMINI_API_KEY),
    googleBusinessProfile: Boolean(
      googleOAuthEnv.googleClientId &&
        googleOAuthEnv.googleClientSecret &&
        googleOAuthEnv.googleRedirectUri
    ),
    rankTracking: process.env.RANK_TRACKING_PROVIDER !== "disabled"
  };

  return NextResponse.json({
    mode:
      credentials.supabase || credentials.gemini || credentials.googleBusinessProfile
        ? "configured"
        : "demo",
    credentials,
    googleOAuthEnv
  });
}
