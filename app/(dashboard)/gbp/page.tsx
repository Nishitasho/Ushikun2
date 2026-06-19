"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Link2, RefreshCcw, Store, TestTube2 } from "lucide-react";
import { Button, EmptyState, Panel, Select } from "@/components/ui";

type GoogleAccount = {
  id: string;
  google_account_name: string | null;
  account_name: string | null;
  is_active: boolean;
  created_at: string;
};

type GbpLocation = {
  id: string;
  store_id: string | null;
  google_account_name: string;
  account_name: string | null;
  location_name: string;
  title: string;
  place_id: string | null;
  address: string | null;
};

type StoreRow = {
  id: string;
  name: string;
  gbp_account_name: string | null;
  gbp_location_name: string | null;
};

type StatusResponse = {
  configured: boolean;
  setupRequired?: boolean;
  accounts: GoogleAccount[];
  locations: GbpLocation[];
  stores: StoreRow[];
  error?: string;
};

type ApiResponse = {
  error?: string;
  reviews?: unknown[];
};

export default function GbpPage() {
  const [status, setStatus] = useState<StatusResponse>();
  const [selectedLocationByStore, setSelectedLocationByStore] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  const linkedCount = useMemo(
    () => status?.stores.filter((store) => store.gbp_location_name).length || 0,
    [status?.stores]
  );

  async function loadStatus() {
    const response = await fetch("/api/gbp/status", { cache: "no-store" });
    const data = (await response.json()) as StatusResponse;
    setStatus(data);
    if (data.error) setMessage(data.error);
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    const connected = params.get("connected");
    const accountFetch = params.get("accountFetch");
    if (error) {
      setMessage(decodeURIComponent(error));
    } else if (connected && accountFetch === "failed") {
      setMessage("Google OAuth連携は保存しました。GBPアカウント一覧は取得できていないため、API権限や対象アカウントの管理権限を確認してください。");
    } else if (connected) {
      setMessage("Google OAuth連携を保存しました。");
    }
    loadStatus().catch((error) => setMessage(error instanceof Error ? error.message : "GBP状況の取得に失敗しました。"));
  }, []);

  async function postJson(path: string, body?: unknown) {
    setIsBusy(true);
    setMessage("");
    try {
      const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined
      });
      const data = (await response.json()) as ApiResponse;
      if (!response.ok) throw new Error(data.error || "処理に失敗しました。");
      await loadStatus();
      return data;
    } catch (error) {
      const text = error instanceof Error ? error.message : "処理に失敗しました。";
      setMessage(text);
      throw error;
    } finally {
      setIsBusy(false);
    }
  }

  async function syncLocations() {
    await postJson("/api/gbp/locations/sync");
    setMessage("GBPロケーションを同期しました。");
  }

  async function linkStore(storeId: string) {
    const locationId = selectedLocationByStore[storeId];
    if (!locationId) {
      setMessage("紐付けるGBPロケーションを選択してください。");
      return;
    }
    await postJson("/api/gbp/stores/link", { storeId, locationId });
    setMessage("店舗とGBPロケーションを紐付けました。");
  }

  async function syncReviews(storeId: string) {
    const data = await postJson("/api/gbp/reviews/sync", { storeId });
    setMessage(`口コミを同期しました。${data.reviews?.length || 0}件を確認しています。`);
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-bold text-brass">Google Business Profile</p>
          <h1 className="mt-1 text-3xl font-black text-ink">GBP連携</h1>
          <p className="mt-2 text-sm text-ink/62">
            Googleアカウント認証後、店舗ごとにGBPロケーションを紐付けます。
          </p>
        </div>
        <Button variant="secondary" onClick={loadStatus}>
          <RefreshCcw className="size-4" />
          更新
        </Button>
      </div>

      {message ? (
        <div className="rounded-md border border-line bg-white px-4 py-3 text-sm font-semibold text-ink/70">
          {message}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="OAuth設定">
          <div className="flex items-start gap-3">
            <CheckCircle2 className={`mt-0.5 size-5 ${status?.configured ? "text-moss" : "text-brass"}`} />
            <div>
              <p className="font-bold">{status?.configured ? "環境変数は設定済み" : "Google OAuth環境変数が未設定"}</p>
              <p className="mt-1 text-sm leading-6 text-ink/60">
                GOOGLE_CLIENT_ID、GOOGLE_CLIENT_SECRET、GOOGLE_REDIRECT_URIをVercelに設定します。
              </p>
            </div>
          </div>
          <Link
            href="/api/gbp/oauth/start"
            className={`mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold ${
              status?.configured ? "bg-ink text-white" : "pointer-events-none bg-ink/20 text-ink/45"
            }`}
          >
            <Link2 className="size-4" />
            Googleで連携
          </Link>
        </Panel>

        <Panel title="連携アカウント">
          <p className="text-3xl font-black text-ink">{status?.accounts.length || 0}</p>
          <p className="mt-1 text-sm text-ink/60">認証済みアカウント</p>
          {status?.accounts[0] ? (
            <p className="mt-3 text-xs font-semibold text-ink/52">{status.accounts[0].account_name || status.accounts[0].google_account_name}</p>
          ) : null}
        </Panel>

        <Panel title="店舗紐付け">
          <p className="text-3xl font-black text-ink">{linkedCount}</p>
          <p className="mt-1 text-sm text-ink/60">GBPロケーション紐付け済み</p>
          <Button className="mt-4" variant="secondary" disabled={isBusy || !status?.accounts.length} onClick={syncLocations}>
            <Store className="size-4" />
            ロケーション同期
          </Button>
        </Panel>
      </div>

      {status?.setupRequired ? (
        <Panel title="DB追加設定が必要です">
          <p className="text-sm leading-6 text-ink/65">
            Supabase SQL Editorで `database/migrate_add_gbp_connection.sql` を実行すると、GoogleアカウントとGBPロケーションの保存先が作成されます。
          </p>
        </Panel>
      ) : null}

      <Panel title="店舗ごとのGBPロケーション紐付け">
        {status?.stores.length ? (
          <div className="grid gap-3">
            {status.stores.map((store) => {
              const linkedLocation = status.locations.find(
                (location) => location.location_name === store.gbp_location_name || location.store_id === store.id
              );
              return (
                <div key={store.id} className="grid gap-3 rounded-lg border border-line bg-white p-4 lg:grid-cols-[1fr_1.3fr_auto_auto] lg:items-center">
                  <div>
                    <p className="font-bold text-ink">{store.name}</p>
                    <p className="mt-1 text-xs font-semibold text-ink/50">
                      {linkedLocation ? `連携中: ${linkedLocation.title}` : "未連携"}
                    </p>
                  </div>
                  <Select
                    value={selectedLocationByStore[store.id] || linkedLocation?.id || ""}
                    onChange={(event) =>
                      setSelectedLocationByStore((current) => ({
                        ...current,
                        [store.id]: event.target.value
                      }))
                    }
                  >
                    <option value="">GBPロケーションを選択</option>
                    {status.locations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.title} / {location.address || location.location_name}
                      </option>
                    ))}
                  </Select>
                  <Button variant="secondary" disabled={isBusy || !status.locations.length} onClick={() => linkStore(store.id)}>
                    紐付け
                  </Button>
                  <Button disabled={isBusy || !linkedLocation} onClick={() => syncReviews(store.id)}>
                    <TestTube2 className="size-4" />
                    口コミ取得
                  </Button>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState title="店舗がありません" description="先に店舗を登録してからGBPロケーションを紐付けます。" />
        )}
      </Panel>
    </div>
  );
}
