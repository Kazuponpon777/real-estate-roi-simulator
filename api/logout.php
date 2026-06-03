<?php
/**
 * 🏢 不動産収支シミュレーション - ログアウトAPI
 * セッションを破棄してログアウト処理を行います。
 */

require_once 'db.php';

// セッション変数のクリアと破棄
$_SESSION = [];

if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000,
        $params["path"], $params["domain"],
        $params["secure"], $params["httponly"]
    );
}

session_destroy();

echo json_encode([
    "status" => "success",
    "message" => "ログアウトしました。"
]);
