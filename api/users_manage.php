<?php
/**
 * 🏢 不動産収支シミュレーション - ユーザー管理API (管理者専用)
 * アカウントの作成、更新、削除を処理します。
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

$json = file_get_contents('php://input');
$requestData = json_decode($json, true);

$action = trim($requestData['action'] ?? '');

if (empty($action)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "アクション（action）を指定してください。"]);
    exit();
}

try {
    if ($action === 'create') {
        // 日本語コメント: 新規アカウント作成
        $email = trim($requestData['email'] ?? '');
        $password = trim($requestData['password'] ?? '');
        $name = trim($requestData['name'] ?? '');
        $is_admin = (int)($requestData['is_admin'] ?? 0);
        $role = trim($requestData['role'] ?? 'external'); // デフォルトは 'external' (社外ユーザー)

        if (empty($email) || empty($password) || empty($name)) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "メールアドレス、パスワード、氏名は必須です。"]);
            exit();
        }

        // 日本語コメント: メールアドレスの重複チェック
        $stmt = $pdo->prepare("SELECT id FROM app_users WHERE LOWER(email) = LOWER(:email)");
        $stmt->execute([':email' => $email]);
        if ($stmt->fetch()) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "このメールアドレスは既に登録されています。"]);
            exit();
        }

        // 日本語コメント: アカウント番号の自動生成 (EX001 から開始する)
        $stmt = $pdo->query("SELECT MAX(CAST(SUBSTRING(employee_number, 3) AS UNSIGNED)) as max_num FROM app_users WHERE employee_number LIKE 'EX%'");
        $row = $stmt->fetch();
        $next_num = ($row['max_num'] ?? 0) + 1;
        $employee_number = 'EX' . str_pad($next_num, 3, '0', STR_PAD_LEFT);

        // 日本語コメント: パスワードを安全にハッシュ化
        $password_hash = password_hash($password, PASSWORD_DEFAULT);

        // 日本語コメント: INSERT処理の実行
        $stmt = $pdo->prepare("INSERT INTO app_users (email, password_hash, name, employee_number, is_admin, role) VALUES (:email, :password_hash, :name, :employee_number, :is_admin, :role)");
        $stmt->execute([
            ':email' => $email,
            ':password_hash' => $password_hash,
            ':name' => $name,
            ':employee_number' => $employee_number,
            ':is_admin' => $is_admin,
            ':role' => $role
        ]);

        echo json_encode(["status" => "success", "message" => "アカウント「{$name}（{$employee_number}）」を正常に作成しました。"]);
        exit();

    } elseif ($action === 'update') {
        // 日本語コメント: アカウント情報の編集・更新
        $id = (int)($requestData['id'] ?? 0);
        $employee_number = trim($requestData['employee_number'] ?? '');
        $email = trim($requestData['email'] ?? '');
        $name = trim($requestData['name'] ?? '');
        $is_admin = (int)($requestData['is_admin'] ?? 0);
        $role = trim($requestData['role'] ?? 'external');
        $password = trim($requestData['password'] ?? ''); // パスワード変更時のみ指定される

        // 日本語コメント: 社内社員の権限変更 (idが指定されておらず、社員番号がある場合)
        if ($id <= 0 && !empty($employee_number)) {
            if (empty($email) || empty($name)) {
                http_response_code(400);
                echo json_encode(["status" => "error", "message" => "社員名およびメールアドレス情報が必要です。"]);
                exit();
            }

            // 既にレコードがあるか確認
            $stmt = $pdo->prepare("SELECT id FROM app_users WHERE employee_number = :employee_number");
            $stmt->execute([':employee_number' => $employee_number]);
            $exists = $stmt->fetch();

            if ($exists) {
                // 存在すれば is_admin 権限のみ更新
                $stmt_upd = $pdo->prepare("UPDATE app_users SET is_admin = :is_admin, name = :name, email = :email WHERE employee_number = :employee_number");
                $stmt_upd->execute([
                    ':is_admin' => $is_admin,
                    ':name' => $name,
                    ':email' => $email,
                    ':employee_number' => $employee_number
                ]);
            } else {
                // 存在しなければ新規管理者/権限レコードを作成 (パスワードはFreee側で認証するのでダミー)
                $stmt_ins = $pdo->prepare("INSERT INTO app_users (email, password_hash, name, employee_number, is_admin, role) VALUES (:email, 'SYSTEM_MANAGED_FREE_AUTH', :name, :employee_number, :is_admin, 'employee')");
                $stmt_ins->execute([
                    ':email' => $email,
                    ':name' => $name,
                    ':employee_number' => $employee_number,
                    ':is_admin' => $is_admin
                ]);
            }

            echo json_encode(["status" => "success", "message" => "社員「{$name}」の権限情報を更新しました。"]);
            exit();
        }

        // 日本語コメント: 従来通り社外パートナーの更新
        if ($id <= 0 || empty($email) || empty($name)) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "不正なリクエストパラメータです。"]);
            exit();
        }

        // 日本語コメント: メールアドレス重複チェック（自分以外のレコードで既に使われているか）
        $stmt = $pdo->prepare("SELECT id FROM app_users WHERE LOWER(email) = LOWER(:email) AND id != :id");
        $stmt->execute([':email' => $email, ':id' => $id]);
        if ($stmt->fetch()) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "指定されたメールアドレスは既に他のユーザーに使用されています。"]);
            exit();
        }

        // 日本語コメント: パスワード変更があるかないかでSQLクエリを分岐
        if (!empty($password)) {
            $password_hash = password_hash($password, PASSWORD_DEFAULT);
            $stmt = $pdo->prepare("UPDATE app_users SET email = :email, name = :name, is_admin = :is_admin, role = :role, password_hash = :password_hash WHERE id = :id");
            $stmt->execute([
                ':email' => $email,
                ':name' => $name,
                ':is_admin' => $is_admin,
                ':role' => $role,
                ':password_hash' => $password_hash,
                ':id' => $id
            ]);
        } else {
            $stmt = $pdo->prepare("UPDATE app_users SET email = :email, name = :name, is_admin = :is_admin, role = :role WHERE id = :id");
            $stmt->execute([
                ':email' => $email,
                ':name' => $name,
                ':is_admin' => $is_admin,
                ':role' => $role,
                ':id' => $id
            ]);
        }

        echo json_encode(["status" => "success", "message" => "アカウント情報を更新しました。"]);
        exit();

    } elseif ($action === 'delete') {
        // 日本語コメント: アカウントの削除
        $id = (int)($requestData['id'] ?? 0);

        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "IDが指定されていません。"]);
            exit();
        }

        // 日本語コメント: 削除対象ユーザーの確認
        $stmt = $pdo->prepare("SELECT employee_number FROM app_users WHERE id = :id");
        $stmt->execute([':id' => $id]);
        $user = $stmt->fetch();
        
        if (!$user) {
            http_response_code(404);
            echo json_encode(["status" => "error", "message" => "該当するユーザーが存在しません。"]);
            exit();
        }

        // 日本語コメント: 自分自身を誤って削除できないようガード
        if (isset($_SESSION['employee_number']) && $_SESSION['employee_number'] === $user['employee_number']) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "現在ログインしている自身のアカウントを削除することはできません。"]);
            exit();
        }

        // 日本語コメント: 削除の実行
        $stmt = $pdo->prepare("DELETE FROM app_users WHERE id = :id");
        $stmt->execute([':id' => $id]);

        echo json_encode(["status" => "success", "message" => "ユーザーアカウントを完全に削除しました。"]);
        exit();

    } else {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "無効なアクションです。"]);
        exit();
    }

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "データベースエラーが発生しました: " . $e->getMessage()]);
}
