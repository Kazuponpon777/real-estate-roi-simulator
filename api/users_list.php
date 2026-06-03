<?php
/**
 * 🏢 不動産収支シミュレーション - ユーザー一覧取得API (管理者専用)
 * 独自追加された社外ユーザーと、既存の社員データベースの情報を統合して取得します。
 */

require_once 'db.php';
check_auth_or_exit();

// 日本語コメント: 管理者権限のチェック (セッション値の型判定揺れを吸収)
$session_is_admin = isset($_SESSION['is_admin']) && ($_SESSION['is_admin'] === true || (int)$_SESSION['is_admin'] === 1 || $_SESSION['is_admin'] === '1');
if (!$session_is_admin) {
    http_response_code(403);
    echo json_encode(["status" => "error", "message" => "この操作を実行する権限がありません。"]);
    exit();
}

try {
    // 日本語コメント: 1. 本システム独自のユーザーテーブル（app_users: 社外ユーザー等）から取得
    $appUsers = [];
    $appAdminMap = []; // 日本語コメント: 社員の employee_number => is_admin のマッピング表
    try {
        $stmt = $pdo->query("SELECT id, email, name, employee_number, is_admin, role, created_at FROM app_users ORDER BY employee_number ASC");
        $allUsers = $stmt->fetchAll();
        foreach ($allUsers as $u) {
            // 日本語コメント: 社員の管理者権限判定用マッピングの作成
            if (!empty($u['employee_number'])) {
                $appAdminMap[$u['employee_number']] = (int)$u['is_admin'] === 1;
            }
            // 日本語コメント: フロントエンドへ返す社外パートナー一覧には role = 'external'（または employee_number が EX で始まる）ユーザーのみを含める
            if ($u['role'] === 'external' || (isset($u['employee_number']) && strpos($u['employee_number'], 'EX') === 0)) {
                $appUsers[] = $u;
            }
        }
    } catch (Exception $e) {
        // app_users テーブルが未作成等の場合は空にする
    }

    // 日本語コメント: 2. 社員データベース（freee_employees）から取得
    $employeeUsers = [];
    try {
        $auth_host = 'mysql80.yashimaltd.sakura.ne.jp';
        $auth_dbname = 'yashimaltd_freeetalent';
        $auth_user = 'yashimaltd_freeetalent';
        $auth_pass = 'Yashima8400';

        $auth_pdo = new PDO("mysql:host=$auth_host;dbname=$auth_dbname;charset=utf8mb4", $auth_user, $auth_pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);

        // 日本語コメント: 所属会社が「八洲建設株式会社」の社員のみを抽出します
        $stmt = $auth_pdo->query("SELECT freee_id, personal_email, name, employee_number, is_admin, company_name, custom_fields_json FROM freee_employees WHERE company_name = '八洲建設株式会社' ORDER BY employee_number ASC");
        while ($row = $stmt->fetch()) {
            // 日本語コメント: カスタムフィールドから社用メールアドレスを取得
            $custom_data = json_decode($row['custom_fields_json'] ?? '{}', true) ?: [];
            $profile = $custom_data['profile_rule'] ?? [];
            $base_email = $profile['email'] ?? $row['personal_email'] ?? "";
            
            $custom_arr = $custom_data['profile_custom_fields'] ?? [];
            $cf_map = [];
            foreach ($custom_arr as $cf) {
                if (isset($cf['name']) && isset($cf['value'])) {
                    $cf_map[$cf['name']] = $cf['value'];
                }
            }
            
            $get_cf = function($keys) use ($cf_map) {
                foreach ($keys as $k) {
                    foreach ($cf_map as $name => $val) {
                        if (mb_strpos($name, $k) !== false && trim($val) !== "") return trim($val);
                    }
                }
                return "";
            };
            $company_email = $get_cf(['社用メールアドレス', '社内E-MAIL']);
            $email = !empty($company_email) ? $company_email : (!empty($base_email) ? $base_email : $row['personal_email']);

            // 日本語コメント: 本システム側の app_users テーブルに設定があればそれを反映し、なければ一般作業者とする
            $emp_num = $row['employee_number'];
            $is_admin = isset($appAdminMap[$emp_num]) ? $appAdminMap[$emp_num] : false;

            $employeeUsers[] = [
                "id" => $row['freee_id'],
                "email" => $email,
                "name" => $row['name'],
                "employee_number" => $row['employee_number'],
                "is_admin" => $is_admin,
                "role" => "worker", // 社員は worker 扱い
                "created_at" => null
            ];
        }
    } catch (Exception $e) {
        // 社員DBが読み込めない場合はクラッシュ回避のためログのみ出力
        error_log("社員データ一覧取得エラー: " . $e->getMessage());
    }

    echo json_encode([
        "status" => "success",
        "app_users" => $appUsers,
        "employee_users" => $employeeUsers
    ], JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "ユーザー一覧の取得中にエラーが発生しました: " . $e->getMessage()]);
}
