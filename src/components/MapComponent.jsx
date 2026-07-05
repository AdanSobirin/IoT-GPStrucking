// ============================================================
// components/MapComponent.jsx
// ============================================================
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { createTruckIcon, createTphIcon, createFactoryIcon } from "../utils/mapIcons";

import TruckSidebar from "./TruckSidebar"; 
import { Truck, MapPin, Factory, Package, CheckCircle2, User, Activity } from "lucide-react";

const DEFAULT_CENTER = [-6.296289, 107.058101];
const DEFAULT_ZOOM = 14;

const isFactory = (name) => /pabrik|pks|mill/i.test(name);

// ─── FUNGSI PENGAMBIL RUTE (OSRM) ─────────────────────────────
const fetchRoute = async (startLat, startLng, destLat, destLng) => {
  try {
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${destLng},${destLat}?overview=full&geometries=geojson`
    );
    const data = await response.json();

    if (data.routes && data.routes.length > 0) {
      // OSRM mengembalikan koordinat GeoJSON [Lng, Lat], kita balik jadi [Lat, Lng]
      return data.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
    }
    return [];
  } catch (error) {
    console.error("Gagal mengambil rute OSRM:", error);
    return [];
  }
};

function FlyToSelected({ selectedTruck }) {
  const map = useMap();
  useEffect(() => {
    if (selectedTruck) {
      map.flyTo([selectedTruck.lat, selectedTruck.lng], 15, { duration: 1.2 });
    }
  }, [selectedTruck, map]);
  return null;
}

export default function MapComponent({ trucks, tph, selectedTruck, onSelectTruck, onApprovalSuccess }) {
  const [routeCoords, setRouteCoords] = useState([]);


  // ─── EFFECT: HITUNG RUTE SAAT TRUK DIPILIH ──────────────────
  useEffect(() => {
    const getRoute = async () => {
      // Pastikan ada truk yang dipilih dan data lokasi (tph/pabrik) tersedia
      if (selectedTruck && tph && tph.length > 0) {
        // Cari titik pabrik dari daftar lokasi
        const factory = tph.find(point => isFactory(point.name));
        
        if (factory) {
          const coords = await fetchRoute(
            selectedTruck.lat,
            selectedTruck.lng,
            factory.lat,
            factory.lng
          );
          setRouteCoords(coords);
        } else {
          setRouteCoords([]);
        }
      } else {
        setRouteCoords([]); // Hapus rute jika tidak ada truk yang dipilih
      }
    };

    getRoute();
  }, [selectedTruck, tph]); // Akan dipanggil ulang jika posisi truk atau pilihan truk berubah

  return (
    <div className="relative w-full h-full">
      {/* Sidebar Truk Mengapung - Posisi Absolute di dalam peta */}
      <div className="absolute top-4 left-4 z-[1000]">
        <TruckSidebar 
          trucks={trucks} 
          selectedTruck={selectedTruck} 
          onSelectTruck={onSelectTruck} 
        />
      </div>

      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        className="w-full h-full"
        zoomControl={false}
      >
        {/* Dark Mode Map */}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
        />

        <ZoomControl position="bottomright" />
        <FlyToSelected selectedTruck={selectedTruck} />

        {/* ─── GARIS RUTE OSRM ─────────────────────────────────── */}
        {routeCoords.length > 0 && (
          <Polyline 
            positions={routeCoords} 
            color="#10b981" // Warna hijau emerald
            weight={4} 
            opacity={0.8} 
            dashArray="10, 10" // Garis putus-putus
            className="animate-pulse" // Opsional: Tambahkan animasi ringan jika didukung CSS
          />
        )}

        {/* Marker Truk */}
        {trucks.map((truck) => (
          <Marker
            key={`truck-${truck.id}`}
            position={[truck.lat, truck.lng]}
            icon={createTruckIcon(truck.status, selectedTruck?.id === truck.id)}
            eventHandlers={{ click: () => onSelectTruck(truck) }}
          >
            <Popup className="rounded-xl overflow-hidden shadow-2xl border border-gray-700">
              <TruckPopupContent truck={truck} onApprovalSuccess={onApprovalSuccess} />
            </Popup>
          </Marker>
        ))}

        {/* Marker TPH & Pabrik */}
        {tph.map((point) => (
          <Marker
            key={`tph-${point.id}`}
            position={[point.lat, point.lng]}
            icon={isFactory(point.name) ? createFactoryIcon() : createTphIcon(point.name)}
          >
            <Popup className="rounded-lg">
              <TphPopupContent point={point} />
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Popup Modern dengan Tailwind CSS
// ──────────────────────────────────────────────────────────────
function TruckPopupContent({ truck, onApprovalSuccess }) {
  const isLoading = truck.status === "loading";

  const handleApprove = async () => {
    if (!window.confirm(`Approve pembongkaran muatan ${truck.plate}?`)) return;
    try {
      await approveDelivery(truck.id);
      if (onApprovalSuccess) onApprovalSuccess();
    } catch (error) { alert("Gagal: " + error.message); }
  };

  return (
    <div className="p-3 w-48 text-white">
      <div className="font-bold text-sm border-b pb-2 mb-2 flex justify-between items-center">
        <span className="flex items-center gap-1.5"><Truck size={16} className="text-emerald-600"/> {truck.plate}</span>
      </div>
      <div className="text-xs space-y-1.5 text-slate-800">
        <p className="flex items-center gap-1.5"><User size={14} /> {truck.driver || "-"}</p>
        <p className="flex items-center gap-1.5"><Activity size={14} /> {truck.speed || 0} km/h</p>
      </div>
      {isLoading && (
          <button
            type="button"
            onClick={() => alert("Approve hanya tersedia di halaman ApprovalCenter.")}
            className="flex items-center justify-center gap-2 w-full mt-3 bg-slate-700/60 hover:bg-slate-700 text-white text-xs font-bold py-2 rounded-lg transition-colors opacity-80"
          >
            <CheckCircle2 size={14} /> Approve di PKS (di halaman Approval)
          </button>

      )}
    </div>
  );
}

function TphPopupContent({ point }) {
  return (
    <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
      {isFactory(point.name) ? <Factory size={14} className="text-amber-500" /> : <Package size={14} className="text-blue-500" />} 
      {point.name}
    </div>
  );
}