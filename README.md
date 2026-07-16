# 🌿 PalmTrack — Dashboard Monitoring Truk Sawit

Dashboard real-time untuk monitoring posisi truk dan TPH di perkebunan sawit.

## Struktur Proyek

```
dashboard1/
├── src/
│   ├── App.jsx                   ← Komponen utama + routing
│   ├── index.css                 ← Tailwind + custom Leaflet styles
│   ├── components/
│   │   ├── MapComponent.jsx      ← Peta Leaflet + marker truk & TPH
│   │   ├── TruckSidebar.jsx      ← Daftar truk + filter status
│   │   └── StatusBar.jsx         ← Header statistik + status koneksi
│   ├── services/
│   │   └── api.js                ← Fetch ke FastAPI (+ mock data)
│   └── utils/
│       └── mapIcons.js           ← L.divIcon kustom (truk/TPH/pabrik)
├── api/                          ← API PHP untuk aplikasi Android supir & alat IoT (ESP32)
│   ├── config.php                ← Koneksi DB + loader .env
│   ├── login.php                 ← Login supir (Android)
│   ├── sync.php                  ← Terima data timbangan (Android) & koordinat (ESP32)
│   ├── get_vehicles.php
│   └── get_history.php
├── backend/
│   ├── main.py                   ← FastAPI server untuk dashboard React
│   └── requirements.txt
└── package.json
```

## Setup Environment (.env)

Proyek ini punya dua backend yang membaca konfigurasi dari **satu file `.env` di root**:
- `api/*.php` (dipakai aplikasi Android supir & alat IoT ESP32)
- `backend/main.py` (dipakai dashboard React via FastAPI)

Langkah setup (berlaku sama untuk lokal maupun VPS — hanya isinya yang beda):

```bash
cp .env.example .env
```

Lalu sesuaikan nilainya:

| Variabel | Dipakai oleh | Keterangan |
|---|---|---|
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS` | `api/config.php` | Kredensial PostgreSQL untuk PHP |
| `DATABASE_URL` | `backend/main.py` | Connection string PostgreSQL untuk FastAPI |
| `CORS_ALLOWED_ORIGIN` | `api/config.php` | Origin yang diizinkan akses API PHP (default `*`, aman karena diakses oleh app Android/alat IoT, bukan browser) |
| `CORS_ORIGINS` | `backend/main.py` | Daftar origin browser yang diizinkan akses dashboard (pisahkan koma), harus diisi domain VPS saat production |
| `APP_BASE_URL` | `api/get_history.php` | Base URL publik untuk membangun link foto (`.../assets/...`) |

Untuk frontend (Vite), buat juga:
- `.env` (dev lokal) → `VITE_API_BASE_URL=http://localhost:8000`
- `.env.production` (dipakai otomatis saat `npm run build`) → isi sesuai contoh di `.env.production.example`, arahkan ke domain FastAPI di VPS

File `.env`, `.env.production`, dll. **tidak ikut di-commit** (lihat `.gitignore`). Yang di-commit hanya file `*.example`.

## Instalasi Frontend

```bash
npm install
npm run dev
```

## Instalasi Backend (FastAPI)

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
`--reload` hanya untuk development lokal (mengaktifkan file watcher yang boros CPU) — **jangan dipakai di VPS**, lihat bagian production di bawah.

## Menjalankan di VPS (Production)

> Untuk langkah update rutin (git pull → migrasi database → restart service), lihat checklist lengkap di [DEPLOY.md](DEPLOY.md).

Supaya ringan di VPS (terutama spek kecil), jalankan dengan cara berikut — bukan `npm run dev` / `uvicorn --reload`:

**Frontend** — build jadi file statis, lalu serve lewat Nginx/Apache (bukan Vite dev server):
```bash
npm install
npm run build      # hasil ada di dist/
```
Arahkan Nginx/Apache untuk serve folder `dist/` sebagai document root.

**FastAPI** — tanpa `--reload`, jumlah worker disesuaikan spek VPS (1 worker cukup untuk VPS kecil 1 vCPU):
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --host 127.0.0.1 --port 8000 --workers 1
```
Jalankan lewat process manager (systemd/pm2) supaya otomatis restart jika crash, dan pastikan hanya **satu** instance yang berjalan. Nginx bertindak sebagai reverse proxy ke `127.0.0.1:8000` untuk endpoint `/api/*` FastAPI.

Atur `DB_POOL_MIN`/`DB_POOL_MAX` di `.env` sesuai spek VPS (default 1–5) agar koneksi ke PostgreSQL tidak berlebihan, dan `VITE_POLLING_INTERVAL_MS` untuk mengatur seberapa sering dashboard menarik data terbaru.

## Setup Database

Skema awal (tabel `users`, `vehicles`, `live_tracking`, `input_data`, `locations`, dll.) dikelola di luar repo ini. Setelah skema awal dibuat, jalankan migrasi tambahan di `db/migrations/` **secara berurutan** (nama file sudah diberi nomor urut):

```bash
psql -d db_sawit_app -f db/migrations/001_add_traveled_distance.sql
```

Migrasi ini wajib dijalankan juga di database VPS saat pertama kali deploy (dan setiap kali ada file migrasi baru ditambahkan).

## Integrasi Android/PHP

Data dari aplikasi Android supir dikirim via PHP (`api/sync.php`), data koordinat dari alat IoT (ESP32) juga lewat endpoint yang sama dengan `source: "esp32"`:
```
POST /api/sync
{ "vehicle_id": 1, "lat": -1.534, "lng": 110.432 }
```

## Format API Response — `/api/dashboard`

```json
{
  "trucks": [
    { "id": 1, "plate": "BM 1234 AB", "lat": -1.534, "lng": 110.432,
      "status": "loading", "driver": "Budi", "speed": 42, "last_tph": "TPH-03" }
  ],
  "tph": [
    { "id": 1, "name": "TPH-01", "lat": -1.518, "lng": 110.415 }
  ]
}
```

## Warna Ikon Peta

| Ikon | Warna | Kondisi |
|------|-------|---------|
| 🚛 Truk | 🟢 Hijau (`#10b981`) | `status: "loading"` |
| 🚛 Truk | ⚫ Abu-abu (`#6b7280`) | `status: "idle"` |
| 📦 TPH  | 🟡 Amber (`#f59e0b`) | Semua TPH |
| 🏭 Pabrik | 🟣 Ungu (`#7c3aed`) | name mengandung "pabrik/pks" |
