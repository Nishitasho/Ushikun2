"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  CircleAlert,
  Database,
  FileChartColumn,
  KeyRound,
  MapPinned,
  MessageSquareText,
  Rocket,
  Store as StoreIcon
} from "lucide-react";
import { Button, Metric, Panel } from "@/components/ui";
import { useKuroko } from "@/features/core/kuroko-store";
import { formatDateTime } from "@/features/core/utils";

type Status = {
  mode: "demo" | "configured";
  credentials: {
    supabase: boolean;
    gemini: boolean;
    googleBusinessProfile: boolean;
    rankTracking: boolean;
  };
};

type LaunchItem = {
  title: string;
  done: boolean;
  detail: string;
  href?: string;
  action?: string;
};

function StatusIcon({ done }: { done: boolean }) {
  return done ? (
    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-moss" />
  ) : (
    <CircleAlert className="mt-0.5 size-5 shrink-0 text-brass" />
  );
}

export default function LaunchPage() {
  const { state, generateProposals } = useKuroko();
  const [status, setStatus] = useState<Status>();

  useEffect(() => {
    fetch("/api/system/status")
      .then((response) => response.json())
      .then((data) => setStatus(data as Status))
      .catch(() => undefined);
  }, []);

  const firstStore = state.stores[0];
  const trackedStores = state.stores.filter((store) => store.keywords.length > 0);
  const latestRankBatch = [...state.rankBatches].sort((a, b) =>
    b.completedAt.localeCompare(a.completedAt)
  )[0];
  const latestReport = [...state.marketingReports].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  )[0];
  const draftProposals = state.proposals.filter((proposal) => proposal.status === "draft");
  const approvedOrPosted = state.proposals.filter((proposal) =>
    ["approved", "posted"].includes(proposal.status)
  );

  const launchItems = useMemo<LaunchItem[]>(
    () => [
      {
        title: "実店舗を1件登録",
        done: state.stores.length > 0,
        detail: state.stores.length
          ? `${state.stores.length}店舗登録済み`
          : "Google Maps URLから読み取って、足りない情報だけ補完します。",
        href: "/stores/new",
        action: "店舗を登録"
      },
      {
        title: "対策キーワードを設定",
        done: trackedStores.length > 0,
        detail: trackedStores.length
          ? `${trackedStores.length}店舗でキーワード設定済み`
          : "順位取得とレポートの軸になるため、まず5〜20個登録します。",
        href: firstStore ? `/stores/${firstStore.id}/edit` : "/stores/new",
        action: "キーワードを確認"
      },
      {
        title: "AI提案を作成",
        done: state.proposals.length > 0,
        detail: state.proposals.length
          ? `${state.proposals.length}件作成済み、承認待ち${draftProposals.length}件`
          : "店舗情報から投稿・口コミ・FAQ・改善提案を生成します。",
        href: "/proposals",
        action: "提案を見る"
      },
      {
        title: "検索順位と口コミ指標を取得",
        done: Boolean(latestRankBatch),
        detail: latestRankBatch
          ? `最終取得 ${formatDateTime(latestRankBatch.completedAt)}`
          : "Google Mapsから参考順位、平均評価、口コミ件数を取得します。",
        href: "/rankings",
        action: "順位を取得"
      },
      {
        title: "運用レポートを作成",
        done: Boolean(latestReport),
        detail: latestReport
          ? `最終作成 ${formatDateTime(latestReport.createdAt)}`
          : "順位・口コミ・店舗情報から次の施策をまとめます。",
        href: "/reports",
        action: "レポート作成"
      },
      {
        title: "Gemini APIを設定",
        done: Boolean(status?.credentials.gemini),
        detail: status?.credentials.gemini
          ? "AI提案とレポートでGeminiを利用できます。"
          : "未設定でも動きますが、提案品質を上げるには設定推奨です。",
        href: "/settings",
        action: "設定確認"
      },
      {
        title: "Supabase本番DBを設定",
        done: Boolean(status?.credentials.supabase),
        detail: status?.credentials.supabase
          ? "Supabase環境変数が設定されています。"
          : "本番運用ではブラウザ保存からDB保存へ切り替えます。",
        href: "/settings",
        action: "設定確認"
      },
      {
        title: "GBP OAuth連携を準備",
        done: Boolean(status?.credentials.googleBusinessProfile),
        detail: status?.credentials.googleBusinessProfile
          ? "Google Business Profile認証情報があります。"
          : "実投稿・実返信にはGoogle CloudとGBP権限が必要です。",
        href: "/settings",
        action: "準備を見る"
      }
    ],
    [
      draftProposals.length,
      firstStore,
      latestRankBatch,
      latestReport,
      state.proposals.length,
      state.stores.length,
      status?.credentials.gemini,
      status?.credentials.googleBusinessProfile,
      status?.credentials.supabase,
      trackedStores.length
    ]
  );

  const completedCount = launchItems.filter((item) => item.done).length;
  const readyRate = Math.round((completedCount / launchItems.length) * 100);
  const nextItem = launchItems.find((item) => !item.done);

  return (
    <div className="grid gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-bold text-brass">Launch control</p>
          <h1 className="mt-1 text-3xl font-black text-ink">運用開始</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/62">
            実店舗運用に必要な準備を上から順に潰していきます。まずは1店舗で小さく回し、提案・順位・レポートの流れを確認します。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/stores/new">
            <Button>
              <StoreIcon className="size-4" />
              店舗登録
            </Button>
          </Link>
          <Button variant="secondary" onClick={() => generateProposals()}>
            <MessageSquareText className="size-4" />
            提案作成
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Metric label="準備進捗" value={`${readyRate}%`} note={`${completedCount}/${launchItems.length} 完了`} />
        <Metric label="登録店舗" value={state.stores.length} note={`${trackedStores.length}店舗でキーワードあり`} />
        <Metric label="AI提案" value={state.proposals.length} note={`承認/投稿 ${approvedOrPosted.length}件`} />
        <Metric label="本番連携" value={status?.mode === "configured" ? "一部設定済み" : "未設定"} note="まずはデモで運用確認" />
      </div>

      <Panel
        title="次にやること"
        description="迷ったらこの1つだけ進めれば大丈夫です。"
        action={
          nextItem?.href ? (
            <Link href={nextItem.href}>
              <Button>
                <Rocket className="size-4" />
                {nextItem.action || "進める"}
              </Button>
            </Link>
          ) : null
        }
      >
        {nextItem ? (
          <div className="flex items-start gap-3 rounded-md border border-brass/35 bg-brass/10 p-4">
            <StatusIcon done={false} />
            <div>
              <h2 className="font-bold text-ink">{nextItem.title}</h2>
              <p className="mt-1 text-sm leading-6 text-ink/65">{nextItem.detail}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 rounded-md border border-moss/30 bg-moss/10 p-4">
            <StatusIcon done />
            <div>
              <h2 className="font-bold text-ink">初期運用の準備は揃っています</h2>
              <p className="mt-1 text-sm leading-6 text-ink/65">
                週次で順位取得、AI提案、レポート作成を回し、承認済み施策を投稿履歴に残してください。
              </p>
            </div>
          </div>
        )}
      </Panel>

      <Panel title="運用開始チェックリスト">
        <div className="grid gap-3">
          {launchItems.map((item) => (
            <div
              key={item.title}
              className="grid gap-3 rounded-md border border-line bg-white px-4 py-4 sm:grid-cols-[1fr_auto]"
            >
              <div className="flex items-start gap-3">
                <StatusIcon done={item.done} />
                <div>
                  <h3 className="font-bold text-ink">{item.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-ink/60">{item.detail}</p>
                </div>
              </div>
              {item.href ? (
                <Link href={item.href}>
                  <Button variant={item.done ? "secondary" : "primary"} className="w-full sm:w-auto">
                    {item.action || "開く"}
                  </Button>
                </Link>
              ) : null}
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="毎日の運用">
          <div className="grid gap-3 text-sm leading-6 text-ink/66">
            <div className="flex gap-2"><MessageSquareText className="mt-1 size-4 text-brass" />AI提案を確認し、必要なら編集して承認します。</div>
            <div className="flex gap-2"><CheckCircle2 className="mt-1 size-4 text-moss" />承認済みの投稿・口コミ返信だけを実行対象にします。</div>
          </div>
        </Panel>
        <Panel title="週次の運用">
          <div className="grid gap-3 text-sm leading-6 text-ink/66">
            <div className="flex gap-2"><MapPinned className="mt-1 size-4 text-sky" />順位と口コミ件数を取得して、変化を確認します。</div>
            <div className="flex gap-2"><FileChartColumn className="mt-1 size-4 text-brass" />レポートを作成し、次週の施策を決めます。</div>
          </div>
        </Panel>
        <Panel title="本番化の準備">
          <div className="grid gap-3 text-sm leading-6 text-ink/66">
            <div className="flex gap-2"><KeyRound className="mt-1 size-4 text-brass" />GeminiとGoogle OAuthのキーを設定します。</div>
            <div className="flex gap-2"><Database className="mt-1 size-4 text-moss" />Supabaseへ保存先を移し、複数端末で使える状態にします。</div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
