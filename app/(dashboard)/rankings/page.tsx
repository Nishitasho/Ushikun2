"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, FileChartColumn, RefreshCw, Search } from "lucide-react";
import { Button, EmptyState, Metric, Panel, Select } from "@/components/ui";
import type { RankResult } from "@/features/core/types";
import { useKuroko } from "@/features/core/kuroko-store";
import { formatDateTime } from "@/features/core/utils";

const sourceLabels = {
  dom: "画面データ",
  gemini_vision: "Gemini画像判定",
  none: "判定なし"
} as const;

const statusLabels = {
  succeeded: "取得済み",
  not_found: "20位以内に未検出",
  failed: "取得失敗"
} as const;

function latestByKeyword(results: RankResult[]) {
  const map = new Map<string, RankResult[]>();
  results.forEach((result) => {
    const values = map.get(result.keyword) || [];
    values.push(result);
    map.set(result.keyword, values);
  });
  map.forEach((values) => values.sort((a, b) => b.checkedAt.localeCompare(a.checkedAt)));
  return map;
}

export default function RankingsPage() {
  const { state, runRankTracking } = useKuroko();
  const [storeId, setStoreId] = useState(state.stores[0]?.id || "");
  const [isRunning, setIsRunning] = useState(false);
  const [message, setMessage] = useState("");
  const store = state.stores.find((item) => item.id === storeId) || state.stores[0];

  useEffect(() => {
    const requestedStoreId = new URLSearchParams(window.location.search).get("store");
    if (requestedStoreId && state.stores.some((item) => item.id === requestedStoreId)) {
      setStoreId(requestedStoreId);
    }
  }, [state.stores]);

  const batches = useMemo(
    () =>
      state.rankBatches
        .filter((batch) => batch.storeId === store?.id)
        .sort((a, b) => b.completedAt.localeCompare(a.completedAt)),
    [state.rankBatches, store?.id]
  );
  const results = useMemo(
    () => state.rankResults.filter((result) => result.storeId === store?.id),
    [state.rankResults, store?.id]
  );
  const metricSnapshots = useMemo(
    () =>
      state.storeMetricSnapshots
        .filter((snapshot) => snapshot.storeId === store?.id && snapshot.status === "succeeded")
        .sort((a, b) => b.checkedAt.localeCompare(a.checkedAt)),
    [state.storeMetricSnapshots, store?.id]
  );
  const grouped = useMemo(() => latestByKeyword(results), [results]);
  const latestBatch = batches[0];
  const latestSuccessfulBatch = batches.find(
    (batch) =>
      !batch.retryOf && (batch.status === "succeeded" || batch.status === "partial")
  );
  const nextRunAt = latestSuccessfulBatch
    ? new Date(new Date(latestSuccessfulBatch.completedAt).getTime() + 7 * 86400000)
    : undefined;
  const canRun = !nextRunAt || nextRunAt.getTime() <= Date.now();
  const latestMetric = metricSnapshots[0];
  const previousMetric = metricSnapshots[1];
  const reviewChange =
    latestMetric?.reviewCount !== undefined && previousMetric?.reviewCount !== undefined
      ? latestMetric.reviewCount - previousMetric.reviewCount
      : undefined;

  async function run(retryBatchId?: string) {
    if (!store) return;
    setIsRunning(true);
    setMessage("");
    try {
      const batch = await runRankTracking(store.id, retryBatchId);
      setMessage(
        batch.failedCount
          ? `${batch.succeededCount}件を取得し、${batch.failedCount}件が失敗しました。`
          : `${batch.succeededCount}件の参考順位を取得しました。`
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "順位取得に失敗しました。");
    } finally {
      setIsRunning(false);
    }
  }

  if (!store) {
    return (
      <EmptyState
        title="店舗がまだありません"
        description="店舗と対策キーワードを登録すると、Google Mapsの参考順位を確認できます。"
      />
    );
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-bold text-brass">Local rank tracking</p>
          <h1 className="mt-1 text-3xl font-black text-ink">Google Maps参考順位</h1>
          <p className="mt-2 text-sm leading-6 text-ink/62">
            7日おきに検索結果を確認します。地域・端末・時刻により変動する参考値です。
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-64">
          <Select value={store.id} onChange={(event) => setStoreId(event.target.value)}>
            {state.stores.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </Select>
          <Button disabled={isRunning || !canRun || !store.keywords.length} onClick={() => run()}>
            {isRunning ? <RefreshCw className="size-4 animate-spin" /> : <Search className="size-4" />}
            {isRunning ? "バッチ取得中" : "順位を取得"}
          </Button>
          <Link href={`/reports?store=${store.id}`}>
            <Button className="w-full" variant="secondary">
              <FileChartColumn className="size-4" />
              レポートを作成
            </Button>
          </Link>
        </div>
      </div>

      {message ? (
        <div className="rounded-md border border-brass/35 bg-brass/10 px-4 py-3 text-sm font-semibold text-[#765321]">
          {message}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <Metric label="対象キーワード" value={`${store.keywords.length}/20`} />
        <Metric
          label="最終取得"
          value={latestBatch ? formatDateTime(latestBatch.completedAt) : "未取得"}
          note={latestBatch ? `成功 ${latestBatch.succeededCount} / 失敗 ${latestBatch.failedCount}` : undefined}
        />
        <Metric
          label="次回取得可能"
          value={nextRunAt ? nextRunAt.toLocaleDateString("ja-JP") : "今すぐ"}
          note="通常取得は7日間隔"
        />
        <Metric label="取得方式" value="Playwright" />
        <Metric
          label="口コミ件数"
          value={latestMetric?.reviewCount !== undefined ? `${latestMetric.reviewCount}件` : "未取得"}
          note={reviewChange === undefined ? undefined : `前回比 ${reviewChange >= 0 ? "+" : ""}${reviewChange}件`}
        />
        <Metric
          label="平均評価"
          value={latestMetric?.rating !== undefined ? latestMetric.rating.toFixed(1) : "未取得"}
        />
      </div>

      <div className="flex items-start gap-3 rounded-md border border-sky/30 bg-sky/10 px-4 py-3 text-sm leading-6 text-[#2f5b72]">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
        順位はGoogle公式値ではありません。検索地点やパーソナライズの影響を受けるため、週次の傾向把握に利用してください。
      </div>

      <Panel
        title={`${store.name}のキーワード順位`}
        description={`${store.address}周辺を含む検索語で上位20件を確認します。`}
        className="min-w-0"
      >
        {store.keywords.length ? (
          <div className="max-w-full overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs text-ink/50">
                  <th className="px-3 py-3 font-bold">キーワード</th>
                  <th className="px-3 py-3 font-bold">参考順位</th>
                  <th className="px-3 py-3 font-bold">前回差</th>
                  <th className="px-3 py-3 font-bold">状態</th>
                  <th className="px-3 py-3 font-bold">判定</th>
                  <th className="px-3 py-3 font-bold">取得日時</th>
                </tr>
              </thead>
              <tbody>
                {store.keywords.map((keyword) => {
                  const history = grouped.get(keyword) || [];
                  const latest = history[0];
                  const previous = history[1];
                  const change = latest?.position && previous?.position
                    ? previous.position - latest.position
                    : undefined;
                  return (
                    <tr key={keyword} className="border-b border-line/70 last:border-0">
                      <td className="px-3 py-4 font-bold text-ink">{keyword}</td>
                      <td className="px-3 py-4">
                        <span className="text-lg font-black text-ink">
                          {latest?.position ? `${latest.position}位` : latest ? "圏外" : "-"}
                        </span>
                      </td>
                      <td className="px-3 py-4 font-bold">
                        {change === undefined ? "-" : change > 0 ? `↑ ${change}` : change < 0 ? `↓ ${Math.abs(change)}` : "→ 0"}
                      </td>
                      <td className="px-3 py-4">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${latest?.status === "failed" ? "border-coral/30 bg-coral/10 text-[#934438]" : "border-moss/30 bg-moss/10 text-[#3e5a43]"}`}>
                          {latest ? statusLabels[latest.status] : "未取得"}
                        </span>
                        {latest?.error ? <p className="mt-1 max-w-64 text-xs text-coral">{latest.error}</p> : null}
                      </td>
                      <td className="px-3 py-4 text-xs font-semibold text-ink/60">
                        {latest ? `${sourceLabels[latest.source]} / ${Math.round(latest.confidence * 100)}%` : "-"}
                      </td>
                      <td className="px-3 py-4 text-xs font-semibold text-ink/55">
                        {latest ? formatDateTime(latest.checkedAt) : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="対策キーワードがありません"
            description="店舗編集から順位を追跡したいキーワードを最大20件登録してください。"
          />
        )}
      </Panel>

      <Panel title="取得履歴" description="失敗したキーワードだけを再実行できます。">
        {batches.length ? (
          <div className="grid gap-2">
            {batches.slice(0, 10).map((batch) => (
              <div key={batch.id} className="flex flex-col gap-3 rounded-md border border-line bg-paper/55 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-ink">{formatDateTime(batch.completedAt)} / {batch.provider}</p>
                  <p className="mt-1 text-xs font-semibold text-ink/52">成功 {batch.succeededCount}件・失敗 {batch.failedCount}件{batch.retryOf ? "・再実行" : ""}</p>
                </div>
                {batch.failedCount && !batches.some((item) => item.retryOf === batch.id) ? (
                  <Button variant="secondary" disabled={isRunning} onClick={() => run(batch.id)}>
                    <RefreshCw className="size-4" />
                    失敗分を再実行
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink/55">順位を取得すると、ここにバッチ履歴が表示されます。</p>
        )}
      </Panel>
    </div>
  );
}
