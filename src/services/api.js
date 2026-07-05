// ============================================================
// services/api.js
// Konfigurasi dan fungsi fetch ke backend FastAPI
// ============================================================

// Memastikan jika di VPS (production), tidak ada tabrakan double /api
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
/**
 * Mengambil data truk dan TPH dari backend FastAPI.
 */
export async function fetchDashboardData() {
  const response = await fetch(`${API_BASE_URL}/api/dashboard`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(4000),
  });

  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status}`);
  }

  return response.json();
}

/**
 * Mengirimkan data approval timbangan buah ke Pabrik PKS
 * @param {number} vehicleId ID Kendaraan yang akan di-approve statusnya menjadi idle
 */
export async function approveDelivery(payload) {
  const response = await fetch(`${API_BASE_URL}/api/approve-delivery`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      transaction_id: payload?.transaction_id,
      vehicle_id: payload?.vehicle_id,
    }),
  });

  if (!response.ok) {
    throw new Error(`Gagal memproses approval: ${response.status}`);
  }

  return response.json();
}

// ─── ENDPOINT BARU UNTUK DASHBOARD MODERN ──────────────────────────

/**
 * Mengambil data armada truk dan status koneksinya
 */
export async function fetchFleetStatus() {
  const response = await fetch(`${API_BASE_URL}/api/fleet`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) throw new Error("Gagal mengambil data armada");
  return response.json();
}

/**
 * Mengambil daftar antrean muatan yang menunggu di-approve di PKS
 */
export async function fetchApprovalQueue() {
  const response = await fetch(`${API_BASE_URL}/api/approvals/queue`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) throw new Error("Gagal mengambil antrean approval");
  return response.json();
}

/**
 * Mengambil data supir beserta riwayat jalan (trip history) mereka
 */
export async function fetchDriverHistory() {
  const response = await fetch(`${API_BASE_URL}/api/drivers`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) throw new Error("Gagal mengambil riwayat supir");
  return response.json();
}
// Mengambil riwayat yang sudah di-approve
export async function fetchApprovalHistory() {
  const response = await fetch(`${API_BASE_URL}/api/approvals/history`);
  if (!response.ok) throw new Error("Gagal mengambil riwayat approval");
  return response.json();
}

//CRUD SUPIR
export async function createDriver(driverData) {
  const response = await fetch(`${API_BASE_URL}/api/drivers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(driverData),
  });
if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Gagal menyimpan data");
  }
  return response.json();
}

export async function softDeleteDriver(id) {
  const url = `${API_BASE_URL}/api/drivers/delete/${id}`;
  console.log("Mencoba fetch ke URL:", url); // <--- LIHAT INI DI CONSOLE
  
  const response = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
  });
  
  console.log("Status response:", response.status); // <--- LIHAT INI
  if (!response.ok) throw new Error("Gagal menonaktifkan supir");
  return response.json();
}

export async function updateDriver(id, driverData) {
  const response = await fetch(`${API_BASE_URL}/api/drivers/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(driverData),
  });
  if (!response.ok) throw new Error("Gagal mengupdate supir");
  return response.json();
}


export const fetchVehiclesDropdown = async () => {
  try {
    // Sesuaikan API_BASE_URL jika menggunakan variabel lingkungan
    const response = await fetch(`${API_BASE_URL}/api/vehicles/dropdown`); 
    if (!response.ok) {
      throw new Error("Gagal mengambil data kendaraan");
    }
    return response.json();
  } catch (error) {
    console.error("Fetch vehicles error:", error);
    return [];
  }
};

// CRUD ARMADA
export async function createFleet(fleetData) {
  const response = await fetch(`${API_BASE_URL}/api/fleet`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fleetData),
  });
  if (!response.ok) throw new Error("Gagal menambah armada");
  return response.json();
}

export async function updateFleet(id, fleetData) {
  const response = await fetch(`${API_BASE_URL}/api/fleet/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fleetData),
  });
  if (!response.ok) throw new Error("Gagal mengupdate armada");
  return response.json();
}

export async function deleteFleet(id) {
  const response = await fetch(`${API_BASE_URL}/api/fleet/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Gagal menghapus armada");
  return response.json();
}

//CRUD location
// Ambil daftar lokasi
export const fetchLocations = async () => {
  const response = await fetch(`${API_BASE_URL}/api/locations`);
  if (!response.ok) throw new Error("Gagal mengambil data lokasi");
  return response.json();
};

// Tambah lokasi
export const createLocation = async (data) => {
  const response = await fetch(`${API_BASE_URL}/api/locations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Gagal menambah lokasi");
  return response.json();
};

// Update lokasi
export const updateLocation = async (id, data) => {
  const response = await fetch(`${API_BASE_URL}/api/locations/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Gagal mengupdate lokasi");
  return response.json();
};

// Hapus lokasi
export const deleteLocation = async (id) => {
  const response = await fetch(`${API_BASE_URL}/api/locations/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Gagal menghapus lokasi");
  return response.json();
};

// Fungsi untuk mengambil rute jalan raya dari OSRM
const fetchRoute = async (startLat, startLng, destLat, destLng) => {
  try {
    // Format OSRM: /route/v1/driving/startLng,startLat;destLng,destLat
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${destLng},${destLat}?overview=full&geometries=geojson`
    );
    const data = await response.json();

    if (data.routes && data.routes.length > 0) {
      // OSRM mengembalikan koordinat GeoJSON [Lng, Lat]
      // Kita harus membaliknya menjadi [Lat, Lng] agar bisa dibaca oleh Leaflet Polyline
      const coordinates = data.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
      return coordinates;
    }
    return [];
  } catch (error) {
    console.error("Gagal mengambil rute OSRM:", error);
    return [];
  }
};
// Ambil data live tracking truk termasuk traveled_distance
export const fetchLiveTrucks = async () => {
  const response = await fetch(`${API_BASE_URL}/api/iot/location`);
  if (!response.ok) throw new Error("Gagal mengambil data Jarak.");
  return response.json();
};

// Di services/api.js
export async function loginAdmin(credentials) {
  const response = await fetch(`${API_BASE_URL}/api/login`, {
    method: "POST", // Harus POST
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials), // Mengirim username & password
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "Gagal login");
  }
  return response.json();
}

export async function handleLogout() {
  const response = await fetch(`${API_BASE_URL}/api/logout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) throw new Error("Gagal logout");
  return response.json();
}

export async function fetchDeviceStatus(vehicleId) {
  const response = await fetch(`${API_BASE_URL}/api/device-status/${vehicleId}`);
  if (!response.ok) throw new Error("Gagal mengambil status perangkat");
  return response.json();
}

/**
 * DATA MOCK — untuk development/testing tanpa backend.
 */
export async function fetchMockData() {
  await new Promise((r) => setTimeout(r, 300));
}
