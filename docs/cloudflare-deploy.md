# 牛くんずAI Cloudflare Workers デプロイ手順

## 前提

- Supabase の `database/schema.sql` が実行済み
- Cloudflare アカウントにログイン可能
- 本番では `.env.local` を使わず、Cloudflare Workers の Variables / Secrets を使う

## 1. Cloudflareへログイン

```bash
npm exec wrangler login
```

## 2. 本番用の通常環境変数を設定

Cloudflare Dashboard で Workers & Pages から `ushikuns-ai` を選び、Settings の Variables and Secrets に登録します。

通常の環境変数:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
GEMINI_MODEL
RANK_TRACKING_PROVIDER
GOOGLE_MAPS_IMPORT_PROVIDER
```

設定値の例:

```text
GEMINI_MODEL=gemini-2.5-flash
RANK_TRACKING_PROVIDER=disabled
GOOGLE_MAPS_IMPORT_PROVIDER=disabled
```

`NEXT_PUBLIC_` はブラウザにも公開される値です。Supabase URL と anon key のみ入れてください。

## 3. 本番用のSecretを設定

以下はSecretとして登録します。DashboardからSecretを選ぶか、CLIで登録します。

```bash
npm exec wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npm exec wrangler secret put GEMINI_API_KEY
```

将来GBP連携を本番化する場合は、以下もSecretにします。

```bash
npm exec wrangler secret put GOOGLE_CLIENT_SECRET
```

## 4. ビルド

```bash
npm run cf:build
```

## 5. Workers runtimeでローカル確認

```bash
npm run cf:preview
```

起動したURLで以下を確認します。

```text
/api/system/health
/settings
```

`/api/system/health` で以下がすべて成功ならOKです。

- Supabase接続テスト
- Gemini API接続テスト
- storesテーブル取得テスト

## 6. デプロイ

```bash
npm run cf:deploy
```

このプロジェクトの `cf:deploy` は `--keep-vars` を付けています。Cloudflare Dashboardで設定済みのVariables / Secretsをデプロイ時に消さないためです。

## 注意

- `SUPABASE_SERVICE_ROLE_KEY` と `GEMINI_API_KEY` はソースコード、GitHub、ブラウザに出さないでください。
- 順位取得のPlaywright実行はCloudflare Workers上では動かさず、本番では `RANK_TRACKING_PROVIDER=disabled` から開始してください。
- Google Maps URL読み取りのPlaywright実行もCloudflare Workers上では動かさず、本番では `GOOGLE_MAPS_IMPORT_PROVIDER=disabled` から開始してください。
- Google Maps順位取得は、後でCloudflare Queues + 外部ブラウザ実行環境、またはSerpApi/DataForSEOへ切り替える想定です。
