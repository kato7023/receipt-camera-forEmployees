/**
 * Cloud SQL (MySQL) アクセス共通モジュール
 *
 * Script Properties（必須）:
 * - DB_INSTANCE_CONNECTION_NAME … 例: my-project:asia-northeast1:my-instance
 * - DB_NAME … 例: corp_shared
 * - DB_USER
 * - DB_PASS
 *
 * すべてのSQL実行はプリペアドステートメント経由で行い、SQLインジェクションを防ぐ。
 */

/**
 * Cloud SQL への接続を取得する。呼び出し側で必ず close() すること
 * （query/execute ヘルパーを使えば自動で close される）。
 */
function getDbConnection() {
  const props = PropertiesService.getScriptProperties();
  const instance = props.getProperty('DB_INSTANCE_CONNECTION_NAME');
  const dbName = props.getProperty('DB_NAME');
  const user = props.getProperty('DB_USER');
  const pass = props.getProperty('DB_PASS');

  if (!instance || !dbName || !user || !pass) {
    throw new Error('DB接続情報が未設定です。Script Properties に DB_INSTANCE_CONNECTION_NAME / DB_NAME / DB_USER / DB_PASS を設定してください。');
  }

  const url = 'jdbc:google:mysql://' + instance + '/' + dbName;
  return Jdbc.getCloudSqlConnection(url, user, pass);
}

/**
 * SELECT を実行し、行をオブジェクトの配列で返す。
 * @param {string} sql プレースホルダ(?)を含むSQL
 * @param {Array} params プレースホルダに割り当てる値（省略可）
 * @returns {Array<Object>} カラム名をキーとした行の配列
 */
function dbQuery(sql, params) {
  const conn = getDbConnection();
  try {
    const stmt = conn.prepareStatement(sql);
    bindParams_(stmt, params);
    const rs = stmt.executeQuery();
    const meta = rs.getMetaData();
    const colCount = meta.getColumnCount();
    const colNames = [];
    for (let i = 1; i <= colCount; i++) {
      colNames.push(meta.getColumnLabel(i));
    }

    const rows = [];
    while (rs.next()) {
      const row = {};
      for (let i = 1; i <= colCount; i++) {
        row[colNames[i - 1]] = rs.getObject(i);
      }
      rows.push(row);
    }
    rs.close();
    stmt.close();
    return rows;
  } finally {
    conn.close();
  }
}

/**
 * INSERT / UPDATE を実行し、影響行数を返す。
 * ※本プロジェクトではアプリコードからの DELETE 文は原則書かない（データ保全方針）。
 * @param {string} sql プレースホルダ(?)を含むSQL
 * @param {Array} params プレースホルダに割り当てる値（省略可）
 * @returns {number} 影響行数
 */
function dbExecute(sql, params) {
  const conn = getDbConnection();
  try {
    const stmt = conn.prepareStatement(sql);
    bindParams_(stmt, params);
    const affected = stmt.executeUpdate();
    stmt.close();
    return affected;
  } finally {
    conn.close();
  }
}

/**
 * INSERT を実行し、AUTO_INCREMENT で採番されたIDを返す。
 */
function dbInsert(sql, params) {
  const conn = getDbConnection();
  try {
    const stmt = conn.prepareStatement(sql, Jdbc.Statement.RETURN_GENERATED_KEYS);
    bindParams_(stmt, params);
    stmt.executeUpdate();
    const keys = stmt.getGeneratedKeys();
    let id = null;
    if (keys.next()) {
      id = keys.getLong(1);
    }
    keys.close();
    stmt.close();
    return id;
  } finally {
    conn.close();
  }
}

/**
 * プリペアドステートメントに値を割り当てる（内部ヘルパー）。
 */
function bindParams_(stmt, params) {
  if (!params) return;
  for (let i = 0; i < params.length; i++) {
    const value = params[i];
    if (value === null || value === undefined) {
      stmt.setNull(i + 1, 0); // java.sql.Types.NULL
    } else if (typeof value === 'number') {
      if (Number.isInteger(value)) {
        stmt.setLong(i + 1, value);
      } else {
        stmt.setDouble(i + 1, value);
      }
    } else if (typeof value === 'boolean') {
      stmt.setBoolean(i + 1, value);
    } else if (value instanceof Date) {
      stmt.setTimestamp(i + 1, Jdbc.newTimestamp(value.getTime()));
    } else {
      stmt.setString(i + 1, String(value));
    }
  }
}

// ============================================================
// セットアップ・診断用関数（GAS エディタから手動実行）
// ============================================================

/**
 * DB接続テスト。GAS エディタで「testDbConnection」を選択して ▶ 実行。
 * 接続・読み取り・ログ書き込みまでの一連の動作を確認する。
 */
function testDbConnection() {
  Logger.log('=== Cloud SQL 接続テスト ===');

  // 1. 接続と単純なクエリ
  const rows = dbQuery('SELECT 1 AS ok, NOW() AS server_time');
  Logger.log('✅ 接続成功: ' + JSON.stringify(rows));

  // 2. テーブル一覧
  const tables = dbQuery('SHOW TABLES');
  Logger.log('✅ テーブル一覧: ' + JSON.stringify(tables));

  // 3. ログ書き込みテスト（app_logs テーブル作成後に成功する）
  try {
    logToDb('testDbConnection', 'E2E接続テスト', 'system');
    const logs = dbQuery('SELECT * FROM app_logs ORDER BY id DESC LIMIT 3');
    Logger.log('✅ ログ書き込み成功。直近のログ: ' + JSON.stringify(logs));
  } catch (e) {
    Logger.log('⚠️ ログ書き込みは未確認（app_logs テーブル未作成の可能性）: ' + e.message);
  }

  Logger.log('🎉 接続テスト完了');
}
