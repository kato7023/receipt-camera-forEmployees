# プロジェクトルール — 領収書撮影システム（社員版）

全社員（50名超）対象の経費精算アプリ。既存の個人用プロジェクト（receipt-camera）とは完全に独立した別プロジェクト。

## 🔴 Freee API 安全規則（最重要）

本プロジェクトは Freee 会計 API と連携します（Phase B以降）。
Freee API への破壊的操作は企業運営に致命的なダメージを与える可能性があるため、以下を厳守してください：

1. **Freee API への DELETE リクエストのコードを書いてはならない**
2. **Freee API への PUT リクエストのコードを書いてはならない**（マスタデータの変更に該当するもの）
3. **許可される POST は `receipts`（証憑アップロード）と `expense_applications`（経費精算下書き）のみ**
4. **freeeAPIv2 ライブラリ（Script ID: `1qn-v2btDmxL4wIhqCsvb_2x4KZGopxWty6N5rSUg_uiv_TSAsIaJoZsm`）は本プロジェクトでは一切使用しない**（管理者個人用の実験ライブラリのため。変更も禁止）
5. freee OAuth2 エンドポイント（認可コード交換・トークンリフレッシュ）への接続は、全社員OAuth導入（freeeAPIv3モジュール）に必要な範囲で**承認済み**（2026-07-12）
6. 上記以外の新しい Freee API エンドポイントを追加する場合は、必ずユーザーの承認を得ること
7. **Phase B 完了までは freee 接続コードを一切書かない**（アプリはfreee無効の状態で構築する）

## アーキテクチャ規則

- データベースは **Cloud SQL (MySQL)**。GASからは標準JDBCサービスで接続。スプレッドシートをDBとして使わない
- 秘密情報（DB接続情報・freee client_secret・社員のOAuthトークン）は **Script Properties のみ**に保管。DB・リポジトリ・スプレッドシートに置かない
- 全APIアクションは Google IDトークン検証（Phase A以降）を通すこと。認証なしで実データへアクセスできるアクションを作らない
- 社員マスタ（employees）・ログ（app_logs）は他の社内アプリと共通利用する「全社共通マスタ基盤」として設計する
- freeeAPIv3モジュール（`gas/freee-api-v3.js`）は、安定後にライブラリとして切り出す前提で設計する（依存はScript Properties＋LockServiceに限定）

## コーディング規約

- GAS バックエンドは `.js`（純粋 JavaScript）で記述する（`.ts` は clasp が認識しない）
- `clasp deploy` は必ず `-i <DEPLOYMENT_ID>` オプションで既存デプロイを上書きすること
  - 本番デプロイID: `AKfycbwMpMUnhVOv2X07s9m3lec1F5b3k4gAz7V919bjm6UhE90JfIsfyX2BA1rFBTHgSso`
- GAS の `clasp push` と `clasp deploy` は `gas/` ディレクトリで実行すること
