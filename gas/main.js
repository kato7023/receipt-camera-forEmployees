/**
 * メインエントリ — GAS Web App（領収書撮影システム 社員版）
 *
 * Phase 0: 基盤構築（DB接続・ログ基盤・疎通確認のみ）
 * Phase A: Google IDトークン検証＋社員マスタ照合を全アクションに適用（予定）
 * Phase B: freeeAPIv3（社員ごとOAuth・本人名義登録）（予定）
 *
 * ⚠️ Phase B 完了までは freee 接続コードを一切書かないこと（AGENTS.md参照）。
 */

/**
 * GET リクエストハンドラ
 */
function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || '';

    let data;

    switch (action) {
      case 'ping':
        // 疎通確認用（実データには一切アクセスしない）
        data = { message: 'pong', serverTime: new Date().toISOString(), phase: 'Phase 0' };
        logToDb('doGet:ping', 'ok', 'anonymous');
        break;
      default:
        return jsonResponse({ success: false, error: `不明なアクション: ${action}` });
    }

    return jsonResponse({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('doGet error:', message);
    logErrorToDb('doGet', error, 'anonymous');
    return jsonResponse({ success: false, error: message });
  }
}

/**
 * POST リクエストハンドラ
 */
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);

    // Phase A で全アクションに IDトークン検証を適用する。
    // それまで実データへアクセスする POST アクションは実装しない。
    return jsonResponse({ success: false, error: `不明なアクション: ${body.action}` });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('doPost error:', message);
    logErrorToDb('doPost', error, 'anonymous');
    return jsonResponse({ success: false, error: message });
  }
}

/**
 * JSON レスポンスを生成
 */
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
