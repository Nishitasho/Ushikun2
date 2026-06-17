# 牛くんずAI Vercel デプロイ手順

## 方針

本番運用はVercelの通常のNext.jsアプリとしてデプロイします。

Cloudflare Workers / OpenNext / Wrangler 用の設定ファイルは残していますが、Vercel本番では使いません。Vercelでは `npm run build` によるNext.jsビルドを使います。

## 1. 事前準備

- Supabaseで `database/schema.sql` を実行済み
- GitHubリポジトリに最新コードを反映済み
- Supabaseの `service_role` とGemini APIキーは本番前に再発行済み

## 2. Vercelプロジェクト作成

1. Vercel Dashboardを開く
2. `Add New...` からProjectを作成
3. GitHubリポジトリを選択
4. Framework Preset は `Next.js`
5. Build Command はデフォルトまたは `npm run build`
6. Output Directory は空欄のまま

## 3. Vercel Environment Variables

Vercel Dashboardの Project Settings から Environment Variables を開き、Production / Preview / Development に必要な値を登録します。

必須:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
GEMINI_API_KEY
GEMINI_MODEL=gemini-2.5-flash
RANK_TRACKING_PROVIDER=playwright
GOOGLE_MAPS_IMPORT_PROVIDER=playwright
```

Secretとして扱う値:

```text
SUPABASE_SERVICE_ROLE_KEY
GEMINI_API_KEY
```

`NEXT_PUBLIC_` が付く値はブラウザにも公開されます。Supabase URL と anon key のみにしてください。

## 4. デプロイ

GitHub連携後は、mainブランチにpushするとVercelが自動デプロイします。

CLIで行う場合:

```bash
npm exec vercel login
npm exec vercel link
npm exec vercel deploy --prod
```

## 5. 本番確認

デプロイ後、本番URLで以下を確認します。

```text
/api/system/health
/settings
/stores/new
```

`/api/system/health` で以下がすべて成功なら、本番の基本接続はOKです。

- Supabase接続テスト
- Gemini API接続テスト
- storesテーブル取得テスト

## 6. Google Maps順位取得の運用案

推奨は `外部ジョブ + Vercel Cron` です。

### 推奨: 外部ジョブ + Vercel Cron

Vercel Cronで週1回のAPIを起動し、実際のGoogle Maps Playwright処理はBrowserless、Cloud Run、Railway、Render、専用VPSなどのブラウザ実行環境で動かします。

理由:

- Google Maps取得はブラウザ実行時間が長くなりやすい
- CAPTCHAや一時ブロック時のリトライ制御が必要
- Vercel Serverless単体ではブラウザバイナリ管理が不安定になりやすい
- 将来SerpApi / DataForSEOへ切り替えやすい

### 次点: Vercel Cron + Vercel Function

Vercel Cronで `/api/rankings/run` 相当の処理を呼び、Vercel Function内でPlaywrightを動かします。

ただし、Chromium実行環境、関数実行時間、メモリ、Google Maps側のブロック対策が課題になります。MVPの本番初期ではおすすめしません。

### 非推奨: ユーザー操作時に直接Playwright実行

管理画面のボタン押下で直接Google Maps取得を走らせる方式は、待ち時間が長く、失敗時のUXも悪くなります。本番ではバッチ化してください。

## 7. Cloudflare設定について

以下はCloudflare検証用に残っていますが、Vercelデプロイでは参照されません。

```text
wrangler.jsonc
open-next.config.ts
cloudflare-env.d.ts
docs/cloudflare-deploy.md
```

`next.config.ts` からCloudflare専用のdev初期化は外しているため、VercelのNext.jsビルドを邪魔しません。

## 8. 参考

- Vercel Environment Variables: https://vercel.com/docs/environment-variables
- Vercel Cron Jobs: https://vercel.com/docs/cron-jobs
- Vercel Node.js Runtime: https://vercel.com/docs/functions/runtimes/node-js
