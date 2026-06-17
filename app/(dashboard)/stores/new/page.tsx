"use client";

import { Panel } from "@/components/ui";
import { StoreForm } from "@/components/store-form";
import { useKuroko } from "@/features/core/kuroko-store";
import type { StoreInput } from "@/features/core/types";

export default function NewStorePage() {
  const { createStore } = useKuroko();

  async function saveStore(input: StoreInput) {
    const response = await fetch("/api/stores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input)
    });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      throw new Error(data.error || "Supabaseへの店舗登録に失敗しました。");
    }
    createStore(input);
  }

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-sm font-bold text-brass">New store</p>
        <h1 className="mt-1 text-3xl font-black text-ink">店舗登録</h1>
      </div>
      <Panel title="店舗情報">
        <StoreForm onSubmit={saveStore} />
      </Panel>
    </div>
  );
}
