"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, FileChartColumn, Sparkles } from "lucide-react";
import { Button, EmptyState, Metric, Panel, Select } from "@/components/ui";
import { useKuroko } from "@/features/core/kuroko-store";
import { formatDateTime } from "@/features/core/utils";

const priorityLabels = { high: "最優先", medium: "優先", low: "継続" } as const;
const priorityStyles = {
  high: "border-coral/30 bg-coral/10 text-[#934438]",
  medium: "border-brass/35 bg-brass/10 text-[#765321]",
  low: "border-moss/30 bg-moss/10 text-[#3e5a43]"
} as const;

export default function ReportsPage() {
  const { state, generateMarketingReport } = useKuroko();
  const [storeId, setStoreId] = useState(state.stores[0]?.id || "");
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState("");
  const store = state.stores.find((item) => item.id === storeId) || state.stores[0];

  useEffect(() => {
    const requestedStoreId = new URLSearchParams(window.location.search).get("store");
    if (requestedStoreId && state.stores.some((item) => item.id === requestedStoreId)) {
      setStoreId(requestedStoreId);
    }
  }, [state.stores]);

  const reports = useMemo(
    () =>
      state.marketingReports
        .filter((report) => report.storeId === store?.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [state.marketingReports, store?.id]
  );
  const report = reports[0];
  const rankResults = state.rankResults.filter((result) => result.storeId === store?.id);
  const metrics = state.storeMetricSnapshots
    .filter((snapshot) => snapshot.storeId === store?.id && snapshot.status === "succeeded")
    .sort((a, b) => b.checkedAt.localeCompare(a.checkedAt));
  const latestMetric = metrics[0];
  const previousMetric = metrics[1];
  const reviewChange =
    latestMetric?.reviewCount !== undefined && previousMetric?.reviewCount !== undefined
      ? latestMetric.reviewCount - previousMetric.reviewCount
      : undefined;

  async function generate() {
    if (!store) return;
    setIsGenerating(true);
    setMessage("");
    try {
      await generateMarketingReport(store.id);
      setMessage("最新データからレポートを作成しました。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "レポート生成に失敗しました。");
    } finally {
      setIsGenerating(false);
    }
  }

  if (!store) {
    return <EmptyState title="店舗がまだありません" description="店舗登録後にレポートを作成できます。" />;
  }

  return (
    <div className="report-page grid gap-6">
      <div className="report-controls flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-bold text-brass">Weekly report</p>
          <h1 className="mt-1 text-3xl font-black text-ink">店舗マーケティングレポート</h1>
          <p className="mt-2 text-sm text-ink/62">順位・口コミ・店舗情報から、次に行う施策をまとめます。</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-64">
          <Select value={store.id} onChange={(event) => setStoreId(event.target.value)}>
            {state.stores.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </Select>
          <Button disabled={isGenerating} onClick={generate}>
            <Sparkles className="size-4" />
            {isGenerating ? "分析中" : "ワンクリックで作成"}
          </Button>
          {report ? (
            <Button variant="secondary" onClick={() => window.print()}>
              <Download className="size-4" />
              PDF保存・印刷
            </Button>
          ) : null}
        </div>
      </div>

      {message ? <div className="report-controls rounded-md border border-brass/35 bg-brass/10 px-4 py-3 text-sm font-semibold text-[#765321]">{message}</div> : null}

      {report ? (
        <>
          <div className="flex flex-col gap-2 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold text-ink/45">{store.industry} / {store.address}</p>
              <h2 className="mt-1 text-2xl font-black text-ink">{store.name}</h2>
            </div>
            <p className="text-xs font-semibold text-ink/50">作成日時 {formatDateTime(report.createdAt)}</p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <Metric label="追跡キーワード" value={`${store.keywords.length}件`} note={`順位履歴 ${rankResults.length}件`} />
            <Metric label="口コミ件数" value={latestMetric?.reviewCount !== undefined ? `${latestMetric.reviewCount}件` : "未取得"} note={reviewChange === undefined ? "次回取得後に比較" : `前回比 ${reviewChange >= 0 ? "+" : ""}${reviewChange}件`} />
            <Metric label="平均評価" value={latestMetric?.rating !== undefined ? latestMetric.rating.toFixed(1) : "未取得"} />
          </div>

          <Panel title="総評"><p className="text-sm leading-7 text-ink/72">{report.summary}</p></Panel>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="検索順位の分析"><p className="text-sm leading-7 text-ink/72">{report.rankingSummary}</p></Panel>
            <Panel title="口コミの分析"><p className="text-sm leading-7 text-ink/72">{report.reviewSummary}</p></Panel>
          </div>

          <Panel title="おすすめキーワード" description="次回の対策キーワード候補です。">
            <div className="flex flex-wrap gap-2">
              {report.recommendedKeywords.map((keyword) => (
                <span key={keyword} className="rounded-md border border-line bg-paper px-3 py-2 text-sm font-bold text-ink/72">{keyword}</span>
              ))}
            </div>
          </Panel>

          <Panel title="店舗で実施する対策" description="上から順に着手してください。">
            <div className="grid gap-3">
              {report.actions.map((action, index) => (
                <div key={`${action.title}-${index}`} className="grid gap-3 rounded-md border border-line bg-paper/55 p-4 sm:grid-cols-[auto_1fr]">
                  <span className={`inline-flex h-7 items-center rounded-full border px-2.5 text-xs font-bold ${priorityStyles[action.priority]}`}>{priorityLabels[action.priority]}</span>
                  <div>
                    <h3 className="font-bold text-ink">{action.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-ink/65">{action.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </>
      ) : (
        <EmptyState
          title="レポートはまだありません"
          description="順位取得後に作成すると、順位と口コミの変化を含む具体的なレポートになります。データがなくても初期施策を提案できます。"
          action={<Button onClick={generate}><FileChartColumn className="size-4" />最初のレポートを作成</Button>}
        />
      )}
    </div>
  );
}
