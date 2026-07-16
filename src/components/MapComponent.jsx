// ============================================================
// components/MapComponent.jsx
// ============================================================
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { createTruckIcon, createTphIcon, createFactoryIcon } from "../utils/mapIcons";

import TruckSidebar from "./TruckSidebar";
import { Truck, MapPin, Factory, Package, CheckCircle2, User, Activity, Navigation, Satellite, Map as MapIcon } from "lucide-react";
import { useSmoothPosition } from "../hooks/useSmoothPosition";
import { POLLING_INTERVAL_MS } from "../utils/pollingConfig";

const DEFAULT_CENTER = [-6.296289, 107.058101];
const DEFAULT_ZOOM = 14;

const isFactory = (name) => /pabrik|pks|mill/i.test(name);

// ─── PILIHAN MODE PETA ─────────────────────────────────────────
const MAP_MODES = {
  satellite: {
    label: "Satelit",
    layers: [
      {
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
      },
      {
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
        attribution: "",
      },
    ],
  },
  light: {
    label: "Terang",
    layers: [
      {
        url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      },
    ],
  },
};

// Format detik jadi teks durasi ("12 menit" / "1 jam 5 menit")
function formatDuration(seconds) {
  const totalMinutes = Math.max(1, Math.round(seconds / 60));
  if (totalMinutes < 60) return `${totalMinutes} menit`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours} jam ${minutes} menit` : `${hours} jam`;
}

// Format jam perkiraan tiba dari sekarang + durasi (detik)
function formatEtaClock(seconds) {
  const eta = new Date(Date.now() + seconds * 1000);
  return eta.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

// ─── FUNGSI PENGAMBIL RUTE (OSRM) ─────────────────────────────
const fetchRoute = async (startLat, startLng, destLat, destLng) => {
  try {
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${destLng},${destLat}?overview=full&geometries=geojson`
    );
    const data = await response.json();

    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      // OSRM mengembalikan koordinat GeoJSON [Lng, Lat], kita balik jadi [Lat, Lng]
      const coordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
      // distance dalam meter, duration dalam detik
      return { coordinates, distance: route.distance, duration: route.duration };
    }
    return { coordinates: [], distance: 0, duration: 0 };
  } catch (error) {
    console.error("Gagal mengambil rute OSRM:", error);
    return { coordinates: [], distance: 0, duration: 0 };
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
  const [routeInfo, setRouteInfo] = useState(null); // { distance, duration, destination }
  const [mapMode, setMapMode] = useState("satellite"); // "satellite" | "light"

  // ─── EFFECT: HITUNG RUTE SAAT TRUK DIPILIH ──────────────────
  useEffect(() => {
    const getRoute = async () => {
      // Pastikan ada truk yang dipilih dan data lokasi (tph/pabrik) tersedia
      if (selectedTruck && tph && tph.length > 0) {
        // Cari titik pabrik dari daftar lokasi
        const factory = tph.find(point => isFactory(point.name));

        if (factory) {
          const result = await fetchRoute(
            selectedTruck.lat,
            selectedTruck.lng,
            factory.lat,
            factory.lng
          );
          setRouteCoords(result.coordinates);
          setRouteInfo(
            result.coordinates.length > 0
              ? { distance: result.distance, duration: result.duration, destination: factory.name }
              : null
          );
        } else {
          setRouteCoords([]);
          setRouteInfo(null);
        }
      } else {
        setRouteCoords([]); // Hapus rute jika tidak ada truk yang dipilih
        setRouteInfo(null);
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

      {/* Kartu Estimasi Jarak & Waktu Tiba — muncul saat rute truk terpilih aktif */}
      {routeInfo && (
        <div className="absolute top-4 right-4 z-[1000] max-w-[170px] sm:max-w-[220px] bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-slate-200 dark:border-gray-800 rounded-2xl shadow-2xl px-3 py-2.5 sm:px-4 sm:py-3">
          <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-bold text-xs sm:text-sm mb-1">
            <Navigation size={14} className="shrink-0" />
            <span className="truncate">Menuju {routeInfo.destination}</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] sm:text-xs text-slate-700 dark:text-slate-300 font-mono">
            <span>{(routeInfo.distance / 1000).toFixed(1)} km</span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span>{formatDuration(routeInfo.duration)}</span>
          </div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
            Estimasi tiba {formatEtaClock(routeInfo.duration)}
          </div>
        </div>
      )}

      {/* Switcher mode peta (Satelit / Terang) */}
      <div className="absolute bottom-4 left-4 z-[1000] flex items-center gap-1 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-slate-200 dark:border-gray-800 rounded-full shadow-2xl p-1">
        {Object.entries(MAP_MODES).map(([key, mode]) => (
          <button
            key={key}
            onClick={() => setMapMode(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
              mapMode === key
                ? "bg-emerald-500 text-slate-950"
                : "text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-800"
            }`}
          >
            {key === "satellite" ? <Satellite size={14} /> : <MapIcon size={14} />}
            {mode.label}
          </button>
        ))}
      </div>

      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        className="w-full h-full"
        zoomControl={false}
      >
        {/* Layer peta mengikuti mode yang dipilih (Satelit Esri World Imagery, atau
            Terang CartoDB Positron — dideklarasikan belakangan supaya label/layer
            kedua otomatis tersusun di atas layer pertama tanpa perlu "pane" khusus). */}
        {MAP_MODES[mapMode].layers.map((layer, idx) => (
          <TileLayer key={`${mapMode}-${idx}`} url={layer.url} attribution={layer.attribution} maxZoom={19} />
        ))}

        <ZoomControl position="bottomright" />
        <FlyToSelected selectedTruck={selectedTruck} />

        {/* ─── GARIS RUTE OSRM (solid biru gaya Google Maps, dengan outline putih agar
             tetap kontras di atas citra satelit) ─────────────────────────────── */}
        {routeCoords.length > 0 && (
          <>
            <Polyline
              positions={routeCoords}
              color="#ffffff"
              weight={7}
              opacity={0.9}
              lineCap="round"
              lineJoin="round"
            />
            <Polyline
              positions={routeCoords}
              color="#4285F4"
              weight={5}
              opacity={1}
              lineCap="round"
              lineJoin="round"
            />
          </>
        )}

        {/* Marker Truk — posisi dianimasikan halus (lihat AnimatedTruckMarker) */}
        {trucks.map((truck) => (
          <AnimatedTruckMarker
            key={`truck-${truck.id}`}
            truck={truck}
            isSelected={selectedTruck?.id === truck.id}
            onSelectTruck={onSelectTruck}
          />
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
// Marker truk dengan posisi yang meluncur halus (bukan loncat instan)
// setiap kali koordinat baru datang dari polling — pola yang sama dipakai
// aplikasi seperti Gojek/Grab untuk pergerakan marker di peta.
// ──────────────────────────────────────────────────────────────
function AnimatedTruckMarker({ truck, isSelected, onSelectTruck }) {
  // Durasi animasi mengikuti interval polling supaya marker selesai "berjalan"
  // tepat saat data berikutnya datang, bukan berhenti menunggu di tengah jalan.
  const [animLat, animLng] = useSmoothPosition(truck.lat, truck.lng, POLLING_INTERVAL_MS * 0.9);

  return (
    <Marker
      position={[animLat, animLng]}
      icon={createTruckIcon(truck.status, isSelected)}
      eventHandlers={{ click: () => onSelectTruck(truck) }}
    >
      <Popup className="rounded-xl overflow-hidden shadow-2xl border border-gray-700">
        <TruckPopupContent truck={truck} />
      </Popup>
    </Marker>
  );
}

// ──────────────────────────────────────────────────────────────
// Popup Modern dengan Tailwind CSS
// ──────────────────────────────────────────────────────────────
function TruckPopupContent({ truck }) {
  const isLoading = truck.status === "loading";

  return (
    <div className="p-3 w-48 text-slate-900 dark:text-white">
      <div className="font-bold text-sm border-b border-slate-200 dark:border-slate-700 pb-2 mb-2 flex justify-between items-center">
        <span className="flex items-center gap-1.5"><Truck size={16} className="text-emerald-600"/> {truck.plate}</span>
      </div>
      <div className="text-xs space-y-1.5 text-slate-700 dark:text-slate-200">
        <p className="flex items-center gap-1.5"><User size={14} /> {truck.driver || "-"}</p>
        <p className="flex items-center gap-1.5"><Activity size={14} /> {truck.speed || 0} km/h</p>
      </div>
      {isLoading && (
          <button
            type="button"
            onClick={() => alert("Approve hanya tersedia di halaman ApprovalCenter.")}
            className="flex items-center justify-center gap-2 w-full mt-3 bg-slate-200 dark:bg-slate-700/60 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-white text-xs font-bold py-2 rounded-lg transition-colors opacity-90"
          >
            <CheckCircle2 size={14} /> Approve di PKS (di halaman Approval)
          </button>

      )}
    </div>
  );
}

function TphPopupContent({ point }) {
  return (
    <div className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
      {isFactory(point.name) ? <Factory size={14} className="text-amber-500" /> : <Package size={14} className="text-blue-500" />}
      {point.name}
    </div>
  );
}