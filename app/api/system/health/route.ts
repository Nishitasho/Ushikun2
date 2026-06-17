import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type CheckResult = {
  ok: boolean;
  message: string;
  details?: Record<string, unknown>;
};

async function testSupabase(): Promise<CheckResult> {
  const client = createSupabaseServerClient();
  if (!client) {
    return {
      ok: false,
      message: "Supabaseの環境変数が不足しています。"
    };
  }

  const { count, error } = await client
    .from("stores")
    .select("id", { count: "exact", head: true });

  if (error) {
    return {
      ok: false,
      message: error.message,
      details: { code: error.code }
    };
  }

  return {
    ok: true,
    message: "Supabaseへ接続できました。",
    details: { storesCount: count ?? 0 }
  };
}

async function testStoresTable(): Promise<CheckResult> {
  const client = createSupabaseServerClient();
  if (!client) {
    return {
      ok: false,
      message: "Supabaseの環境変数が不足しています。"
    };
  }

  const { data, error } = await client
    .from("stores")
    .select("id,name,industry,created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    return {
      ok: false,
      message: error.message,
      details: { code: error.code }
    };
  }

  return {
    ok: true,
    message: "storesテーブルを取得できました。",
    details: {
      rows: data?.length ?? 0,
      stores: data ?? []
    }
  };
}

async function testGemini(): Promise<CheckResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  if (!apiKey) {
    return {
      ok: false,
      message: "GEMINI_API_KEYが設定されていません。"
    };
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: "接続確認です。JSONで {\"ok\": true, \"service\": \"gemini\"} だけ返してください。"
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0
        }
      }),
      cache: "no-store"
    }
  );

  const data = (await response.json().catch(() => ({}))) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    error?: { message?: string };
  };

  if (!response.ok) {
    return {
      ok: false,
      message: data.error?.message || `Gemini APIエラー (${response.status})`,
      details: { model }
    };
  }

  const text = data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || "")
    .join("")
    .trim();

  return {
    ok: Boolean(text),
    message: text ? "Gemini APIへ接続できました。" : "Gemini APIの応答が空でした。",
    details: { model, response: text || null }
  };
}

export async function GET() {
  const [supabase, gemini, stores] = await Promise.all([
    testSupabase(),
    testGemini(),
    testStoresTable()
  ]);

  return NextResponse.json({
    ok: supabase.ok && gemini.ok && stores.ok,
    checkedAt: new Date().toISOString(),
    env: {
      NEXT_PUBLIC_SUPABASE_URL: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      GEMINI_API_KEY: Boolean(process.env.GEMINI_API_KEY),
      GEMINI_MODEL: process.env.GEMINI_MODEL || "gemini-2.5-flash"
    },
    checks: {
      supabase,
      gemini,
      stores
    }
  });
}
