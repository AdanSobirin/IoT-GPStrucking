<?php
// C:\xampp\htdocs\api\login.php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Tangani request OPTIONS (CORS Preflight)
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once 'config.php';

// Matikan error reporting agar tidak merusak format JSON jika ada warning
error_reporting(0);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Metode request tidak diizinkan!"]);
    exit();
}

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Input JSON tidak valid!"]);
    exit();
}

$username = $input['username'] ?? '';
$password = $input['password'] ?? '';

// ... sisa kode query database Anda tetap sama ...

if (empty($username) || empty($password)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Username dan password wajib diisi!"]);
    exit();
}

try {
    // Query ambil data user beserta relasi plat nomor kendaraannya
    $query = "SELECT u.id, u.username, u.password_hash, u.driver_name, u.vehicle_id, u.is_active, v.plate_number 
              FROM users u 
              LEFT JOIN vehicles v ON u.vehicle_id = v.id 
              WHERE u.username = :username LIMIT 1";
              
    $stmt = $pdo->prepare($query);
    $stmt->execute(['username' => $username]);
    $user = $stmt->fetch();

    // Validasi keberadaan user dan status keaktifan
    if (!$user) {
        http_response_code(401);
        echo json_encode(["status" => "error", "message" => "Username tidak ditemukan!"]);
        exit();
    }

    if (!$user['is_active']) {
        http_response_code(403);
        echo json_encode(["status" => "error", "message" => "Akun supir nonaktif!"]);
        exit();
    }

    // Verifikasi password Bcrypt (Mencocokkan kata mentah dengan hasil hash di DB)
    if (password_verify($password, $user['password_hash'])) {
        // Generate token sederhana untuk session Android (Bisa diganti JWT nanti)
        $token = bin2hex(random_bytes(32));
        
        // Simpan token ke database
        $updateToken = $pdo->prepare("UPDATE users SET auth_token = :token, updated_at = NOW() WHERE id = :id");
        $updateToken->execute(['token' => $token, 'id' => $user['id']]);

        echo json_encode([
            "status" => "success",
            "message" => "Login Berhasil!",
            "data" => [
                "driver_id" => (int)$user['id'],
                "username" => $user['username'],
                "driver_name" => $user['driver_name'],
                "vehicle_id" => $user['vehicle_id'] ? (int)$user['vehicle_id'] : null,
                "vehicle_plate" => $user['plate_number'] ?? "Tidak Ada Kendaraan",
                "auth_token" => $token
            ]
        ]);
    } else {
        http_response_code(401);
        echo json_encode(["status" => "error", "message" => "Password salah!"]);
    }

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Gagal memproses data: " . $e->getMessage()]);
}
exit();
?>