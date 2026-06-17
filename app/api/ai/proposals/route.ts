import { NextResponse } from "next/server";
import { z } from "zod";
import { generateDailyProposals } from "@/features/core/proposal-generator";
import type {
  AiProposal,
  ProposalCategory,
  ProposalPlatform,
  Store
} from "@/features/core/types";
import { includesAny, nowIso, uid } from "@/features/core/utils";
import { generateGeminiJson, isGeminiConfigured } from "@/lib/gemini/client";

const categorySchema = z.enum([
  "google_business_profile_post",
  "note_article",
  "line_message",
  "review_reply",
  "faq_aeo_article",
  "store_improvement"
]);

const platformSchema = z.enum([
  "google_business_profile",
  "note",
  "line",
  "website",
  "internal"
]);

const generatedProposalSchema = z.object({
  title: z.string().min(1),
  category: categorySchema,
  body: z.string().min(1),
  platform: platformSchema,
  goal: z.string().min(1),
  targetKeywords: z.array(z.string()).max(3)
});

const generatedProposalsSchema = z.array(generatedProposalSchema).length(6);

const requestSchema = z.object({
  stores: z.array(z.custom<Store>()).min(1).max(20)
});

const expectedPairs: Array<[ProposalCategory, ProposalPlatform]> = [
  ["google_business_profile_post", "google_business_profile"],
  ["note_article", "note"],
  ["line_message", "line"],
  ["review_reply", "google_business_profile"],
  ["faq_aeo_article", "website"],
  ["store_improvement", "internal"]
];

async function generateForStore(store: Store): Promise<AiProposal[]> {
  const prompt = `以下の店舗情報を読み、店舗固有のマーケティング提案を6件作成してください。

店舗情報:
${JSON.stringify(store, null, 2)}

必ず次の順番・カテゴリ・媒体で1件ずつ作成してください:
${expectedPairs
  .map(([category, platform], index) => `${index + 1}. ${category} / ${platform}`)
  .join("\n")}

ルール:
- 日本語で作成する
- 店舗の強み、業種、ターゲット、投稿トーンを反映する
- 対策キーワードは各提案1〜3個だけ自然に使用する
- NG表現を使用しない
- 過度な効果保証や事実不明の表現を避ける
- 来店や問い合わせにつながる具体的な導線を含める
- JSON配列のみを返す

各要素の形式:
{"title":"提案タイトル","category":"指定カテゴリ","body":"提案本文","platform":"指定媒体","goal":"狙い","targetKeywords":["キーワード"]}`;

  const raw = await generateGeminiJson<unknown>({
    systemInstruction:
      "あなたは日本の店舗ビジネスに精通したマーケティング運用担当者です。MEO、AEO、口コミ改善、LINE活用、リピーター獲得、インバウンド対策を、誠実で実行可能な表現に落とし込んでください。",
    prompt
  });
  const generated = generatedProposalsSchema.parse(raw);
  const createdAt = nowIso();

  return generated.map((proposal, index) => {
    const [category, platform] = expectedPairs[index];
    const body = proposal.body;
    return {
      id: uid("proposal"),
      storeId: store.id,
      title: proposal.title,
      category,
      body,
      platform,
      goal: proposal.goal,
      targetKeywords: proposal.targetKeywords.slice(0, 3),
      status: "draft",
      sourceType: "ai",
      riskNotes: includesAny(body, store.ngExpressions)
        ? ["NG表現候補が含まれています。確認してください。"]
        : [],
      createdAt,
      updatedAt: createdAt
    };
  });
}

export async function POST(request: Request) {
  try {
    const body = requestSchema.parse(await request.json());

    if (!isGeminiConfigured()) {
      return NextResponse.json({
        provider: "mock",
        proposals: generateDailyProposals(body.stores)
      });
    }

    const results = await Promise.allSettled(body.stores.map(generateForStore));
    const proposals = results.flatMap((result, index) =>
      result.status === "fulfilled"
        ? result.value
        : generateDailyProposals([body.stores[index]])
    );
    const usedFallback = results.some((result) => result.status === "rejected");

    return NextResponse.json({
      provider: usedFallback ? "gemini_with_mock_fallback" : "gemini",
      proposals
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "提案生成に失敗しました。";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
