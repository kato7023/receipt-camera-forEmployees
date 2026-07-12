-- ============================================================
-- 領収書撮影システム（社員版） DBスキーマ 初版
-- 対象: Cloud SQL (MySQL 8.0)
-- 適用方法: GCPコンソール → Cloud SQL → Cloud SQL Studio で実行
--
-- 設計方針:
-- - employees / app_logs は「全社共通マスタ基盤」。他の社内アプリからも共通利用する
-- - 領収書画像の実体は Google Drive に保存し、DBには drive_file_id のみ記録する
-- - アプリコードからの DELETE は原則行わない（無効化は is_active / status で表現）
-- ============================================================

CREATE DATABASE IF NOT EXISTS corp_shared
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE corp_shared;

-- ------------------------------------------------------------
-- 社員マスタ（全社共通）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS employees (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,      -- Google Workspaceのメールアドレス（認証キー）
  name          VARCHAR(100) NOT NULL,
  department    VARCHAR(100) NULL,                 -- 部署（承認経路の条件に使用）
  job_title     VARCHAR(100) NULL,                 -- 役職
  is_admin      BOOLEAN      NOT NULL DEFAULT FALSE, -- 本システムの管理者権限
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,  -- FALSEでログイン不可（退職・停止）
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 領収書
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS receipts (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  employee_id     INT          NOT NULL,
  captured_at     DATETIME     NOT NULL,            -- 撮影日時
  amount          INT          NOT NULL DEFAULT 1,  -- 金額（円）
  payment_method  VARCHAR(50)  NULL,                -- 支払い方法名
  group_name      VARCHAR(100) NULL,                -- グループ（複数枚を1申請にまとめる）
  memo            TEXT         NULL,
  drive_file_id   VARCHAR(100) NULL,                -- Drive上の画像ファイルID
  status          VARCHAR(20)  NOT NULL DEFAULT 'draft',
  -- draft(下書き) / submitted(申請中) / approved(承認済) / rejected(差戻し) / freee_posted(freee登録済)
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id),
  INDEX idx_receipts_employee_status (employee_id, status),
  INDEX idx_receipts_status (status)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 承認経路マスタ（段数・経路をマスタで可変にする）
-- 例: 部署=営業部・金額10,000円以上 → step1=課長, step2=部長
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS approval_routes (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(100) NOT NULL,             -- 経路名（管理用）
  department      VARCHAR(100) NULL,                 -- 対象部署（NULL=全部署に適用）
  min_amount      INT          NOT NULL DEFAULT 0,   -- この金額以上の申請に適用
  step_no         INT          NOT NULL,             -- 承認段（1, 2, ...）
  approver_email  VARCHAR(255) NOT NULL,             -- この段の承認者
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_routes_lookup (department, min_amount, is_active)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 承認ステップ（個別申請ごとの承認状態）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS approval_steps (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  receipt_id      INT          NOT NULL,
  step_no         INT          NOT NULL,
  approver_email  VARCHAR(255) NOT NULL,
  status          VARCHAR(20)  NOT NULL DEFAULT 'pending', -- pending / approved / rejected
  comment         TEXT         NULL,                       -- 承認・差戻しコメント
  decided_at      DATETIME     NULL,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (receipt_id) REFERENCES receipts(id),
  INDEX idx_steps_approver (approver_email, status),
  INDEX idx_steps_receipt (receipt_id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- freee登録結果（Phase B以降で使用）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS freee_uploads (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  receipt_id        INT          NOT NULL,
  request_id        VARCHAR(64)  NULL,               -- 通信断対策のリクエストID（現行プロジェクトの知見を移植）
  freee_company_id  BIGINT       NULL,
  freee_receipt_id  BIGINT       NULL,               -- 証憑ID
  freee_expense_id  BIGINT       NULL,               -- 経費申請ID
  actor_email       VARCHAR(255) NOT NULL,           -- 実行者（=名義人）
  status            VARCHAR(20)  NOT NULL,           -- completed / partial / error
  error             TEXT         NULL,
  created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (receipt_id) REFERENCES receipts(id),
  INDEX idx_freee_request (request_id),
  INDEX idx_freee_receipt (receipt_id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 汎用ログ（全社共通・他アプリと共用）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS app_logs (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  app_name     VARCHAR(50)  NOT NULL,     -- ログを出したアプリの識別子
  actor_email  VARCHAR(255) NULL,
  action       VARCHAR(100) NOT NULL,
  detail       TEXT         NULL,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_logs_app_time (app_name, created_at),
  INDEX idx_logs_actor (actor_email)
) ENGINE=InnoDB;
