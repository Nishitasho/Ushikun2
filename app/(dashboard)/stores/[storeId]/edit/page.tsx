"use client";

import { useParams, useRouter } from "next/navigation";
import { Button, EmptyState, Panel } from "@/components/ui";
import { StoreForm } from "@/components/store-form";
import { useKuroko } from "@/features/core/kuroko-store";

export default function EditStorePage() {
  const params = useParams<{ storeId: string }>();
  const router = useRouter();
  const { state, updateStore, isReady } = useKuroko();
  const store = state.stores.find((item) => item.id === params.storeId);

  if (!isReady) {
    return <Panel>読み込み中...</Panel>;
  }

  if (!store) {
    return (
      <EmptyState
        title="店舗が見つかりません"
        description="一覧に戻って店舗を選び直してください。"
        action={<Button onClick={() => router.push("/stores")}>店舗一覧へ</Button>}
      />
    );
  }

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-sm font-bold text-brass">Edit store</p>
        <h1 className="mt-1 text-3xl font-black text-ink">{store.name}</h1>
      </div>
      <Panel title="店舗情報の編集">
        <StoreForm store={store} onSubmit={(input) => updateStore(store.id, input)} />
      </Panel>
    </div>
  );
}
