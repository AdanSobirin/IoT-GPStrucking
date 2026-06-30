# 🌿 PalmTrack — Dashboard Monitoring Truk Sawit

Dashboard real-time untuk monitoring posisi truk dan TPH di perkebunan sawit.

## Struktur Proyek

```
dashboard/
├── src/
│   ├── App.jsx                   ← Komponen utama + polling logic
│   ├── index.css                 ← Tailwind + custom Leaflet styles
│   ├── components/
│   │   ├── MapComponent.jsx      ← Peta Leaflet + marker truk & TPH
│   │   ├── TruckSidebar.jsx      ← Daftar truk + filter status
│   │   └── StatusBar.jsx         ← Header statistik + status koneksi
│   ├── services/
│   │   └── api.js                ← Fetch ke FastAPI (+ mock data)
│   └── utils/
│       └── mapIcons.js           ← L.divIcon kustom (truk/TPH/pabrik)
├── backend/
│   ├── main.py                   ← FastAPI server
│   └── schema.sql                ← Skema PostgreSQL + PostGIS
└── package.json
```

## Instalasi Frontend

```bash
npm install
npm run dev
```

## Instalasi Backend

```bash
pip install fastapi uvicorn asyncpg

# Atur variabel lingkungan
export DATABASE_URL="postgresql://postgres:admin@localhost:5432/db_sawit_app"

# Jalankan server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Setup Database

```bash
psql -d sawit_db -f backend/schema.sql
```

## Konfigurasi

### URL API Backend
Edit file `.env` di root proyek:
```
VITE_API_BASE_URL=http://localhost:8000
```

### Mode Mock (tanpa backend)
Di `App.jsx`, ganti:
```js
import { fetchDashboardData } from "./services/api";
```
menjadi:
```js
import { fetchMockData as fetchDashboardData } from "./services/api";
```

## Integrasi Android/PHP

Data dari aplikasi Android Anda dikirim via PHP (`sync.php`) ke endpoint:
```
POST /api/sync
{ "vehicle_id": 1, "lat": -1.534, "lng": 110.432, "status": "loading", "speed": 42 }
```

## Format API Response

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
