"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  CircleAlert,
  KeyRound,
  MapPin,
  RotateCcw,
  ShieldCheck,
  TestTube2
} from "lucide-react";
import { Button, Panel } from "@/components/ui";
import { useKuroko } from "@/features/core/kuroko-store";

type Status = {
  mode: "demo" | "configured";
  credentials: {
    supabase: boolean;
    gemini: boolean;
    googleBusinessProfile: boolean;
    rankTracking: boolean;
  };
};

type HealthResult = {
  ok: boolean;
  checkedAt: string;
  env: Record<string, boolean | string>;
  checks: Record<
    "supabase" | "gemini" | "stores",
    {
      ok: boolean;
      message: string;
      details?: Record<string, unknown>;
    }
  >;
};

export default function SettingsPage() {
  const { resetDemo } = useKuroko();
  const [status, setStatus] = useState<Status>();
  const [health, setHealth] = useState<HealthResult>();
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    fetch("/api/system/status")
      .then((response) => response.json())
      .then((data) => setStatus(data as Status));
  }, []);

  const rows = [
    ["Supabase 認証・DB", status?.credentials.supabase],
    ["Gemini API", status?.credentials.gemini],
    ["Google Business Profile", status?.credentials.googleBusinessProfile]
  ] as const;

  async function runHealthCheck() {
    setIsTesting(true);
    try {
      const response = await fetch("/api/system/health", { cache: "no-store" });
      const data = (await response.json()) as HealthResult;
      setHealth(data);
    } finally {
      setIsTesting(false);
    }
  }

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-sm font-bold text-brass">System settings</p>
        <h1 className="mt-1 text-3xl font-black text-ink">設定・連携状況</h1>
      </div>

      <Panel title="現在の利用モード">
        <div className="flex items-start gap-3 rounded-lg bg-paper p-4">
          {status?.mode === "configured" ? (
            <CheckCircle2 className="mt-0.5 size-5 text-moss" />
          ) : (
            <CircleAlert className="mt-0.5 size-5 text-brass" />
          )}
          <div>
            <p className="font-bold">{status?.mode === "configured" ? "外部サービスの認証情報あり" : "デモモード"}</p>
            <p className="mt-1 text-sm leading-6 text-ink/60">
              現在のアプリはデモ保存を使用します。認証情報を設定した後も、各APIの接続実装と動作確認を完了してから本番運用してください。
            </p>
          </div>
        </div>
      </Panel>

      <Panel title="外部連携">
        <div className="grid gap-2">
          {rows.map(([label, connected]) => (
            <div key={label} className="flex items-center justify-between rounded-md border border-line bg-white px-4 py-3">
              <span className="text-sm font-bold">{label}</span>
              <span className={`text-xs font-bold ${connected ? "text-moss" : "text-brass"}`}>
                {connected ? "認証情報あり" : "未設定"}
              </span>
            </div>
          ))}
        </div>
      </Panel>

      <Panel
        title="接続テスト"
        description="環境変数を設定した後、Supabase、Gemini、storesテーブルの取得を確認します。"
        action={
          <Button variant="secondary" disabled={isTesting} onClick={runHealthCheck}>
            <TestTube2 className="size-4" />
            {isTesting ? "確認中" : "接続テスト"}
          </Button>
        }
      >
        {health ? (
          <div className="grid gap-3">
            {[
              ["Supabase接続テスト", health.checks.supabase],
              ["Gemini API接続テスト", health.checks.gemini],
              ["storesテーブル取得テスト", health.checks.stores]
            ].map(([label, result]) => {
              const check = result as HealthResult["checks"]["supabase"];
              return (
                <div
                  key={label as string}
                  className="rounded-md border border-line bg-white px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-bold">{label as string}</p>
                    <span className={`text-xs font-bold ${check.ok ? "text-moss" : "text-coral"}`}>
                      {check.ok ? "成功" : "要確認"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-ink/60">{check.message}</p>
                </div>
              );
            })}
            <p className="text-xs text-ink/45">
              最終確認: {new Date(health.checkedAt).toLocaleString("ja-JP")}
            </p>
          </div>
        ) : (
          <p className="rounded-md bg-paper px-4 py-3 text-sm leading-6 text-ink/60">
            `.env.local` を設定して開発サーバーを再起動後、接続テストを実行してください。
          </p>
        )}
      </Panel>

      <Panel
        title="GBP連携に必要な準備"
        description="Googleアカウントで認証した後、管理可能な店舗を牛くんずAI側で取得して紐づけます。"
      >
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-md border border-line bg-paper p-4">
            <KeyRound className="size-5 text-brass" />
            <h3 className="mt-3 text-sm font-bold">Google Cloud設定</h3>
            <p className="mt-1 text-xs leading-5 text-ink/60">
              GBP API利用承認、関連APIの有効化、OAuthクライアントIDとリダイレクトURIが必要です。
            </p>
          </div>
          <div className="rounded-md border border-line bg-paper p-4">
            <ShieldCheck className="size-5 text-moss" />
            <h3 className="mt-3 text-sm font-bold">管理権限のあるアカウント</h3>
            <p className="mt-1 text-xs leading-5 text-ink/60">
              対象店舗のオーナーまたは管理者権限を持つGoogleアカウントでOAuth認証します。
            </p>
          </div>
          <div className="rounded-md border border-line bg-paper p-4">
            <MapPin className="size-5 text-sky" />
            <h3 className="mt-3 text-sm font-bold">店舗ロケーション選択</h3>
            <p className="mt-1 text-xs leading-5 text-ink/60">
              認証後にaccountとlocationをAPI取得します。口コミ返信には確認済みロケーションが必要です。
            </p>
          </div>
        </div>
      </Panel>

      <Panel title="ローカル保存データ">
        <Button variant="secondary" onClick={resetDemo}>
          <RotateCcw className="size-4" /> ローカルデータを初期化
        </Button>
      </Panel>
    </div>
  );
}
