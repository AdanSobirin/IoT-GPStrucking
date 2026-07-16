<?php
// C:\xampp\htdocs\api\sync.php
require_once 'config.php';

// Kompres & resize foto upload agar hemat disk/bandwidth di VPS.
// Kalau ekstensi GD tidak tersedia atau file bukan gambar yang didukung,
// fungsi ini diam-diam tidak melakukan apa-apa (file asli tetap dipakai).
function compress_uploaded_photo($path, $maxWidth = 1280, $quality = 75) {
    if (!extension_loaded('gd')) {
        return;
    }
    $info = @getimagesize($path);
    if (!$info) {
        return;
    }
    [$width, $height, $type] = $info;

    switch ($type) {
        case IMAGETYPE_JPEG:
            $src = @imagecreatefromjpeg($path);
            break;
        case IMAGETYPE_PNG:
            $src = @imagecreatefrompng($path);
            break;
        case IMAGETYPE_WEBP:
            $src = function_exists('imagecreatefromwebp') ? @imagecreatefromwebp($path) : false;
            break;
        default:
            $src = false;
    }
    if (!$src) {
        return;
    }

    if ($width > $maxWidth) {
        $newWidth = $maxWidth;
        $newHeight = (int) round($height * ($maxWidth / $width));
        $resized = imagecreatetruecolor($newWidth, $newHeight);
        imagecopyresampled($resized, $src, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
        imagedestroy($src);
        $src = $resized;
    }

    imagejpeg($src, $path, $quality);
    imagedestroy($src);
}

// Proteksi metode Request
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Metode tidak diizinkan!"]);
    exit();
}

// Deteksi otomatis tipe konten (Android = Multipart, ESP32 = JSON)
$contentType = $_SERVER['CONTENT_TYPE'] ?? '';
if (strpos($contentType, 'multipart/form-data') !== false) {
    $input = $_POST;
    $source = 'android';
} else {
    $input = json_decode(file_get_contents('php://input'), true);
    $source = $input['source'] ?? 'android';
}

try {
    $pdo->beginTransaction();

    if ($source === 'esp32') {
        // --- LOGIKA ESP32 (Mengisi koordinat ke baris yang sudah dibuat Android) ---
        $vehicle_id = $input['vehicle_id'] ?? null;
        $lat        = $input['lat'] ?? null;
        $lng        = $input['lng'] ?? null;

        if (is_null($vehicle_id) || is_null($lat) || is_null($lng)) {
            throw new Exception("Data ESP32 tidak lengkap! v_id, lat, dan lng wajib diisi.");
        }

        // 1. UPDATE: Cari baris terbaru di input_data berdasarkan vehicle_id milik truk ini, 
        // lalu masukkan koordinatnya ke kolom 'geom' pada baris tersebut.
        $query_update = "UPDATE input_data 
                         SET geom = ST_SetSRID(ST_MakePoint(:lng, :lat), 4326),
                             updated_at = NOW()
                         WHERE id = (
                             SELECT id FROM input_data 
                             WHERE vehicle_id = :vehicle_id 
                             ORDER BY created_at DESC 
                             LIMIT 1
                         )";

        $stmt_update = $pdo->prepare($query_update);
        $stmt_update->execute([
            'vehicle_id' => $vehicle_id,
            'lat'        => $lat,
            'lng'        => $lng
        ]);
        
        // 2. Perbarui peta realtime di live_tracking (untuk icon truk bergerak di dashboard),
        // sekaligus akumulasikan jarak tempuh (traveled_distance_m) dari posisi lama ke posisi
        // baru memakai ST_Distance (geography, hasil dalam meter). "live_tracking.last_position"
        // di sini merujuk ke nilai LAMA (sebelum di-update), "EXCLUDED.last_position" ke nilai baru.
        $query_live = "INSERT INTO live_tracking (vehicle_id, last_position, updated_at)
                       VALUES (:vehicle_id, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326), NOW())
                       ON CONFLICT (vehicle_id)
                       DO UPDATE SET
                           traveled_distance_m = COALESCE(live_tracking.traveled_distance_m, 0) +
                               CASE WHEN live_tracking.last_position IS NOT NULL
                                    THEN ST_Distance(live_tracking.last_position::geography, EXCLUDED.last_position::geography)
                                    ELSE 0 END,
                           last_position = EXCLUDED.last_position,
                           updated_at = NOW()";

        $stmt_live = $pdo->prepare($query_live);
        $stmt_live->execute([
            'vehicle_id' => $vehicle_id,
            'lat'        => $lat,
            'lng'        => $lng
        ]);
    } else {
        // --- LOGIKA ANDROID (Multipart Form Data dari Supir) ---
        $driver_id        = $input['driver_id'] ?? null;
        $vehicle_id       = $input['vehicle_id'] ?? null; // Menangkap vehicle_id dari Android
        $driver_name      = $input['driver_name'] ?? '';
        $vehicle_plate    = $input['vehicle_plate'] ?? '';
        $jumlah_janjang   = $input['jumlah_janjang'] ?? null;

        // Validasi data input form timbangan sawit
        if (is_null($driver_id) || is_null($vehicle_id) || empty($driver_name) || is_null($jumlah_janjang)) {
            throw new Exception("Data tidak lengkap! Pastikan driver_id, vehicle_id, driver_name, dan jumlah_janjang terisi.");
        }

        // Penanganan upload file foto asli nota/jajangan sawit
        $photo_path = null;
        if (isset($_FILES['photo']) && $_FILES['photo']['error'] === UPLOAD_ERR_OK) {
            
            // KOREKSI: Mundur satu tingkat dari folder 'api' menggunakan '/../'
            $uploadDir = __DIR__ . '/../public/assets/uploads';
            
            if (!file_exists($uploadDir)) {
                // Buat folder jika belum ada dengan permission 0775
                mkdir($uploadDir, 0775, true);
            }

            $filename = "SAWIT_" . time() . ".jpg";
            $target = $uploadDir . '/' . $filename;

            if (move_uploaded_file($_FILES['photo']['tmp_name'], $target)) {
                // 🔥 TAMBAHKAN BARIS INI: Paksa permission file menjadi 0775 agar bisa dibuka web
                chmod($target, 0775);

                // Kompres/resize agar hemat disk & bandwidth VPS (aman jika GD tidak ada)
                compress_uploaded_photo($target);

                // Simpan path relatif untuk URL frontend
                $photo_path = "assets/uploads/" . $filename;
            } else {
                throw new Exception("Gagal memindahkan file foto ke folder assets/uploads.");
            }
        }

        // 1. Simpan data timbangan dari aplikasi supir (sync_status: 1 = Dikirim)
        $query = "INSERT INTO input_data (
                    driver_id, vehicle_id, driver_name, vehicle_plate, 
                    tph_code, blok_name, jumlah_janjang, photo_path, sync_status, received_at
                  ) VALUES (
                    :driver_id, :vehicle_id, :driver_name, :vehicle_plate, 
                    :tph_code, :blok_name, :jumlah_janjang, :photo_path, 1, NOW()
                  )";
        
        $stmt = $pdo->prepare($query);
        $stmt->execute([
            'driver_id'      => $driver_id,
            'vehicle_id'     => $vehicle_id,
            'driver_name'    => $driver_name,
            'vehicle_plate'  => $vehicle_plate,
            'tph_code'       => $input['tph_code'] ?? null,
            'blok_name'      => $input['blok_name'] ?? null,
            'jumlah_janjang' => (int)$jumlah_janjang,
            'photo_path'     => $photo_path
        ]);

        // 2. 💡 UPDATE LOGIKA BARU: Paksa tabel live_tracking mengubah status truk menjadi 'loading' (Mengangkut)
        // Trip baru dimulai di sini, jadi traveled_distance_m direset ke 0 (lihat api/sync.php cabang esp32
        // untuk logika akumulasinya).
        $query_update_live = "INSERT INTO live_tracking (vehicle_id, status, traveled_distance_m, updated_at)
                              VALUES (:vehicle_id, 'loading', 0, NOW())
                              ON CONFLICT (vehicle_id)
                              DO UPDATE SET status = 'loading',
                                            traveled_distance_m = 0,
                                            updated_at = NOW()";
        
        $stmt_update_live = $pdo->prepare($query_update_live);
        $stmt_update_live->execute([
            'vehicle_id' => $vehicle_id
        ]);
    }

    $pdo->commit();
    echo json_encode(["status" => "success", "message" => "Data berhasil disimpan"]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>