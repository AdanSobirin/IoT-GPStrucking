<?php
// C:\xampp\htdocs\api\get_vehicles.php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
error_reporting(0); // Sembunyikan warning agar JSON tidak rusak

require_once 'config.php';

try {
    // Gunakan 'is_active' saja jika tipenya boolean (true/false)
    $stmt = $pdo->query("SELECT id, plate_number FROM vehicles WHERE is_active = true");
    $vehicles = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Pastikan mengembalikan list [] jika kosong
    if (!$vehicles) {
        $vehicles = [];
    }
    
    echo json_encode($vehicles);
} catch (PDOException $e) {
    http_response_code(500);
    // Kirim pesan error asli ke Logcat Android untuk debug
    echo json_encode(["message" => "Error Database: " . $e->getMessage()]);
}
?>