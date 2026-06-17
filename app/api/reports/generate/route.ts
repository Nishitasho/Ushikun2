import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import type {
  MarketingReport,
  RankResult,
  Store,
  StoreMetricSnapshot
} from "@/features/core/types";
import { buildFallbackReport } from "@/features/reports/generator";
import { generateGeminiJson, isGeminiConfigured } from "@/lib/gemini/client";

const requestSchema = z.object({
  store: z.custom<Store>(),
  rankResults: z.array(z.custom<RankResult>()).max(100),
  storeMetrics: z.array(z.custom<StoreMetricSnapshot>()).max(20)
});

const generatedSchema = z.object({
  summary: z.string().min(1),
  rankingSummary: z.string().min(1),
  reviewSummary: z.string().min(1),
  recommendedKeywords: z.array(z.string().min(1)).min(3).max(8),
  actions: z.array(
    z.object({
      priority: z.enum(["high", "medium", "low"]),
      title: z.string().min(1),
      description: z.string().min(1)
    })
  ).min(3).max(6)
});

export async function POST(request: Request) {
  try {
    const body = requestSchema.parse(await request.json());
    const fallback = buildFallbackReport(body);
    if (!isGeminiConfigured()) {
      return NextResponse.json({ provider: "local", report: fallback });
    }

    const raw = await generateGeminiJson<unknown>({
      systemInstruction:
        "あなたは日本の店舗集客、MEO、口コミ改善に詳しい運用コンサルタントです。数字にない事実は作らず、店舗スタッフが今週実行できる内容にしてください。",
      prompt: `以下の店舗データから週次マーケティングレポートを作成してください。

店舗:
${JSON.stringify(body.store, null, 2)}

順位履歴:
${JSON.stringify(body.rankResults, null, 2)}

評価・口コミ件数履歴:
${JSON.stringify(body.storeMetrics, null, 2)}

条件:
- 日本語
- 順位は参考値として表現
- 既存キーワードと重複しないおすすめキーワードを3〜8個
- 店舗で今週実施できる対策を優先度付きで3〜6個
- 過度な効果保証をしない
- JSONのみ返す

形式:
{"summary":"総評","rankingSummary":"順位分析","reviewSummary":"口コミ分析","recommendedKeywords":["候補"],"actions":[{"priority":"high","title":"施策名","description":"実施内容"}]}`
    });
    const generated = generatedSchema.parse(raw);
    const report: MarketingReport = {
      id: randomUUID(),
      storeId: body.store.id,
      ...generated,
      createdAt: new Date().toISOString()
    };
    return NextResponse.json({ provider: "gemini", report });
  } catch (error) {
    const message = error instanceof Error ? error.message : "レポート生成に失敗しました。";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
