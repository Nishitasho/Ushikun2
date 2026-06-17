"use client";

import Link from "next/link";
import { CheckCircle2, Clock, MessageSquareReply, Send, Sparkles } from "lucide-react";
import { Button, EmptyState, Metric, Panel, StatusBadge } from "@/components/ui";
import { categoryLabels, platformLabels } from "@/features/core/labels";
import { useKuroko } from "@/features/core/kuroko-store";
import { formatDateTime } from "@/features/core/utils";

export default function DashboardPage() {
  const {
    state,
    generateProposals,
    autoReplySafeReviews,
    autoCreateLowRiskGbpPosts
  } = useKuroko();

  const today = new Date().toDateString();
  const todaysProposals = state.proposals.filter(
    (proposal) => new Date(proposal.createdAt).toDateString() === today
  );
  const draftCount = state.proposals.filter((proposal) => proposal.status === "draft").length;
  const approvedCount = state.proposals.filter((proposal) => proposal.status === "approved").length;
  const postedCount = state.proposals.filter((proposal) => proposal.status === "posted").length;
  const repliedCount = state.googleReviews.filter((review) => review.replyStatus === "replied").length;
  const pendingReviews = state.googleReviews.filter((review) => review.replyStatus !== "replied").length;

  const byPlatform = state.proposals.reduce<Record<string, number>>((acc, proposal) => {
    acc[proposal.platform] = (acc[proposal.platform] || 0) + 1;
    return acc;
  }, {});
  const byStore = state.stores.map((store) => ({
    store,
    count: state.proposals.filter((proposal) => proposal.storeId === store.id).length
  }));

  return (
    <div className="grid gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-bold text-brass">Today&apos;s operation</p>
          <h1 className="mt-1 text-3xl font-black text-ink">本日の承認待ち</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/62">
            店舗オーナーが見るべき提案だけを短時間で確認し、承認・編集・却下できます。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => generateProposals()}>
            <Sparkles className="size-4" />
            提案を生成
          </Button>
          <Button variant="secondary" onClick={() => autoReplySafeReviews()}>
            <MessageSquareReply className="size-4" />
            安全な口コミへ自動返信
          </Button>
          <Button variant="secondary" onClick={() => autoCreateLowRiskGbpPosts()}>
            <Send className="size-4" />
            低リスク投稿を自動作成
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Metric label="本日のAI提案" value={todaysProposals.length} note="毎営業日運用の起点" />
        <Metric label="承認待ち" value={draftCount} note="最優先で確認" />
        <Metric label="承認済み" value={approvedCount} />
        <Metric label="投稿済み" value={postedCount} />
        <Metric label="口コミ返信済み" value={repliedCount} note={`未返信 ${pendingReviews}件`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <Panel title="本日のAI提案" description="承認・編集・却下の判断が必要な施策です。">
          {todaysProposals.length ? (
            <div className="grid gap-3">
              {todaysProposals.slice(0, 8).map((proposal) => {
                const store = state.stores.find((item) => item.id === proposal.storeId);
                return (
                  <Link
                    key={proposal.id}
                    href={`/proposals/${proposal.id}`}
                    className="grid gap-3 rounded-lg border border-line bg-white px-4 py-3 transition hover:border-moss/50 hover:shadow-soft sm:grid-cols-[1fr_auto]"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={proposal.status} />
                        <span className="text-xs font-bold text-ink/50">
                          {platformLabels[proposal.platform]} / {categoryLabels[proposal.category]}
                        </span>
                      </div>
                      <h3 className="mt-2 text-base font-bold text-ink">{proposal.title}</h3>
                      <p className="mt-1 text-sm text-ink/58">{store?.name}</p>
                    </div>
                    <div className="text-xs font-semibold text-ink/45">
                      {formatDateTime(proposal.createdAt)}
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title="本日の提案はまだありません"
              description="店舗情報をもとに、GBP・note・LINE・口コミ・AEO・改善案をまとめて生成できます。"
              action={
                <Button onClick={() => generateProposals()}>
                  <Sparkles className="size-4" />
                  提案を生成
                </Button>
              }
            />
          )}
        </Panel>

        <div className="grid gap-6">
          <Panel title="媒体別提案件数">
            <div className="grid gap-2">
              {Object.entries(byPlatform).map(([platform, count]) => (
                <div key={platform} className="flex items-center justify-between rounded-md bg-paper px-3 py-2">
                  <span className="text-sm font-semibold text-ink/70">
                    {platformLabels[platform as keyof typeof platformLabels]}
                  </span>
                  <span className="text-sm font-black">{count}</span>
                </div>
              ))}
              {!Object.keys(byPlatform).length ? (
                <p className="text-sm text-ink/55">提案生成後に集計されます。</p>
              ) : null}
            </div>
          </Panel>

          <Panel title="店舗別提案件数">
            <div className="grid gap-2">
              {byStore.map(({ store, count }) => (
                <div key={store.id} className="flex items-center justify-between rounded-md bg-paper px-3 py-2">
                  <span className="text-sm font-semibold text-ink/70">{store.name}</span>
                  <span className="text-sm font-black">{count}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="自動化ガード">
            <div className="grid gap-3 text-sm text-ink/65">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-4 text-moss" />
                星4から5でリスクなしの口コミだけテンプレ自動返信
              </div>
              <div className="flex items-start gap-2">
                <Clock className="mt-0.5 size-4 text-brass" />
                星1から3、クレーム、NG表現、規制業種は承認制へ戻す
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
