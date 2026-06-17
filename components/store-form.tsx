"use client";

import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DownloadCloud, Save } from "lucide-react";
import { Button, Field, Input, Select, Textarea } from "./ui";
import type { AutomationMode, Store, StoreInput } from "@/features/core/types";
import { splitTextarea, uniqueCompact } from "@/features/core/utils";
import type { ImportedStoreDraft } from "@/features/store-import/types";

const defaultInput: StoreInput = {
  name: "",
  industry: "",
  address: "",
  phoneNumber: "",
  businessHours: "",
  regularHolidays: "",
  services: "",
  strengths: "",
  targetCustomers: "",
  keywords: [],
  competitors: [],
  postTone: "親しみやすく、誠実。過度な煽りは避ける",
  ngExpressions: [],
  postAutomationMode: "approval",
  reviewAutomationMode: "approval",
  postFrequencyPerMonth: 20,
  gbpLocationName: ""
};

function inputFromStore(store?: Store): StoreInput {
  if (!store) return defaultInput;
  return {
    name: store.name,
    industry: store.industry,
    address: store.address,
    phoneNumber: store.phoneNumber,
    businessHours: store.businessHours,
    regularHolidays: store.regularHolidays,
    services: store.services,
    strengths: store.strengths,
    targetCustomers: store.targetCustomers,
    keywords: store.keywords,
    competitors: store.competitors,
    postTone: store.postTone,
    ngExpressions: store.ngExpressions,
    postAutomationMode: store.postAutomationMode,
    reviewAutomationMode: store.reviewAutomationMode,
    postFrequencyPerMonth: store.postFrequencyPerMonth,
    gbpLocationName: store.gbpLocationName
  };
}

export function StoreForm({
  store,
  onSubmit
}: {
  store?: Store;
  onSubmit: (input: StoreInput) => void | Promise<void>;
}) {
  const router = useRouter();
  const [input, setInput] = useState<StoreInput>(() => inputFromStore(store));
  const [keywordText, setKeywordText] = useState(() => input.keywords.join("\n"));
  const [competitorText, setCompetitorText] = useState(() => input.competitors.join("\n"));
  const [ngText, setNgText] = useState(() => input.ngExpressions.join("\n"));
  const [gbpUrl, setGbpUrl] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [importMessage, setImportMessage] = useState("");
  const [error, setError] = useState("");

  const keywordCount = useMemo(() => splitTextarea(keywordText).length, [keywordText]);

  function applyImportedDraft(draft: ImportedStoreDraft) {
    const nextKeywords = uniqueCompact([
      ...(draft.keywords || []),
      ...splitTextarea(keywordText)
    ]).slice(0, 20);
    const nextStrengths = uniqueCompact([
      draft.strengths || "",
      input.strengths
    ]).join("\n");

    setInput((current) => ({
      ...current,
      name: draft.name || current.name,
      industry: draft.industry || current.industry,
      address: draft.address || current.address,
      phoneNumber: draft.phoneNumber || current.phoneNumber,
      businessHours: draft.businessHours || current.businessHours,
      services: draft.services || current.services,
      strengths: nextStrengths || current.strengths,
      keywords: nextKeywords,
      gbpLocationName: draft.gbpUrl || current.gbpLocationName
    }));
    setKeywordText(nextKeywords.join("\n"));
  }

  async function importFromGbp() {
    setError("");
    setImportMessage("");
    if (!gbpUrl.trim()) {
      setError("Google MapsまたはGBPのURLを入力してください。");
      return;
    }
    setIsImporting(true);
    try {
      const response = await fetch("/api/stores/import-gbp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: gbpUrl.trim() })
      });
      const data = (await response.json()) as {
        draft?: ImportedStoreDraft;
        error?: string;
      };
      if (!response.ok || !data.draft) {
        throw new Error(data.error || "店舗情報の読み取りに失敗しました。");
      }
      applyImportedDraft(data.draft);
      const notes = [
        data.draft.name ? "店舗名" : "",
        data.draft.address ? "住所" : "",
        data.draft.phoneNumber ? "電話" : "",
        data.draft.businessHours ? "営業時間" : "",
        data.draft.keywords?.length ? "キーワード候補" : ""
      ].filter(Boolean);
      setImportMessage(
        notes.length
          ? `${notes.join("・")}を反映しました。必要に応じて編集してください。`
          : "読み取りましたが、反映できる項目が少なかったため手入力で補完してください。"
      );
    } catch (error) {
      setError(error instanceof Error ? error.message : "店舗情報の読み取りに失敗しました。");
    } finally {
      setIsImporting(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const keywords = splitTextarea(keywordText).slice(0, 20);
    if (!input.name.trim()) {
      setError("店舗名を入力してください。");
      return;
    }
    if (!input.industry.trim()) {
      setError("業種を入力してください。");
      return;
    }
    if (keywordCount > 20) {
      setError("対策キーワードは最大20個までです。");
      return;
    }

    setIsSaving(true);
    try {
      await onSubmit({
        ...input,
        keywords,
        competitors: splitTextarea(competitorText),
        ngExpressions: uniqueCompact(splitTextarea(ngText)),
        postFrequencyPerMonth: Number(input.postFrequencyPerMonth) || 20
      });
      router.push("/stores");
    } catch (error) {
      setError(error instanceof Error ? error.message : "店舗情報の保存に失敗しました。");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-6">
      {error ? (
        <div className="rounded-md border border-coral/30 bg-coral/10 px-4 py-3 text-sm font-semibold text-[#934438]">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 rounded-lg border border-line bg-white/82 p-4">
        <div>
          <h2 className="text-base font-bold text-ink">Google Maps URLから店舗情報を読み取り</h2>
          <p className="mt-1 text-xs leading-5 text-ink/55">
            Google Mapsの共有URLまたはGBPの店舗URLを貼ると、基本情報を下書きに反映します。
          </p>
        </div>
        <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
          <Input
            value={gbpUrl}
            placeholder="https://maps.app.goo.gl/... または https://www.google.com/maps/place/..."
            onChange={(event) => setGbpUrl(event.target.value)}
          />
          <Button type="button" variant="secondary" disabled={isImporting} onClick={importFromGbp}>
            <DownloadCloud className="size-4" />
            {isImporting ? "読み取り中" : "読み取り"}
          </Button>
        </div>
        {importMessage ? (
          <p className="rounded-md bg-moss/10 px-3 py-2 text-xs font-semibold leading-5 text-[#3e5a43]">
            {importMessage}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Field label="店舗名">
          <Input value={input.name} onChange={(event) => setInput({ ...input, name: event.target.value })} />
        </Field>
        <Field label="業種">
          <Input
            value={input.industry}
            placeholder="例: 高級飲食、美容、クリニック、士業"
            onChange={(event) => setInput({ ...input, industry: event.target.value })}
          />
        </Field>
        <Field label="住所">
          <Input
            value={input.address}
            onChange={(event) => setInput({ ...input, address: event.target.value })}
          />
        </Field>
        <Field label="電話番号">
          <Input
            value={input.phoneNumber}
            onChange={(event) => setInput({ ...input, phoneNumber: event.target.value })}
          />
        </Field>
        <Field label="営業時間">
          <Input
            value={input.businessHours}
            placeholder="例: 10:00-19:00"
            onChange={(event) => setInput({ ...input, businessHours: event.target.value })}
          />
        </Field>
        <Field label="定休日">
          <Input
            value={input.regularHolidays}
            onChange={(event) => setInput({ ...input, regularHolidays: event.target.value })}
          />
        </Field>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Field label="サービス・メニュー">
          <Textarea
            value={input.services}
            onChange={(event) => setInput({ ...input, services: event.target.value })}
          />
        </Field>
        <Field label="店舗の強み">
          <Textarea
            value={input.strengths}
            onChange={(event) => setInput({ ...input, strengths: event.target.value })}
          />
        </Field>
        <Field label="ターゲット顧客">
          <Textarea
            value={input.targetCustomers}
            onChange={(event) => setInput({ ...input, targetCustomers: event.target.value })}
          />
        </Field>
        <Field label="投稿のトーン">
          <Textarea
            value={input.postTone}
            onChange={(event) => setInput({ ...input, postTone: event.target.value })}
          />
        </Field>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Field label={`対策キーワード (${keywordCount}/20)`} hint="1行に1キーワード。最大20個。">
          <Textarea value={keywordText} onChange={(event) => setKeywordText(event.target.value)} />
        </Field>
        <Field label="競合店舗名" hint="1行に1店舗。">
          <Textarea value={competitorText} onChange={(event) => setCompetitorText(event.target.value)} />
        </Field>
        <Field label="NG表現" hint="生成前後のチェック対象。">
          <Textarea value={ngText} onChange={(event) => setNgText(event.target.value)} />
        </Field>
      </div>

      <div className="grid gap-4 rounded-lg border border-line bg-paper/60 p-4 lg:grid-cols-2">
        <div className="grid gap-4 rounded-md border border-line bg-white p-4">
          <div>
            <h2 className="text-base font-bold text-ink">投稿</h2>
            <p className="mt-1 text-xs leading-5 text-ink/55">
              GBP投稿案の承認・自動投稿レベルを設定します。
            </p>
          </div>
          <Field label="投稿の自動化モード">
            <Select
              value={input.postAutomationMode}
              onChange={(event) =>
                setInput({
                  ...input,
                  postAutomationMode: event.target.value as AutomationMode
                })
              }
            >
              <option value="approval">承認制</option>
              <option value="semi_auto">半自動</option>
              <option value="full_auto">完全自動</option>
            </Select>
          </Field>
          <Field label="月間投稿目安">
            <Input
              type="number"
              min={0}
              max={31}
              value={input.postFrequencyPerMonth}
              onChange={(event) =>
                setInput({ ...input, postFrequencyPerMonth: Number(event.target.value) })
              }
            />
          </Field>
        </div>

        <div className="grid gap-4 rounded-md border border-line bg-white p-4">
          <div>
            <h2 className="text-base font-bold text-ink">口コミテンプレート自動返信</h2>
            <p className="mt-1 text-xs leading-5 text-ink/55">
              星評価別テンプレートを使う返信の自動化レベルを設定します。
            </p>
          </div>
          <Field label="口コミ返信の自動化モード">
            <Select
              value={input.reviewAutomationMode}
              onChange={(event) =>
                setInput({
                  ...input,
                  reviewAutomationMode: event.target.value as AutomationMode
                })
              }
            >
              <option value="approval">承認制</option>
              <option value="semi_auto">半自動</option>
              <option value="full_auto">完全自動</option>
            </Select>
          </Field>
          <p className="rounded-md bg-paper px-3 py-2 text-xs leading-5 text-ink/60">
            半自動では星4〜5の安全な口コミのみ自動返信し、低評価・クレーム系は承認待ちにします。
          </p>
        </div>

        <div className="lg:col-span-2">
          <Field
            label="GBPロケーション名"
            hint="本番連携ではOAuth後に管理可能なロケーションから選択します。"
          >
            <Input
              value={input.gbpLocationName || ""}
              placeholder="accounts/{accountId}/locations/{locationId}"
              onChange={(event) => setInput({ ...input, gbpLocationName: event.target.value })}
            />
          </Field>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          キャンセル
        </Button>
        <Button type="submit" disabled={isSaving}>
          <Save className="size-4" />
          {isSaving ? "保存中" : "保存"}
        </Button>
      </div>
    </form>
  );
}
