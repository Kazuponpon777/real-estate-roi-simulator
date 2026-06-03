<?php
/**
 * 🏢 不動産収支シミュレーション - 削除API
 * 指定されたIDのシミュレーションデータをDBから安全に削除します
 * 作成者本人または管理者のみ削除を許可します
 */

require_once 'db.php';
check_auth_or_exit();

// リクエストボディの取得とパース (JSON経由)
$json = file_get_contents('php://input');
$requestData = json_decode($json, true);

$id = null;
if (isset($requestData['id'])) {
    $id = intval($requestData['id']);
} elseif (isset($_GET['id'])) {
    $id = intval($_GET['id']);
}

if (!$id || $id <= 0) {
    http_response_code(400);
    echo json_encode([
        "status" => "error",
        "message" => "有効なIDが指定されていません。"
    ]);
    exit();
}

$currentUserNum = $_SESSION['employee_number'];
$isAdmin = isset($_SESSION['is_admin']) && $_SESSION['is_admin'] === true;

try {
    // 該当データが存在するか、また作成者は誰かチェック
    $checkStmt = $pdo->prepare("SELECT id, created_by FROM simulations WHERE id = :id");
    $checkStmt->bindParam(':id', $id, PDO::PARAM_INT);
    $checkStmt->execute();
    $existing = $checkStmt->fetch();
    
    if (!$existing) {
        http_response_code(404);
        echo json_encode([
            "status" => "error",
            "message" => "指定されたデータが見つからないため削除できません。"
        ]);
        exit();
    }

    // 所有者本人または管理者のみ削除を許可
    if ($existing['created_by'] !== $currentUserNum && !$isAdmin) {
        http_response_code(403);
        echo json_encode([
            "status" => "error",
            "message" => "このデータを削除する権限がありません。"
        ]);
        exit();
    }

    // 削除の実行
    $stmt = $pdo->prepare("DELETE FROM simulations WHERE id = :id");
    $stmt->bindParam(':id', $id, PDO::PARAM_INT);
    $stmt->execute();

    echo json_encode([
        "status" => "success",
        "message" => "シミュレーションデータを削除しました。",
        "id" => $id
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => "データの削除中にエラーが発生しました: " . $e->getMessage()
    ]);
}
