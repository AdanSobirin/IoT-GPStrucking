import { Bell, Moon, Sun, LogOut, User } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import { fetchApprovalQueue } from '../services/api';
import { POLLING_INTERVAL_MS } from '../utils/pollingConfig';

export default function StatusBar({ lastUpdated, isLoading, error }) {
  const [theme, toggleTheme] = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const menuRef = useRef(null);

  // Ambil data admin dari localStorage
  const adminName = localStorage.getItem('adminName') || 'Admin';

  // Menutup menu jika klik di luar area profil
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ─── NOTIFIKASI LONCENG: jumlah truk yang sedang mengirim data / menunggu approval ───
  // Sumbernya sama dengan antrean di halaman Approval (sync_status = 1, dikirim
  // begitu supir submit data angkutan lewat app Android).
  useEffect(() => {
    // Halaman Approval sudah polling endpoint ini sendiri (ApprovalCenter.jsx) —
    // dilewati di sini supaya tidak ada request dobel saat sedang di halaman itu.
    if (location.pathname.startsWith('/dashboard/approvals')) return;

    let cancelled = false;
    const loadPendingCount = async () => {
      try {
        const queue = await fetchApprovalQueue();
        if (!cancelled) setPendingCount(Array.isArray(queue) ? queue.length : 0);
      } catch {
        // Diamkan — biarkan badge lama tetap tampil daripada mengganggu UI dengan error.
      }
    };

    loadPendingCount();
    const interval = setInterval(loadPendingCount, POLLING_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [location.pathname]);

  const handleLogout = () => {
    Swal.fire({
      title: 'Yakin ingin keluar?',
      text: "Anda akan diarahkan kembali ke halaman login.",
      icon: 'warning',
      background: '#0f172a',
      color: '#fff',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Logout'
    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.removeItem('token');
        localStorage.removeItem('access_token');
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('adminName');
        navigate('/login');
      }
    });
  };

  const timeStr = lastUpdated
    ? lastUpdated.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "--:--:--";

  return (
    <div className="flex items-center gap-2 sm:gap-6">
      <div className="flex items-center gap-2 border rounded-full px-2.5 sm:px-4 py-1 sm:py-1.5 shadow-sm transition-colors border-slate-300 bg-slate-100 dark:border-slate-800 dark:bg-slate-900">
        <span className={`w-2 h-2 rounded-full ${error ? 'bg-red-500' : isLoading ? 'bg-yellow-500' : 'bg-emerald-500'} animate-pulse`} />
        <span className="text-[10px] sm:text-xs font-mono font-bold tracking-widest text-slate-700 dark:text-slate-300">
          {error ? "ERROR" : isLoading ? "CONNECTING..." : (
            <>LIVE <span className="hidden sm:inline">{timeStr}</span></>
          )}
        </span>
      </div>

      <div className="flex items-center gap-2 sm:gap-4 text-slate-500 dark:text-slate-400">
        <button
          onClick={() => navigate('/dashboard/approvals')}
          className="relative inline-flex hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors"
          title={pendingCount > 0 ? `${pendingCount} truk menunggu approval` : "Tidak ada truk menunggu approval"}
        >
          <Bell size={20} />
          {pendingCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold leading-none">
              {pendingCount > 9 ? '9+' : pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={toggleTheme}
          className="hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors"
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>

      {/* Profil dengan Dropdown */}
      <div className="relative" ref={menuRef}>
        <div 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="w-9 h-9 rounded-full overflow-hidden border-2 cursor-pointer transition-all border-slate-300 dark:border-slate-700 hover:border-emerald-500"
        >
          <img 
            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${adminName}`} 
            alt="Profile" 
            className="w-full h-full object-cover bg-slate-200 dark:bg-slate-800"
          />
        </div>

        {isMenuOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 py-2">
            <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-800">
              <p className="text-[10px] uppercase text-slate-500 font-bold">Login sebagai</p>
              <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{adminName}</p>
            </div>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}