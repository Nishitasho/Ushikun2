import { NextResponse } from "next/server";
import { buildGoogleOAuthUrl } from "@/lib/gbp/client";

export function GET() {
  try {
    return NextResponse.redirect(buildGoogleOAuthUrl());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google OAuthを開始できませんでした。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
