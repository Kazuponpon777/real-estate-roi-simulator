<?php
/**
 * 🏢 不動産収支シミュレーション - 保存API
 * POSTで送信されたシミュレーションデータをDBに新規保存または上書き保存します
 * 作成者 (created_by) カラムおよび権限制御に対応
 */

require_once 'db.php';
check_auth_or_exit();

// リクエストボディの取得とパース
$json = file_get_contents('php://input');
$requestData = json_decode($json, true);

if (!$requestData || empty($requestData['title']) || empty($requestData['mode']) || empty($requestData['data'])) {
    http_response_code(400);
    echo json_encode([
        "status" => "error",
        "message" => "必須パラメータ（title, mode, data）が不足しています。"
    ]);
    exit();
}

$id = isset($requestData['id']) ? intval($requestData['id']) : null;
$title = htmlspecialchars(strip_tags($requestData['title']));
$mode = htmlspecialchars(strip_tags($requestData['mode']));
// シミュレーションデータ(data)はフロント側で文字列化されたJSONまたはオブジェクトを受け取り、JSON文字列としてDBに保存します
$data = is_array($requestData['data']) ? json_encode($requestData['data'], JSON_UNESCAPED_UNICODE) : $requestData['data'];

$currentUserNum = $_SESSION['employee_number'];
$isAdmin = isset($_SESSION['is_admin']) && $_SESSION['is_admin'] === true;

try {
    if ($id && $id > 0) {
        // IDが指定されている場合は上書き保存 (UPDATE)
        // まず、既存データの作成者をチェック
        $checkStmt = $pdo->prepare("SELECT created_by FROM simulations WHERE id = :id");
        $checkStmt->bindParam(':id', $id, PDO::PARAM_INT);
        $checkStmt->execute();
        $existing = $checkStmt->fetch();

        if (!$existing) {
            http_response_code(404);
            echo json_encode([
                "status" => "error",
                "message" => "指定されたデータが見つかりません。"
            ]);
            exit();
        }

        // 所有者本人または管理者のみ上書きを許可
        if ($existing['created_by'] !== $currentUserNum && !$isAdmin) {
            http_response_code(403);
            echo json_encode([
                "status" => "error",
                "message" => "このデータを上書き保存する権限がありません。"
            ]);
            exit();
        }

        $stmt = $pdo->prepare("UPDATE simulations SET title = :title, mode = :mode, data = :data, updated_at = NOW() WHERE id = :id");
        $stmt->bindParam(':title', $title);
        $stmt->bindParam(':mode', $mode);
        $stmt->bindParam(':data', $data);
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        
        echo json_encode([
            "status" => "success",
            "message" => "シミュレーションデータを更新しました。",
            "id" => $id
        ]);
    } else {
        // IDが指定されていない場合は新規保存 (INSERT)
        $stmt = $pdo->prepare("INSERT INTO simulations (title, mode, created_by, data, created_at, updated_at) VALUES (:title, :mode, :created_by, :data, NOW(), NOW())");
        $stmt->bindParam(':title', $title);
        $stmt->bindParam(':mode', $mode);
        $stmt->bindParam(':created_by', $currentUserNum);
        $stmt->bindParam(':data', $data);
        $stmt->execute();
        
        $newId = intval($pdo->lastInsertId());
        
        echo json_encode([
            "status" => "success",
            "message" => "シミュレーションデータを新規保存しました。",
            "id" => $newId
        ]);
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => "データの保存中にエラーが発生しました: " . $e->getMessage()
    ]);
}
