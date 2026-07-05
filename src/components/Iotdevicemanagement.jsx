import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import {
  Cpu,
  Radio,
  MapPin,
  RefreshCw,
  AlertTriangle,
  Truck,
  ChevronDown,
  Wifi,
  WifiOff,
  Clock,
  Activity,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Static fleet reference. In production this would come from a /vehicles
// endpoint, but the brief only specifies the per-vehicle status endpoint,
// so the selectable fleet list is kept local.
// ---------------------------------------------------------------------------
const POLL_INTERVAL_MS = 5000;
const FALLBACK_FLEET = [
  { id: 1, label: "Truck 01", plate: "BM 8821 PO" },
  { id: 2, label: "Truck 02", plate: "BM 4410 PO" },
  { id: 3, label: "Truck 03", plate: "BM 7765 PO" },
  { id: 4, label: "Truck 04", plate: "BM 1092 PO" },
];


const MODULES = [
  {
    key: "status_esp32",
    name: "ESP32 Main Core",
    role: "Central controller \u2014 orchestrates telemetry, sensors & uplink",
    icon: Cpu,
    image: "/assets/hardware/esp32.png",
  },
  {
    key: "status_gps",
    name: "GPS Neo-6M",
    role: "Satellite positioning \u2014 real-time coordinates & route trace",
    icon: MapPin,
    image: "/assets/hardware/gps.png",
  },
  {
    key: "status_gsm",
    name: "GSM SIM800L",
    role: "Cellular uplink \u2014 relays telemetry over the GSM network",
    icon: Radio,
    image: "/assets/hardware/sim800l.png",
  },
];

function formatTimestamp(iso) {
  if (!iso) return "\u2014";
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

function useHeartbeat(referenceIso) {
  const [secondsAgo, setSecondsAgo] = useState(null);

  useEffect(() => {
    if (!referenceIso) {
      setSecondsAgo(null);
      return;
    }
    const ref = new Date(referenceIso).getTime();
    const tick = () => setSecondsAgo(Math.max(0, Math.floor((Date.now() - ref) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [referenceIso]);

  return secondsAgo;
}

function Led({ online, size = "md" }) {
  const dim = size === "sm" ? "h-2.5 w-2.5" : "h-3.5 w-3.5";
  return (
    <span className="relative inline-flex items-center justify-center">
      {online && (
        <span className={`absolute inline-flex ${dim} rounded-full bg-emerald-400 opacity-75 animate-ping`} />
      )}
      <span
        className={[
          "relative inline-flex rounded-full",
          dim,
          online
            ? "bg-emerald-500 shadow-[0_0_15px_#10b981] animate-pulse"
            : "bg-red-500 shadow-[0_0_15px_#ef4444]",
        ].join(" ")}
      />
    </span>
  );
}

function HardwareCard({ mod, online, connectionLost }) {
  const Icon = mod.icon;
  const effectiveOnline = connectionLost ? false : online;

  return (
    <div
      className={[
        "group relative overflow-hidden rounded-2xl border bg-slate-900/60 backdrop-blur-sm p-5",
        "transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl",
        effectiveOnline
          ? "border-emerald-500/20 hover:border-emerald-400/50 hover:shadow-emerald-500/10"
          : "border-red-500/20 hover:border-red-400/50 hover:shadow-red-500/10",
      ].join(" ")}
    >
      {/* Ambient scan-line glow */}
      <div
        className={[
          "pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500",
          effectiveOnline
            ? "bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent"
            : "bg-gradient-to-br from-red-500/5 via-transparent to-transparent",
        ].join(" ")}
      />

      <div className="relative flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Icon
            className={[
              "h-4 w-4",
              effectiveOnline ? "text-emerald-400" : "text-red-400",
            ].join(" ")}
          />
          <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
            Module
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={[
              "text-[10px] font-mono uppercase tracking-wider",
              effectiveOnline ? "text-emerald-400" : "text-red-400",
            ].join(" ")}
          >
            {effectiveOnline ? "Online" : "Offline"}
          </span>
          <Led online={effectiveOnline} />
        </div>
      </div>

      {/* Image placeholder */}
      <div className="relative mt-4 flex h-32 items-center justify-center rounded-xl border border-slate-800 bg-slate-950/60">
        <div
          className={[
            "absolute inset-0 rounded-xl opacity-20 blur-2xl transition-opacity duration-500",
            effectiveOnline ? "bg-emerald-500" : "bg-red-500",
            "group-hover:opacity-30",
          ].join(" ")}
        />
        <img
          src={mod.image}
          alt={mod.name}
          className="relative h-24 w-24 object-contain drop-shadow-[0_0_12px_rgba(148,163,184,0.15)] transition-transform duration-300 group-hover:scale-105"
          onError={(e) => {
            e.currentTarget.style.display = "none";
            e.currentTarget.nextSibling.style.display = "flex";
          }}
        />
        <div
          className="relative hidden h-24 w-24 items-center justify-center rounded-lg border border-dashed border-slate-700 text-slate-600"
          style={{ display: "none" }}
        >
          <Icon className="h-8 w-8" />
        </div>
      </div>

      <div className="relative mt-4">
        <h3 className="text-sm font-semibold text-slate-100 tracking-tight">{mod.name}</h3>
        <p className="mt-1 text-xs leading-relaxed text-slate-400">{mod.role}</p>
      </div>
    </div>
  );
}

export default function IoTDeviceManagement() {
  // 1. State dideklarasikan menggunakan nama 'fleets' (pake s)
  const [fleets, setFleets] = useState([]);
  const [selectedTruckId, setSelectedTruckId] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [deviceStatus, setDeviceStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connectionLost, setConnectionLost] = useState(false);
  const [lastFetchAttempt, setLastFetchAttempt] = useState(null);
  const pollRef = useRef(null);

  // 2. Load daftar vehicles dari database PostgreSQL
  useEffect(() => {
    const fetchFleets = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}/api/vehicles`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
          }
        });

        if (res.data && res.data.length > 0) {
          const formatted = res.data.map(v => ({
            id: v.id || v.vehicle_id,
            label: v.plat_nomor ? `Truck ${v.id || ''}` : v.label,
            plate: v.plat_nomor || v.plate
          }));
          setFleets(formatted); // Mengisi state fleets
          setSelectedTruckId(formatted[0].id);
        } else {
          setFleets(FALLBACK_FLEET);
          setSelectedTruckId(FALLBACK_FLEET[0].id);
        }
      } catch (err) {
        console.error("Gagal memuat database armada, beralih ke lokal:", err);
        setFleets(FALLBACK_FLEET);
        setSelectedTruckId(FALLBACK_FLEET[0].id);
      }
    };
    fetchFleets();
  }, []);

  // 3. Penentuan selectedTruck menggunakan 'fleets' yang aman dari error loading
  const selectedTruck = (fleets && fleets.length > 0)
    ? (fleets.find((t) => t.id === selectedTruckId) ?? fleets[0])
    : FALLBACK_FLEET[0];

  // 4. UseCallback untuk mengambil status hardware
  const fetchStatus = useCallback(async (vehicleId) => {
    if (!vehicleId) return;
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}/api/device-status/${vehicleId}`, {

        timeout: 4000,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });
      console.log("Data Status Hardware dari FastAPI:", res.data);
      setDeviceStatus(res.data);
      setConnectionLost(false);
    } catch (err) {
      setConnectionLost(true);
    } finally {
      setLoading(false);
      setLastFetchAttempt(new Date().toISOString());
    }
  }, []);

  // 5. Interval Polling
  useEffect(() => {
    if (!selectedTruckId) return;
    setLoading(true);
    setDeviceStatus(null);
    fetchStatus(selectedTruckId);

    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => fetchStatus(selectedTruckId), POLL_INTERVAL_MS);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [selectedTruckId, fetchStatus]);

  const heartbeatSeconds = useHeartbeat(deviceStatus?.updated_at);

  const overallOnline =
    !connectionLost &&
    deviceStatus &&
    deviceStatus.status_esp32 &&
    deviceStatus.status_gps &&
    deviceStatus.status_gsm;

  return (
    <div className="min-h-full w-full bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 p-6 text-slate-100">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-emerald-400" />
            <h1 className="text-lg font-bold tracking-tight text-slate-50">
              IoT Device Monitoring
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Live hardware twin &mdash; palm oil fleet telemetry, polled every 5s
          </p>
        </div>

        {/* Vehicle selector */}
        <div className="relative w-full sm:w-64">
          <button
            onClick={() => setDropdownOpen((v) => !v)}
            className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-2.5 text-sm text-slate-200 shadow-inner transition-colors duration-200 hover:border-emerald-500/40 hover:bg-slate-900"
          >
            <span className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-emerald-400" />
              <span className="font-medium">{selectedTruck?.label || "Loading..."}</span>
              <span className="text-slate-500">&middot; {selectedTruck?.plate || ""}</span>
            </span>
            <ChevronDown
              className={`h-4 w-4 text-slate-500 transition-transform duration-200 ${
                dropdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {dropdownOpen && (
            <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-900/95 shadow-2xl backdrop-blur-md">
              {fleets.map((truck) => (
                <button
                  key={truck.id}
                  onClick={() => {
                    setSelectedTruckId(truck.id);
                    setDropdownOpen(false);
                  }}
                  className={[
                    "flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors duration-150",
                    truck.id === selectedTruckId
                      ? "bg-emerald-500/10 text-emerald-300"
                      : "text-slate-300 hover:bg-slate-800/70",
                  ].join(" ")}
                >
                  <span>{truck.label}</span>
                  <span className="text-xs text-slate-500">{truck.plate}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Offline banner */}
      {connectionLost && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-950/40 px-4 py-3 text-red-300">
          <AlertTriangle className="h-5 w-5 shrink-0 animate-pulse" />
          <div className="flex-1">
            <p className="text-sm font-semibold">Connection to telemetry server lost</p>
            <p className="text-xs text-red-400/80">
              Unable to reach device-status endpoint. Showing last known state as offline until connection is restored.
            </p>
          </div>
          <RefreshCw className="h-4 w-4 animate-spin text-red-400/70" />
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !deviceStatus && !connectionLost && (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-64 animate-pulse rounded-2xl border border-slate-800 bg-slate-900/50"
            />
          ))}
        </div>
      )}

      {/* Hardware twin grid */}
      {(deviceStatus || connectionLost) && !loading && (
        <>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {MODULES.map((mod) => (
              <HardwareCard
                key={mod.key}
                mod={mod}
                online={
                deviceStatus 
                    ? (deviceStatus[mod.key] === true || deviceStatus[mod.key] === 't' || deviceStatus[mod.key] === 1) 
                    : false
                }
                connectionLost={connectionLost}
              />
            ))}
          </div>

          {/* System metadata footer */}
          <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 px-5 py-4 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              {overallOnline ? (
                <Wifi className="h-4 w-4 text-emerald-400" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-400" />
              )}
              <span
                className={`text-xs font-semibold uppercase tracking-wider ${
                  overallOnline ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {overallOnline ? "Unit fully operational" : "Unit degraded"}
              </span>
            </div>

            <div className="flex items-center gap-5 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-slate-500" />
                <span>Last updated: {formatTimestamp(deviceStatus?.updated_at)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
                <span>
                  Synced{" "}
                  <span className="font-mono text-slate-300">
                    {heartbeatSeconds === null ? "—" : `${heartbeatSeconds}s`}
                  </span>{" "}
                  ago
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}