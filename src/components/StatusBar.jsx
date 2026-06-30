import { Bell, Moon, Sun, LogOut, User } from 'lucide-react';
import { useTheme } from '../hooks/useTheme'; 
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

export default function StatusBar({ lastUpdated, isLoading, error }) {
  const [theme, toggleTheme] = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const menuRef = useRef(null);

  // Ambil data admin dari localStorage
  const adminName = sessionStorage.getItem('adminName') || 'Admin';

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
        sessionStorage.removeItem('isLoggedIn');
        sessionStorage.removeItem('adminName');
        navigate('/login');
      }
    });
  };

  const timeStr = lastUpdated
    ? lastUpdated.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "--:--:--";

  return (
    <div className="flex items-center gap-6">
      <div className="flex items-center gap-2 border rounded-full px-4 py-1.5 shadow-sm transition-colors border-slate-300 bg-slate-100 dark:border-slate-800 dark:bg-slate-900">
        <span className={`w-2 h-2 rounded-full ${error ? 'bg-red-500' : isLoading ? 'bg-yellow-500' : 'bg-emerald-500'} animate-pulse`} />
        <span className="text-xs font-mono font-bold tracking-widest text-slate-700 dark:text-slate-300">
          {error ? "ERROR" : isLoading ? "CONNECTING..." : `LIVE ${timeStr}`}
        </span>
      </div>

      <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400">
        <button className="hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors">
          <Bell size={20} />
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