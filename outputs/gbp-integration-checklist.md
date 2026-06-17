# 牛くんずAI GBP連携チェックリスト

## 事前に用意するもの

- Google Business Profileを管理できるGoogleアカウント
- Google Cloudプロジェクト
- Business Profile APIsの利用承認
- 関連APIの有効化
- OAuth 2.0クライアントID・クライアントシークレット
- 本番環境とローカル環境のリダイレクトURI
- OAuthスコープ `https://www.googleapis.com/auth/business.manage`

## OAuth後にAPIから取得するもの

- 管理可能なGBPアカウント一覧
- `accounts/{accountId}` 形式のアカウントリソース名
- 管理可能なロケーション一覧
- `locations/{locationId}` またはAPI操作用のアカウント・ロケーション識別子
- 店舗名、住所、電話番号、カテゴリ、Webサイト、営業時間等の店舗情報
- ロケーションの確認状態
- 口コミID、評価、本文、投稿者、投稿日時、既存返信
- GBP投稿ID、投稿本文、投稿状態、作成日時

## 牛くんずAIに保存するもの

- GoogleアカウントとのOAuth連携情報
- アクセストークンではなく、暗号化したリフレッシュトークン
- GBPアカウントリソース名
- GBPロケーションリソース名
- 店舗IDとの紐付け
- 最終同期日時と同期エラー
- 口コミ返信・投稿の実行履歴

## 注意事項

- 口コミ返信APIは確認済みロケーションでのみ利用できます。
- Business Profile APIsには一般的なサンドボックス環境がありません。
- 初期運用は承認制を推奨し、半自動・完全自動は店舗ごとの設定で段階的に開放します。
- Google CloudのOAuth同意画面、プライバシーポリシー、トークン保管、APIポリシー対応が必要です。
