# 牛くんずAI 本番接続情報シート

作成日: 2026年6月15日

> APIキーやシークレットは、このファイルやチャットへ記載しないでください。Vercelまたはローカルの `.env.local` に直接登録します。

## 1. 運用体制

- サービス責任者:
- 店舗運用担当者:
- 技術・障害対応担当者:
- 試験運用する店舗名:
- 日次確認時刻:
- 口コミ対応期限:

## 2. Supabase

- プロジェクト名:
- Project URLを取得済み: [ ]
- anon keyを環境変数へ登録済み: [ ]
- service role keyをサーバー環境変数へ登録済み: [ ]
- `database/schema.sql` 実行済み: [ ]
- RLSテスト済み: [ ]
- Authのメール認証設定済み: [ ]
- 本番URLをRedirect URLsへ登録済み: [ ]

登録する環境変数:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## 3. Gemini API

- Google AI Studioで本番用キーを発行済み: [ ]
- 利用モデルを決定済み: [ ]
- Vercel環境変数へ登録済み: [ ]

```env
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
```

## 4. Google Business Profile

- 対象GBPを管理できるGoogleアカウントあり: [ ]
- Google Cloudプロジェクト名:
- Business Profile APIs利用承認済み: [ ]
- OAuth同意画面設定済み: [ ]
- OAuthクライアント作成済み: [ ]
- ローカルRedirect URI登録済み: [ ]
- 本番Redirect URI登録済み: [ ]
- 対象ロケーションが確認済み: [ ]

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
```

## 5. 試験運用条件

- 投稿の初期モード: 承認制
- 口コミ返信の初期モード: 承認制
- 試験期間: 1〜2週間
- 投稿テスト担当者:
- 口コミ返信テスト担当者:
- 緊急停止判断者:
- 半自動へ移行する条件:
- 承認制へ戻す条件:

## 次の実装開始条件

以下が完了した時点で、Supabase Auth・DB永続化・GBP OAuthの実接続を開始します。

- [ ] Supabaseプロジェクト作成
- [ ] Gemini APIキーの環境変数登録
- [ ] Google CloudプロジェクトとOAuthクライアント作成
- [ ] 試験店舗と担当者の決定
