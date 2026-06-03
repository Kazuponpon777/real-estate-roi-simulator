<?php
/**
 * 🏢 不動産収支シミュレーション - ログインAPI (社員データベース連携)
 * タレントマネジメントDBを参照し、社員メールアドレスとパスワードで認証します。
 */

require_once 'db.php';

// POSTデータの取得
$json = file_get_contents('php://input');
$requestData = json_decode($json, true);

$login_id = trim($requestData['login_id'] ?? '');
$login_pass = trim($requestData['password'] ?? '');

if (empty($login_id) || empty($login_pass)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "メールアドレスとパスワードを入力してください。"]);
    exit();
}

// 日本語コメント: 1. 本システム独自のユーザー管理テーブル（app_users）を確認（社外ユーザー等）
try {
    // メールアドレスは大小文字を区別せず検索するため LOWER を適用
    $stmt = $pdo->prepare("SELECT * FROM app_users WHERE LOWER(email) = LOWER(:email) LIMIT 1");
    $stmt->execute([':email' => $login_id]);
    $app_user = $stmt->fetch();

    if ($app_user) {
        // 日本語コメント: パスワードがFreee社員認証連携 ('SYSTEM_MANAGED_FREE_AUTH') ではない場合のみ、本システム側でハッシュ認証
        if ($app_user['password_hash'] !== 'SYSTEM_MANAGED_FREE_AUTH') {
            // パスワードの検証（ハッシュ照合）
            if (password_verify($login_pass, $app_user['password_hash'])) {
                // ログイン成功 -> セッションをセット
                $_SESSION['authenticated'] = true;
                $_SESSION['employee_id'] = $app_user['id'];
                $_SESSION['employee_number'] = $app_user['employee_number']; // EX001 などのアカウント番号
                $_SESSION['employee_name'] = $app_user['name'];
                $_SESSION['company_name'] = $app_user['role'] === 'external' ? '社外パートナー' : '個別登録ユーザー';
                $_SESSION['is_admin'] = (int)$app_user['is_admin'] === 1;

                echo json_encode([
                    "status" => "success",
                    "message" => "ログインに成功しました。",
                    "user" => [
                        "name" => $app_user['name'],
                        "employee_number" => $app_user['employee_number'],
                        "is_admin" => $_SESSION['is_admin']
                    ]
                ], JSON_UNESCAPED_UNICODE);
                exit();
            } else {
                http_response_code(401);
                echo json_encode(["status" => "error", "message" => "パスワードが正しくありません。"]);
                exit();
            }
        }
        // 日本語コメント: 'SYSTEM_MANAGED_FREE_AUTH' の場合は、このブロックをスルーして後半のFreee社員認証処理へ進みます
    }
} catch (PDOException $e) {
    // 日本語コメント: テーブル未作成や移行途中の場合はログ出力し、社員DB認証へフォールバック
    error_log("app_users 認証エラー (フォールバックします): " . $e->getMessage());
}

// 日本語コメント: 2. 従来のタレントマネジメントDBへの別接続パラメータ
$auth_host = 'mysql80.yashimaltd.sakura.ne.jp';
$auth_dbname = 'yashimaltd_freeetalent';
$auth_user = 'yashimaltd_freeetalent';
$auth_pass = 'Yashima8400';

try {
    // 社員データベースに接続
    $auth_pdo = new PDO("mysql:host=$auth_host;dbname=$auth_dbname;charset=utf8mb4", $auth_user, $auth_pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    // 全社員のデータを取得してログインIDとパスワードの照合を行う
    $stmt = $auth_pdo->query("SELECT * FROM freee_employees");
    $allowed_user = null;

    while ($row = $stmt->fetch()) {
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
        
        $emails = [];
        if (!empty($profile['email'])) $emails[] = strtolower(trim($profile['email']));
        if (!empty($row['personal_email'])) $emails[] = strtolower(trim($row['personal_email']));
        if (!empty($company_email)) $emails[] = strtolower(trim($company_email));

        $custom_password = $get_cf(['パスワード', 'PCログイン']);
        $fallback_password = $row['login_password'] ?? $row['employee_number'] ?? "";
        $actual_password = !empty($custom_password) ? $custom_password : $fallback_password;

        if (in_array(strtolower($login_id), $emails)) {
            $authenticated = false;

            // 1. ハッシュ化されたパスワードでの検証
            if (!empty($row['login_password']) && strpos($row['login_password'], '$2y$') === 0) {
                if (password_verify($login_pass, $row['login_password'])) {
                    $authenticated = true;
                }
            }

            // 2. 平文との一致検証
            if (!$authenticated) {
                if ($login_pass === $actual_password || $login_pass === $row['login_password'] || $login_pass === $row['employee_number']) {
                    $authenticated = true;
                }
            }

            if ($authenticated) {
                $allowed_user = $row;
                break;
            } else {
                http_response_code(401);
                echo json_encode(["status" => "error", "message" => "パスワードが正しくありません。"]);
                exit();
            }
        }
    }

    if (!$allowed_user) {
        http_response_code(401);
        echo json_encode(["status" => "error", "message" => "該当するメールアドレスが見つかりません。"]);
        exit();
    }

    // 認証成功 -> セッション開始 (db.phpで開始済み)
    $_SESSION['authenticated'] = true;
    $_SESSION['employee_id'] = $allowed_user['freee_id'];
    $_SESSION['employee_number'] = $allowed_user['employee_number'];
    $_SESSION['employee_name'] = $allowed_user['name'];
    $_SESSION['company_name'] = $allowed_user['company_name'];

    // 日本語コメント: Freee側の管理権限は引き継がず、本システムの app_users テーブルを参照して決定します
    $session_is_admin = false;
    try {
        $stmt_app = $pdo->prepare("SELECT is_admin FROM app_users WHERE employee_number = :emp_num LIMIT 1");
        $stmt_app->execute([':emp_num' => $allowed_user['employee_number']]);
        $app_profile = $stmt_app->fetch();

        if ($app_profile) {
            // すでに本システムに権限レコードがある場合はその設定を反映
            $session_is_admin = (int)$app_profile['is_admin'] === 1;
        } else {
            // 本システムにレコードが無い場合：
            // Freee DB側で管理者権限（is_admin = 1）を持っていれば、最初の移行ガードとして本システムにも管理者として自動インサート（セルフブートストラップ）
            $freee_is_admin = (int)($allowed_user['is_admin'] ?? 0) === 1;
            if ($freee_is_admin) {
                $session_is_admin = true;
                // 代表メールアドレスを決定
                $emp_email = !empty($company_email) ? $company_email : (!empty($profile['email']) ? $profile['email'] : ($allowed_user['personal_email'] ?? $login_id));
                
                // app_users にダミーパスワードで自動インサート
                $stmt_ins = $pdo->prepare("INSERT INTO app_users (email, password_hash, name, employee_number, is_admin, role) VALUES (:email, 'SYSTEM_MANAGED_FREE_AUTH', :name, :employee_number, 1, 'employee')");
                $stmt_ins->execute([
                    ':email' => $emp_email,
                    ':name' => $allowed_user['name'],
                    ':employee_number' => $allowed_user['employee_number']
                ]);
            } else {
                $session_is_admin = false;
            }
        }
    } catch (PDOException $e_auth) {
        error_log("社員の権限チェックエラー: " . $e_auth->getMessage());
        $session_is_admin = false;
    }

    $_SESSION['is_admin'] = $session_is_admin;

    echo json_encode([
        "status" => "success",
        "message" => "ログインに成功しました。",
        "user" => [
            "name" => $allowed_user['name'],
            "employee_number" => $allowed_user['employee_number'],
            "is_admin" => $_SESSION['is_admin']
        ]
    ], JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "ログイン処理中にシステムエラーが発生しました: " . $e->getMessage()]);
}
