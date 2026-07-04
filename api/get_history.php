<?php
// C:\xampp\htdocs\api\get_history.php
require_once 'config.php';

// Atur header agar output berupa JSON
header("Content-Type: application/json");

// Proteksi metode Request (Hanya izinkan GET)
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Metode tidak diizinkan! Gunakan GET."]);
    exit();
}

$driver_id = $_GET['driver_id'] ?? null;

if (is_null($driver_id) || empty($driver_id)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Parameter driver_id tidak boleh kosong!"]);
    exit();
}

try {
    // Ambil data berdasarkan driver_id yang dikirim dari Android
    $stmt = $pdo->prepare("SELECT id, tph_code, blok_name, jumlah_janjang, received_at, photo_path, sync_status 
                           FROM input_data 
                           WHERE driver_id = :driver_id 
                           ORDER BY received_at DESC");
    $stmt->execute(['driver_id' => $driver_id]);
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Protokol dinamis untuk membuat URL foto absolut agar bisa dibaca langsung oleh Android (Glide/Picasso)
    $server_ip = $_SERVER['SERVER_NAME'] ?? 'localhost'; 
    $base_url = "https://kamangmakmur.online" . $server_ip . "/assets/"; // Sesuaikan folder jika bukan di root xampp

    // Modifikasi hasil data sebelum dikirim ke Android
    foreach ($results as &$row) {
        // 1. Ubah path foto menjadi URL lengkap yang bisa di-klik / dimuat Android
        if (!empty($row['photo_path'])) {
            // Jika di DB tertulis "api/uploads/...", kita bersihkan agar tidak duplikat dengan base_url
            $clean_path = str_replace('public/assets/uploads', '', $row['photo_path']);
            $row['photo_url'] = $base_url . $clean_path;
        } else {
            $row['photo_url'] = null;
        }
        
        // 2. Pastikan tipe data angka dikembalikan sebagai integer (bukan string)
        $row['id'] = (int)$row['id'];
        $row['jumlah_janjang'] = (int)$row['jumlah_janjang'];
        $row['sync_status'] = (int)$row['sync_status'];
    }

    // Kembalikan array data histori (jika kosong, otomatis mengirimkan [])
    echo json_encode($results);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
}
?>