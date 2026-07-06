# ============================================================
# backend/main.py
# FastAPI backend untuk Dashboard Monitoring Truk Sawit
# Hubungkan ke PostgreSQL/PostGIS Anda
# ============================================================

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import asyncpg # type: ignore
import os
import uvicorn
from passlib.context import CryptContext
from datetime import datetime

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
app = FastAPI(title="PalmTrack API", version="1.0.0")

# ── CORS ────────────────────────────────────────────────────
# Izinkan frontend React mengakses API ini
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Koneksi Database ────────────────────────────────────────
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:admin@localhost:5432/db_sawit_app"
)

# Gunakan connection pool untuk manajemen koneksi yang lebih efisien
db_pool = None

@app.on_event("startup")
async def startup_db_pool():
    global db_pool
    db_pool = await asyncpg.create_pool(DATABASE_URL)

@app.on_event("shutdown")
async def shutdown_db_pool():
    if db_pool:
        await db_pool.close()


# ── Model Pydantic ──────────────────────────────────────────
class TruckData(BaseModel):
    id: int
    plate: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    status: str                  # "loading", "idle", dll.
    driver: Optional[str] = None
    speed: Optional[float] = None
    last_tph: Optional[str] = None

class TphData(BaseModel):
    id: int
    name: str
    lat: float
    lng: float

class DashboardResponse(BaseModel):
    trucks: List[TruckData]
    tph: List[TphData]

class ApprovalPayload(BaseModel):
    transaction_id: int
    vehicle_id: int

# Model untuk halaman Fleet List
class FleetData(BaseModel):
    id: int
    plate: str
    driver: str
    brand_model: str    # Kolom baru
    capacity: float     # Kolom baru
    status: str

# Model untuk halaman Approval Center
class ApprovalQueueItem(BaseModel):
    id: int
    vehicle_id: int
    plate: str
    driver: str
    janjang: int
    weight: str
    tph: str
    blok: str
    time: str
    photo: str

# Model untuk halaman Driver Management
class TripHistory(BaseModel):
    tripId: str
    date: str
    origin: str
    dest: str
    janjang: int
    weight: str
    status: str

class DriverData(BaseModel):
    id: str
    name: str
    username: str             # Wajib ada agar React bisa baca
    vehicle_id: Optional[int] # Wajib ada agar React bisa baca
    is_active: bool           # Wajib ada agar React bisa baca
    status: str               # Ini status jalan (Sedang Jalan/Idle)
    joinDate: str
    history: List[TripHistory]

    # Tambahan untuk UI DriverManagement
    plate_number: Optional[str] = None
    brand_model: Optional[str] = None


class DriverCreateUpdate(BaseModel):
    name: str 
    username: str
    password: Optional[str] = None 
    vehicle_id: Optional[int] = None
    status: str = "Standby" 
    is_active: bool = True

class VehicleDropdown(BaseModel):
    id: int
    plate_number: str
    brand_model: str

class LocationCreateUpdate(BaseModel):
    name: str
    type: str # 'tph' atau 'pks'
    lat: float
    lng: float

class LocationResponse(BaseModel):
    id: int
    name: str
    type: str
    lat: float
    lng: float

# Model data yang dikirim oleh alat IoT ke server
class IotPayload(BaseModel):
    vehicle_id: int
    lat: float
    lng: float
    status: str = "moving"

class AdminCreate(BaseModel):
    username: str
    password: str
    full_name: str

# Model Pydantic khusus untuk skema status komponen IoT
class DeviceStatusResponse(BaseModel):
    vehicle_id: int
    status_esp32: bool
    status_gps: bool
    status_gsm: bool
    updated_at: datetime

    class Config:
        from_attributes = True

# ── Endpoint Utama ──────────────────────────────────────────
@app.get("/api/dashboard", response_model=DashboardResponse)
async def get_dashboard():
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database connection pool not initialized.")
    
    conn: asyncpg.Connection = await db_pool.acquire()
    try:
        # ── Query Truk yang disesuaikan dengan skema tabel live_tracking terbaru ──
        truck_rows = await conn.fetch(
            """
            SELECT
                lt.vehicle_id AS id,
                v.plate_number AS plate,
                ST_Y(lt.last_position) AS lat,
                ST_X(lt.last_position) AS lng,
                COALESCE(lt.status, 'loading') AS status, -- Dinamis membaca status dari database
                COALESCE(u.driver_name, 'Supir Aktif') AS driver,
                0.0 AS speed,
                '-' AS last_tph
            FROM live_tracking lt
            JOIN vehicles v ON v.id = lt.vehicle_id
            LEFT JOIN users u ON u.vehicle_id = v.id;
            """
        )

        # ── Query Tempat Lokasi TPH & Pabrik PKS ──
        tph_rows = await conn.fetch(
            """
            SELECT id, name, ST_Y(geom) AS lat, ST_X(geom) AS lng
            FROM locations
            WHERE LOWER(type) IN ('tph', 'pabrik', 'factory', 'pks')
            ORDER BY name;
            """
        )

        return DashboardResponse(
            trucks=[TruckData(**dict(r)) for r in truck_rows],
            tph=[TphData(**dict(r)) for r in tph_rows],
        )

    except Exception as e:
        print(f"CRITICAL DATABASE ERROR: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {e}")
    finally:
        await db_pool.release(conn)


# ── Endpoint Approval Timbangan PKS ──────────────────────────
@app.post("/api/approve-delivery")
async def approve_delivery(payload: ApprovalPayload):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database connection pool not initialized.")
    
    # 1. Gunakan 'async with' agar koneksi otomatis tertutup / direlease
    async with db_pool.acquire() as conn:
        try:
            # 2. Gunakan blok transaksi agar data konsisten (All or Nothing)
            async with conn.transaction():
                
                # Update status truk menjadi idle
                await conn.execute(
                    """
                    UPDATE live_tracking 
                    SET status = 'idle',
                        updated_at = NOW()
                    WHERE vehicle_id = $1;
                    """,
                    payload.vehicle_id
                )

                # Update status muatan menggunakan ID TRANSAKSI langsung (Lebih Akurat!)
                # Tidak perlu lagi pakai SELECT subquery yang berisiko salah sasaran
                result = await conn.execute(
                    """
                    UPDATE input_data
                    -- Pastikan status setelah approval menjadi 2 (approved)
                    SET sync_status = 2,
                        updated_at = NOW()
                    WHERE id = $1;
                    """,
                    payload.transaction_id 
                )

                # Cek apakah data benar-benar terupdate
                if result == "UPDATE 0":
                    raise HTTPException(status_code=404, detail="Data transaksi tidak ditemukan.")
                    
            # 3. Pastikan fungsi mengembalikan respons JSON agar React tidak error
            return {"status": "success", "message": "Muatan berhasil disetujui, truk kembali idle."}
            
        except Exception as e:
            print(f"Error saat approval: {e}")
            raise HTTPException(status_code=500, detail=str(e))

# ─── ENDPOINT DASHBOARD MODERN ──────────────────────────────────────
# GET data armada (fleet) untuk halaman Fleet List
@app.get("/api/fleet", response_model=List[FleetData])
async def get_fleet_status():
    if not db_pool: raise HTTPException(status_code=500, detail="DB Error")
    conn: asyncpg.Connection = await db_pool.acquire()
    try:
        rows = await conn.fetch("""
            SELECT 
                v.id, 
                v.plate_number AS plate, 
                COALESCE(u.driver_name, 'Tanpa Supir') AS driver,
                COALESCE(v.brand_model, 'N/A') AS brand_model,
                COALESCE(v.capacity_ton, 0.0) AS capacity,
                UPPER(COALESCE(lt.status, 'IDLE')) AS status
            FROM vehicles v
            LEFT JOIN users u ON u.vehicle_id = v.id
            LEFT JOIN live_tracking lt ON lt.vehicle_id = v.id
            ORDER BY v.id;
        """)
        return [FleetData(**dict(r)) for r in rows]
    finally:
        await db_pool.release(conn)

# Edit data armada (fleet) berdasarkan ID

@app.put("/api/fleet/{fleet_id}")
async def update_fleet(fleet_id: int, fleet: dict):
    if not db_pool: raise HTTPException(status_code=500, detail="DB Error")
    conn: asyncpg.Connection = await db_pool.acquire()
    try:
        # Jalankan perintah UPDATE ke database
        result = await conn.execute("""
            UPDATE vehicles 
            SET plate_number = $1, 
                brand_model = $2, 
                capacity_ton = $3 
            WHERE id = $4
        """, fleet['plate'], fleet['brand_model'], float(fleet['capacity']), fleet_id)
        
        if result == "UPDATE 0":
            raise HTTPException(status_code=404, detail="Armada tidak ditemukan")
            
        return {"message": "Data armada berhasil diupdate"}
    except Exception as e:
        print(f"Error Update Fleet: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        await db_pool.release(conn)

# ADD data armada (fleet) baru
@app.post("/api/fleet")
async def add_fleet(fleet: dict):
    if not db_pool: raise HTTPException(status_code=500, detail="DB Error")
    conn: asyncpg.Connection = await db_pool.acquire()
    try:
        # Jalankan perintah INSERT ke database
        await conn.execute("""
            INSERT INTO vehicles (plate_number, brand_model, capacity_ton) 
            VALUES ($1, $2, $3)
        """, fleet['plate'], fleet['brand_model'], float(fleet['capacity']))
        
        return {"message": "Data armada berhasil ditambahkan"}
    except Exception as e:
        print(f"Error Add Fleet: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        await db_pool.release(conn)

# DELETE data armada (fleet) berdasarkan ID
@app.delete("/api/fleet/{fleet_id}")
async def delete_fleet(fleet_id: int):
    if not db_pool: raise HTTPException(status_code=500, detail="DB Error")
    conn: asyncpg.Connection = await db_pool.acquire()
    try:
        # Jalankan perintah DELETE ke database
        result = await conn.execute("""
            DELETE FROM vehicles WHERE id = $1
        """, fleet_id)
        
        if result == "DELETE 0":
            raise HTTPException(status_code=404, detail="Armada tidak ditemukan")
            
        return {"message": "Data armada berhasil dihapus"}
    except Exception as e:
        print(f"Error Delete Fleet: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        await db_pool.release(conn)

#Approval Center Endpoints GET
@app.get("/api/approvals/queue", response_model=List[ApprovalQueueItem])
async def get_approval_queue():
    if not db_pool: raise HTTPException(status_code=500, detail="DB Error")
    conn: asyncpg.Connection = await db_pool.acquire()
    try:
        # Menggunakan kolom yang sesuai dengan sync.php: jumlah_janjang, received_at, tph_code
        rows = await conn.fetch("""
            SELECT 
                i.id,
                v.id AS vehicle_id,
                v.plate_number AS plate,
                COALESCE(i.driver_name, u.driver_name, 'Supir') AS driver,
                COALESCE(i.jumlah_janjang, 0) AS janjang,
                'N/A' AS weight,
                COALESCE(i.tph_code, 'TPH Tidak Diketahui') AS tph,
                COALESCE(i.blok_name, '-') AS blok,
                TO_CHAR(i.received_at, 'DD Mon YYYY, HH24:MI WIB') AS time,
                COALESCE(i.photo_path, '') AS photo
            FROM input_data i
            JOIN vehicles v ON v.id = i.vehicle_id
            LEFT JOIN users u ON u.vehicle_id = v.id
            WHERE i.sync_status = 1 
            ORDER BY i.received_at ASC;
        """)
        return [ApprovalQueueItem(**dict(r)) for r in rows]
    except Exception as e:
        print(f"Error Queue: {e}")
        return []
    finally:
        await db_pool.release(conn)

# --- 2. ENDPOINT GET (Read) ---
@app.get("/api/drivers", response_model=List[DriverData])
async def get_drivers_history():
    if not db_pool: raise HTTPException(status_code=500, detail="DB Error")
    conn: asyncpg.Connection = await db_pool.acquire()
    try:
        # PERBAIKAN: Tambahkan username dan is_active di SELECT
        users = await conn.fetch("""
            SELECT 
                id, 
                driver_name, 
                username, 
                vehicle_id,
                is_active,
                TO_CHAR(created_at, 'Mon DD, YYYY') AS join_date
            FROM users 
            WHERE driver_name IS NOT NULL AND is_active = true;
        """)
        
        driver_list = []
        for u in users:
            driver_name = u['driver_name']
            driver_id = f"DRV-{u['id']}"
            
            # Ambil detail kendaraan (plat & brand_model) supaya sesuai seperti TruckSidebar
            # (Schema tabel vehicles: plate_number, brand_model)
            vehicle_row = await conn.fetchrow(
                """
                SELECT 
                    v.plate_number,
                    COALESCE(v.brand_model, 'Tidak Diketahui') AS brand_model
                FROM vehicles v
                WHERE v.id = $1
                """,
                u['vehicle_id'],
            )

            plate_number = vehicle_row['plate_number'] if vehicle_row else 'N/A'
            brand_model = vehicle_row['brand_model'] if vehicle_row else 'Tidak Diketahui'

            history_rows = await conn.fetch("""
                SELECT 
                    'TRP-' || i.id AS "tripId",
                    TO_CHAR(i.received_at, 'DD Mon YYYY, HH24:MI') AS date,
                    COALESCE(i.tph_code, 'Lokasi Awal') AS origin,
                    'PKS Inti' AS dest,
                    COALESCE(i.jumlah_janjang, 0) AS janjang,
                    '0 Ton' AS weight,
                    CASE WHEN i.sync_status = 2 THEN 'Selesai' ELSE 'Dalam Perjalanan' END AS status
                FROM input_data i
                WHERE i.vehicle_id = $1
                ORDER BY i.received_at DESC
                LIMIT 10;
            """, u['vehicle_id'])

            history_list = [TripHistory(**dict(h)) for h in history_rows]

            status_supir = "Idle"
            if history_list and history_list[0].status == "Dalam Perjalanan":
                status_supir = "Sedang Jalan"

            driver_list.append(DriverData(
                id=driver_id,
                name=driver_name,
                username=u['username'],
                vehicle_id=u['vehicle_id'],
                is_active=u['is_active'],
                status=status_supir,
                joinDate=u['join_date'],
                history=history_list,
                # FIELD tambahan untuk UI (DriverManagement aktif vehicle)
                plate_number=plate_number,
                brand_model=brand_model,
            ))
            
        return driver_list
    except Exception as e:
        print(f"Error Driver History: {e}")
        return []
    finally:
        await db_pool.release(conn)


# --- 3. ENDPOINT POST (Create) ---
@app.post("/api/drivers") 
async def add_driver(driver: DriverCreateUpdate): # PERBAIKAN: Gunakan model, bukan dict
    raw_password = driver.password or ''
    
    password_bytes = raw_password.encode('utf-8')
    if len(password_bytes) > 72:
        password_to_hash = password_bytes[:72].decode('utf-8', errors='ignore')
    else:
        password_to_hash = raw_password

    hashed_pw = pwd_context.hash(password_to_hash)
    
    async with db_pool.acquire() as conn:
        # PERBAIKAN: Masukkan juga vehicle_id dan is_active saat membuat supir baru
        await conn.execute(
            """
            INSERT INTO users (username, password_hash, driver_name, vehicle_id, is_active) 
            VALUES ($1, $2, $3, $4, $5)
            """,
            driver.username, hashed_pw, driver.name, driver.vehicle_id, driver.is_active
        )
    return {"message": "Supir ditambahkan"}

# --- 5. ENDPOINT nonaktif (Delete) ---
@app.put("/api/drivers/delete/{driver_id}")
async def soft_delete_driver(driver_id: int):
    async with db_pool.acquire() as conn:
       await conn.execute("UPDATE users SET is_active = false WHERE id=$1", driver_id  )
    return {"message": "Supir dinonaktifkan "}

# --- 4. ENDPOINT PUT (Update) ---
@app.put("/api/drivers/{driver_id}")
async def update_driver(driver_id: int, driver: DriverCreateUpdate):
    async with db_pool.acquire() as conn:
        # PERBAIKAN: Hapus kolom "status" karena tidak ada di database!
        # Sesuaikan urutan parameter ($1, $2, dll)
        await conn.execute(
            """
            UPDATE users 
            SET driver_name = $1, 
                username = $2, 
                vehicle_id = $3, 
                is_active = $4
            WHERE id = $5
            """,
            driver.name, driver.username, driver.vehicle_id, driver.is_active, driver_id
        )
    return {"message": "Data supir berhasil diupdate"}



# 6. Tambahkan endpoint ini di bawah endpoint GET /api/drivers
@app.get("/api/vehicles/dropdown", response_model=List[VehicleDropdown])
async def get_vehicles_dropdown():
    if not db_pool: raise HTTPException(status_code=500, detail="DB Error")
    async with db_pool.acquire() as conn:
        try:
            # Ambil data kendaraan yang is_active = true
            rows = await conn.fetch("""
                SELECT id, plate_number, COALESCE(brand_model, 'Tidak Diketahui') as brand_model 
                FROM vehicles 
                WHERE is_active = true
                ORDER BY plate_number ASC
            """)
            return [dict(row) for row in rows]
        except Exception as e:
            print(f"Error fetching vehicles: {e}")
            return []

# Approval History Endpoint GET History
@app.get("/api/approvals/history", response_model=List[ApprovalQueueItem])
async def get_approval_history():
    if not db_pool: raise HTTPException(status_code=500, detail="DB Error")
    conn: asyncpg.Connection = await db_pool.acquire()
    try:
        # Mengambil data yang sudah di-approve (sync_status = 2)
        rows = await conn.fetch("""
            SELECT 
                i.id,
                v.id AS vehicle_id,
                v.plate_number AS plate,
                COALESCE(i.driver_name, u.driver_name, 'Supir') AS driver,
                COALESCE(i.jumlah_janjang, 0) AS janjang,
                'N/A' AS weight,
                COALESCE(i.tph_code, 'TPH Tidak Diketahui') AS tph,
                COALESCE(i.blok_name, '-') AS blok,
                TO_CHAR(i.updated_at, 'DD Mon YYYY, HH24:MI WIB') AS time,
                COALESCE(i.photo_path, '') AS photo
            FROM input_data i
            JOIN vehicles v ON v.id = i.vehicle_id
            LEFT JOIN users u ON u.vehicle_id = v.id
            WHERE i.sync_status = 2 
            ORDER BY i.updated_at DESC
            LIMIT 50; -- Batasi 50 riwayat terakhir agar tidak berat
        """)
        return [ApprovalQueueItem(**dict(r)) for r in rows]
    except Exception as e:
        print(f"Error History: {e}")
        return []
    finally:
        await db_pool.release(conn)

# Location
# GET: Ambil semua lokasi
@app.get("/api/locations", response_model=List[LocationResponse])
async def get_locations():
    async with db_pool.acquire() as conn:
        # ST_Y = Latitude, ST_X = Longitude
        rows = await conn.fetch("""
            SELECT id, name, type, 
                   ST_Y(geom::geometry) AS lat, 
                   ST_X(geom::geometry) AS lng 
            FROM locations 
            ORDER BY id ASC
        """)
        return [dict(r) for r in rows]

# POST: Tambah lokasi baru
@app.post("/api/locations")
async def add_location(loc: LocationCreateUpdate):
    async with db_pool.acquire() as conn:
        # ST_MakePoint mengambil parameter (Longitude, Latitude) -> Jangan terbalik!
        await conn.execute("""
            INSERT INTO locations (name, type, geom) 
            VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326))
        """, loc.name, loc.type, loc.lng, loc.lat)
    return {"message": "Lokasi berhasil ditambahkan"}

# PUT: Update lokasi
@app.put("/api/locations/{loc_id}")
async def update_location(loc_id: int, loc: LocationCreateUpdate):
    async with db_pool.acquire() as conn:
        await conn.execute("""
            UPDATE locations 
            SET name = $1, 
                type = $2, 
                geom = ST_SetSRID(ST_MakePoint($3, $4), 4326)
            WHERE id = $5
        """, loc.name, loc.type, loc.lng, loc.lat, loc_id)
    return {"message": "Lokasi berhasil diupdate"}

# DELETE: Hapus lokasi
@app.delete("/api/locations/{loc_id}")
async def delete_location(loc_id: int):
    async with db_pool.acquire() as conn:
        await conn.execute("DELETE FROM locations WHERE id = $1", loc_id)
    return {"message": "Lokasi dihapus"}

# ─── 1. ENDPOINT UNTUK MENERIMA DATA DARI ALAT IOT ───


@app.post("/api/setup-admin")
async def create_first_admin(admin: AdminCreate):
    # Hash password menggunakan bcrypt
    hashed_password = pwd_context.hash(admin.password)
    
    async with db_pool.acquire() as conn:
        try:
            await conn.execute(
                """
                INSERT INTO dashboard_admins (username, password_hash, full_name, role, is_active)
                VALUES ($1, $2, $3, 'superadmin', true)
                """,
                admin.username, hashed_password, admin.full_name
            )
            return {"message": "Admin berhasil dibuat!"}
        except Exception as e:
            return {"error": str(e)}

@app.post("/api/login")
async def login(credentials: dict):
    username = credentials.get("username")
    password = credentials.get("password")
    
    async with db_pool.acquire() as conn:
        user = await conn.fetchrow("SELECT * FROM dashboard_admins WHERE username = $1", username)
        
        # Cek jika user ada DAN password cocok
        if user and pwd_context.verify(password, user['password_hash']):
            return {"status": "success", "full_name": user['full_name'], "message": "Login berhasil"}
        else:
            raise HTTPException(status_code=401, detail="Username atau password salah")
        
# ─── 1. ENDPOINT UNTUK LIST TRUK DI HALAMAN IOT (MENGIKUTI TABEL VEHICLES MASTER) ───
@app.get("/api/vehicles")
async def get_all_vehicles():
    if not db_pool: 
        raise HTTPException(status_code=500, detail="Database pool tidak aktif")
        
    async with db_pool.acquire() as conn:
        try:
            # Mengambil truk yang aktif langsung dari master tabel 'vehicles'
            rows = await conn.fetch("""
                SELECT 
                    id, 
                    'Truck ' || id as label, 
                    plate_number as plate 
                FROM vehicles 
                WHERE is_active = true
                ORDER BY plate_number ASC
            """)
            
            if not rows:
                return [
                    {"id": 1, "label": "Truck 01", "plate": "BM 8821 PO"},
                    {"id": 2, "label": "Truck 02", "plate": "BM 4410 PO"},
                ]
                
            return [
                {
                    "id": row["id"],
                    "label": row["label"],
                    "plate": row["plate"]
                } for row in rows
            ]
        except Exception as e:
            print(f"Error pada endpoint vehicles: {e}")
            # Fallback agar frontend tidak crash saat database kosong/error
            return [
                {"id": 1, "label": "Truck 01", "plate": "BM 8821 PO"},
                {"id": 2, "label": "Truck 02", "plate": "BM 4410 PO"},
            ]


# ─── 2. ENDPOINT MONITORING STATUS HARDWARE IOT (SINKRON DENGAN DATA DARI ARDUINO) ───
@app.get("/api/device-status/{vehicle_id}", response_model=DeviceStatusResponse)
async def get_device_status(vehicle_id: int):
    if not db_pool: 
        raise HTTPException(status_code=500, detail="Database pool tidak aktif")
        
    async with db_pool.acquire() as conn:
        try:
            # Query mengambil status hardware twin dari tabel live_tracking menggunakan placeholder asyncpg ($1)
            row = await conn.fetchrow("""
                SELECT 
                    vehicle_id,
                    COALESCE(status_esp32, FALSE) as status_esp32,
                    COALESCE(status_gps, FALSE) as status_gps,
                    COALESCE(status_gsm, FALSE) as status_gsm,
                    updated_at
                FROM live_tracking
                WHERE vehicle_id = $1
            """, vehicle_id)
            
            # Jika data alat belum pernah masuk ke tabel live_tracking
            if not row:
                return {
                    "vehicle_id": vehicle_id,
                    "status_esp32": False,
                    "status_gps": False,
                    "status_gsm": False,
                    "updated_at": datetime.now()
                }
                
            return {
                "vehicle_id": row["vehicle_id"],
                "status_esp32": row["status_esp32"],
                "status_gps": row["status_gps"],
                "status_gsm": row["status_gsm"],
                "updated_at": row["updated_at"]
            }
            
        except Exception as e:
            print(f"Error pada endpoint device-status: {e}")
            raise HTTPException(status_code=500, detail="Gagal mengambil data status hardware.")

# ── Endpoint Sync Cadangan ─────────────────────────────────
class TrackingPayload(BaseModel):
    vehicle_id: int
    lat: float
    lng: float
    status: str

@app.post("/api/sync")
async def sync_tracking(payload: TrackingPayload):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database connection pool not initialized.")
    
    conn: asyncpg.Connection = await db_pool.acquire()
    try:
        await conn.execute(
            """
            INSERT INTO live_tracking (vehicle_id, last_position, status, updated_at)
            VALUES ($1, ST_SetSRID(ST_MakePoint($3, $2), 4326), $4, NOW())
            ON CONFLICT (vehicle_id) 
            DO UPDATE SET last_position = ST_SetSRID(ST_MakePoint($3, $2), 4326), status = $4, updated_at = NOW();
            """,
            payload.vehicle_id, payload.lat, payload.lng, payload.status
        )
        return {"ok": True}
    
    finally:
        await db_pool.release(conn)
if __name__ == "__main__":
    # Sesuaikan host dan port jika diperlukan
    uvicorn.run(app, host="127.0.0.1", port=8000)