"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { EmptyState, Input, Panel, Select, StatusBadge } from "@/components/ui";
import {
  categoryLabels,
  categoryOptions,
  platformLabels,
  platformOptions,
  statusLabels
} from "@/features/core/labels";
import { useKuroko } from "@/features/core/kuroko-store";
import type { ProposalCategory, ProposalPlatform, ProposalStatus } from "@/features/core/types";
import { formatDate, formatDateTime } from "@/features/core/utils";

const historyStatuses: ProposalStatus[] = ["approved", "posted"];

export default function HistoryPage() {
  const { state } = useKuroko();
  const [query, setQuery] = useState("");
  const [storeId, setStoreId] = useState("all");
  const [platform, setPlatform] = useState<ProposalPlatform | "all">("all");
  const [category, setCategory] = useState<ProposalCategory | "all">("all");
  const [status, setStatus] = useState<ProposalStatus | "all">("all");
  const [date, setDate] = useState("");

  const history = useMemo(() => {
    return state.proposals
      .filter((proposal) => historyStatuses.includes(proposal.status))
      .filter((proposal) => {
        const store = state.stores.find((item) => item.id === proposal.storeId);
        const dateTarget = proposal.postedAt || proposal.approvedAt || proposal.updatedAt;
        return (
          `${proposal.title} ${proposal.body} ${store?.name || ""}`
            .toLowerCase()
            .includes(query.toLowerCase()) &&
          (storeId === "all" || proposal.storeId === storeId) &&
          (platform === "all" || proposal.platform === platform) &&
          (category === "all" || proposal.category === category) &&
          (status === "all" || proposal.status === status) &&
          (!date || new Date(dateTarget).toISOString().slice(0, 10) === date)
        );
      });
  }, [category, date, platform, query, state.proposals, state.stores, status, storeId]);

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-sm font-bold text-brass">Publication history</p>
        <h1 className="mt-1 text-3xl font-black text-ink">投稿履歴一覧</h1>
        <p className="mt-2 text-sm text-ink/62">
          承認済み・投稿済みになった提案を、店舗・媒体・カテゴリ・日付で検索します。
        </p>
      </div>

      <Panel>
        <div className="grid gap-3 lg:grid-cols-[1.2fr_repeat(5,0.7fr)]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink/38" />
            <Input
              className="pl-9"
              placeholder="店舗名、タイトル、本文で検索"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <Select value={storeId} onChange={(event) => setStoreId(event.target.value)}>
            <option value="all">全店舗</option>
            {state.stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </Select>
          <Select
            value={platform}
            onChange={(event) => setPlatform(event.target.value as ProposalPlatform | "all")}
          >
            <option value="all">全媒体</option>
            {platformOptions.map((item) => (
              <option key={item} value={item}>
                {platformLabels[item]}
              </option>
            ))}
          </Select>
          <Select
            value={category}
            onChange={(event) => setCategory(event.target.value as ProposalCategory | "all")}
          >
            <option value="all">全カテゴリ</option>
            {categoryOptions.map((item) => (
              <option key={item} value={item}>
                {categoryLabels[item]}
              </option>
            ))}
          </Select>
          <Select
            value={status}
            onChange={(event) => setStatus(event.target.value as ProposalStatus | "all")}
          >
            <option value="all">全ステータス</option>
            {historyStatuses.map((item) => (
              <option key={item} value={item}>
                {statusLabels[item]}
              </option>
            ))}
          </Select>
          <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </div>
      </Panel>

      <Panel>
        {history.length ? (
          <div className="grid gap-3">
            {history.map((proposal) => {
              const store = state.stores.find((item) => item.id === proposal.storeId);
              const dateTarget = proposal.postedAt || proposal.approvedAt || proposal.updatedAt;
              return (
                <Link
                  key={proposal.id}
                  href={`/proposals/${proposal.id}`}
                  className="grid gap-3 rounded-lg border border-line bg-white px-4 py-4 transition hover:border-moss/50 hover:shadow-soft lg:grid-cols-[1fr_auto]"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={proposal.status} />
                      <span className="text-xs font-bold text-ink/48">
                        {store?.name} / {platformLabels[proposal.platform]} / {categoryLabels[proposal.category]}
                      </span>
                    </div>
                    <h2 className="mt-2 text-base font-bold text-ink">{proposal.title}</h2>
                    <p className="mt-1 line-clamp-2 text-sm leading-6 text-ink/58">{proposal.body}</p>
                  </div>
                  <div className="text-sm font-bold text-ink/50">
                    {proposal.status === "posted" ? "投稿日" : "承認日"} {formatDate(dateTarget)}
                    <div className="mt-1 text-xs font-semibold">{formatDateTime(dateTarget)}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="履歴がありません"
            description="提案を承認または投稿済みに変更すると、ここに履歴として表示されます。"
          />
        )}
      </Panel>
    </div>
  );
}
