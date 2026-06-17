import { z } from "zod";
import { generateGeminiJsonWithImage, isGeminiConfigured } from "@/lib/gemini/client";

const visionResultSchema = z.object({
  position: z.number().int().positive().nullable(),
  matchedStoreName: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  reason: z.string()
});

const storeMetricsSchema = z.object({
  rating: z.number().min(0).max(5).nullable(),
  reviewCount: z.number().int().nonnegative().nullable(),
  confidence: z.number().min(0).max(1)
});

export async function detectRankFromScreenshot(input: {
  image: Buffer;
  storeName: string;
  address: string;
  keyword: string;
  visibleResultCount: number;
}) {
  if (!isGeminiConfigured()) return null;

  const raw = await generateGeminiJsonWithImage<unknown>({
    systemInstruction:
      "あなたはGoogle Maps検索結果の目視確認担当です。画像に表示された事実だけを使い、推測で順位を作らないでください。",
    prompt: `Google Mapsの検索結果スクリーンショットです。
検索キーワード: ${input.keyword}
対象店舗名: ${input.storeName}
対象住所: ${input.address}
画面上で確認できた候補数: ${input.visibleResultCount}

対象店舗が検索結果一覧に見える場合、上から何番目かを1始まりで返してください。店名表記が多少異なる場合は住所や支店名も確認してください。見えない、判別不能、広告等で順序が不明な場合はpositionをnullにしてください。
JSON形式: {"position":1またはnull,"matchedStoreName":"表示名"またはnull,"confidence":0から1,"reason":"短い根拠"}`,
    image: input.image
  });
  return visionResultSchema.parse(raw);
}

export async function detectStoreMetricsFromScreenshot(input: {
  image: Buffer;
  storeName: string;
}) {
  if (!isGeminiConfigured()) return null;
  const raw = await generateGeminiJsonWithImage<unknown>({
    systemInstruction:
      "あなたはGoogle Maps店舗画面の数値確認担当です。画像に明確に表示された数値だけを返し、推測しないでください。",
    prompt: `対象店舗「${input.storeName}」のGoogle Maps画面です。平均評価と口コミ総件数を読み取ってください。表示されていない項目はnullにしてください。JSON形式: {"rating":4.5またはnull,"reviewCount":123またはnull,"confidence":0から1}`,
    image: input.image
  });
  return storeMetricsSchema.parse(raw);
}
