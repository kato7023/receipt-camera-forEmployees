# 領収書撮影システム（社員版） — receipt-camera-forEmployees

全社員向けの領収書撮影・経費精算アプリ。撮影した領収書を社内承認フローを経てfreee会計へ本人名義で登録する。

個人用の [receipt-camera](https://github.com/kato7023/receipt-camera) の後継として、マルチユーザー・認証・SQLデータベースを前提に新規設計。

## アーキテクチャ

- **フロントエンド**: React PWA（GitHub Pages）
- **バックエンド**: Google Apps Script Web App
- **データベース**: Cloud SQL (MySQL) — 全社共通マスタ基盤を兼ねる
- **画像保存**: Google Drive
- **認証**: Googleログイン（社内Workspace）+ 社員マスタ照合
- **freee連携**: 社員ごとのOAuth（freeeAPIv3モジュール、Phase B〜）

## 開発フェーズ

- [x] Phase 0: 基盤構築（リポジトリ・GAS・Cloud SQL・共通モジュール）← いまここ
- [ ] Phase A: Google認証＋PWA骨格（freee無効）
- [ ] Phase B: freeeAPIv3（社員ごとfreee OAuth・本人名義登録）
- [ ] Phase C: 社内承認ワークフロー（段数・経路マスタ可変）
- [ ] Phase D: 運用・スケール強化

## セットアップ

[docs/SETUP.md](docs/SETUP.md) を参照。

## プロジェクトルール

[.agents/AGENTS.md](.agents/AGENTS.md) を参照（freee API 安全規則ほか）。
