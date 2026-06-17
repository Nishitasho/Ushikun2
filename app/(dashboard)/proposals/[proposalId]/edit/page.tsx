"use client";

import { useParams, useRouter } from "next/navigation";
import { EmptyState, Button, Panel } from "@/components/ui";
import { ProposalForm } from "@/components/proposal-form";
import { useKuroko } from "@/features/core/kuroko-store";

export default function ProposalEditPage() {
  const params = useParams<{ proposalId: string }>();
  const router = useRouter();
  const { state, updateProposal, isReady } = useKuroko();
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

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-sm font-bold text-brass">Edit proposal</p>
        <h1 className="mt-1 text-3xl font-black text-ink">AI提案編集</h1>
      </div>
      <Panel title={proposal.title}>
        <ProposalForm proposal={proposal} onSubmit={(input) => updateProposal(proposal.id, input)} />
      </Panel>
    </div>
  );
}
