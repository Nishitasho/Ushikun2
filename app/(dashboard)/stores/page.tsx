"use client";

import Link from "next/link";
import { Building2, Edit3, MapPinned, Plus, Sparkles } from "lucide-react";
import { Button, EmptyState, Panel } from "@/components/ui";
import { automationModeLabels } from "@/features/core/labels";
import { useKuroko } from "@/features/core/kuroko-store";

export default function StoresPage() {
  const { state, generateProposals } = useKuroko();

  return (
    <div className="grid gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-bold text-brass">Stores</p>
          <h1 className="mt-1 text-3xl font-black text-ink">店舗一覧</h1>
          <p className="mt-2 text-sm text-ink/62">
            店舗理解を深めるほど、投稿・口コミ返信・AEO提案の精度が上がります。
          </p>
        </div>
        <Link href="/stores/new">
          <Button>
            <Plus className="size-4" />
            店舗を登録
          </Button>
        </Link>
      </div>

      <Panel>
        {state.stores.length ? (
          <div className="grid gap-3">
            {state.stores.map((store) => (
              <div
                key={store.id}
                className="grid gap-4 rounded-lg border border-line bg-white px-4 py-4 lg:grid-cols-[1fr_auto]"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="grid size-9 place-items-center rounded-md bg-moss/12 text-moss">
                      <Building2 className="size-4" />
                    </span>
                    <div>
                      <h2 className="text-lg font-bold text-ink">{store.name}</h2>
                      <p className="text-sm font-semibold text-ink/52">
                        {store.industry} / {store.address}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-2 text-sm text-ink/62 md:grid-cols-3">
                    <div>
                      <span className="font-bold text-ink">キーワード</span>
                      <p className="mt-1">{store.keywords.slice(0, 3).join("、") || "未設定"}</p>
                    </div>
                    <div>
                      <span className="font-bold text-ink">自動化</span>
                      <p className="mt-1">投稿: {automationModeLabels[store.postAutomationMode]}</p>
                      <p className="mt-1">
                        口コミ: {automationModeLabels[store.reviewAutomationMode]}
                      </p>
                    </div>
                    <div>
                      <span className="font-bold text-ink">投稿頻度</span>
                      <p className="mt-1">月{store.postFrequencyPerMonth}回目安</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  <Link href={`/rankings?store=${store.id}`}>
                    <Button variant="secondary">
                      <MapPinned className="size-4" />
                      順位
                    </Button>
                  </Link>
                  <Button variant="secondary" onClick={() => generateProposals(store.id)}>
                    <Sparkles className="size-4" />
                    提案作成
                  </Button>
                  <Link href={`/stores/${store.id}/edit`}>
                    <Button variant="secondary">
                      <Edit3 className="size-4" />
                      編集
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="店舗がまだありません"
            description="店舗名、業種、強み、対策キーワード、NG表現を登録するとAI提案を作成できます。"
            action={
              <Link href="/stores/new">
                <Button>
                  <Plus className="size-4" />
                  店舗を登録
                </Button>
              </Link>
            }
          />
        )}
      </Panel>
    </div>
  );
}
