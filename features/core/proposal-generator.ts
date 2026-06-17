import type { AiProposal, ProposalCategory, ProposalPlatform, Store } from "./types";
import { includesAny, nowIso, uid } from "./utils";

type Template = {
  category: ProposalCategory;
  platform: ProposalPlatform;
  title: (store: Store, keywords: string[]) => string;
  body: (store: Store, keywords: string[]) => string;
  goal: string;
};

function pickKeywords(store: Store, start = 0) {
  const fallback = [store.industry, store.address.split(/[都道府県市区町村]/)[0]].filter(Boolean);
  const source = store.keywords.length ? store.keywords : fallback;
  return source.slice(start, start + 3);
}

const templates: Template[] = [
  {
    category: "google_business_profile_post",
    platform: "google_business_profile",
    title: (store, keywords) => `${store.name}の今週の来店導線投稿`,
    body: (store, keywords) =>
      `${store.name}では、${store.services.split("、")[0] || store.services}をゆっくり楽しめる時間をご用意しています。\n\n${store.strengths}\n\n${keywords.slice(0, 2).join("、")}でお店をお探しの方は、営業時間をご確認のうえご来店ください。ご予約・お問い合わせはお電話から承ります。`,
    goal: "Googleマップ上で店舗の強みと来店導線を明確にし、MEO経由の新規来店を増やす。"
  },
  {
    category: "note_article",
    platform: "note",
    title: (store, keywords) => `${store.industry}として伝えたい一次情報記事`,
    body: (store, keywords) =>
      `テーマ: ${keywords[0] || store.industry}を探す方に向けた、${store.name}ならではの選び方\n\n導入: 店舗選びで迷いやすいポイントを整理し、${store.targetCustomers}に向けて判断材料を提供します。\n\n本文構成:\n1. ${store.industry}選びで見落とされやすい観点\n2. ${store.name}が大切にしている体験\n3. ${store.services}の活用シーン\n4. 初めての方が安心して来店するための確認事項\n\nまとめ: 強引な訴求ではなく、専門性と一次情報で信頼を積み上げます。`,
    goal: "AEOで引用されやすい一次情報を増やし、検索意図ごとの接点を作る。"
  },
  {
    category: "line_message",
    platform: "line",
    title: (store) => `${store.name} LINE再来店配信`,
    body: (store) =>
      `${store.name}からのお知らせです。\n\n今週は${store.services.split("、")[0] || "おすすめメニュー"}を落ち着いて楽しみたい方に向けて、お席をご案内しやすい日程があります。\n\n記念日・接待・ご友人とのお食事など、用途に合わせてお気軽にご相談ください。\n\nご予約はこのLINEへの返信、またはお電話で承ります。`,
    goal: "既存顧客への自然な再来店導線を作り、LINEの稼働価値を高める。"
  },
  {
    category: "review_reply",
    platform: "google_business_profile",
    title: () => "高評価口コミへの返信案",
    body: (store) =>
      `この度は${store.name}へご来店いただき、温かいご評価をありがとうございます。\n\nいただいたお声を励みに、次回も${store.strengths.split("。")[0]}を感じていただけるよう努めてまいります。またのご来店を心よりお待ちしております。`,
    goal: "口コミ返信率を高め、GBP上の信頼感と比較検討時の安心感を改善する。"
  },
  {
    category: "faq_aeo_article",
    platform: "website",
    title: (store, keywords) => `${keywords[0] || store.industry}のFAQ型AEO記事`,
    body: (store, keywords) =>
      `Q. ${keywords[0] || store.industry}を選ぶとき、何を確認すればよいですか？\nA. 目的、場所、利用シーン、予約のしやすさ、店舗の専門性を確認すると選びやすくなります。${store.name}では${store.strengths}\n\nQ. 初めてでも利用しやすいですか？\nA. ${store.targetCustomers}の方にも使いやすいよう、事前相談と来店前の案内を大切にしています。\n\nQ. 予約前に確認すべきことは？\nA. 営業時間、定休日、希望日時、人数、利用目的を確認してください。`,
    goal: "AI検索に拾われやすいFAQ構造で、AEO対策と不安解消を同時に進める。"
  },
  {
    category: "store_improvement",
    platform: "internal",
    title: () => "GBP店舗情報改善案",
    body: (store, keywords) =>
      `改善提案:\n1. GBP説明文に「${keywords.slice(0, 2).join("」「")}」を自然に追加する。\n2. サービス欄に「${store.services.split("、").slice(0, 3).join("」「")}」を個別登録する。\n3. 写真追加は外観、店内、主要サービス、スタッフ対応の4系統で揃える。\n4. 競合「${store.competitors[0] || "近隣店舗"}」と比較される前提で、${store.strengths.split("。")[0]}を最初に伝える。`,
    goal: "NAP・サービス・写真・キーワードの不足を減らし、MEOの土台を整える。"
  }
];

export function generateDailyProposals(stores: Store[]) {
  const createdAt = nowIso();

  return stores.flatMap((store) =>
    templates.map((template, index): AiProposal => {
      const keywords = pickKeywords(store, index % Math.max(store.keywords.length, 1)).slice(0, 3);
      const body = template.body(store, keywords);
      const hasNg = includesAny(body, store.ngExpressions);

      return {
        id: uid("proposal"),
        storeId: store.id,
        title: template.title(store, keywords),
        category: template.category,
        body,
        platform: template.platform,
        goal: template.goal,
        targetKeywords: keywords,
        status: "draft",
        sourceType: "ai",
        riskNotes: hasNg ? ["NG表現候補が含まれています。確認してください。"] : [],
        createdAt,
        updatedAt: createdAt
      };
    })
  );
}

export function buildGbpPostFromProposal(proposal: AiProposal): AiProposal {
  return {
    ...proposal,
    id: uid("proposal"),
    category: "gbp_post",
    platform: "google_business_profile",
    title: `自動投稿候補: ${proposal.title}`,
    sourceType: "template_auto",
    status: "draft",
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
}
