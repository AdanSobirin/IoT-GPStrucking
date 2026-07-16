<?php
// C:\xampp\htdocs\api\config.php

// ── Muat file .env di root project (jika ada) ──
// Loader minimal tanpa dependency, supaya nilai bisa berbeda antara
// lokal (XAMPP) dan VPS tanpa mengedit file ini.
function load_env_file($path) {
    if (!file_exists($path)) {
        return;
    }
    foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#' || strpos($line, '=') === false) {
            continue;
        }
        [$key, $value] = explode('=', $line, 2);
        $key = trim($key);
        $value = trim($value);
        if ($key !== '' && getenv($key) === false) {
            putenv("{$key}={$value}");
        }
    }
}
load_env_file(__DIR__ . '/../.env');

header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: " . (getenv('CORS_ALLOWED_ORIGIN') ?: '*'));
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Konfigurasi Database PostgreSQL (fallback ke nilai default lokal jika .env tidak ada)
$host     = getenv('DB_HOST') ?: "localhost";
$port     = getenv('DB_PORT') ?: "5432";
$dbname   = getenv('DB_NAME') ?: "db_sawit_app";
$user     = getenv('DB_USER') ?: "postgres";
$password = getenv('DB_PASS') ?: "admin";

$connection_string = "host={$host} port={$port} dbname={$dbname} user={$user} password={$password}";

try {
    $pdo = new PDO("pgsql:" . $connection_string);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    echo json_encode([
        "status" => "error",
        "message" => "Koneksi database gagal: " . $e->getMessage()
    ]);
    exit();
}
?>