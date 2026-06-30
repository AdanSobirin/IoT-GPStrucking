<?php
// C:\xampp\htdocs\api\config.php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Konfigurasi Database PostgreSQL
$host     = "localhost";
$port     = "5432";
$dbname   = "db_sawit_app"; // GANTI DENGAN NAMA DATABASE KAMU
$user     = "postgres";                      // Default user PostgreSQL
$password = "admin";       // GANTI DENGAN PASSWORD POSTGRESQL KAMU

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