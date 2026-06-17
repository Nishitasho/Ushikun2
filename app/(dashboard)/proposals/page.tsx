"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Filter, Sparkles } from "lucide-react";
import { Button, EmptyState, Input, Panel, Select, StatusBadge } from "@/components/ui";
import {
  categoryLabels,
  categoryOptions,
  platformLabels,
  platformOptions,
  statusLabels
} from "@/features/core/labels";
import { useKuroko } from "@/features/core/kuroko-store";
import type { ProposalCategory, ProposalPlatform, ProposalStatus } from "@/features/core/types";
import { formatDateTime } from "@/features/core/utils";

const statusOptions: ProposalStatus[] = ["draft", "approved", "rejected", "posted"];

export default function ProposalsPage() {
  const { state, generateProposals } = useKuroko();
  const [query, setQuery] = useState("");
  const [storeId, setStoreId] = useState("all");
  const [platform, setPlatform] = useState<ProposalPlatform | "all">("all");
  const [category, setCategory] = useState<ProposalCategory | "all">("all");
  const [status, setStatus] = useState<ProposalStatus | "all">("all");

  const proposals = useMemo(() => {
    return state.proposals.filter((proposal) => {
      const store = state.stores.find((item) => item.id === proposal.storeId);
      const haystack = `${proposal.title} ${proposal.body} ${store?.name || ""}`.toLowerCase();
      return (
        haystack.includes(query.toLowerCase()) &&
        (storeId === "all" || proposal.storeId === storeId) &&
        (platform === "all" || proposal.platform === platform) &&
        (category === "all" || proposal.category === category) &&
        (status === "all" || proposal.status === status)
      );
    });
  }, [category, platform, query, state.proposals, state.stores, status, storeId]);

  return (
    <div className="grid gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-bold text-brass">AI proposals</p>
          <h1 className="mt-1 text-3xl font-black text-ink">AI提案一覧</h1>
          <p className="mt-2 text-sm text-ink/62">確認、編集、承認、却下、投稿済み変更をここで行います。</p>
        </div>
        <Button onClick={() => generateProposals()}>
          <Sparkles className="size-4" />
          本日の提案を作成
        </Button>
      </div>

      <Panel>
        <div className="grid gap-3 lg:grid-cols-[1.2fr_repeat(4,0.7fr)]">
          <div className="relative">
            <Filter className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink/38" />
            <Input
              className="pl-9"
              placeholder="タイトル、本文、店舗名で検索"
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
            {statusOptions.map((item) => (
              <option key={item} value={item}>
                {statusLabels[item]}
              </option>
            ))}
          </Select>
        </div>
      </Panel>

      <Panel>
        {proposals.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-separate border-spacing-y-2 text-left">
              <thead>
                <tr className="text-xs font-bold text-ink/45">
                  <th className="px-3 py-2">提案</th>
                  <th className="px-3 py-2">店舗</th>
                  <th className="px-3 py-2">媒体</th>
                  <th className="px-3 py-2">カテゴリ</th>
                  <th className="px-3 py-2">ステータス</th>
                  <th className="px-3 py-2">作成</th>
                </tr>
              </thead>
              <tbody>
                {proposals.map((proposal) => {
                  const store = state.stores.find((item) => item.id === proposal.storeId);
                  return (
                    <tr key={proposal.id} className="rounded-lg bg-white shadow-sm">
                      <td className="rounded-l-lg border-y border-l border-line px-3 py-3">
                        <Link href={`/proposals/${proposal.id}`} className="font-bold text-ink hover:text-moss">
                          {proposal.title}
                        </Link>
                        <p className="mt-1 line-clamp-1 text-xs text-ink/55">{proposal.goal}</p>
                      </td>
                      <td className="border-y border-line px-3 py-3 text-sm font-semibold text-ink/65">
                        {store?.name || "不明"}
                      </td>
                      <td className="border-y border-line px-3 py-3 text-sm text-ink/62">
                        {platformLabels[proposal.platform]}
                      </td>
                      <td className="border-y border-line px-3 py-3 text-sm text-ink/62">
                        {categoryLabels[proposal.category]}
                      </td>
                      <td className="border-y border-line px-3 py-3">
                        <StatusBadge status={proposal.status} />
                      </td>
                      <td className="rounded-r-lg border-y border-r border-line px-3 py-3 text-xs font-semibold text-ink/45">
                        {formatDateTime(proposal.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="提案がありません"
            description="店舗情報を登録したあと、本日のAI提案を生成してください。"
            action={
              <Button onClick={() => generateProposals()}>
                <Sparkles className="size-4" />
                提案を作成
              </Button>
            }
          />
        )}
      </Panel>
    </div>
  );
}
