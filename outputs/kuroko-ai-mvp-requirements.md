# 牛くんずAI MVP 要件定義・設計案

作成日: 2026-06-07

## 0. 前提

- ワークスペースに既存プロジェクトは見当たらないため、新規プロジェクトとして設計する。
- 技術スタックは Next.js / TypeScript / Tailwind CSS / Supabase / Gemini API / Vercel を前提にする。
- 初期MVPは「管理画面上でAI提案を作成・編集・承認・却下・履歴管理できる状態」をゴールにする。
- GBP口コミ返信・GBP投稿自動投稿は資料上も中核価値であるため、外部API連携なしの初期MVP完了後、MVP+として最優先で実装する。
- ただし、DB・ディレクトリ・ステータス設計は、後からGBP、note、LINE連携を追加しやすい形にしておく。
- 初期運用モードは事故防止のため、全店舗で「モードA: 承認制」をデフォルトにする。
- ただし、ユーザー要望を踏まえ、星4から5の定型口コミ返信と通常GBP投稿については、テンプレートベースの自動化を早期に実装できる設計にする。

## 1. 要件定義の整理

### 1.1 サービスの目的

牛くんずAIは、店舗オーナーが日々のマーケティング運用を少ない判断コストで回せるようにするAIエージェント型の管理画面である。

対象領域:

- MEO対策
- AEO対策
- 口コミ対策
- Googleビジネスプロフィール投稿
- note記事案作成
- 公式LINE配信案作成
- インバウンド対策
- 店舗情報改善

### 1.2 想定ユーザー

- 店舗オーナー
- 店舗スタッフ
- 複数店舗を運用する本部担当者
- 将来的には運用代行会社・代理店

### 1.3 初期MVPの主要ワークフロー

1. ユーザーがログインする。
2. 店舗情報を登録・編集する。
3. 店舗情報をもとにAI提案を生成する。
4. ユーザーが提案内容を確認する。
5. 必要に応じて本文・タイトル・狙い・キーワードを編集する。
6. 提案を承認または却下する。
7. 承認済み提案を投稿済みに変更する。
8. 承認・投稿済み提案を投稿履歴として確認する。

### 1.4 店舗管理で扱う情報

- 店舗名
- 業種
- 住所
- 電話番号
- 営業時間
- 定休日
- サービス・メニュー
- 店舗の強み
- ターゲット顧客
- 対策キーワード 最大20個
- 競合店舗名
- 投稿のトーン
- NG表現
- 自動化レベル: 承認制 / 半自動 / 完全自動

### 1.5 AI提案カテゴリ

初期MVPで生成するカテゴリ:

- Googleビジネスプロフィール投稿案
- note記事案
- LINE配信案
- 口コミ返信案
- FAQ型AEO記事案
- 店舗情報改善案

将来追加するカテゴリ:

- GBP口コミ返信案
- GBP投稿案
- インバウンド向け多言語投稿案
- 画像生成付き投稿案
- キャンペーン投稿案

### 1.6 AI提案の共通項目

- 提案タイトル
- 提案カテゴリ
- 提案本文
- 投稿先媒体
- 狙い
- 使用キーワード
- ステータス
- 作成日時
- 更新日時
- 承認者
- 承認日時
- 却下理由
- 投稿済み日時
- 生成元プロンプトバージョン
- 生成モデル
- エラー情報

### 1.7 提案ステータス

初期MVP:

- 下書き
- 承認済み
- 却下
- 投稿済み

将来拡張:

- 生成中
- 生成失敗
- 承認待ち
- 予約済み
- 投稿失敗
- 外部削除済み

### 1.8 承認フロー

初期MVPでは、すべての提案は管理画面内で人間が判断する。

- 内容確認
- 編集
- 承認
- 却下
- 投稿済みに変更

GBP連携後も、初期設定は必ず「AI生成 → 管理者承認 → 投稿」にする。

### 1.9 ダッシュボードで見る指標

- 本日のAI提案
- 承認待ち件数
- 承認済み件数
- 投稿済み件数
- 媒体別提案件数
- 店舗別提案件数
- 最近更新された提案
- 生成失敗・投稿失敗アラート

### 1.10 投稿履歴の検索条件

- 店舗名
- 媒体
- カテゴリ
- ステータス
- 日付
- キーワード

## 2. 推奨ディレクトリ構成

```text
kuroko-ai/
  app/
    (auth)/
      login/
        page.tsx
    (dashboard)/
      layout.tsx
      dashboard/
        page.tsx
      stores/
        page.tsx
        new/
          page.tsx
        [storeId]/
          edit/
            page.tsx
      proposals/
        page.tsx
        [proposalId]/
          page.tsx
          edit/
            page.tsx
      history/
        page.tsx
      settings/
        prompts/
          page.tsx
        gbp/
          page.tsx
    api/
      ai/
        proposals/
          route.ts
      proposals/
        [proposalId]/
          status/
            route.ts
      gbp/
        oauth/
          start/
            route.ts
          callback/
            route.ts
        reviews/
          sync/
            route.ts
        posts/
          publish/
            route.ts
  components/
    ui/
    layout/
    dashboard/
    stores/
    proposals/
    history/
    gbp/
  features/
    stores/
      actions.ts
      queries.ts
      schemas.ts
      types.ts
    proposals/
      actions.ts
      queries.ts
      schemas.ts
      status.ts
    ai/
      generate-proposals.ts
      safety.ts
      providers/
        gemini-provider.ts
        mock-provider.ts
    gbp/
      oauth.ts
      reviews.ts
      posts.ts
      templates.ts
      risk-detection.ts
  lib/
    supabase/
      client.ts
      server.ts
      admin.ts
    gemini/
      client.ts
    google/
      oauth-client.ts
      business-profile-client.ts
    errors/
      app-error.ts
      error-logger.ts
    utils/
      date.ts
      keyword.ts
  prompts/
    marketing-proposals.ts
    review-reply.ts
    gbp-post.ts
    shared-rules.ts
  database/
    migrations/
    seed.sql
    types.ts
  tests/
    unit/
    e2e/
  public/
  .env.example
```

設計意図:

- UI、ドメインロジック、API連携、プロンプトを分離する。
- Gemini生成処理は `features/ai/providers` に閉じ込め、モック生成と本番生成を切り替え可能にする。
- GBP、note、LINEなどの外部媒体連携は `features/*` と `app/api/*` に後から追加しやすくする。
- プロンプトは `prompts/` に分離し、DB上の `prompt_templates` とバージョン管理できるようにする。

## 3. DB設計

Supabase PostgreSQLを前提にする。認証は Supabase Auth、アプリ側のユーザー情報は `profiles` に持つ。

### 3.1 Enum

```sql
proposal_status:
  draft
  approved
  rejected
  posted

proposal_category:
  google_business_profile_post
  note_article
  line_message
  review_reply
  faq_aeo_article
  store_improvement
  gbp_review_reply
  gbp_post

proposal_platform:
  google_business_profile
  note
  line
  website
  internal

post_automation_mode / review_automation_mode:
  approval
  semi_auto
  full_auto

reply_status:
  unprocessed
  draft
  pending_approval
  approved
  rejected
  replied
  failed
  skipped

gbp_post_status:
  draft
  pending_approval
  approved
  scheduled
  posted
  rejected
  failed
```

### 3.2 profiles

Supabase Authのユーザーに紐づくプロフィール。

| カラム | 型 | 用途 |
| --- | --- | --- |
| id | uuid pk | auth.users.id と同じ |
| display_name | text | 表示名 |
| email | text | メール |
| created_at | timestamptz | 作成日時 |
| updated_at | timestamptz | 更新日時 |

### 3.3 organizations

複数店舗・代理店運用に備えた管理単位。

| カラム | 型 | 用途 |
| --- | --- | --- |
| id | uuid pk | 組織ID |
| name | text | 組織名 |
| created_at | timestamptz | 作成日時 |
| updated_at | timestamptz | 更新日時 |

### 3.4 organization_members

ユーザーと組織の紐付け。

| カラム | 型 | 用途 |
| --- | --- | --- |
| id | uuid pk | ID |
| organization_id | uuid fk | 組織 |
| profile_id | uuid fk | ユーザー |
| role | text | owner / admin / member |
| created_at | timestamptz | 作成日時 |

### 3.5 stores

店舗マスタ。

| カラム | 型 | 用途 |
| --- | --- | --- |
| id | uuid pk | 店舗ID |
| organization_id | uuid fk | 所属組織 |
| name | text | 店舗名 |
| industry | text | 業種 |
| address | text | 住所 |
| phone_number | text | 電話番号 |
| business_hours | jsonb | 営業時間 |
| regular_holidays | text | 定休日 |
| services | text | サービス・メニュー |
| strengths | text | 店舗の強み |
| target_customers | text | ターゲット顧客 |
| competitors | text[] | 競合店舗名 |
| post_tone | text | 投稿のトーン |
| ng_expressions | text[] | NG表現 |
| post_automation_mode | automation_mode | 投稿の自動化。デフォルト approval |
| review_automation_mode | automation_mode | 口コミテンプレート返信の自動化。デフォルト approval |
| gbp_account_name | text nullable | Google側 account resource name |
| gbp_location_name | text nullable | Google側 location resource name |
| gbp_place_id | text nullable | Google Place ID |
| created_at | timestamptz | 作成日時 |
| updated_at | timestamptz | 更新日時 |
| deleted_at | timestamptz nullable | 論理削除 |

### 3.6 store_keywords

対策キーワード。最大20個はアプリ側バリデーションとDB制約で担保する。

| カラム | 型 | 用途 |
| --- | --- | --- |
| id | uuid pk | ID |
| store_id | uuid fk | 店舗 |
| keyword | text | キーワード |
| priority | int | 優先度 |
| is_active | boolean | 有効フラグ |
| created_at | timestamptz | 作成日時 |
| updated_at | timestamptz | 更新日時 |

推奨制約:

- `unique(store_id, keyword)`
- `priority between 1 and 20`
- 有効キーワード数20個までの制約はトリガーまたはアプリ側で実装

### 3.7 ai_proposals

AI提案の中心テーブル。

| カラム | 型 | 用途 |
| --- | --- | --- |
| id | uuid pk | 提案ID |
| store_id | uuid fk | 店舗 |
| title | text | 提案タイトル |
| category | proposal_category | 提案カテゴリ |
| body | text | 提案本文 |
| platform | proposal_platform | 投稿先媒体 |
| goal | text | 狙い |
| target_keywords | text[] | 使用キーワード |
| status | proposal_status | 下書き / 承認済み / 却下 / 投稿済み |
| source_type | text | ai / manual / gbp_review / gbp_post |
| source_review_id | uuid nullable | 口コミ由来の場合 |
| prompt_template_id | uuid nullable | 使用プロンプト |
| prompt_version | int nullable | プロンプトバージョン |
| ai_model | text nullable | 生成モデル |
| generation_input | jsonb nullable | 生成入力 |
| generation_output | jsonb nullable | 生成出力 |
| generation_error | text nullable | 生成失敗時の原因 |
| approved_by | uuid nullable | 承認者 |
| approved_at | timestamptz nullable | 承認日時 |
| rejected_reason | text nullable | 却下理由 |
| posted_at | timestamptz nullable | 投稿済み日時 |
| created_at | timestamptz | 作成日時 |
| updated_at | timestamptz | 更新日時 |

### 3.8 proposal_revisions

編集履歴。承認フローの監査に使う。

| カラム | 型 | 用途 |
| --- | --- | --- |
| id | uuid pk | ID |
| proposal_id | uuid fk | 提案 |
| edited_by | uuid fk | 編集者 |
| title | text | 編集後タイトル |
| body | text | 編集後本文 |
| goal | text | 編集後の狙い |
| target_keywords | text[] | 編集後キーワード |
| created_at | timestamptz | 編集日時 |

### 3.9 proposal_status_events

ステータス変更履歴。

| カラム | 型 | 用途 |
| --- | --- | --- |
| id | uuid pk | ID |
| proposal_id | uuid fk | 提案 |
| from_status | proposal_status nullable | 変更前 |
| to_status | proposal_status | 変更後 |
| actor_id | uuid fk | 操作者 |
| reason | text nullable | 却下理由・補足 |
| created_at | timestamptz | 作成日時 |

### 3.10 publication_records

将来の外部投稿結果を管理するテーブル。初期MVPでは手動の投稿済み記録として使える。

| カラム | 型 | 用途 |
| --- | --- | --- |
| id | uuid pk | ID |
| proposal_id | uuid fk | 提案 |
| store_id | uuid fk | 店舗 |
| platform | proposal_platform | 投稿媒体 |
| external_id | text nullable | 外部媒体ID |
| status | text | posted / failed / manual |
| payload | jsonb nullable | 投稿時payload |
| error_message | text nullable | 失敗理由 |
| posted_at | timestamptz | 投稿日時 |
| created_at | timestamptz | 作成日時 |

### 3.11 prompt_templates

プロンプト管理。

| カラム | 型 | 用途 |
| --- | --- | --- |
| id | uuid pk | ID |
| name | text | プロンプト名 |
| category | proposal_category | 対象カテゴリ |
| version | int | バージョン |
| system_prompt | text | system文 |
| user_prompt_template | text | user文テンプレート |
| is_active | boolean | 有効フラグ |
| created_at | timestamptz | 作成日時 |
| updated_at | timestamptz | 更新日時 |

### 3.12 ai_generation_logs

原因追跡用ログ。

| カラム | 型 | 用途 |
| --- | --- | --- |
| id | uuid pk | ID |
| store_id | uuid nullable | 店舗 |
| proposal_id | uuid nullable | 提案 |
| provider | text | gemini / mock |
| model | text | モデル名 |
| request_payload | jsonb | 入力 |
| response_payload | jsonb nullable | 出力 |
| error_message | text nullable | エラー |
| latency_ms | int nullable | 処理時間 |
| created_at | timestamptz | 作成日時 |

## 4. GBP追加要件向けDB設計

### 4.1 google_oauth_connections

Google OAuth連携情報。トークンは暗号化して保存する。

| カラム | 型 | 用途 |
| --- | --- | --- |
| id | uuid pk | ID |
| organization_id | uuid fk | 組織 |
| profile_id | uuid fk | 連携ユーザー |
| google_account_id | text nullable | GoogleアカウントID |
| email | text nullable | Googleメール |
| scopes | text[] | 許可スコープ |
| access_token_encrypted | text | 暗号化アクセストークン |
| refresh_token_encrypted | text | 暗号化リフレッシュトークン |
| expires_at | timestamptz | 有効期限 |
| created_at | timestamptz | 作成日時 |
| updated_at | timestamptz | 更新日時 |

### 4.2 gbp_locations

GBPロケーションと店舗の紐付け。

| カラム | 型 | 用途 |
| --- | --- | --- |
| id | uuid pk | ID |
| store_id | uuid fk | 店舗 |
| oauth_connection_id | uuid fk | OAuth連携 |
| account_name | text | accounts/{accountId} |
| location_name | text | accounts/{accountId}/locations/{locationId} |
| place_id | text nullable | Place ID |
| title | text | GBP上の店舗名 |
| address | text nullable | GBP上の住所 |
| is_verified | boolean nullable | 検証済みか |
| connected_at | timestamptz | 連携日時 |
| created_at | timestamptz | 作成日時 |
| updated_at | timestamptz | 更新日時 |

### 4.3 review_reply_templates

指定要件のテーブル。星評価別・業種別テンプレート。

| カラム | 型 | 用途 |
| --- | --- | --- |
| id | uuid pk | ID |
| store_id | uuid fk | 店舗 |
| rating | int | 1から5 |
| industry | text | 業種 |
| template_name | text | テンプレート名 |
| template_body | text | 本文 |
| is_active | boolean | 有効フラグ |
| created_at | timestamptz | 作成日時 |
| updated_at | timestamptz | 更新日時 |

### 4.4 google_reviews

指定要件のテーブルに、将来運用で必要な補助項目を追加する。

| カラム | 型 | 用途 |
| --- | --- | --- |
| id | uuid pk | ID |
| store_id | uuid fk | 店舗 |
| google_review_id | text | Google口コミID |
| reviewer_name | text | 投稿者名 |
| rating | int | 星評価 |
| comment | text nullable | 口コミ本文 |
| review_created_at | timestamptz | 口コミ投稿日時 |
| reply_status | reply_status | 返信状態 |
| reply_body | text nullable | 返信案・返信本文 |
| replied_at | timestamptz nullable | 返信日時 |
| ai_summary | text nullable | クレーム要約など |
| risk_flags | text[] | complaint / regulated_industry / ng_word など |
| last_synced_at | timestamptz nullable | 最終同期 |
| created_at | timestamptz | 作成日時 |
| updated_at | timestamptz | 更新日時 |

推奨制約:

- `unique(store_id, google_review_id)`
- `rating between 1 and 5`

### 4.5 gbp_posts

指定要件のテーブルに、承認フロー・画像管理のための補助項目を追加する。

| カラム | 型 | 用途 |
| --- | --- | --- |
| id | uuid pk | ID |
| store_id | uuid fk | 店舗 |
| proposal_id | uuid nullable | 元AI提案 |
| title | text | タイトル |
| body | text | 投稿本文 |
| category | text | 投稿カテゴリ |
| target_keywords | text[] | 使用キーワード |
| image_url | text nullable | 画像URL |
| image_asset_id | uuid nullable | 画像アセット |
| google_post_id | text nullable | Google投稿ID |
| status | gbp_post_status | 投稿状態 |
| scheduled_at | timestamptz nullable | 予約日時 |
| posted_at | timestamptz nullable | 投稿日時 |
| cta_type | text nullable | CALL / BOOK / ORDER など |
| cta_url | text nullable | CTA URL |
| risk_flags | text[] | リスク検知 |
| created_at | timestamptz | 作成日時 |
| updated_at | timestamptz | 更新日時 |

### 4.6 media_assets

AI生成画像・実店舗写真の管理。

| カラム | 型 | 用途 |
| --- | --- | --- |
| id | uuid pk | ID |
| store_id | uuid fk | 店舗 |
| source | text | upload / ai_generated / external |
| storage_path | text | Supabase Storage path |
| public_url | text nullable | 表示URL |
| prompt | text nullable | 画像生成プロンプト |
| metadata | jsonb nullable | サイズなど |
| created_at | timestamptz | 作成日時 |

## 5. RLS・権限設計

初期MVPでもRLSを有効にする。

- ログインユーザーは、自分が所属する organization の店舗だけ閲覧・編集できる。
- `stores`、`store_keywords`、`ai_proposals`、`proposal_revisions`、`proposal_status_events` は organization membership を基準に制御する。
- OAuthトークンは通常ユーザーから直接参照できないようにし、サーバー側APIだけが復号・使用する。
- 監査ログ系テーブルは原則追加のみ。削除・更新は制限する。

## 6. 画面一覧

| No | 画面 | Route | 主な機能 |
| --- | --- | --- | --- |
| 1 | ログイン画面 | `/login` | メールログイン、ログイン失敗表示 |
| 2 | ダッシュボード | `/dashboard` | 本日の提案、承認待ち、承認済み、投稿済み、媒体別・店舗別件数 |
| 3 | 店舗一覧 | `/stores` | 店舗検索、一覧、登録、編集導線 |
| 4 | 店舗登録 | `/stores/new` | 店舗基本情報、キーワード、NG表現登録 |
| 5 | 店舗編集 | `/stores/[storeId]/edit` | 店舗情報更新、自動化モード設定 |
| 6 | AI提案一覧 | `/proposals` | 店舗・媒体・カテゴリ・ステータス絞り込み、AI生成導線 |
| 7 | AI提案詳細 | `/proposals/[proposalId]` | 内容確認、承認、却下、投稿済み変更 |
| 8 | AI提案編集 | `/proposals/[proposalId]/edit` | タイトル、本文、狙い、キーワード編集 |
| 9 | 投稿履歴一覧 | `/history` | 承認済み・投稿済み提案の検索、外部投稿履歴 |

### GBP連携フェーズで追加する画面

| 画面 | Route | 主な機能 |
| --- | --- | --- |
| GBP連携設定 | `/settings/gbp` | Google OAuth、ロケーション紐付け |
| 口コミ一覧 | `/gbp/reviews` | 口コミ取得、未返信検出、返信案作成 |
| 口コミ返信テンプレート | `/gbp/review-templates` | 星評価別・業種別テンプレート管理 |
| GBP投稿一覧 | `/gbp/posts` | 投稿案、画像、プレビュー、承認、投稿 |
| 投稿画像管理 | `/gbp/media` | AI生成画像、実写真アップロード、差し替え |

## 7. 画面ごとのUX方針

### 7.1 ダッシュボード

- 店舗オーナーが今日見るべき提案を最上部に置く。
- 承認待ちを最優先で目立たせる。
- 「確認する」「承認する」「編集する」への導線を短くする。
- 媒体別・店舗別の件数はカードではなく、一覧性の高い小さな集計ブロックにする。

### 7.2 店舗登録・編集

- 入力項目は多いため、基本情報、マーケティング情報、キーワード、NG表現に分ける。
- キーワードは最大20個をカウンター付きで管理する。
- NG表現はチップ形式で追加・削除できるようにする。
- 自動化モードは初期値を「承認制」に固定する。

### 7.3 AI提案一覧・詳細

- 一覧ではステータス、媒体、店舗、カテゴリ、作成日をすぐ見えるようにする。
- 詳細画面の主要CTAは「承認」「編集」「却下」。
- 「投稿済みに変更」は承認済みの提案だけに表示する。
- 却下時は理由を任意入力できるようにする。

### 7.4 投稿履歴

- 初期MVPでは `ai_proposals.status in ('approved', 'posted')` を中心に表示する。
- 将来は `publication_records` と統合し、外部媒体の投稿IDやエラーも表示する。

## 8. AI提案生成設計

### 8.1 生成入力

- 店舗基本情報
- 業種
- サービス・メニュー
- 店舗の強み
- ターゲット顧客
- 対策キーワード
- 競合店舗
- 投稿トーン
- NG表現
- 生成したいカテゴリ
- 目的: 新規集客 / MEO / AEO / 口コミ改善 / リピーター獲得 / インバウンド / LINE活用

### 8.2 生成出力

AIからはJSON形式で受け取り、DBに保存する。

```json
{
  "title": "提案タイトル",
  "category": "google_business_profile_post",
  "platform": "google_business_profile",
  "body": "投稿本文",
  "goal": "狙い",
  "target_keywords": ["地域名 整体", "肩こり 改善"],
  "risk_notes": []
}
```

### 8.3 プロンプト管理

- `prompts/` に初期プロンプトをコードとして管理する。
- `prompt_templates` に有効プロンプトを保存し、バージョンを持たせる。
- 生成時は `prompt_template_id` と `prompt_version` を `ai_proposals` に保存する。
- NG表現、業種別規制、過度な効果保証の回避ルールは共通プロンプトに分離する。

### 8.4 エラー処理

- Gemini APIエラー、JSON parseエラー、バリデーションエラーを分けて保存する。
- ユーザーには「何が原因で失敗したか」を短く表示する。
- 失敗時は再生成できるようにする。
- 開発・デモ環境では `mock-provider` でサンプル提案を生成できるようにする。

## 9. GBP口コミ返信・GBP投稿の設計方針

### 9.1 初期方針

GBP連携は初期MVP後のフェーズで実装する。ただし、DBと提案ステータスは最初から連携を見越した構造にする。

Google Business Profile APIはOAuth 2.0認証が前提で、レビュー取得・返信、ローカル投稿作成にはGoogle側の権限・ロケーション検証状態・スコープが関係する。実装前にGoogle Cloud側のアプリ設定と利用可能APIを確認する。

### 9.2 口コミ返信フロー

1. Google OAuthで連携する。
2. GBPアカウント・ロケーションを取得し、店舗と紐付ける。
3. 口コミを同期する。
4. 未返信口コミを検出する。
5. 星評価・業種・店舗NG表現をもとにテンプレート候補を選ぶ。
6. 口コミ本文にクレームや具体指摘がある場合、AIが要約して返信案を作成する。
7. リスク表現・NGワードを検査する。
8. 管理者が承認する。
9. 承認後にGBPへ返信を投稿する。
10. 返信履歴と外部IDを保存する。

### 9.3 星評価別テンプレート方針

| 星評価 | 方針 |
| --- | --- |
| 5 | 感謝・再来店促進 |
| 4 | 感謝・改善姿勢 |
| 3 | 感謝・改善点の確認 |
| 2 | 謝罪・改善意思・詳細確認導線 |
| 1 | 謝罪・事実確認・個別連絡導線 |

### 9.4 GBP投稿フロー

1. 店舗情報とキーワードを読み込む。
2. 投稿カテゴリを選ぶ。
3. 投稿テーマを自動生成する。
4. 主要キーワードを1から3個だけ自然に挿入する。
5. 来店導線を入れる。
6. 画像テーマを生成する。
7. 実店舗写真がある場合は実写真を優先し、なければAI画像を生成する。
8. 管理画面で投稿本文・画像をプレビューする。
9. 管理者が承認する。
10. 承認後にGBPへ投稿する。
11. 投稿履歴を保存する。

### 9.5 自動化モード

| モード | 内容 | 初期実装 |
| --- | --- | --- |
| A: 承認制 | すべてAI生成後に管理者承認 | 初期MVPのデフォルト |
| B: 半自動 | 星4から5や通常投稿のみ自動、リスクありは承認制 | 将来 |
| C: 完全自動 | 事前ルールに沿って自動投稿・返信 | 将来 |

## 10. 実装ステップ

### Phase 0: プロジェクト準備

1. Next.js / TypeScript / Tailwind CSS プロジェクト作成
2. ESLint / Prettier / 型チェック設定
3. Supabaseプロジェクト接続
4. `.env.example` 作成
5. Vercelデプロイ前提の環境変数整理

### Phase 1: 初期MVP

1. Supabase Authログイン実装
2. `profiles` / `organizations` / `organization_members` 初期化
3. 店舗DB・RLS・バリデーション実装
4. 店舗一覧・登録・編集画面実装
5. キーワード最大20個・NG表現管理実装
6. AI提案DB・編集履歴・ステータス履歴実装
7. Gemini / mock 生成プロバイダー実装
8. プロンプト分離・バージョン保存実装
9. AI提案一覧・詳細・編集画面実装
10. 承認・却下・投稿済み変更のサーバーアクション実装
11. ダッシュボード集計実装
12. 投稿履歴一覧・検索実装
13. エラー表示・生成ログ実装
14. 基本テスト・Vercelデプロイ確認

### Phase 1.5: テンプレート自動化 MVP+

PDF資料と追加要望を踏まえ、外部API連携を含むが事業価値が高いため、Phase 1完了直後に優先する。

1. 口コミ返信テンプレート管理
2. GBP投稿テンプレート管理
3. 店舗別の自動化モード設定
4. 星4から5口コミのテンプレート自動返信ルール
5. 星1から3、クレーム系、NG表現、規制業種の承認制フォールバック
6. GBP投稿のテンプレート生成・予約・自動投稿ルール
7. 自動化実行ログ
8. 自動化の一時停止スイッチ

### Phase 2: GBP口コミ返信 MVP

1. Google OAuth認証
2. 店舗とGBPロケーションの紐付け
3. 口コミ取得・同期
4. 未返信口コミ検出
5. 返信テンプレート登録
6. AI返信案生成
7. リスク表現・NGワード検査
8. 承認後の口コミ返信投稿
9. 返信履歴管理
10. 同期・投稿エラーのログ管理

### Phase 3: GBP投稿 MVP

1. 投稿カテゴリ管理
2. GBP投稿テーマ自動生成
3. 投稿本文へのキーワード自然挿入
4. 投稿画像生成
5. 投稿画像保存
6. 実写真優先・画像差し替え
7. GBP投稿プレビュー
8. 承認後のGBP投稿
9. 投稿履歴管理

### Phase 4: 自動化レベル拡張

1. モードBの条件判定
2. 星4から5口コミの自動返信ルール
3. 通常投稿の自動投稿ルール
4. リスク表現がある場合の承認制フォールバック
5. モードCの安全制限・停止機能
6. 通知・監査ログ強化

## 11. MVPでやること・やらないこと

### 11.1 初期MVPでやること

- ログイン
- 店舗登録・編集
- キーワード最大20個管理
- NG表現管理
- AI提案生成
- AI提案一覧
- AI提案詳細確認
- AI提案編集
- 承認
- 却下
- 投稿済み変更
- ダッシュボード集計
- 投稿履歴検索
- プロンプト分離
- 生成ログ・エラー表示
- 将来の外部連携を見越したDB設計

### 11.2 初期MVPでやらないこと

- GBPへの実投稿。ただしMVP+で最優先実装する
- GBP口コミへの実返信投稿。ただしMVP+で最優先実装する
- note API投稿
- LINE API配信
- 無条件の完全自動運用
- 決済
- 権限の細かいロール管理
- 多言語翻訳の本格運用
- 詳細な分析レポート
- 外部媒体からの実績自動取得

### 11.3 GBP連携MVPでやること

- Google OAuth
- GBPロケーション紐付け
- 口コミ取得
- 返信テンプレート管理
- AI返信案生成
- 承認後の口コミ返信投稿
- 星4から5のテンプレート自動返信
- 星1から3、クレーム系、リスク表現あり口コミの承認制フォールバック
- GBP投稿文生成
- GBP投稿画像生成
- 承認後のGBP投稿
- 通常GBP投稿のテンプレート自動投稿
- 投稿・返信履歴管理

### 11.4 GBP連携MVPでまだやらないこと

- すべての口コミへの完全自動返信
- すべての投稿カテゴリでの完全自動投稿
- 星1から3やクレーム系口コミの自動投稿
- 法規制が絡む業種での無制限な自動返信
- 投稿成果の高度な効果測定
- 複数媒体への同時自動配信

## 12. 実装時の注意点

- 承認フローを最優先にする。
- ステータス変更は必ず履歴に残す。
- AI生成結果は必ず人間が編集できる形にする。
- 店舗ごとのNG表現を生成前・生成後の両方で扱う。
- 医療・美容・士業などは、効果保証や断定表現を避けるルールを共通化する。
- Gemini API障害時にMVP全体が止まらないよう、mock生成や再試行を用意する。
- OAuthトークンは暗号化し、クライアントに露出させない。
- GBP API投稿・返信は、外部ID・payload・エラーを保存する。
- UIは店舗オーナーが毎日使う前提で、承認待ちの確認と判断を短時間で終えられる設計にする。

## 13. 参考にした公式資料

- Google Business Profile APIs overview: https://developers.google.com/my-business/ref_overview
- Google Business Profile review data: https://developers.google.com/my-business/content/review-data
- Google Business Profile review reply method: https://developers.google.com/my-business/reference/rest/v4/accounts.locations.reviews/updateReply
- Google Business Profile posts data: https://developers.google.com/my-business/content/posts-data
- Google Business Profile localPosts resource: https://developers.google.com/my-business/reference/rest/v4/accounts.locations.localPosts

## 14. PDF資料からの追加反映

参照資料: `/Users/nishidashou/Desktop/s-1x1_3a647215-fd3d-42cc-aeb9-b4daad323dbb.pdf`

### 14.1 資料から読み取れるプロダクト価値

- 牛くんずAIは「24時間365日働くAI社員」として、店舗マーケティングを毎日運用する。
- 店舗オーナーの作業は、毎朝の提案確認、承認、編集、却下に集約する。
- 目標UXは「1日30秒」「月間10分」でマーケティング運用が完了すること。
- 従来の月4から6回投稿ではなく、GBP、note、LINEを最大毎営業日レベルで運用する。
- MEO、AEO、口コミ、LINE、インバウンドを分断せず、同じ店舗理解に基づいて横断運用する。
- 口コミ対策では、Googleポリシー違反を避け、正攻法で口コミ獲得と返信を運用する。
- 業種特化エージェントの考え方が重要。高級飲食、飲食、美容、ホテル、自動車・不動産、クリニック、掃除・便利屋、スクール、買取、士業などで訴求軸を変える。

### 14.2 MVPへの反映

- ダッシュボードの主役は「本日の承認待ち」にする。
- 提案生成は単発ではなく、営業日ごとに複数媒体の施策を作る前提にする。
- 投稿頻度設定を店舗ごとに持たせる。
- GBP投稿、note記事、LINE配信は同じマーケティングカレンダー上で管理できる設計にする。
- 口コミ返信は承認制だけでなく、テンプレート自動返信を早期実装対象にする。
- 口コミ獲得支援として、将来的にQRアンケート、低評価フィードバックの社内改善票化、高評価ユーザーのGoogle口コミ導線を追加できるDB余地を残す。
- 業種別プロンプト・テンプレートを管理できる設計にする。

### 14.3 投稿・口コミ自動化の改訂方針

ユーザー要望として「投稿、口コミは自動返信までは自動化したい。テンプレでも可能」が追加されたため、以下の方針に改訂する。

#### 口コミ返信

- デフォルトは承認制。
- 店舗ごとに「テンプレート自動返信を許可」を設定できる。
- 自動返信対象は、まず星4から5、本文なし、または明確なクレームを含まない短文口コミに限定する。
- 星1から3、クレーム、医療・美容・士業など規制業種、NGワード検出時は必ず承認制に戻す。
- 自動返信でも `google_reviews` と `proposal_status_events` に履歴を残す。

#### GBP投稿

- デフォルトは承認制。
- 店舗ごとに「通常投稿の自動投稿を許可」を設定できる。
- 自動投稿対象は、最新情報、店舗の強み紹介、よくある質問、季節イベントなど低リスクカテゴリから開始する。
- キャンペーン、価格、医療・美容の効果訴求、クレーム引用、口コミ紹介は承認制にする。
- 1投稿あたり主要キーワードは1から3個までに制限する。
- 自動投稿でも投稿前プレビュー、投稿後履歴、失敗ログを残す。

### 14.4 追加DB候補

#### automation_rules

| カラム | 型 | 用途 |
| --- | --- | --- |
| id | uuid pk | ID |
| store_id | uuid fk | 店舗 |
| rule_type | text | review_reply / gbp_post |
| is_enabled | boolean | 有効フラグ |
| conditions | jsonb | 星評価、カテゴリ、NG条件など |
| action | text | auto_reply / auto_post / require_approval |
| created_at | timestamptz | 作成日時 |
| updated_at | timestamptz | 更新日時 |

#### post_templates

| カラム | 型 | 用途 |
| --- | --- | --- |
| id | uuid pk | ID |
| store_id | uuid nullable | 店舗別テンプレート。nullなら共通 |
| industry | text nullable | 業種 |
| category | text | 投稿カテゴリ |
| template_name | text | テンプレート名 |
| template_body | text | 本文 |
| is_active | boolean | 有効フラグ |
| created_at | timestamptz | 作成日時 |
| updated_at | timestamptz | 更新日時 |

#### marketing_calendar_items

| カラム | 型 | 用途 |
| --- | --- | --- |
| id | uuid pk | ID |
| store_id | uuid fk | 店舗 |
| proposal_id | uuid nullable | 元提案 |
| platform | proposal_platform | 媒体 |
| category | text | カテゴリ |
| scheduled_date | date | 実行予定日 |
| status | text | planned / generated / approved / posted / skipped / failed |
| created_at | timestamptz | 作成日時 |
| updated_at | timestamptz | 更新日時 |

#### customer_feedback_surveys

| カラム | 型 | 用途 |
| --- | --- | --- |
| id | uuid pk | ID |
| store_id | uuid fk | 店舗 |
| rating | int | アンケート評価 |
| comment | text nullable | コメント |
| destination | text | google_review_request / internal_improvement |
| created_at | timestamptz | 作成日時 |

### 14.5 改訂後の実装優先順位

1. 外部APIなしMVPで、店舗管理、提案生成、承認フローを完成させる。
2. GBP OAuthとロケーション紐付けを実装する。
3. 口コミ取得と返信テンプレート管理を実装する。
4. 星4から5の安全な口コミに限り、テンプレート自動返信を実装する。
5. リスク判定に該当する口コミは承認制に戻す。
6. GBP投稿テンプレートと投稿カテゴリ管理を実装する。
7. 低リスクカテゴリのGBP通常投稿を自動投稿できるようにする。
8. 投稿・返信の実行ログ、停止スイッチ、失敗時アラートを実装する。
9. note、LINE、多言語、アンケート口コミ改善システムへ拡張する。
