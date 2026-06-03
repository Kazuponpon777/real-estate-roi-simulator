<?php
/**
 * 🏢 不動産収支シミュレーション - 認証ステータス確認API
 * 現在のセッションが認証済みかどうかを確認します。
 */

require_once 'db.php';

$authenticated = isset($_SESSION['authenticated']) && $_SESSION['authenticated'] === true && !empty($_SESSION['employee_number']);

$response = [
    "status" => "success",
    "authenticated" => $authenticated
];

if ($authenticated) {
    $response["user"] = [
        "name" => $_SESSION['employee_name'] ?? '',
        "employee_number" => $_SESSION['employee_number'] ?? '',
        "is_admin" => isset($_SESSION['is_admin']) && $_SESSION['is_admin'] === true
    ];
}

echo json_encode($response, JSON_UNESCAPED_UNICODE);
