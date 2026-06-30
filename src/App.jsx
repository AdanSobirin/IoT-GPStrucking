import { useState, useEffect, useCallback } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";

// Import Komponen Halaman
import Login from "./components/Login"; 
import MapComponent from "./components/MapComponent";
import StatusBar from "./components/StatusBar";
import Sidebar from "./components/Sidebar"; 
import DriverManagement from "./components/DriverManagement";
import FleetList from "./components/FleetList";
import ApprovalCenter from "./components/ApprovalCenter";
import LocationManagement from "./components/LocationManagement";
import { fetchDashboardData } from "./services/api";

const POLLING_INTERVAL = 5000;

// ─── PELINDUNG HALAMAN (PROTECTED ROUTE) ───
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem('isLoggedIn');
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// ─── LAYOUT DASHBOARD UTAMA (MENGGUNAKAN OUTLET) ───
function DashboardLayout() {
  const [data, setData] = useState({ trucks: [], tph: [] });
  const [selectedTruck, setSelectedTruck] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const result = await fetchDashboardData();
      setData(result);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError("Gagal memuat data. Periksa koneksi ke server.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, POLLING_INTERVAL);
    return () => clearInterval(interval);
  }, [loadData]);

  const loadingTrucks = data.trucks ? data.trucks.filter((t) => t.status === "loading").length : 0;
  const idleTrucks = data.trucks ? data.trucks.filter((t) => t.status === "idle").length : 0;
  const totalTphCount = data.tph ? data.tph.length : 0;

  return (
    <div className="flex h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-200 transition-colors duration-300">
      {/* Sidebar sekarang tidak butuh state activeView lagi karena membaca URL */}
      <Sidebar />
      
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="flex items-center justify-between px-6 py-3 bg-gray-900 border-b border-emerald-900/60 shrink-0 z-10">
          <div className="flex items-center gap-3">
            <span className="text-white font-bold text-sm uppercase tracking-wider text-emerald-400">
              PalmTrack Monitoring
            </span>
          </div>
          <StatusBar
            lastUpdated={lastUpdated}
            isLoading={isLoading}
            error={error}
            loadingCount={loadingTrucks}
            idleCount={idleTrucks}
            totalTph={totalTphCount}
          />
        </header>
        
        {/* Konten Utama: <Outlet /> akan otomatis merender halaman sesuai URL Route di bawah */}
        <div className="flex-1 overflow-hidden relative bg-slate-100 dark:bg-slate-900">
          {error && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-red-900/90 border border-red-600 text-red-200 text-xs px-4 py-2 rounded-full">
              ⚠ {error}
            </div>
          )}
          {/* Mengirimkan data real-time ke halaman anak melalui React Router Context jika diperlukan */}
          <Outlet context={{ data, selectedTruck, setSelectedTruck, loadData }} />
        </div>
      </div>
    </div>
  );
}

// ─── LAYOUT KHUSUS UNTUK MEMBUNGKUS MAPCOMPONENT (AGAR DATA MASUK) ───
function LiveTrackingWrapper() {
  const { data, selectedTruck, setSelectedTruck, loadData } = useOutletContext();
  return (
    <main className="flex-1 relative h-full w-full">
      <MapComponent
        trucks={data.trucks || []}
        tph={data.tph || []}
        selectedTruck={selectedTruck}
        onSelectTruck={setSelectedTruck}
        onApprovalSuccess={loadData}
      />
    </main>
  );
}

// Helper hook agar child route bisa mengambil data map dari parent layout
import { useOutletContext } from "react-router-dom";

// ─── MAIN APP ROUTING STRUCTURE ───
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Halaman Login */}
        <Route path="/login" element={<Login />} />

        {/* Root URL dialihkan ke halaman dashboard utama */}
        <Route path="/" element={<Navigate to="/dashboard/live-tracking" replace />} />

        {/* Struktur Nested Routing untuk Dashboard */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          {/* Ini adalah rute-rute URL yang akan berubah di browser */}
          <Route path="live-tracking" element={<LiveTrackingWrapper />} />
          <Route path="drivers" element={<div className="p-6 h-full overflow-y-auto"><DriverManagement /></div>} />
          <Route path="fleets" element={<div className="p-6 h-full overflow-y-auto"><FleetList /></div>} />
          <Route path="approvals" element={<div className="p-6 h-full overflow-y-auto"><ApprovalCenter /></div>} />
          <Route path="locations" element={<div className="p-6 h-full overflow-y-auto"><LocationManagement /></div>} />
          
          {/* Jika user hanya mengetik /dashboard, lempar ke live-tracking */}
          <Route index element={<Navigate to="live-tracking" replace />} />
        </Route>

        {/* Handling URL Salah */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}