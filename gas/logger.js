/**
 * 汎用ログモジュール — 全社内アプリ共用を想定
 *
 * GAS Web App は doGet/doPost の実行ログがエディタから見えず不便なため、
 * すべての重要アクションを Cloud SQL の app_logs テーブルへ記録する。
 * 将来ライブラリとして切り出す前提のため、依存は db.js（dbInsert）のみに限定する。
 */

// このアプリのログ識別子（app_logs.app_name に記録される）
const LOG_APP_NAME = 'receipt-camera-forEmployees';

/**
 * ログをDBへ記録する（ベストエフォート）。
 * ログ書き込みの失敗が業務処理を止めないよう、エラーは握りつぶして console に残す。
 * @param {string} action アクション名（例: 'doPost:upload', 'auth:rejected'）
 * @param {string|Object} detail 詳細（オブジェクトはJSON化される）
 * @param {string} actorEmail 実行者メールアドレス（不明時は 'anonymous'）
 */
function logToDb(action, detail, actorEmail) {
  try {
    const detailStr = typeof detail === 'string' ? detail : JSON.stringify(detail);
    dbInsert(
      'INSERT INTO app_logs (app_name, actor_email, action, detail) VALUES (?, ?, ?, ?)',
      [LOG_APP_NAME, actorEmail || 'anonymous', action, detailStr]
    );
  } catch (e) {
    // ログ失敗は業務処理に影響させない
    console.error('logToDb failed:', action, e && e.message);
  }
}

/**
 * エラーログ専用ヘルパー。スタックトレース付きで記録する。
 */
function logErrorToDb(action, error, actorEmail) {
  const detail = {
    message: error && error.message ? error.message : String(error),
    stack: error && error.stack ? error.stack : '',
  };
  logToDb(action + ':error', detail, actorEmail);
}
