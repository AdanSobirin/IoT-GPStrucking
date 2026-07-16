-- Menambahkan kolom akumulasi jarak tempuh (meter) per kendaraan.
-- Diisi/diakumulasi oleh api/sync.php setiap ESP32 mengirim koordinat baru,
-- dan direset ke 0 setiap kali Android memulai trip baru.
-- Aman dijalankan berkali-kali (idempotent).

ALTER TABLE live_tracking
  ADD COLUMN IF NOT EXISTS traveled_distance_m DOUBLE PRECISION NOT NULL DEFAULT 0;
