<?php
/**
 * 🏢 不動産収支シミュレーション - 一覧取得API
 * 保存されているすべてのシミュレーションの一覧（メタデータのみ）を取得して返却します
 * 一般社員の場合は本人のデータのみ、管理者の場合は作成者氏名付きで全データを取得
 */

require_once 'db.php';
check_auth_or_exit();

$currentUserNum = $_SESSION['employee_number'];
$isAdmin = isset($_SESSION['is_admin']) && $_SESSION['is_admin'] === true;

try {
    if ($isAdmin) {
        // 管理者は全データを取得
        $stmt = $pdo->query("SELECT id, title, mode, created_by, updated_at FROM simulations ORDER BY updated_at DESC");
        $list = $stmt->fetchAll();
    } else {
        // 一般社員は自分のデータのみ取得
        $stmt = $pdo->prepare("SELECT id, title, mode, created_by, updated_at FROM simulations WHERE created_by = :created_by ORDER BY updated_at DESC");
        $stmt->bindParam(':created_by', $currentUserNum);
        $stmt->execute();
        $list = $stmt->fetchAll();
    }

    // 日本語コメント: 社員番号 ⇔ 名前のマッピングを取得してマージ（社外アカウント＆社内社員）
    $employeeNames = [];

    // 日本語コメント: 1. 本システム独自のユーザーテーブル（app_users）から取得
    try {
        $uStmt = $pdo->query("SELECT employee_number, name FROM app_users");
        while ($uRow = $uStmt->fetch()) {
            $key = trim($uRow['employee_number']);
            $employeeNames[$key] = $uRow['name'];
        }
    } catch (Exception $e) {
        // app_users未作成時はスキップ
    }

    // 日本語コメント: 2. 別DB（社員データベース）から追加取得してマージ
    try {
        $auth_host = 'mysql80.yashimaltd.sakura.ne.jp';
        $auth_dbname = 'yashimaltd_freeetalent';
        $auth_user = 'yashimaltd_freeetalent';
        $auth_pass = 'Yashima8400';

        $auth_pdo = new PDO("mysql:host=$auth_host;dbname=$auth_dbname;charset=utf8mb4", $auth_user, $auth_pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);

        $empStmt = $auth_pdo->query("SELECT employee_number, name FROM freee_employees");
        while ($empRow = $empStmt->fetch()) {
            $key = trim($empRow['employee_number']);
            // 既存キーを上書きしない、または社員情報を優先マージ
            $employeeNames[$key] = $empRow['name'];
        }
    } catch (Exception $e) {
        // 社員DBへのアクセス失敗時はスキップし、システムクラッシュを回避
    }

    // 作成者名をマージ
    foreach ($list as &$item) {
        $creatorKey = trim($item['created_by'] ?? '');
        $item['creator_name'] = isset($employeeNames[$creatorKey]) ? $employeeNames[$creatorKey] : '';
    }

    echo json_encode([
        "status" => "success",
        "list" => $list
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => "一覧の取得中にエラーが発生しました: " . $e->getMessage()
    ]);
}
