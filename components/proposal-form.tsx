"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { Button, Field, Input, Textarea } from "./ui";
import type { AiProposal, ProposalInput } from "@/features/core/types";
import { splitTextarea } from "@/features/core/utils";

export function ProposalForm({
  proposal,
  onSubmit
}: {
  proposal: AiProposal;
  onSubmit: (input: ProposalInput) => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(proposal.title);
  const [body, setBody] = useState(proposal.body);
  const [goal, setGoal] = useState(proposal.goal);
  const [keywords, setKeywords] = useState(proposal.targetKeywords.join("\n"));
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || !body.trim()) {
      setError("タイトルと本文を入力してください。");
      return;
    }
    onSubmit({
      title,
      body,
      goal,
      targetKeywords: splitTextarea(keywords)
    });
    router.push(`/proposals/${proposal.id}`);
  }

  return (
    <form onSubmit={submit} className="grid gap-5">
      {error ? (
        <div className="rounded-md border border-coral/30 bg-coral/10 px-4 py-3 text-sm font-semibold text-[#934438]">
          {error}
        </div>
      ) : null}
      <Field label="提案タイトル">
        <Input value={title} onChange={(event) => setTitle(event.target.value)} />
      </Field>
      <Field label="提案本文">
        <Textarea className="min-h-80" value={body} onChange={(event) => setBody(event.target.value)} />
      </Field>
      <Field label="狙い">
        <Textarea value={goal} onChange={(event) => setGoal(event.target.value)} />
      </Field>
      <Field label="使用キーワード">
        <Textarea value={keywords} onChange={(event) => setKeywords(event.target.value)} />
      </Field>
      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          キャンセル
        </Button>
        <Button type="submit">
          <Save className="size-4" />
          保存
        </Button>
      </div>
    </form>
  );
}
