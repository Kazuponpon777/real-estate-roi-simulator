<?php
/**
 * 🏢 不動産収支シミュレーション - 読込API
 * GETで指定されたIDのシミュレーションデータをDBから取得して返却します
 * 作成者本人または管理者のみ読み込みを許可します
 */

require_once 'db.php';
check_auth_or_exit();

$id = isset($_GET['id']) ? intval($_GET['id']) : null;

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
    $stmt = $pdo->prepare("SELECT id, title, mode, created_by, data, created_at, updated_at FROM simulations WHERE id = :id");
    $stmt->bindParam(':id', $id, PDO::PARAM_INT);
    $stmt->execute();
    $result = $stmt->fetch();

    if ($result) {
        // 所有者本人または管理者のみ読み込みを許可
        if ($result['created_by'] !== $currentUserNum && !$isAdmin) {
            http_response_code(403);
            echo json_encode([
                "status" => "error",
                "message" => "このデータを閲覧する権限がありません。"
            ]);
            exit();
        }

        // DBに保存されているJSON文字列をパース可能な状態でフロントエンドへ返します
        $result['data'] = json_decode($result['data'], true);
        
        echo json_encode([
            "status" => "success",
            "data" => $result
        ]);
    } else {
        http_response_code(404);
        echo json_encode([
            "status" => "error",
            "message" => "指定されたIDのシミュレーションデータが見つかりません。"
        ]);
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => "データの読み込み中にエラーが発生しました: " . $e->getMessage()
    ]);
}
