# Checklist Deploy ke VPS

Panduan ini untuk update rutin (kode sudah pernah di-deploy sebelumnya). Untuk setup pertama kali, lihat bagian paling bawah.

## Update Rutin (ada perubahan kode, dengan/tanpa migrasi database)

Jalankan berurutan lewat SSH ke VPS:

### 1. Backup database dulu (jaga-jaga sebelum migrasi apa pun)
```bash
pg_dump -U postgres db_sawit_app > ~/backup_$(date +%Y%m%d_%H%M%S).sql
```

### 2. Tarik kode terbaru
```bash
cd /path/ke/dashboard1
git pull origin main
```

### 3. Jalankan migrasi database baru (kalau ada file baru di `db/migrations/`)
Cek dulu file mana yang belum pernah dijalankan di VPS ini, lalu jalankan **berurutan sesuai nomor**:
```bash
psql -U postgres -d db_sawit_app -f db/migrations/00X_nama_migrasi.sql
```
Skip langkah ini kalau tidak ada file migrasi baru di commit yang baru di-pull.

### 4. Install dependency baru (kalau `requirements.txt` / `package.json` berubah)
```bash
# Backend
cd backend && pip install -r requirements.txt && cd ..

# Frontend
npm install
```

### 5. Build ulang frontend (kalau ada perubahan di `src/`)
```bash
npm run build
```
Hasil ada di `dist/` — pastikan Nginx/Apache mengarah ke folder ini sebagai document root (tidak perlu restart web server kecuali config Nginx sendiri berubah).

### 6. Restart FastAPI (kalau `backend/main.py` berubah, atau ada migrasi database yang dipakai backend)
```bash
# Contoh kalau pakai pm2
pm2 restart palmtrack-api

# Contoh kalau pakai systemd
sudo systemctl restart palmtrack-api
```
**Urutan penting:** migrasi database (langkah 3) harus selesai *sebelum* restart ini, supaya backend tidak crash query ke kolom/tabel yang belum ada.

### 7. PHP (`api/*.php`)
Tidak perlu restart apa pun — Apache/PHP-FPM langsung membaca file terbaru tiap request begitu `git pull` selesai.

### 8. Verifikasi cepat
- Buka dashboard di browser, cek Live Tracking tampil normal.
- Cek `GET https://kamangmakmur.online/api/get_vehicles.php` (atau path API PHP Anda) mengembalikan JSON, bukan error.
- Cek log FastAPI (`pm2 logs` / `journalctl -u palmtrack-api`) tidak ada error saat startup.

---

## Setup Pertama Kali (server baru)

1. Clone repo, `cp .env.example .env` lalu isi kredensial DB & domain VPS sesuai `.env.example`.
2. Buat database + jalankan skema awal (tabel `users`, `vehicles`, `live_tracking`, `input_data`, `locations`, dll — dikelola di luar repo ini).
3. Jalankan **semua** file di `db/migrations/` berurutan dari nomor 001.
4. `npm install && npm run build` — arahkan Nginx/Apache ke `dist/`.
5. `cd backend && pip install -r requirements.txt`, jalankan lewat pm2/systemd tanpa `--reload`, lihat [README.md](README.md#menjalankan-di-vps-production) bagian "Menjalankan di VPS (Production)".
6. Pastikan folder `public/assets/uploads/` bisa ditulis oleh user yang menjalankan PHP (permission `0775`, lihat `api/sync.php`).
