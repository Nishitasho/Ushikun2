"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Check, Edit3, Send, X } from "lucide-react";
import { Button, EmptyState, Panel, StatusBadge } from "@/components/ui";
import { categoryLabels, platformLabels } from "@/features/core/labels";
import { useKuroko } from "@/features/core/kuroko-store";
import { formatDateTime } from "@/features/core/utils";

export default function ProposalDetailPage() {
  const params = useParams<{ proposalId: string }>();
  const router = useRouter();
  const { state, changeProposalStatus, isReady } = useKuroko();
  const proposal = state.proposals.find((item) => item.id === params.proposalId);

  if (!isReady) {
    return <Panel>読み込み中...</Panel>;
  }

  if (!proposal) {
    return (
      <EmptyState
        title="提案が見つかりません"
        description="一覧に戻って提案を選び直してください。"
        action={<Button onClick={() => router.push("/proposals")}>提案一覧へ</Button>}
      />
    );
  }

  const store = state.stores.find((item) => item.id === proposal.storeId);
  const revisions = state.revisions.filter((item) => item.proposalId === proposal.id);
  const events = state.statusEvents.filter((item) => item.proposalId === proposal.id);

  return (
    <div className="grid gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={proposal.status} />
            <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-ink/55">
              {platformLabels[proposal.platform]} / {categoryLabels[proposal.category]}
            </span>
          </div>
          <h1 className="mt-3 text-3xl font-black text-ink">{proposal.title}</h1>
          <p className="mt-2 text-sm font-semibold text-ink/55">{store?.name}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/proposals/${proposal.id}/edit`}>
            <Button variant="secondary">
              <Edit3 className="size-4" />
              編集
            </Button>
          </Link>
          <Button onClick={() => changeProposalStatus(proposal.id, "approved")}>
            <Check className="size-4" />
            承認
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              const reason = window.prompt("却下理由を入力してください。") || "理由未入力";
              changeProposalStatus(proposal.id, "rejected", reason);
            }}
          >
            <X className="size-4" />
            却下
          </Button>
          <Button
            variant="secondary"
            disabled={proposal.status === "rejected"}
            onClick={() => changeProposalStatus(proposal.id, "posted")}
          >
            <Send className="size-4" />
            投稿済み
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.75fr]">
        <Panel title="提案本文">
          <article className="whitespace-pre-wrap text-sm leading-7 text-ink/76">{proposal.body}</article>
        </Panel>

        <div className="grid gap-6">
          <Panel title="狙い">
            <p className="text-sm leading-6 text-ink/70">{proposal.goal}</p>
          </Panel>
          <Panel title="使用キーワード">
            <div className="flex flex-wrap gap-2">
              {proposal.targetKeywords.map((keyword) => (
                <span key={keyword} className="rounded-full bg-paper px-3 py-1 text-xs font-bold text-ink/62">
                  {keyword}
                </span>
              ))}
              {!proposal.targetKeywords.length ? <span className="text-sm text-ink/50">未設定</span> : null}
            </div>
          </Panel>
          <Panel title="リスクメモ">
            {proposal.riskNotes.length ? (
              <ul className="grid gap-2 text-sm text-coral">
                {proposal.riskNotes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink/55">検出されたリスクはありません。</p>
            )}
          </Panel>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="ステータス履歴">
          {events.length ? (
            <div className="grid gap-2">
              {events.map((event) => (
                <div key={event.id} className="rounded-md bg-paper px-3 py-2 text-sm text-ink/66">
                  {event.fromStatus || "作成"} → {event.toStatus}
                  {event.reason ? ` / ${event.reason}` : ""} / {formatDateTime(event.createdAt)}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink/55">まだ変更履歴はありません。</p>
          )}
        </Panel>
        <Panel title="編集履歴">
          {revisions.length ? (
            <div className="grid gap-2">
              {revisions.map((revision) => (
                <div key={revision.id} className="rounded-md bg-paper px-3 py-2 text-sm text-ink/66">
                  {revision.title} / {formatDateTime(revision.createdAt)}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink/55">まだ編集履歴はありません。</p>
          )}
        </Panel>
      </div>
    </div>
  );
}
