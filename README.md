# 牛くんずAI MVP

店舗向けAIマーケティング運用サービス「牛くんずAI」の管理画面MVPです。

## 現在使える機能

- デモログイン
- 店舗登録・編集
- 対策キーワード最大20個、NG表現、自動化モード管理
- 投稿と口コミテンプレート返信の自動化モードを個別管理
- Google Maps/GBP URLから店舗基本情報の下書き作成
- 店舗情報に合わせたGBP、note、LINE、口コミ、FAQ、店舗改善の提案生成
- 提案の編集、承認、却下、投稿済み変更
- 投稿履歴検索
- 星評価別の口コミ返信テンプレート編集
- 安全な星4から5口コミのテンプレート自動返信
- 低評価・クレーム口コミの承認フロー
- 外部連携状況の確認
- 店舗別Google Maps参考順位のバッチ取得、週次比較、失敗分の再実行
- Google Maps上の口コミ件数・平均評価の週次推移
- 順位・口コミ・店舗情報から作るワンクリック店舗レポート

## 重要: 利用モード

環境変数を設定しない場合はデモモードです。

- データはブラウザの `localStorage` に保存されます。
- `GEMINI_API_KEY` 未設定時、AI提案はローカルのモック生成です。
- Googleへの実投稿・実返信は行いません。

実店舗で本番運用するには、Supabase、Gemini API、Google Business Profile APIの設定が必要です。

## ローカル起動

```bash
npm install
npm run dev
```

ブラウザで `http://127.0.0.1:3000` を開きます。ログイン画面の初期メールアドレスでそのままログインできます。

## 環境変数

`.env.example` を `.env.local` に複製し、必要な値を設定します。

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
RANK_TRACKING_PROVIDER=playwright
RANK_BROWSER_EXECUTABLE_PATH=/Applications/Google Chrome.app/Contents/MacOS/Google Chrome
RANK_BROWSER_HEADLESS=true
```

Gemini APIキーはGoogle AI Studioで発行します。`GEMINI_API_KEY` を設定すると、提案作成時に店舗情報をGeminiへ送信します。キーはサーバー側だけで利用し、画面には公開しません。

## Supabase

1. Supabaseでプロジェクトを作成します。
2. SQL Editorで `database/schema.sql` を実行します。
3. `.env.local` にURLとキーを設定します。
4. Supabase Authでメール認証を有効にします。

`database/schema.sql` には主要テーブルとRLSポリシーが含まれます。本番投入前には、組織作成・初期owner登録をサーバー処理またはDB関数にまとめてください。

旧スキーマを適用済みの環境では、SQL Editorで `database/migrate_split_automation_modes.sql` を1回実行すると、投稿と口コミの自動化モードが別々の列へ移行されます。

順位テーブルを追加する場合は `database/migrate_add_rank_tracking.sql` を1回実行します。

## Google Maps参考順位

- 店舗の対策キーワードを最大20件、7日おきにバッチ取得します。
- DOM上の店舗名照合を優先し、曖昧な場合だけスクリーンショットをGeminiへ送ります。
- 取得失敗時は、順位画面から失敗したキーワードだけ再実行できます。
- 通常バッチでは店舗の口コミ件数と平均評価も同時に記録します。
- CAPTCHAや追加確認画面が出た場合は処理を停止し、回避処理は行いません。
- 検索地点、時刻、端末、パーソナライズで結果が変わるため、順位は絶対値ではなく週次傾向の参考値です。
- `RANK_TRACKING_PROVIDER` を境界にしており、将来SerpApiやDataForSEOの実装へ差し替え可能です。

レポート画面では、店舗情報・順位履歴・口コミ指標から、おすすめキーワードと優先施策を生成します。Gemini未設定時もローカル分析で生成でき、印刷画面からPDF保存できます。

ローカルではMacにインストール済みのGoogle Chromeを使います。Vercel本番では通常の関数実行時間やブラウザ配布に制約があるため、定期ジョブを外部ワーカーへ分離するか、サーバーレス対応Chromiumを追加する構成を推奨します。

## Google Maps URLから店舗登録

店舗登録画面の上部にGoogle Maps/GBP URLの読み取り欄があります。共有URLや `https://www.google.com/maps/place/...` を貼って読み取ると、店舗名、業種、住所、電話番号、営業時間、評価・口コミ由来の強み、対策キーワード候補を下書きへ反映します。Google側で追加確認画面が出た場合や表示項目が少ない場合は、取れた項目だけ反映して手入力で補完します。

## 本番化で残っている作業

- デモ認証からSupabase Authへの切り替え
- localStorageからSupabase DBへの切り替え
- Gemini API提案生成の本番プロンプト調整・監視
- Google OAuthとGBPロケーション紐付け
- Google口コミ同期・実返信
- GBP投稿・画像保存・実投稿
- Vercel環境変数と定期実行設定

## 検証

```bash
npm run typecheck
npm run build
```
