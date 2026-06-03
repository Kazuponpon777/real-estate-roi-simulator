<?php
/**
 * 🏢 不動産収支シミュレーション - データベースマイグレーション
 * 実行すると simulations テーブルを自動作成します
 */

require_once 'db.php';

try {
    // simulations テーブル作成用のSQL文
    $sql = "CREATE TABLE IF NOT EXISTS simulations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        mode VARCHAR(50) NOT NULL,
        created_by VARCHAR(50) NULL,
        data LONGTEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

    $pdo->exec($sql);
    
    // app_users テーブル作成用のSQL文 (日本語コメント: 社外ユーザーやカスタムユーザー管理用)
    $sql_users = "CREATE TABLE IF NOT EXISTS app_users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        employee_number VARCHAR(50) NOT NULL UNIQUE,
        is_admin TINYINT NOT NULL DEFAULT 0,
        role VARCHAR(50) NOT NULL DEFAULT 'external',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

    $pdo->exec($sql_users);
    
    // すでにテーブルが存在し、created_by カラムが無い場合は追加
    $stmt = $pdo->query("SHOW COLUMNS FROM simulations LIKE 'created_by'");
    if (!$stmt->fetch()) {
        $pdo->exec("ALTER TABLE simulations ADD COLUMN created_by VARCHAR(50) NULL AFTER mode");
        $msg = "データベーステーブル 'simulations' に 'created_by' カラムが追加され、'app_users' テーブルが正常に準備されました。";
    } else {
        $msg = "データベーステーブル 'simulations' および 'app_users' が正常に準備されました。";
    }
    
    echo json_encode([
        "status" => "success",
        "message" => $msg
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => "テーブルの作成・更新に失敗しました: " . $e->getMessage()
    ]);
}
